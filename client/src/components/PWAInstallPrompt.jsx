import { useState, useEffect } from 'react';
import { FaDownload, FaTimes, FaWifi, FaMobileAlt, FaShareSquare, FaPlusSquare } from 'react-icons/fa';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone app mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standaloneMode);

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Check dismissed status in localStorage (within 24 hours)
    const lastDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < 24 * 60 * 60 * 1000) {
      setDismissed(true);
    }

    // Listen to install prompt on Chromium / Android / Desktop
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Online / Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // If app installed, hide prompt
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    });

    // Custom trigger from Navbar or buttons
    const handleOpenInstall = () => {
      setDismissed(false);
      if (isIOS) {
        setShowIOSGuide(true);
      } else if (deferredPrompt) {
        handleInstallClick();
      }
    };
    window.addEventListener('open-pwa-install', handleOpenInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('open-pwa-install', handleOpenInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  return (
    <>
      {/* Offline Status Warning Bar */}
      {!isOnline && (
        <div
          className="bg-warning text-dark px-3 py-2 text-center small fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm border-bottom border-warning"
          style={{ position: 'sticky', top: 0, zIndex: 1060 }}
        >
          <FaWifi className="opacity-75" />
          <span>Bạn đang ở chế độ Ngoại Tuyến (Offline). Bạn vẫn có thể làm và ôn tập các đề thi đã tải!</span>
        </div>
      )}

      {/* Install App Banner (Only when not standalone & not dismissed) */}
      {!isStandalone && !dismissed && (isInstallable || isIOS) && (
        <div
          className="pwa-install-banner shadow-lg border rounded-3 p-3 mx-2 my-2"
          style={{
            position: 'fixed',
            bottom: '68px', // above mobile thumb nav
            left: 0,
            right: 0,
            maxWidth: '520px',
            margin: '0 auto',
            zIndex: 1050,
            background: 'var(--card-bg, #ffffff)',
            borderColor: '#0284c7'
          }}
        >
          <div className="d-flex align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center text-white"
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  flexShrink: 0
                }}
              >
                <FaMobileAlt size={22} />
              </div>
              <div>
                <h6 className="fw-bold mb-0 text-dark small" style={{ fontSize: '0.9rem' }}>
                  Cài Đặt App QuizMaster
                </h6>
                <p className="text-secondary mb-0" style={{ fontSize: '0.78rem' }}>
                  Thêm vào màn hình chính để mở nhanh & làm bài thi mượt mà!
                </p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1 flex-shrink-0">
              <button
                type="button"
                className="btn btn-primary-custom btn-sm py-1 px-3 fw-bold d-flex align-items-center gap-1"
                style={{ fontSize: '0.8rem' }}
                onClick={handleInstallClick}
              >
                <FaDownload size={12} /> Cài Đặt
              </button>
              <button
                type="button"
                className="btn btn-sm btn-light text-secondary rounded-circle p-1"
                style={{ width: '28px', height: '28px' }}
                onClick={handleDismiss}
                title="Đóng"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 1070 }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div className="modal-dialog modal-dialog-centered px-3" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom py-3">
                <h6 className="modal-title fw-bold d-flex align-items-center gap-2 text-primary">
                  <FaMobileAlt /> Cài Đặt QuizMaster Trên iPhone / iPad
                </h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowIOSGuide(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="small text-secondary mb-3">
                  Để trải nghiệm ứng dụng toàn màn hình không có thanh địa chỉ Safari:
                </p>

                <div className="d-flex align-items-start gap-3 mb-3 p-3 bg-light rounded-3">
                  <span className="badge bg-primary rounded-circle p-2 fs-6">1</span>
                  <div>
                    <strong className="d-block text-dark small">Nhấn nút Chia Sẻ trên Safari:</strong>
                    <span className="text-secondary small d-flex align-items-center gap-1 mt-1">
                      Chạm vào biểu tượng <FaShareSquare className="text-primary" /> ở thanh công cụ dưới cùng Safari.
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3 mb-3 p-3 bg-light rounded-3">
                  <span className="badge bg-primary rounded-circle p-2 fs-6">2</span>
                  <div>
                    <strong className="d-block text-dark small">Chọn Thêm Vào Màn Hình Chính:</strong>
                    <span className="text-secondary small d-flex align-items-center gap-1 mt-1">
                      Cuộn xuống menu và chọn <FaPlusSquare className="text-primary" /> <strong>"Thêm vào MH chính"</strong> (Add to Home Screen).
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3">
                  <span className="badge bg-primary rounded-circle p-2 fs-6">3</span>
                  <div>
                    <strong className="d-block text-dark small">Nhấn "Thêm" (Add):</strong>
                    <span className="text-secondary small mt-1 d-block">
                      Nhấn nút <strong>Thêm</strong> ở góc trên bên phải để hoàn tất. Biểu tượng QuizMaster sẽ xuất hiện ngay trên màn hình chính!
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top py-2">
                <button
                  type="button"
                  className="btn btn-primary-custom w-100 fw-bold"
                  onClick={() => setShowIOSGuide(false)}
                >
                  Tôi Đã Hiểu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

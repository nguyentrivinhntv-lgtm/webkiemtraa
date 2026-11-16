import { useState, useEffect } from 'react';
import {
  FaDownload, FaTimes, FaWifi, FaMobileAlt, FaShareSquare,
  FaPlusSquare, FaEllipsisV, FaCheckCircle, FaExclamationTriangle,
  FaAndroid, FaApple
} from 'react-icons/fa';
import { toast } from 'react-toastify';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState('android'); // 'android', 'ios', 'inapp'

  // Device & Browser detection
  const ua = (typeof window !== 'undefined' && window.navigator.userAgent) ? window.navigator.userAgent.toLowerCase() : '';
  const isIOSDevice = /iphone|ipad|ipod/.test(ua);
  const isInAppBrowser = /zalo|fbav|fban|messenger|instagram|line|micromessenger|tiktok/.test(ua);
  const isAndroidDevice = /android/.test(ua);

  useEffect(() => {
    // Check standalone mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standaloneMode);

    // Initial tab based on detected device
    if (isInAppBrowser) {
      setActiveTab('inapp');
    } else if (isIOSDevice) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }

    // Check dismissed in localStorage (within 12 hours)
    const lastDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < 12 * 60 * 60 * 1000) {
      setDismissed(true);
    }

    // Listen to install prompt on Chromium / Android / Desktop
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto show banner if not standalone and not dismissed
      setDismissed(false);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowGuideModal(false);
      toast.success('🎉 Cài đặt QuizMaster thành công! Bạn có thể mở từ màn hình chính.');
    });

    // Custom trigger from Navbar or any button
    const handleOpenInstall = () => {
      if (standaloneMode) {
        toast.info('🎉 Bạn đang sử dụng ứng dụng QuizMaster trên màn hình chính rồi!');
        return;
      }

      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(({ outcome }) => {
          if (outcome !== 'accepted') {
            setShowGuideModal(true);
          }
          setDeferredPrompt(null);
        }).catch(() => {
          setShowGuideModal(true);
        });
      } else {
        // If browser prompt is not ready or unsupported, ALWAYS show guide modal!
        setShowGuideModal(true);
      }
    };

    window.addEventListener('open-pwa-install', handleOpenInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('open-pwa-install', handleOpenInstall);
    };
  }, [isInAppBrowser, isIOSDevice]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        } else {
          setShowGuideModal(true);
        }
      }).catch(() => {
        setShowGuideModal(true);
      });
    } else {
      setShowGuideModal(true);
    }
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
          <span>Bạn đang ngoại tuyến (Offline). Bạn vẫn có thể mở và ôn tập các đề thi đã tải trước đó!</span>
        </div>
      )}

      {/* Install App Floating Banner (Only when not standalone & not dismissed) */}
      {!isStandalone && !dismissed && (
        <div
          className="pwa-install-banner shadow-lg border rounded-3 p-3 mx-2 my-2 animate__animated animate__fadeInUp"
          style={{
            position: 'fixed',
            bottom: '68px',
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
                  width: '42px',
                  height: '42px',
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
                  Thêm vào màn hình chính để mở nhanh & làm bài thi toàn màn hình!
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

      {/* Detailed Install Guide Modal for ALL Platforms */}
      {showGuideModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1070 }}
          onClick={() => setShowGuideModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered px-3" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom py-3">
                <h6 className="modal-title fw-bold d-flex align-items-center gap-2 text-primary">
                  <FaMobileAlt /> Hướng Dẫn Cài Đặt QuizMaster Ra Màn Hình
                </h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowGuideModal(false)}
                ></button>
              </div>

              {/* Platform Tabs */}
              <div className="border-bottom bg-light p-2 d-flex gap-1">
                {isInAppBrowser && (
                  <button
                    type="button"
                    className={`btn btn-sm flex-fill fw-bold py-1 ${activeTab === 'inapp' ? 'btn-danger text-white' : 'btn-outline-secondary bg-white'}`}
                    onClick={() => setActiveTab('inapp')}
                    style={{ fontSize: '0.78rem' }}
                  >
                    ⚠️ Mở từ Zalo/FB
                  </button>
                )}
                <button
                  type="button"
                  className={`btn btn-sm flex-fill fw-bold py-1 d-flex align-items-center justify-content-center gap-1 ${activeTab === 'android' ? 'btn-primary' : 'btn-outline-secondary bg-white'}`}
                  onClick={() => setActiveTab('android')}
                  style={{ fontSize: '0.78rem' }}
                >
                  <FaAndroid /> Android / Chrome
                </button>
                <button
                  type="button"
                  className={`btn btn-sm flex-fill fw-bold py-1 d-flex align-items-center justify-content-center gap-1 ${activeTab === 'ios' ? 'btn-primary' : 'btn-outline-secondary bg-white'}`}
                  onClick={() => setActiveTab('ios')}
                  style={{ fontSize: '0.78rem' }}
                >
                  <FaApple /> iPhone / iPad
                </button>
              </div>

              <div className="modal-body p-3 p-md-4">
                {/* TAB 1: IN-APP BROWSER (Zalo / Facebook / Messenger) */}
                {activeTab === 'inapp' && (
                  <div>
                    <div className="alert alert-warning py-2 px-3 small mb-3 border-warning">
                      <strong className="d-flex align-items-center gap-1">
                        <FaExclamationTriangle /> Bạn đang mở link bên trong Zalo / Facebook!
                      </strong>
                      Trình duyệt nội bộ của Zalo/Facebook không cho phép cài đặt app trực tiếp. Hãy làm 2 bước sau:
                    </div>

                    <div className="d-flex align-items-start gap-3 mb-3 p-3 bg-light rounded-3">
                      <span className="badge bg-danger rounded-circle p-2 fs-6">1</span>
                      <div>
                        <strong className="d-block text-dark small">Bấm vào dấu 3 chấm (...) ở góc trên:</strong>
                        <span className="text-secondary small mt-1 d-block">
                          Nhìn lên <strong>góc trên cùng bên phải</strong> màn hình Zalo/Facebook, chạm vào biểu tượng <strong>dấu 3 chấm `...`</strong>.
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3">
                      <span className="badge bg-danger rounded-circle p-2 fs-6">2</span>
                      <div>
                        <strong className="d-block text-dark small">Chọn "Mở bằng trình duyệt":</strong>
                        <span className="text-secondary small mt-1 d-block">
                          Chọn <strong>"Mở bằng trình duyệt"</strong> (Chrome trên Android hoặc Safari trên iPhone) để tiến hành cài đặt ứng dụng.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ANDROID (Chrome / Cốc Cốc / Samsung Internet) */}
                {activeTab === 'android' && (
                  <div>
                    <p className="small text-secondary mb-3">
                      Cài đặt ứng dụng trên điện thoại Android (Samsung, Oppo, Xiaomi, Vivo...):
                    </p>

                    <div className="d-flex align-items-start gap-3 mb-3 p-3 bg-light rounded-3">
                      <span className="badge bg-primary rounded-circle p-2 fs-6">1</span>
                      <div>
                        <strong className="d-block text-dark small">Chạm vào nút 3 chấm ở góc trên:</strong>
                        <span className="text-secondary small d-flex align-items-center gap-1 mt-1">
                          Nhấn biểu tượng <FaEllipsisV className="text-primary" /> ở <strong>góc trên bên phải</strong> trình duyệt Chrome.
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 mb-3 p-3 bg-light rounded-3">
                      <span className="badge bg-primary rounded-circle p-2 fs-6">2</span>
                      <div>
                        <strong className="d-block text-dark small">Chọn Cài đặt ứng dụng / Thêm vào MH chính:</strong>
                        <span className="text-secondary small d-flex align-items-center gap-1 mt-1">
                          Cuộn menu xuống và bấm vào dòng <FaDownload className="text-success" /> <strong>"Cài đặt ứng dụng"</strong> (hoặc <strong>"Thêm vào Màn hình chính"</strong>).
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3">
                      <span className="badge bg-primary rounded-circle p-2 fs-6">3</span>
                      <div>
                        <strong className="d-block text-dark small">Xác nhận "Cài đặt":</strong>
                        <span className="text-secondary small mt-1 d-block">
                          Nhấn <strong>"Cài đặt"</strong> trong hộp thoại xác nhận. Biểu tượng QuizMaster sẽ xuất hiện ngay ngoài màn hình điện thoại như một app thật!
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: iOS (iPhone / iPad Safari) */}
                {activeTab === 'ios' && (
                  <div>
                    <p className="small text-secondary mb-3">
                      Cài đặt ứng dụng trên iPhone / iPad bằng trình duyệt <strong>Safari</strong>:
                    </p>

                    <div className="d-flex align-items-start gap-3 mb-3 p-3 bg-light rounded-3">
                      <span className="badge bg-primary rounded-circle p-2 fs-6">1</span>
                      <div>
                        <strong className="d-block text-dark small">Nhấn nút Chia Sẻ trên Safari:</strong>
                        <span className="text-secondary small d-flex align-items-center gap-1 mt-1">
                          Chạm vào biểu tượng Chia sẻ <FaShareSquare className="text-primary" /> ở thanh công cụ <strong>dưới cùng</strong> màn hình Safari.
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 mb-3 p-3 bg-light rounded-3">
                      <span className="badge bg-primary rounded-circle p-2 fs-6">2</span>
                      <div>
                        <strong className="d-block text-dark small">Chọn "Thêm vào MH chính":</strong>
                        <span className="text-secondary small d-flex align-items-center gap-1 mt-1">
                          Cuộn xuống dưới và chọn dòng có biểu tượng <FaPlusSquare className="text-primary" /> <strong>"Thêm vào MH chính"</strong> (Add to Home Screen).
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3">
                      <span className="badge bg-primary rounded-circle p-2 fs-6">3</span>
                      <div>
                        <strong className="d-block text-dark small">Nhấn "Thêm" (Add):</strong>
                        <span className="text-secondary small mt-1 d-block">
                          Nhấn nút <strong>"Thêm"</strong> ở góc trên bên phải màn hình. Xong! Ứng dụng QuizMaster sẽ nằm trên màn hình chính của bạn.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top py-2">
                <button
                  type="button"
                  className="btn btn-primary-custom w-100 fw-bold"
                  onClick={() => setShowGuideModal(false)}
                >
                  <FaCheckCircle className="me-1" /> Tôi Đã Hiểu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

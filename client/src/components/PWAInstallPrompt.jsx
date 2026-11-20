import { useState, useEffect, useCallback } from 'react';
import {
  FaDownload, FaTimes, FaWifi, FaMobileAlt, FaShareSquare,
  FaPlusSquare, FaEllipsisV, FaCheckCircle, FaExclamationTriangle,
  FaAndroid, FaApple, FaArrowUp, FaSafari
} from 'react-icons/fa';
import { toast } from 'react-toastify';

// ─── Utility: Device & Browser detection ───
function detectDevice() {
  if (typeof window === 'undefined') return { isIOS: false, isIPad: false, isAndroid: false, isInApp: false, isSafari: false };
  const ua = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform || '';
  const maxTouch = window.navigator.maxTouchPoints || 0;

  const isIPhone = /iphone|ipod/.test(ua);
  const isIPadUA = /ipad/.test(ua);
  // iPadOS 13+ identifies as Mac desktop but has touch
  const isIPadOS = platform === 'MacIntel' && maxTouch > 1 && !/iphone/.test(ua);
  const isIPad = isIPadUA || isIPadOS;
  const isIOS = isIPhone || isIPad;

  const isAndroid = /android/.test(ua);
  const isInApp = /zalo|fbav|fban|messenger|instagram|line|micromessenger|tiktok/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios|opios/.test(ua);

  return { isIOS, isIPad, isIPhone, isAndroid, isInApp, isSafari };
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [dismissed, setDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState('android');
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [iosBannerStep, setIosBannerStep] = useState(0); // 0 = compact, 1 = expanded

  const device = detectDevice();

  useEffect(() => {
    const standalone = isStandaloneMode();
    setIsStandalone(standalone);

    // Set initial tab & iOS banner
    if (device.isInApp) {
      setActiveTab('inapp');
    } else if (device.isIOS) {
      setActiveTab('ios');
      // Show iOS banner automatically if on Safari & not standalone & not dismissed
      if (!standalone) {
        const lastDismissed = localStorage.getItem('pwa_ios_banner_dismissed');
        if (!lastDismissed || Date.now() - parseInt(lastDismissed) > 24 * 60 * 60 * 1000) {
          // Delay slightly for a nicer entrance
          setTimeout(() => setShowIOSBanner(true), 1500);
        }
      }
    } else {
      setActiveTab('android');
    }

    // Check general dismiss in localStorage (12 hours)
    const lastDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < 12 * 60 * 60 * 1000) {
      setDismissed(true);
    }

    // Listen to install prompt on Chromium
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
      setShowIOSBanner(false);
      toast.success('🎉 Cài đặt QuizMaster thành công! Bạn có thể mở từ màn hình chính.');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Custom event to open install guide from anywhere (Navbar, etc.)
  useEffect(() => {
    const handleOpenInstall = () => {
      if (isStandalone) {
        toast.info('🎉 Bạn đang sử dụng ứng dụng QuizMaster trên màn hình chính rồi!');
        return;
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(({ outcome }) => {
          if (outcome !== 'accepted') setShowGuideModal(true);
          setDeferredPrompt(null);
        }).catch(() => setShowGuideModal(true));
      } else {
        setShowGuideModal(true);
      }
    };
    window.addEventListener('open-pwa-install', handleOpenInstall);
    return () => window.removeEventListener('open-pwa-install', handleOpenInstall);
  }, [isStandalone, deferredPrompt]);

  const handleInstallClick = useCallback(() => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') setDeferredPrompt(null);
        else setShowGuideModal(true);
      }).catch(() => setShowGuideModal(true));
    } else {
      setShowGuideModal(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  const handleIOSBannerDismiss = () => {
    setShowIOSBanner(false);
    localStorage.setItem('pwa_ios_banner_dismissed', Date.now().toString());
  };

  // ─── RENDER ───
  return (
    <>
      {/* ══════════════════════ Offline Warning Bar ══════════════════════ */}
      {!isOnline && (
        <div
          className="bg-warning text-dark px-3 py-2 text-center small fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm border-bottom border-warning"
          style={{ position: 'sticky', top: 0, zIndex: 1060 }}
        >
          <FaWifi className="opacity-75" />
          <span>Bạn đang ngoại tuyến (Offline). Bạn vẫn có thể mở và ôn tập các đề thi đã tải trước đó!</span>
        </div>
      )}

      {/* ══════════════════════ iOS Safari — Dedicated Smart Banner ══════════════════════ */}
      {device.isIOS && !device.isInApp && showIOSBanner && !isStandalone && (
        <div
          className="animate__animated animate__fadeInUp"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1055,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, #ffffff 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid #e2e8f0',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
            paddingBottom: 'env(safe-area-inset-bottom, 12px)',
          }}
        >
          {/* Compact mode — single row CTA */}
          {iosBannerStep === 0 && (
            <div className="px-3 py-3">
              <div className="d-flex align-items-center gap-3">
                {/* App icon */}
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center text-white flex-shrink-0"
                  style={{
                    width: 48, height: 48,
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    borderRadius: '12px',
                  }}
                >
                  <FaGraduationCapIcon />
                </div>

                {/* Text */}
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                    📲 Thêm QuizMaster vào MH chính
                  </div>
                  <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                    Mở nhanh như app thật trên {device.isIPad ? 'iPad' : 'iPhone'} của bạn!
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  className="btn btn-sm fw-bold text-white flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '6px 16px',
                    fontSize: '0.82rem',
                  }}
                  onClick={() => setIosBannerStep(1)}
                >
                  Hướng dẫn
                </button>

                {/* Close */}
                <button
                  type="button"
                  className="btn btn-sm text-secondary p-0 flex-shrink-0"
                  onClick={handleIOSBannerDismiss}
                  style={{ width: 28, height: 28, lineHeight: '28px' }}
                  aria-label="Đóng"
                >
                  <FaTimes size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Expanded mode — step-by-step visual guide */}
          {iosBannerStep === 1 && (
            <div className="px-3 pt-3 pb-2">
              {/* Header */}
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: '#0284c7', fontSize: '0.95rem' }}>
                  <FaApple /> Cài QuizMaster lên {device.isIPad ? 'iPad' : 'iPhone'}
                </h6>
                <button
                  type="button"
                  className="btn btn-sm text-secondary p-0"
                  onClick={handleIOSBannerDismiss}
                  aria-label="Đóng"
                >
                  <FaTimes size={16} />
                </button>
              </div>

              {/* Visual Steps — 3 large icon cards */}
              <div className="d-flex gap-2 mb-3">
                {/* Step 1 */}
                <div className="flex-fill text-center p-2 rounded-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="mb-1">
                    <span style={{ fontSize: '1.6rem' }}>
                      <FaShareSquare style={{ color: '#0284c7' }} />
                    </span>
                  </div>
                  <div className="fw-bold" style={{ fontSize: '0.72rem', color: '#0369a1' }}>
                    1. Nhấn <span style={{ fontSize: '1rem' }}>⎋</span>
                  </div>
                  <div className="text-secondary" style={{ fontSize: '0.68rem' }}>
                    Nút Chia sẻ ở {device.isIPad ? 'trên cùng' : 'dưới cùng'}
                  </div>
                </div>

                {/* Arrow */}
                <div className="d-flex align-items-center text-secondary" style={{ fontSize: '1.2rem' }}>→</div>

                {/* Step 2 */}
                <div className="flex-fill text-center p-2 rounded-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="mb-1">
                    <span style={{ fontSize: '1.6rem' }}>
                      <FaPlusSquare style={{ color: '#0284c7' }} />
                    </span>
                  </div>
                  <div className="fw-bold" style={{ fontSize: '0.72rem', color: '#0369a1' }}>
                    2. &quot;Thêm vào MH chính&quot;
                  </div>
                  <div className="text-secondary" style={{ fontSize: '0.68rem' }}>
                    Cuộn menu, chọn dòng này
                  </div>
                </div>

                {/* Arrow */}
                <div className="d-flex align-items-center text-secondary" style={{ fontSize: '1.2rem' }}>→</div>

                {/* Step 3 */}
                <div className="flex-fill text-center p-2 rounded-3" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                  <div className="mb-1">
                    <span style={{ fontSize: '1.6rem' }}>
                      <FaCheckCircle style={{ color: '#059669' }} />
                    </span>
                  </div>
                  <div className="fw-bold" style={{ fontSize: '0.72rem', color: '#059669' }}>
                    3. Nhấn &quot;Thêm&quot;
                  </div>
                  <div className="text-secondary" style={{ fontSize: '0.68rem' }}>
                    Xong! App trên MH chính
                  </div>
                </div>
              </div>

              {/* Pointing arrow to Safari share button */}
              <div
                className="text-center py-2 rounded-3 d-flex align-items-center justify-content-center gap-2"
                style={{ background: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.78rem', color: '#92400e' }}
              >
                <FaArrowUp className="animate__animated animate__bounce animate__infinite" />
                <span>
                  <strong>Lưu ý:</strong> Phải mở bằng <strong>Safari</strong> (không phải Chrome/Firefox trên iOS)
                </span>
              </div>

              {/* Got it button */}
              <button
                type="button"
                className="btn w-100 fw-bold mt-2 text-white"
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.88rem',
                }}
                onClick={handleIOSBannerDismiss}
              >
                <FaCheckCircle className="me-1" /> Tôi Đã Hiểu
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ In-App Browser Warning (Zalo/FB on iOS) ══════════════════════ */}
      {device.isInApp && !isStandalone && !dismissed && (
        <div
          className="animate__animated animate__fadeInUp shadow-lg"
          style={{
            position: 'fixed',
            bottom: '68px',
            left: 8, right: 8,
            maxWidth: 520,
            margin: '0 auto',
            zIndex: 1050,
            background: '#fff',
            borderRadius: '16px',
            border: '2px solid #f59e0b',
            overflow: 'hidden',
          }}
        >
          <div className="p-3">
            <div className="d-flex align-items-start gap-2 mb-2">
              <FaExclamationTriangle className="text-warning mt-1 flex-shrink-0" size={18} />
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                  Bạn đang mở trong Zalo / Facebook
                </div>
                <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                  Trình duyệt nội bộ không hỗ trợ cài app. Hãy mở bằng {device.isIOS ? 'Safari' : 'Chrome'}:
                </div>
              </div>
              <button type="button" className="btn btn-sm text-secondary p-0 flex-shrink-0 ms-auto" onClick={handleDismiss}>
                <FaTimes size={14} />
              </button>
            </div>

            <div className="d-flex gap-2">
              <div className="flex-fill p-2 rounded-3 text-center" style={{ background: '#fef3c7' }}>
                <div style={{ fontSize: '1.4rem' }}>⋯</div>
                <div className="fw-bold" style={{ fontSize: '0.72rem', color: '#92400e' }}>1. Nhấn dấu ⋯</div>
                <div className="text-secondary" style={{ fontSize: '0.65rem' }}>Góc trên bên phải</div>
              </div>
              <div className="d-flex align-items-center text-secondary">→</div>
              <div className="flex-fill p-2 rounded-3 text-center" style={{ background: '#ecfdf5' }}>
                <div style={{ fontSize: '1.4rem' }}>{device.isIOS ? '🧭' : '🌐'}</div>
                <div className="fw-bold" style={{ fontSize: '0.72rem', color: '#059669' }}>
                  2. &quot;Mở bằng {device.isIOS ? 'Safari' : 'Chrome'}&quot;
                </div>
                <div className="text-secondary" style={{ fontSize: '0.65rem' }}>Rồi cài từ đó</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ Android / Desktop Floating Banner ══════════════════════ */}
      {!device.isIOS && !device.isInApp && !isStandalone && !dismissed && (
        <div
          className="pwa-install-banner shadow-lg border rounded-3 p-3 mx-2 my-2 animate__animated animate__fadeInUp"
          style={{
            position: 'fixed',
            bottom: '68px',
            left: 0, right: 0,
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
                  width: '42px', height: '42px',
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

      {/* ══════════════════════ Detailed Install Guide Modal ══════════════════════ */}
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
                <button type="button" className="btn-close" onClick={() => setShowGuideModal(false)}></button>
              </div>

              {/* Platform Tabs */}
              <div className="border-bottom bg-light p-2 d-flex gap-1">
                {device.isInApp && (
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
                {/* TAB: IN-APP BROWSER */}
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
                        <strong className="d-block text-dark small">Chọn &quot;Mở bằng trình duyệt&quot;:</strong>
                        <span className="text-secondary small mt-1 d-block">
                          Chọn <strong>&quot;Mở bằng trình duyệt&quot;</strong> ({device.isIOS ? 'Safari trên iPhone/iPad' : 'Chrome trên Android'}) để tiến hành cài đặt ứng dụng.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: ANDROID */}
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
                          Cuộn menu xuống và bấm vào dòng <FaDownload className="text-success" /> <strong>&quot;Cài đặt ứng dụng&quot;</strong> (hoặc <strong>&quot;Thêm vào Màn hình chính&quot;</strong>).
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3">
                      <span className="badge bg-primary rounded-circle p-2 fs-6">3</span>
                      <div>
                        <strong className="d-block text-dark small">Xác nhận &quot;Cài đặt&quot;:</strong>
                        <span className="text-secondary small mt-1 d-block">
                          Nhấn <strong>&quot;Cài đặt&quot;</strong> trong hộp thoại xác nhận. Biểu tượng QuizMaster sẽ xuất hiện ngay ngoài màn hình điện thoại như một app thật!
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: iOS */}
                {activeTab === 'ios' && (
                  <div>
                    <div
                      className="alert py-2 px-3 small mb-3"
                      style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1' }}
                    >
                      <strong className="d-flex align-items-center gap-1 mb-1">
                        <FaApple /> Yêu cầu: Mở bằng trình duyệt Safari
                      </strong>
                      <span style={{ fontSize: '0.78rem' }}>
                        iPhone / iPad chỉ hỗ trợ cài app từ <strong>Safari</strong>. Nếu bạn đang dùng Chrome/Firefox trên iOS, hãy copy link và mở lại bằng Safari.
                      </span>
                    </div>

                    <div className="d-flex align-items-start gap-3 mb-3 p-3 rounded-3" style={{ background: '#f0f9ff' }}>
                      <span className="badge rounded-circle p-2 fs-6" style={{ background: '#0284c7' }}>1</span>
                      <div>
                        <strong className="d-block text-dark small">Nhấn nút Chia Sẻ <span style={{ fontSize: '1.1rem' }}>⎋</span> trên Safari:</strong>
                        <span className="text-secondary small d-flex align-items-center gap-1 mt-1">
                          Chạm vào biểu tượng Chia sẻ <FaShareSquare style={{ color: '#0284c7' }} /> ở thanh công cụ <strong>{device.isIPad ? 'trên cùng' : 'dưới cùng'}</strong> màn hình Safari.
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 mb-3 p-3 rounded-3" style={{ background: '#f0f9ff' }}>
                      <span className="badge rounded-circle p-2 fs-6" style={{ background: '#0284c7' }}>2</span>
                      <div>
                        <strong className="d-block text-dark small">Cuộn xuống, chọn <FaPlusSquare style={{ color: '#0284c7' }} /> &quot;Thêm vào MH chính&quot;:</strong>
                        <span className="text-secondary small mt-1 d-block">
                          Trong bảng Chia sẻ, cuộn xuống tìm dòng <strong>&quot;Thêm vào Màn hình chính&quot;</strong> (Add to Home Screen) rồi chạm vào.
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ background: '#ecfdf5' }}>
                      <span className="badge rounded-circle p-2 fs-6" style={{ background: '#059669' }}>3</span>
                      <div>
                        <strong className="d-block text-dark small">Nhấn &quot;Thêm&quot; (Add) ở góc trên bên phải:</strong>
                        <span className="text-secondary small mt-1 d-block">
                          Nhấn nút <strong>&quot;Thêm&quot;</strong>. Xong! 🎉 Biểu tượng QuizMaster sẽ nằm trên màn hình chính {device.isIPad ? 'iPad' : 'iPhone'} của bạn, mở lên như một app thật với toàn màn hình!
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

// Small helper component for the graduation cap icon in the iOS banner
function FaGraduationCapIcon() {
  return (
    <svg viewBox="0 0 640 512" fill="currentColor" width="24" height="24">
      <path d="M320 32L0 192l128 69.5V352c0 35.3 86 64 192 64s192-28.7 192-64V261.5l64-34.8V352h64V192L320 32zm192 243.2l-192 104-192-104V283l192 104 192-104v-7.8z"/>
    </svg>
  );
}

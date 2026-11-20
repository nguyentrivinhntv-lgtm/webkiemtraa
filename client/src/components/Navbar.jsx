import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaGraduationCap, FaHome, FaCog, FaBars, FaTimes,
  FaSun, FaMoon, FaUser, FaSignOutAlt, FaSignInAlt, FaUserCircle,
  FaStar, FaMobileAlt, FaBell, FaCheckCircle
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, isTeacherOrAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('read_notif_ids') || '[]');
    } catch {
      return [];
    }
  });

  const notifications = [
    {
      id: 'notif_spaced_rep',
      type: 'study',
      title: '🃏 Đến hạn ôn tập Flashcard (SM-2)',
      message: 'Các câu hỏi khó đang chờ bạn lật thẻ hôm nay để củng cố trí nhớ dài hạn!',
      link: '/bookmarks',
      time: 'Hôm nay'
    },
    {
      id: 'notif_speed_challenge',
      type: 'challenge',
      title: '⚡ Thử thách Tốc độ (Speed Quiz)',
      message: 'Rèn luyện phản xạ 15s/câu để nhận gấp đôi điểm kinh nghiệm (XP)!',
      link: '/leaderboard',
      time: 'Mới'
    },
    {
      id: 'notif_classroom',
      type: 'classroom',
      title: '🏫 Lớp học & Bài tập trực tuyến',
      message: 'Tham gia lớp học và kiểm tra danh sách đề thi giáo viên giao.',
      link: '/classroom',
      time: 'Nhắc nhở'
    }
  ];

  const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem('read_notif_ids', JSON.stringify(allIds));
  };

  const handleNotifClick = (notif) => {
    if (!readNotifIds.includes(notif.id)) {
      const updated = [...readNotifIds, notif.id];
      setReadNotifIds(updated);
      localStorage.setItem('read_notif_ids', JSON.stringify(updated));
    }
    setShowNotifications(false);
    navigate(notif.link);
  };

  const toggleMenu = () => setIsOpen(prev => !prev);
  const closeMenu = () => {
    setIsOpen(false);
    setShowNotifications(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate('/');
  };

  // Completely hide Navbar and bottom navigation bar during exam!
  if (location.pathname.startsWith('/quiz/')) {
    return null;
  }

  return (
    <>
      <nav className="navbar navbar-custom sticky-top">
        <div className="container d-flex justify-content-between align-items-center">
          {/* Brand */}
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/" onClick={closeMenu}>
            <FaGraduationCap size={28} />
            <span>QuizMaster</span>
          </Link>

          {/* Desktop Nav Items */}
          <div className="d-none d-md-flex align-items-center gap-2">
            <Link
              className={`nav-link-custom ${location.pathname === '/' ? 'active' : ''}`}
              to="/"
            >
              <FaHome /> Trang chủ
            </Link>

            <Link
              className={`nav-link-custom ${location.pathname === '/bookmarks' ? 'active' : ''}`}
              to="/bookmarks"
            >
              <FaStar className="text-warning" /> Đã lưu
            </Link>

            <Link
              className={`nav-link-custom ${location.pathname === '/leaderboard' ? 'active' : ''}`}
              to="/leaderboard"
            >
              🏆 Xếp hạng
            </Link>

            {isLoggedIn && (
              <Link
                className={`nav-link-custom ${location.pathname === '/dashboard' ? 'active' : ''}`}
                to="/dashboard"
              >
                📊 Thống kê
              </Link>
            )}

            {isLoggedIn && (
              <Link
                className={`nav-link-custom ${location.pathname === '/classroom' ? 'active' : ''}`}
                to="/classroom"
              >
                🏫 Lớp học
              </Link>
            )}

            {isTeacherOrAdmin && (
              <Link
                className={`nav-link-custom ${location.pathname === '/teacher' ? 'active' : ''}`}
                to="/teacher"
              >
                👨‍🏫 Bảng điểm
              </Link>
            )}

            <Link
              className={`nav-link-custom ${location.pathname === '/admin' ? 'active' : ''}`}
              to="/admin"
            >
              <FaCog /> Quản lý đề thi
            </Link>

            {/* Dark Mode Toggle */}
            <button
              className="btn btn-outline-light btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36 }}
              onClick={toggleTheme}
              title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {isDark ? <FaSun className="text-warning" /> : <FaMoon />}
            </button>

            {/* Notification Bell Button & Dropdown */}
            <div className="position-relative">
              <button
                className="btn btn-outline-light btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center position-relative"
                style={{ width: 36, height: 36 }}
                onClick={() => setShowNotifications(prev => !prev)}
                title="Thông báo học tập"
              >
                <FaBell />
                {unreadCount > 0 && (
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: '0.65rem' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifications && (
                <div
                  className="notification-dropdown shadow-lg rounded-3 border"
                  style={{
                    position: 'absolute',
                    top: '46px',
                    right: 0,
                    width: '320px',
                    maxWidth: 'calc(100vw - 32px)',
                    background: 'var(--bg-card, #ffffff)',
                    zIndex: 2500,
                    color: 'var(--text-primary, #0f172a)'
                  }}
                >
                  <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light rounded-top">
                    <div className="fw-bold d-flex align-items-center gap-1 small text-dark">
                      <FaBell className="text-primary" /> Thông Báo
                      {unreadCount > 0 && <span className="badge bg-danger rounded-pill">{unreadCount}</span>}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="btn btn-link text-primary p-0 small text-decoration-none"
                        style={{ fontSize: '0.75rem' }}
                        onClick={handleMarkAllRead}
                      >
                        Đọc tất cả
                      </button>
                    )}
                  </div>

                  <div className="p-2" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {notifications.map((notif) => {
                      const isRead = readNotifIds.includes(notif.id);
                      return (
                        <div
                          key={notif.id}
                          className={`p-2 rounded-2 mb-2 transition-all ${isRead ? 'bg-light opacity-75' : 'bg-primary bg-opacity-10 border border-primary border-opacity-25'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleNotifClick(notif)}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold small text-dark" style={{ fontSize: '0.82rem' }}>
                              {notif.title}
                            </span>
                            <span className="badge bg-secondary bg-opacity-25 text-secondary" style={{ fontSize: '0.68rem' }}>
                              {notif.time}
                            </span>
                          </div>
                          <p className="small text-secondary mb-0" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                            {notif.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User Auth Info */}
            {isLoggedIn ? (
              <div className="d-flex align-items-center gap-2 ms-2">
                <Link
                  to="/profile"
                  className="btn btn-light btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-2 text-dark text-decoration-none shadow-sm"
                >
                  <div
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold small"
                    style={{ width: 24, height: 24, fontSize: '0.75rem' }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="fw-semibold small text-truncate" style={{ maxWidth: 120 }}>
                    {user?.name}
                  </span>
                </Link>

                <button
                  className="btn btn-outline-light btn-sm p-2 rounded-circle"
                  style={{ width: 36, height: 36 }}
                  onClick={handleLogout}
                  title="Đăng xuất"
                >
                  <FaSignOutAlt />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn btn-light btn-sm rounded-pill px-3 py-1 ms-2 fw-semibold text-primary d-flex align-items-center gap-1 shadow-sm"
              >
                <FaSignInAlt /> Đăng nhập
              </Link>
            )}
          </div>

          {/* Mobile Right Controls: Dark Mode + Notification + Hamburger */}
          <div className="d-flex d-md-none align-items-center gap-2">
            <button
              className="btn btn-outline-light btn-sm rounded-circle p-1 d-flex align-items-center justify-content-center"
              style={{ width: 32, height: 32 }}
              onClick={toggleTheme}
            >
              {isDark ? <FaSun className="text-warning" size={14} /> : <FaMoon size={14} />}
            </button>

            <button
              className="btn btn-outline-light btn-sm rounded-circle p-1 d-flex align-items-center justify-content-center position-relative"
              style={{ width: 32, height: 32 }}
              onClick={() => setShowNotifications(prev => !prev)}
            >
              <FaBell size={14} />
              {unreadCount > 0 && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style={{ fontSize: '0.6rem', padding: '2px 4px' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <Link to="/profile" className="text-white text-decoration-none" onClick={closeMenu}>
                <div
                  className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center fw-bold small"
                  style={{ width: 30, height: 30, fontSize: '0.8rem' }}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </Link>
            ) : (
              <Link
                to="/login"
                className="btn btn-sm btn-light fw-bold px-2 py-1 text-primary small"
                onClick={closeMenu}
              >
                Đăng nhập
              </Link>
            )}

            <button
              className="btn btn-outline-light btn-sm border-0 px-2 py-1"
              type="button"
              onClick={toggleMenu}
              aria-label="Toggle navigation"
            >
              {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isOpen && (
          <div className="d-md-none mobile-nav-dropdown border-top border-white border-opacity-10 py-2 mt-2 w-100">
            <div className="container d-flex flex-column gap-1">
              <Link
                className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`}
                to="/"
                onClick={closeMenu}
              >
                <FaHome className="me-2" /> Trang chủ
              </Link>
              <Link
                className={`mobile-nav-link ${location.pathname === '/bookmarks' ? 'active' : ''}`}
                to="/bookmarks"
                onClick={closeMenu}
              >
                <FaStar className="me-2 text-warning" /> Câu hỏi đã đánh dấu
              </Link>
              <Link
                className={`mobile-nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}
                to="/leaderboard"
                onClick={closeMenu}
              >
                🏆 Bảng vinh danh & Xếp hạng
              </Link>
              {isLoggedIn && (
                <Link
                  className={`mobile-nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                  to="/dashboard"
                  onClick={closeMenu}
                >
                  📊 Tiến độ học tập cá nhân
                </Link>
              )}

              {isLoggedIn && (
                <Link
                  className={`mobile-nav-link ${location.pathname === '/classroom' ? 'active' : ''}`}
                  to="/classroom"
                  onClick={closeMenu}
                >
                  🏫 Lớp học & Nhiệm vụ
                </Link>
              )}

              {isTeacherOrAdmin && (
                <Link
                  className={`mobile-nav-link ${location.pathname === '/teacher' ? 'active' : ''}`}
                  to="/teacher"
                  onClick={closeMenu}
                >
                  👨‍🏫 Bảng điểm & Thống kê lớp
                </Link>
              )}

              <Link
                className={`mobile-nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
                to="/admin"
                onClick={closeMenu}
              >
                <FaCog className="me-2" /> Quản lý & Thêm đề thi
              </Link>

              <button
                type="button"
                className="mobile-nav-link border-0 bg-transparent text-start w-100 text-info fw-semibold"
                onClick={() => {
                  closeMenu();
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('open-pwa-install'));
                  }, 120);
                }}
              >
                <FaMobileAlt className="me-2" /> 📲 Cài đặt App ra màn hình
              </button>

              {isLoggedIn ? (
                <>
                  <Link
                    className={`mobile-nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
                    to="/profile"
                    onClick={closeMenu}
                  >
                    <FaUser className="me-2" /> Trang cá nhân ({user?.name})
                  </Link>
                  <button
                    className="mobile-nav-link text-danger border-0 bg-transparent text-start w-100"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className="me-2" /> Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  className="mobile-nav-link text-white fw-bold"
                  to="/login"
                  onClick={closeMenu}
                >
                  <FaSignInAlt className="me-2" /> Đăng nhập / Đăng ký
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <div className="mobile-bottom-nav d-flex d-md-none justify-content-around align-items-center">
        <Link
          to="/"
          className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <FaHome size={20} />
          <span>Trang chủ</span>
        </Link>
        <Link
          to="/bookmarks"
          className={`bottom-nav-item ${location.pathname === '/bookmarks' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <FaStar size={20} className="text-warning" />
          <span>Đã lưu</span>
        </Link>
        <Link
          to="/admin"
          className={`bottom-nav-item ${location.pathname === '/admin' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <FaCog size={20} />
          <span>Quản lý</span>
        </Link>
        <Link
          to={isLoggedIn ? "/profile" : "/login"}
          className={`bottom-nav-item ${location.pathname === '/profile' || location.pathname === '/login' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <FaUserCircle size={20} />
          <span>{isLoggedIn ? 'Tài khoản' : 'Đăng nhập'}</span>
        </Link>
      </div>
    </>
  );
}

export default Navbar;

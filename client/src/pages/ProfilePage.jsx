import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfileApi, changePasswordApi, getUserSubmissions, getUserBadgesApi } from '../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import {
  FaUser, FaEnvelope, FaLock, FaIdCard, FaChalkboardTeacher,
  FaUserGraduate, FaCalendarAlt, FaCheckCircle, FaClock, FaHistory,
  FaTrophy, FaMedal, FaStar, FaFire, FaBolt, FaCrown, FaShieldAlt
} from 'react-icons/fa';
import AiConfigCard from '../components/AiConfigCard';

export default function ProfilePage() {
  const { user, updateCurrentUser } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    studentId: user?.studentId || '',
    classRoom: user?.classRoom || ''
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [gamification, setGamification] = useState(null);
  const [loadingGamification, setLoadingGamification] = useState(true);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        studentId: user.studentId || '',
        classRoom: user.classRoom || ''
      });
      loadHistory();
      loadGamification();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const res = await getUserSubmissions();
      setSubmissions(res.data);
    } catch (err) {
      console.warn('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadGamification = async () => {
    try {
      const res = await getUserBadgesApi();
      setGamification(res.data);
    } catch (err) {
      console.warn('Error loading gamification:', err);
    } finally {
      setLoadingGamification(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateProfileApi(profileData);
      updateCurrentUser(res.data.user);
      toast.success('🎉 Cập nhật thông tin thành công!');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu mới nhập lại không khớp!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setSavingPassword(true);
    try {
      await changePasswordApi({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('🎉 Đổi mật khẩu thành công!');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}p ${secs}s`;
  };

  const xpPercent = gamification
    ? Math.min(100, Math.round(((gamification.currentLevelXP || 0) / (gamification.nextLevelXP || 150)) * 100))
    : 0;

  return (
    <div className="container py-4 pb-5">
      {/* Header Banner */}
      <div className="card-custom p-4 mb-4 border shadow-sm">
        <div className="d-flex flex-column flex-sm-row align-items-center gap-3">
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-3"
            style={{ width: 72, height: 72, flexShrink: 0 }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div className="text-center text-sm-start flex-1">
            <h4 className="fw-bold mb-1">{user?.name}</h4>
            <div className="d-flex flex-wrap justify-content-center justify-content-sm-start gap-2 align-items-center text-secondary small">
              <span><FaEnvelope className="me-1" />{user?.email}</span>
              <span className={`badge ${user?.role === 'teacher' ? 'bg-warning text-dark' : 'bg-primary'}`}>
                {user?.role === 'teacher' ? '👨‍🏫 Giáo viên' : '🎓 Sinh viên'}
              </span>
              {user?.studentId && <span className="badge bg-light text-dark border">MSSV: {user.studentId}</span>}
              {user?.classRoom && <span className="badge bg-light text-dark border">Lớp: {user.classRoom}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Gamification Level & XP Progress Banner */}
      <div className="card-custom p-4 mb-4 border shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, rgba(13, 148, 136, 0.08) 100%)' }}>
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-7">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge bg-primary text-white fs-6 px-3 py-1">
                ⭐ Cấp độ {gamification?.level || 1}
              </span>
              <h5 className="fw-bold mb-0 text-dark">
                {gamification?.levelTitle || 'Tập Sự Tri Thức'}
              </h5>
            </div>
            <p className="text-secondary small mb-3">
              Tích lũy XP qua các bài kiểm tra, ôn tập câu khó và hoàn thành thử thách để nâng cấp bậc học giả.
            </p>

            {/* Progress to next level */}
            <div className="d-flex justify-content-between small fw-bold mb-1">
              <span className="text-secondary">Tiến độ lên cấp:</span>
              <span className="text-primary">{gamification?.currentLevelXP || 0} / {gamification?.nextLevelXP || 150} XP ({xpPercent}%)</span>
            </div>
            <div className="progress" style={{ height: '8px' }}>
              <div
                className="progress-bar bg-primary"
                style={{ width: `${xpPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="col-12 col-md-5 d-flex flex-wrap justify-content-md-end gap-2">
            <div className="p-3 rounded-3 bg-white border text-center shadow-sm flex-1" style={{ minWidth: 120 }}>
              <span className="small text-secondary d-block fw-semibold" style={{ fontSize: '0.72rem' }}>TỔNG ĐIỂM XP</span>
              <strong className="fs-4 text-warning">🔥 {gamification?.totalXP || 0}</strong>
            </div>
            <div className="p-3 rounded-3 bg-white border text-center shadow-sm flex-1" style={{ minWidth: 120 }}>
              <span className="small text-secondary d-block fw-semibold" style={{ fontSize: '0.72rem' }}>HUY HIỆU</span>
              <strong className="fs-4 text-primary">🏅 {gamification?.totalBadgesUnlocked || 0}/{gamification?.totalBadgesCount || 8}</strong>
            </div>
            <Link to="/leaderboard" className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1 mt-1 fw-bold">
              <FaTrophy /> Bảng Vinh Danh Toàn Trường
            </Link>
          </div>
        </div>
      </div>

      {/* Badges Showcase Section */}
      <div className="card-custom p-4 mb-4 border shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="fw-bold mb-0 fs-6 d-flex align-items-center gap-2">
              <FaMedal className="text-warning" /> Bộ Sưu Tập Huy Hiệu ({gamification?.totalBadgesUnlocked || 0}/{gamification?.totalBadgesCount || 8})
            </h5>
            <span className="small text-secondary">
              Mở khóa các mốc thành tích và danh hiệu trong quá trình học tập
            </span>
          </div>
        </div>

        <div className="row g-3">
          {gamification?.badges?.map((badge) => (
            <div key={badge.id} className="col-6 col-sm-4 col-md-3">
              <div
                className={`p-3 rounded-3 border text-center h-100 d-flex flex-column justify-content-between transition-all ${
                  badge.unlocked
                    ? 'bg-white border-primary shadow-sm'
                    : 'bg-light bg-opacity-75 border-secondary border-opacity-25'
                }`}
                style={{ opacity: badge.unlocked ? 1 : 0.65 }}
              >
                <div>
                  <div className={`fs-1 mb-2 ${badge.unlocked ? '' : 'filter-grayscale'}`}>
                    {badge.icon}
                  </div>
                  <h6 className="fw-bold mb-1 small text-dark">{badge.name}</h6>
                  <p className="small text-secondary mb-2" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                    {badge.description}
                  </p>
                </div>

                <div>
                  {badge.unlocked ? (
                    <span className="badge bg-success bg-opacity-10 text-success border border-success w-100 py-1" style={{ fontSize: '0.72rem' }}>
                      ✓ Đã đạt (+{badge.xpReward} XP)
                    </span>
                  ) : (
                    <span className="badge bg-secondary bg-opacity-10 text-secondary border w-100 py-1" style={{ fontSize: '0.72rem' }}>
                      🔒 Chưa đạt (+{badge.xpReward} XP)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Edit profile & password */}
        <div className="col-lg-5">
          {/* Edit Profile */}
          <div className="card-custom p-4 mb-4 border">
            <h5 className="fw-bold mb-3 fs-6 d-flex align-items-center gap-2">
              <FaUser className="text-primary" /> Thông Tin Cá Nhân
            </h5>

            <form onSubmit={handleUpdateProfile}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">HỌ VÀ TÊN</label>
                <input
                  type="text"
                  className="form-control"
                  value={profileData.name}
                  onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                  required
                />
              </div>

              {user?.role === 'student' && (
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-secondary">MÃ SINH VIÊN</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profileData.studentId}
                      onChange={e => setProfileData({ ...profileData, studentId: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-secondary">LỚP HỌC</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profileData.classRoom}
                      onChange={e => setProfileData({ ...profileData, classRoom: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary-custom w-100 py-2 small fw-bold"
                disabled={savingProfile}
              >
                {savingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card-custom p-4 border">
            <h5 className="fw-bold mb-3 fs-6 d-flex align-items-center gap-2">
              <FaLock className="text-warning" /> Đổi Mật Khẩu
            </h5>

            <form onSubmit={handleChangePassword}>
              <div className="mb-2">
                <label className="form-label small fw-bold text-secondary">MẬT KHẨU HIỆN TẠI</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  value={passwordData.oldPassword}
                  onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  required
                />
              </div>

              <div className="mb-2">
                <label className="form-label small fw-bold text-secondary">MẬT KHẨU MỚI</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">NHẬP LẠI MẬT KHẨU MỚI</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  value={passwordData.confirmPassword}
                  onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-outline-secondary w-100 py-2 small fw-semibold"
                disabled={savingPassword}
              >
                {savingPassword ? 'Đang xử lý...' : 'Cập Nhật Mật Khẩu'}
              </button>
            </form>
          </div>

          {/* AI Gemini API Configuration Card */}
          <div className="mt-4">
            <AiConfigCard />
          </div>
        </div>

        {/* Right Column: Submission History */}
        <div className="col-lg-7">
          <div className="card-custom p-4 border h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 fs-6 d-flex align-items-center gap-2">
                <FaHistory className="text-primary" /> Lịch Sử Làm Bài Thi ({submissions.length})
              </h5>
              <span className="small text-secondary">Đã lưu tự động</span>
            </div>

            {loadingHistory ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary"></div>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-5 text-secondary">
                <p className="mb-2">Chưa có bài thi nào được hoàn thành.</p>
                <Link to="/" className="btn btn-primary-custom btn-sm">
                  Làm bài thi ngay
                </Link>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {submissions.map((sub, i) => {
                  const scoreNum = parseFloat(sub.score);
                  const isHigh = scoreNum >= 8.0;
                  const isPass = scoreNum >= 5.0;

                  return (
                    <div key={sub.id || i} className="p-3 rounded-3 border bg-light">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <h6 className="fw-bold mb-0 text-dark flex-1">{sub.quizTitle}</h6>
                        <span className={`badge fs-6 ${isHigh ? 'bg-success' : isPass ? 'bg-primary' : 'bg-danger'}`}>
                          {sub.score} / 10
                        </span>
                      </div>

                      <div className="d-flex flex-wrap gap-3 small text-secondary">
                        <span className="d-flex align-items-center gap-1">
                          <FaCheckCircle className="text-success" />
                          Đúng {sub.correctCount} / {sub.totalQuestions}
                        </span>
                        <span className="d-flex align-items-center gap-1">
                          <FaClock />
                          {formatTime(sub.timeSpent)}
                        </span>
                        <span className="d-flex align-items-center gap-1">
                          <FaCalendarAlt />
                          {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

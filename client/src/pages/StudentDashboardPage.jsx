import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaChartLine, FaCheckCircle, FaClock, FaBookOpen, FaTrophy,
  FaArrowLeft, FaHistory, FaCalendarAlt, FaStar, FaAward
} from 'react-icons/fa';
import { getUserSubmissions, getBookmarksApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function StudentDashboardPage() {
  const { user, isLoggedIn } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const loadData = async () => {
    try {
      const [subsRes, bmRes] = await Promise.all([
        getUserSubmissions(),
        getBookmarksApi()
      ]);
      setSubmissions(subsRes.data || []);
      setBookmarksCount(bmRes.data?.length || 0);
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (submissions.length === 0) {
      return { total: 0, avg: 0, passRate: 0, totalTime: 0, totalCorrect: 0, totalQuestions: 0 };
    }

    const scores = submissions.map(s => parseFloat(s.score) || 0);
    const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    const passed = scores.filter(s => s >= 5.0).length;
    const passRate = Math.round((passed / scores.length) * 100);
    const totalTime = submissions.reduce((a, b) => a + (b.timeSpent || 0), 0);
    const totalCorrect = submissions.reduce((a, b) => a + (b.correctCount || 0), 0);
    const totalQuestions = submissions.reduce((a, b) => a + (b.totalQuestions || 0), 0);

    return {
      total: submissions.length,
      avg,
      passRate,
      totalTime,
      totalCorrect,
      totalQuestions
    };
  }, [submissions]);

  const formatTime = (seconds) => {
    if (!seconds) return '0 phút';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} phút`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} giờ ${remMins} phút`;
  };

  if (!isLoggedIn) {
    return (
      <div className="container py-5 text-center">
        <div className="card-custom p-5 max-w-md mx-auto border">
          <FaChartLine size={48} className="text-primary mb-3" />
          <h4 className="fw-bold mb-2">Bảng Thống Kê Học Tập</h4>
          <p className="text-secondary mb-4">
            Đăng nhập để theo dõi tiến độ học tập, biểu đồ điểm số và lịch sử bài thi.
          </p>
          <Link to="/login" className="btn btn-primary-custom px-4 py-2">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-custom"></div>
      </div>
    );
  }

  return (
    <div className="container py-4 pb-5">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <Link to="/" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 mb-1">
            <FaArrowLeft /> Về trang chủ
          </Link>
          <h3 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <FaChartLine className="text-primary" /> Tiến Độ Học Tập: {user?.name}
          </h3>
          <p className="text-secondary small mb-0">
            Theo dõi sự tiến bộ, điểm số và các câu hỏi trọng tâm cần cải thiện
          </p>
        </div>

        <div className="d-flex gap-2">
          <Link to="/bookmarks" className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1 text-dark">
            <FaStar className="text-warning" /> Câu hỏi đã lưu ({bookmarksCount})
          </Link>
          <Link to="/" className="btn btn-primary-custom btn-sm">
            <FaBookOpen className="me-1" /> Làm bài thi mới
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card-custom p-3 border h-100">
            <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
              <FaAward className="text-primary" /> Bài thi đã nộp
            </span>
            <h3 className="fw-bold mb-0 text-dark">{stats.total}</h3>
            <span className="text-secondary small">lượt hoàn thành</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card-custom p-3 border h-100">
            <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
              <FaTrophy className="text-warning" /> Điểm trung bình
            </span>
            <h3 className="fw-bold mb-0 text-primary">{stats.avg} / 10</h3>
            <span className={`small ${stats.avg >= 7 ? 'text-success' : stats.avg >= 5 ? 'text-warning' : 'text-danger'}`}>
              {stats.avg >= 8 ? '🌟 Xuất sắc' : stats.avg >= 5 ? '👍 Đạt chuẩn' : '⚠️ Cần cố gắng'}
            </span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card-custom p-3 border h-100">
            <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
              <FaCheckCircle className="text-success" /> Tỷ lệ đỗ (≥ 5.0)
            </span>
            <h3 className="fw-bold mb-0 text-success">{stats.passRate}%</h3>
            <span className="text-secondary small">trên tổng số bài</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card-custom p-3 border h-100">
            <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
              <FaClock className="text-secondary" /> Tổng thời gian thi
            </span>
            <h3 className="fw-bold mb-0 text-dark">{formatTime(stats.totalTime)}</h3>
            <span className="text-secondary small">thời gian làm bài thực tế</span>
          </div>
        </div>
      </div>

      {/* Score Progress Chart (Visual CSS Bar Chart) */}
      <div className="card-custom p-4 mb-4 border shadow-sm">
        <h5 className="fw-bold mb-3 fs-6 d-flex align-items-center gap-2">
          <FaChartLine className="text-primary" /> Lịch Sử Điểm Số Các Lần Thi Gần Nhất
        </h5>

        {submissions.length === 0 ? (
          <div className="text-center py-4 text-secondary">
            Chưa có bài thi nào được thực hiện. Hãy vào trang chủ và bắt đầu làm bài!
          </div>
        ) : (
          <div>
            <div className="d-flex align-items-end gap-2 pt-4 pb-2 px-2 border-bottom" style={{ height: '200px', overflowX: 'auto' }}>
              {submissions.slice(-15).map((sub, i) => {
                const s = parseFloat(sub.score) || 0;
                const barHeight = Math.max(15, (s / 10) * 160);
                const isPass = s >= 5.0;

                return (
                  <div key={i} className="d-flex flex-column align-items-center flex-1" style={{ minWidth: '40px' }}>
                    <span className="small fw-bold mb-1" style={{ fontSize: '0.75rem' }}>
                      {s}
                    </span>
                    <div
                      className={`w-100 rounded-top ${isPass ? 'bg-primary' : 'bg-danger'}`}
                      style={{
                        height: `${barHeight}px`,
                        transition: 'height 0.4s ease',
                        opacity: 0.85
                      }}
                      title={`${sub.quizTitle}: ${s}/10 điểm`}
                    ></div>
                    <span className="text-secondary small mt-1 text-truncate" style={{ fontSize: '0.65rem', maxWidth: '40px' }}>
                      Lần {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="d-flex justify-content-between small text-secondary mt-2">
              <span>Đầu tiên</span>
              <span>Gần đây nhất →</span>
            </div>
          </div>
        )}
      </div>

      {/* Submissions Detail List */}
      <div className="card-custom p-4 border shadow-sm">
        <h5 className="fw-bold mb-3 fs-6 d-flex align-items-center gap-2">
          <FaHistory className="text-primary" /> Danh Sách Bài Thi Đã Làm ({submissions.length})
        </h5>

        {submissions.length === 0 ? (
          <div className="text-center py-4 text-secondary">
            Chưa có lịch sử làm bài.
          </div>
        ) : (
          <div className="d-flex flex-column gap-2" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            {submissions.map((sub, i) => (
              <div key={sub.id || i} className="p-3 rounded-3 border bg-light d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                <div className="flex-1">
                  <h6 className="fw-bold text-dark mb-1">{sub.quizTitle}</h6>
                  <div className="d-flex flex-wrap gap-3 small text-secondary">
                    <span><FaCheckCircle className="text-success me-1" />{sub.correctCount} / {sub.totalQuestions} câu</span>
                    <span><FaClock className="me-1" />{Math.floor((sub.timeSpent || 0) / 60)} phút</span>
                    <span><FaCalendarAlt className="me-1" />{new Date(sub.submittedAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className={`badge fs-6 px-3 py-2 ${parseFloat(sub.score) >= 7 ? 'bg-success' : parseFloat(sub.score) >= 5 ? 'bg-primary' : 'bg-danger'}`}>
                    {sub.score} / 10
                  </span>
                  <Link to={`/review/${sub.quizId}`} className="btn btn-sm btn-outline-primary">
                    Ôn lại
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

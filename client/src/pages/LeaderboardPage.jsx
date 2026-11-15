import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaTrophy, FaMedal, FaCrown, FaClock, FaCheckCircle,
  FaArrowLeft, FaFilter, FaUser, FaPlay, FaFire, FaCalendarAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getLeaderboardApi, getQuizList } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('all');
  const [timeframe, setTimeframe] = useState('all'); // 'all', 'week', 'today'
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [selectedQuizId, timeframe]);

  const loadQuizzes = async () => {
    try {
      const res = await getQuizList();
      setQuizzes(res.data || []);
    } catch (err) {
      console.warn('Error loading quizzes:', err);
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await getLeaderboardApi(selectedQuizId === 'all' ? null : selectedQuizId, timeframe);
      setLeaderboard(res.data || []);
    } catch (err) {
      toast.error('Lỗi tải bảng xếp hạng: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}p ${secs}s`;
  };

  return (
    <div className="container py-4 pb-5">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <Link to="/" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 mb-1">
            <FaArrowLeft /> Về trang chủ
          </Link>
          <h3 className="fw-bold mb-0 d-flex align-items-center gap-2">
            🏆 Bảng Vinh Danh & Xếp Hạng
          </h3>
          <p className="text-secondary small mb-0">
            Top những thí sinh có điểm số cao nhất và thời gian làm bài nhanh nhất
          </p>
        </div>

        {/* Filter controls */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Timeframe tabs */}
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${timeframe === 'all' ? 'btn-primary' : 'btn-outline-secondary'} fw-semibold`}
              onClick={() => setTimeframe('all')}
            >
              🏆 Mọi lúc
            </button>
            <button
              type="button"
              className={`btn ${timeframe === 'week' ? 'btn-primary' : 'btn-outline-secondary'} fw-semibold`}
              onClick={() => setTimeframe('week')}
            >
              📅 Tuần này
            </button>
            <button
              type="button"
              className={`btn ${timeframe === 'today' ? 'btn-primary' : 'btn-outline-secondary'} fw-semibold`}
              onClick={() => setTimeframe('today')}
            >
              ⚡ Hôm nay
            </button>
          </div>

          {/* Filter by quiz */}
          <div className="d-flex align-items-center gap-1">
            <select
              className="form-select form-select-sm"
              value={selectedQuizId}
              onChange={e => setSelectedQuizId(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="all">Toàn bộ đề thi</option>
              {quizzes.map(q => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner-custom"></div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="card-custom p-5 text-center border">
          <div className="empty-icon">🏆</div>
          <h5 className="fw-bold mb-2">Chưa có ai ghi danh vào bảng xếp hạng!</h5>
          <p className="text-secondary mb-4">
            {timeframe !== 'all'
              ? `Chưa có lượt nộp bài nào trong khoảng thời gian này (${timeframe === 'today' ? 'hôm nay' : 'tuần này'}).`
              : 'Hãy là người đầu tiên hoàn thành bài thi với điểm số cao nhất để ghi tên lên bảng vàng!'}
          </p>
          <Link to="/" className="btn btn-primary-custom">
            Vào thi ngay
          </Link>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="row g-3 justify-content-center align-items-end mb-5 pt-3">
            {/* Top 2: Silver */}
            {top2 && (
              <div className="col-4 col-md-3 order-1">
                <div className="card-custom p-3 text-center border shadow-sm" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' }}>
                  <div className="mb-2">
                    <span className="fs-1">🥈</span>
                  </div>
                  <h6 className="fw-bold text-dark mb-1 text-truncate" title={top2.studentName}>
                    {top2.studentName}
                  </h6>
                  <span className="badge bg-secondary mb-2">{top2.score} điểm</span>
                  <div className="small text-secondary">
                    <FaClock className="me-1" />{formatTime(top2.timeSpent)}
                  </div>
                  <div className="small text-secondary mt-1 fw-bold">Hạng 2</div>
                </div>
              </div>
            )}

            {/* Top 1: Gold Crown */}
            {top1 && (
              <div className="col-4 col-md-4 order-0 order-md-1">
                <div
                  className="card-custom p-4 text-center border border-warning shadow-lg"
                  style={{
                    background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)',
                    transform: 'translateY(-12px)'
                  }}
                >
                  <div className="mb-2">
                    <FaCrown size={36} className="text-warning fa-bounce" />
                    <div className="fs-1 mt-1">🥇</div>
                  </div>
                  <h5 className="fw-bold text-dark mb-1 text-truncate" title={top1.studentName}>
                    {top1.studentName}
                  </h5>
                  <span className="badge bg-warning text-dark fs-6 px-3 py-1 mb-2 fw-bold">
                    {top1.score} / 10 Điểm
                  </span>
                  <div className="small text-dark fw-semibold">
                    <FaClock className="me-1" />{formatTime(top1.timeSpent)}
                  </div>
                  <div className="badge bg-danger mt-2">👑 Quán Quân</div>
                </div>
              </div>
            )}

            {/* Top 3: Bronze */}
            {top3 && (
              <div className="col-4 col-md-3 order-2">
                <div className="card-custom p-3 text-center border shadow-sm" style={{ background: 'linear-gradient(180deg, #fff7ed 0%, #fed7aa 100%)' }}>
                  <div className="mb-2">
                    <span className="fs-1">🥉</span>
                  </div>
                  <h6 className="fw-bold text-dark mb-1 text-truncate" title={top3.studentName}>
                    {top3.studentName}
                  </h6>
                  <span className="badge bg-dark bg-opacity-75 text-white mb-2">{top3.score} điểm</span>
                  <div className="small text-secondary">
                    <FaClock className="me-1" />{formatTime(top3.timeSpent)}
                  </div>
                  <div className="small text-secondary mt-1 fw-bold">Hạng 3</div>
                </div>
              </div>
            )}
          </div>

          {/* Full Leaderboard Table */}
          <div className="card-custom p-4 border shadow-sm">
            <h5 className="fw-bold mb-3 fs-6 d-flex align-items-center gap-2">
              <FaMedal className="text-warning" /> Danh Sách Xếp Hạng Chi Tiết ({leaderboard.length} thí sinh)
            </h5>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small">
                  <tr>
                    <th style={{ width: '80px' }}>Hạng</th>
                    <th>Thí Sinh</th>
                    <th>MSSV</th>
                    <th>Đề Thi</th>
                    <th>Điểm Số</th>
                    <th>Thời Gian</th>
                    <th>Ngày Thi</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item, idx) => {
                    const rank = idx + 1;
                    const isCurrentUser = user && (item.userId === user.id || item.studentName.includes(user.name));

                    return (
                      <tr key={item.id || idx} className={isCurrentUser ? 'table-warning fw-bold' : ''}>
                        <td>
                          {rank === 1 ? (
                            <span className="badge bg-warning text-dark px-2 py-1">🥇 1</span>
                          ) : rank === 2 ? (
                            <span className="badge bg-secondary text-white px-2 py-1">🥈 2</span>
                          ) : rank === 3 ? (
                            <span className="badge bg-danger bg-opacity-75 text-white px-2 py-1">🥉 3</span>
                          ) : (
                            <span className="fw-bold text-secondary ps-2">#{rank}</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <strong className="text-dark">{item.studentName}</strong>
                            {isCurrentUser && <span className="badge bg-primary small">Bạn</span>}
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {item.studentId || '-'}
                          </span>
                        </td>
                        <td className="small text-secondary text-truncate" style={{ maxWidth: '200px' }}>
                          {item.quizTitle}
                        </td>
                        <td>
                          <span className={`badge fs-6 ${item.score >= 8 ? 'bg-success' : item.score >= 5 ? 'bg-primary' : 'bg-danger'}`}>
                            {item.score}
                          </span>
                        </td>
                        <td className="small text-secondary">
                          <FaClock className="me-1" />{formatTime(item.timeSpent)}
                        </td>
                        <td className="small text-secondary">
                          {new Date(item.submittedAt).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

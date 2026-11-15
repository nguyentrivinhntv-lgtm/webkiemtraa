import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaChalkboardTeacher, FaFileExcel, FaUsers, FaChartBar,
  FaExclamationTriangle, FaDownload, FaArrowLeft, FaCheckCircle,
  FaSearch, FaFilter
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getTeacherOverviewApi, getQuizAnalyticsApi, exportQuizExcelApi } from '../services/api';

export default function TeacherDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (selectedQuizId) {
      loadQuizAnalytics(selectedQuizId);
    }
  }, [selectedQuizId]);

  const loadOverview = async () => {
    try {
      const res = await getTeacherOverviewApi();
      setOverview(res.data);
      if (res.data.quizzes?.length > 0) {
        setSelectedQuizId(res.data.quizzes[0].id);
      }
    } catch (err) {
      toast.error('Lỗi tải tổng quan giáo viên: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadQuizAnalytics = async (quizId) => {
    try {
      const res = await getQuizAnalyticsApi(quizId);
      setAnalytics(res.data);
    } catch (err) {
      console.warn('Analytics error:', err);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedQuizId) return;
    setExporting(true);
    try {
      const res = await exportQuizExcelApi(selectedQuizId);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BangDiem_${selectedQuizId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('🎉 Xuất file Excel thành công! Đã bắt đầu tải về.');
    } catch (err) {
      toast.error('Lỗi khi tải file Excel: ' + (err.response?.data?.error || err.message));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-custom"></div>
      </div>
    );
  }

  const filteredSubmissions = (analytics?.submissions || []).filter(s =>
    (s.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.studentId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container py-4 pb-5">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <Link to="/" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 mb-1">
            <FaArrowLeft /> Về trang chủ
          </Link>
          <h3 className="fw-bold mb-0 d-flex align-items-center gap-2">
            👨‍🏫 Bảng Điều Khiển Giáo Viên
          </h3>
          <p className="text-secondary small mb-0">
            Theo dõi thống kê lớp học, câu hỏi học sinh hay sai và xuất bảng điểm Excel
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-success d-flex align-items-center gap-2 shadow-sm"
            onClick={handleExportExcel}
            disabled={exporting || !selectedQuizId}
          >
            <FaFileExcel />
            {exporting ? 'Đang xuất Excel...' : 'Xuất Bảng Điểm (.xlsx)'}
          </button>
          <Link to="/admin" className="btn btn-outline-primary">
            + Thêm đề thi mới
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card-custom p-3 border h-100">
            <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
              📚 Tổng số đề thi
            </span>
            <h3 className="fw-bold mb-0 text-dark">{overview?.totalQuizzes || 0}</h3>
            <span className="text-secondary small">đề đang hoạt động</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card-custom p-3 border h-100">
            <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
              <FaUsers className="text-primary" /> Tổng lượt bài nộp
            </span>
            <h3 className="fw-bold mb-0 text-primary">{overview?.totalSubmissions || 0}</h3>
            <span className="text-secondary small">lượt thi của sinh viên</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card-custom p-3 border h-100">
            <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
              ⭐ Điểm trung bình chung
            </span>
            <h3 className="fw-bold mb-0 text-dark">{overview?.avgScore || 0} / 10</h3>
            <span className="text-secondary small">toàn bộ các bài thi</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card-custom p-3 border h-100">
            <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
              <FaCheckCircle className="text-success" /> Tỷ lệ đạt (≥ 5.0)
            </span>
            <h3 className="fw-bold mb-0 text-success">{overview?.passRate || 0}%</h3>
            <span className="text-secondary small">sinh viên đạt chuẩn</span>
          </div>
        </div>
      </div>

      {/* Quiz Selector */}
      <div className="card-custom p-3 mb-4 border shadow-sm">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <label className="form-label small fw-bold text-secondary mb-1">
              CHỌN ĐỀ THI ĐỂ XEM PHÂN TÍCH:
            </label>
            <select
              className="form-select"
              value={selectedQuizId}
              onChange={e => setSelectedQuizId(e.target.value)}
            >
              {overview?.quizzes?.map(q => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.totalQuestions} câu)
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-8">
            {analytics && (
              <div className="d-flex flex-wrap gap-3 pt-md-4 small text-secondary">
                <span>Số bài nộp: <strong className="text-dark">{analytics.totalSubmissions}</strong></span>
                <span>Điểm trung bình đề: <strong className="text-primary">{analytics.avgScore} / 10</strong></span>
                <span>Thời gian: <strong className="text-dark">{analytics.quiz.timeLimit} phút</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Score Distribution */}
        <div className="col-lg-5">
          <div className="card-custom p-4 border h-100 shadow-sm">
            <h5 className="fw-bold mb-3 fs-6 d-flex align-items-center gap-2">
              <FaChartBar className="text-primary" /> Phân Bố Điểm Số Lớp Học
            </h5>

            {analytics?.distribution && (
              <div className="d-flex flex-column gap-3">
                <div>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-semibold text-danger">Dưới 5.0 (Cần ôn lại)</span>
                    <strong className="text-danger">{analytics.distribution.under5} sinh viên</strong>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div
                      className="progress-bar bg-danger"
                      style={{ width: `${analytics.totalSubmissions ? (analytics.distribution.under5 / analytics.totalSubmissions) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-semibold text-warning">Từ 5.0 - 6.9 (Trung bình)</span>
                    <strong className="text-warning">{analytics.distribution.from5to7} sinh viên</strong>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div
                      className="progress-bar bg-warning"
                      style={{ width: `${analytics.totalSubmissions ? (analytics.distribution.from5to7 / analytics.totalSubmissions) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-semibold text-primary">Từ 7.0 - 8.4 (Khá)</span>
                    <strong className="text-primary">{analytics.distribution.from7to85} sinh viên</strong>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div
                      className="progress-bar bg-primary"
                      style={{ width: `${analytics.totalSubmissions ? (analytics.distribution.from7to85 / analytics.totalSubmissions) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-semibold text-success">Từ 8.5 - 10.0 (Giỏi / Xuất sắc)</span>
                    <strong className="text-success">{analytics.distribution.from85to10} sinh viên</strong>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div
                      className="progress-bar bg-success"
                      style={{ width: `${analytics.totalSubmissions ? (analytics.distribution.from85to10 / analytics.totalSubmissions) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Difficult Questions */}
        <div className="col-lg-7">
          <div className="card-custom p-4 border h-100 shadow-sm">
            <h5 className="fw-bold mb-3 fs-6 d-flex align-items-center gap-2">
              <FaExclamationTriangle className="text-warning" /> Top Câu Hỏi Nhiều Học Sinh Sai Nhất
            </h5>

            {(!analytics?.hardQuestions || analytics.hardQuestions.length === 0) ? (
              <div className="text-center py-4 text-secondary">
                Chưa có dữ liệu thống kê câu sai.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {analytics.hardQuestions.map((hq, i) => (
                  <div key={i} className="p-2 px-3 rounded-3 bg-light border small">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold text-dark">Câu {hq.questionIndex + 1} {hq.unit ? `(${hq.unit})` : ''}</span>
                      <span className="badge bg-danger">
                        {hq.wrongCount} lượt sai ({hq.wrongRate}%)
                      </span>
                    </div>
                    <p className="mb-0 text-secondary text-truncate">
                      {hq.question}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Submissions Table */}
      <div className="card-custom p-4 border shadow-sm">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <h5 className="fw-bold mb-0 fs-6 d-flex align-items-center gap-2">
            📋 Danh Sách Bài Làm Thí Sinh ({filteredSubmissions.length})
          </h5>

          {/* Search Box */}
          <div className="input-group input-group-sm" style={{ maxWidth: '300px' }}>
            <span className="input-group-text bg-light"><FaSearch className="text-secondary" /></span>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo tên hoặc MSSV..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            Chưa có thí sinh nào nộp bài thi này.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small">
                <tr>
                  <th>STT</th>
                  <th>Họ và Tên</th>
                  <th>MSSV</th>
                  <th>Điểm Số</th>
                  <th>Số Câu Đúng</th>
                  <th>Thời Gian</th>
                  <th>Ngày Nộp</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub, idx) => {
                  const s = parseFloat(sub.score) || 0;
                  return (
                    <tr key={sub.id || idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong className="text-dark">{sub.studentName}</strong>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {sub.studentId || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge fs-6 ${s >= 8 ? 'bg-success' : s >= 5 ? 'bg-primary' : 'bg-danger'}`}>
                          {sub.score}
                        </span>
                      </td>
                      <td>
                        <span className="text-success fw-bold">{sub.correctCount}</span> / {sub.totalQuestions}
                      </td>
                      <td className="small text-secondary">
                        {Math.floor((sub.timeSpent || 0) / 60)}p {(sub.timeSpent || 0) % 60}s
                      </td>
                      <td className="small text-secondary">
                        {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

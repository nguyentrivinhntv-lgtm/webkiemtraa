import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaClipboardList, FaClock, FaPlay, FaBookOpen, FaQuestionCircle,
  FaBookReader, FaLink, FaCheck, FaBolt, FaTrophy, FaStar,
  FaSearch, FaShieldAlt, FaFire, FaLayerGroup, FaGraduationCap
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getQuizList } from '../services/api';

function HomePage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const res = await getQuizList();
      setQuizzes(res.data || []);
    } catch (err) {
      console.error('Error loading quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (quizId, title) => {
    const url = `${window.location.origin}/quiz/${quizId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(quizId);
        toast.success(`Đã sao chép link đề thi "${title}"!`);
        setTimeout(() => setCopiedId(null), 2500);
      }).catch(() => {
        prompt('Sao chép link làm bài thi:', url);
      });
    } else {
      prompt('Sao chép link làm bài thi:', url);
    }
  };

  // Filter quizzes by search term and type
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      const matchSearch = (q.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'all' || q.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [quizzes, searchTerm, typeFilter]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-custom"></div>
      </div>
    );
  }

  return (
    <div className="container py-2 pb-5">
      {/* ===== Artistic Hero Banner ===== */}
      <div className="hero-artistic text-center">
        {/* Glowing Badge */}
        <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-white shadow-sm border border-info border-opacity-25 mb-3">
          <span className="badge bg-primary bg-opacity-10 text-primary fw-bold" style={{ fontSize: '0.75rem' }}>
            ✨ PHIÊN BẢN 2.0
          </span>
          <span className="small text-secondary fw-semibold">
            Nền Tảng Luyện Thi & Ôn Tập Thông Minh
          </span>
        </div>

        {/* Title */}
        <h1 className="fw-bold mb-3 fs-1 lh-sm">
          Chinh Phục Mọi Kỳ Thi Với{' '}
          <span className="text-gradient-ocean">Phương Pháp Học Hiện Đại</span>
        </h1>

        {/* Subtitle */}
        <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '680px', fontSize: '1.05rem', lineHeight: '1.6' }}>
          Ghi nhớ kiến thức bền vững qua <strong>Flashcard 3D (Spaced Repetition)</strong>, rèn phản xạ với <strong>Thử Thách Tốc Độ</strong>, và trải nghiệm phòng thi <strong>Toàn Màn Hình</strong> bảo mật chống gian lận.
        </p>

        {/* Feature Hub Grid (4 Interactive Pill Cards) */}
        <div className="row g-3 justify-content-center text-start mt-2">
          {/* Card 1: Flashcard */}
          <div className="col-6 col-md-3">
            <Link to={quizzes.length > 0 ? `/flashcards/${quizzes[0].id}` : '#'} className="feature-pill-card">
              <div className="feature-icon-circle bg-warning bg-opacity-10 text-warning">
                🃏
              </div>
              <h6 className="fw-bold text-dark mb-1 small">Flashcard 3D</h6>
              <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>
                Học lật thẻ thuật toán SM-2
              </span>
            </Link>
          </div>

          {/* Card 2: Speed Challenge */}
          <div className="col-6 col-md-3">
            <Link to={quizzes.length > 0 ? `/challenge/${quizzes[0].id}` : '#'} className="feature-pill-card">
              <div className="feature-icon-circle bg-danger bg-opacity-10 text-danger">
                ⚡
              </div>
              <h6 className="fw-bold text-dark mb-1 small">Thử Thách Tốc Độ</h6>
              <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>
                Đua phản xạ 15 giây/câu
              </span>
            </Link>
          </div>

          {/* Card 3: Leaderboard */}
          <div className="col-6 col-md-3">
            <Link to="/leaderboard" className="feature-pill-card">
              <div className="feature-icon-circle bg-primary bg-opacity-10 text-primary">
                🏆
              </div>
              <h6 className="fw-bold text-dark mb-1 small">Bảng Vinh Danh</h6>
              <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>
                Xếp hạng cao thủ & điểm 10
              </span>
            </Link>
          </div>

          {/* Card 4: Bookmarks */}
          <div className="col-6 col-md-3">
            <Link to="/bookmarks" className="feature-pill-card">
              <div className="feature-icon-circle bg-success bg-opacity-10 text-success">
                ⭐
              </div>
              <h6 className="fw-bold text-dark mb-1 small">Câu Hỏi Đã Lưu</h6>
              <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>
                Ôn lại trọng tâm câu khó
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Install App Quick Banner */}
      <div className="d-flex justify-content-between align-items-center p-3 mb-4 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 d-md-none">
        <div className="d-flex align-items-center gap-2">
          <span className="fs-3">📲</span>
          <div>
            <strong className="d-block text-dark small">Cài QuizMaster vào điện thoại</strong>
            <span className="text-secondary small" style={{ fontSize: '0.78rem' }}>Mở nhanh & làm bài thi toàn màn hình</span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary-custom btn-sm px-3 py-1 fw-bold"
          onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
        >
          Cài Đặt
        </button>
      </div>

      {/* ===== Search & Filter Toolbar ===== */}
      <div className="card-custom p-3 mb-4 border shadow-sm">
        <div className="row g-2 align-items-center justify-content-between">
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <FaSearch className="text-secondary" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Tìm kiếm đề thi (VD: Unit 1, Tiếng Anh, Đọc hiểu...)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="col-12 col-md-auto d-flex gap-2">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-semibold ${typeFilter === 'all' ? 'btn-primary' : 'btn-light border'}`}
              onClick={() => setTypeFilter('all')}
            >
              Tất cả ({quizzes.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-semibold ${typeFilter === 'multiple-choice' ? 'btn-primary' : 'btn-light border'}`}
              onClick={() => setTypeFilter('multiple-choice')}
            >
              Trắc nghiệm
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-semibold ${typeFilter === 'reading-comprehension' ? 'btn-primary' : 'btn-light border'}`}
              onClick={() => setTypeFilter('reading-comprehension')}
            >
              Đọc hiểu
            </button>
          </div>
        </div>
      </div>

      {/* ===== Quizzes Grid ===== */}
      {filteredQuizzes.length === 0 ? (
        <div className="empty-state card-custom p-5 text-center border">
          <div className="empty-icon">🔍</div>
          <h5 className="fw-bold mb-2">Không tìm thấy đề thi phù hợp</h5>
          <p className="text-secondary mb-3">
            Thử nhập từ khóa khác hoặc vào trang Quản lý để tải file Word đề thi mới lên!
          </p>
          <Link to="/admin" className="btn btn-primary-custom">
            + Tải file Word đề thi mới
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {filteredQuizzes.map(quiz => (
            <div key={quiz.id} className="col-md-6 col-lg-4">
              <div className="card-custom quiz-hover-card h-100 border bg-white d-flex flex-column">
                {/* Header Tag Bar */}
                <div className="card-header-custom py-3 px-4 d-flex justify-content-between align-items-center">
                  <span
                    className="badge bg-white bg-opacity-25 text-white fw-bold d-flex align-items-center gap-1"
                    style={{ fontSize: '0.78rem' }}
                  >
                    {quiz.type === 'multiple-choice' ? (
                      <><FaQuestionCircle /> Trắc nghiệm ABCD</>
                    ) : (
                      <><FaBookOpen /> Bài Đọc hiểu</>
                    )}
                  </span>
                  <span className="badge bg-dark bg-opacity-25 text-white small px-2 py-1">
                    {quiz.totalQuestions} câu hỏi
                  </span>
                </div>

                <div className="card-body p-4 d-flex flex-column flex-1">
                  {/* Quiz Title */}
                  <h5 className="fw-bold mb-3 fs-6 text-dark lh-base flex-1">
                    {quiz.title}
                  </h5>

                  {/* Metadata Chips */}
                  <div className="d-flex flex-wrap gap-3 mb-4 small text-secondary">
                    <div className="d-flex align-items-center gap-1">
                      <FaClipboardList className="text-primary" />
                      <span>{quiz.totalQuestions} câu</span>
                    </div>
                    <div className="d-flex align-items-center gap-1">
                      <FaClock className="text-warning" />
                      <span>{quiz.timeLimit} phút</span>
                    </div>
                    <div className="d-flex align-items-center gap-1 text-success">
                      <FaShieldAlt />
                      <span>Chống gian lận</span>
                    </div>
                  </div>

                  {/* Multi-mode Action Buttons */}
                  <div className="d-flex flex-column gap-2 mb-3">
                    {/* Top sub-modes: Flashcard, Review, Speed Challenge */}
                    <div className="d-flex gap-2">
                      <Link
                        to={`/flashcards/${quiz.id}`}
                        className="btn btn-outline-warning btn-sm flex-fill d-flex align-items-center justify-content-center gap-1 py-2 fw-semibold text-dark rounded-3"
                        title="Học bằng flashcard lật thẻ"
                      >
                        🃏 Flashcard
                      </Link>
                      <Link
                        to={`/review/${quiz.id}`}
                        className="btn btn-outline-primary btn-sm flex-fill d-flex align-items-center justify-content-center gap-1 py-2 fw-semibold rounded-3"
                        title="Ôn tập câu hỏi có giải thích đáp án"
                      >
                        <FaBookReader /> Ôn tập
                      </Link>
                      <Link
                        to={`/challenge/${quiz.id}`}
                        className="btn btn-outline-danger btn-sm flex-fill d-flex align-items-center justify-content-center gap-1 py-2 fw-semibold rounded-3"
                        title="Thử thách tốc độ 15s"
                      >
                        ⚡ 15s
                      </Link>
                    </div>

                    {/* Main Official Exam Button */}
                    <Link
                      to={`/quiz/${quiz.id}`}
                      className="btn btn-primary-custom w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    >
                      <FaPlay /> Vào Phòng Thi Chính Thức
                    </Link>
                  </div>

                  {/* Share Link Button */}
                  <button
                    type="button"
                    className="btn btn-light btn-sm text-secondary border w-100 d-flex align-items-center justify-content-center gap-1 py-1"
                    onClick={() => handleCopyLink(quiz.id, quiz.title)}
                  >
                    {copiedId === quiz.id ? (
                      <><FaCheck className="text-success" /> <span className="text-success fw-bold">Đã chép link phòng thi!</span></>
                    ) : (
                      <><FaLink /> <span>Sao chép link gửi sinh viên</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trust & Features Footer Banner */}
      <div className="row g-3 mt-5 pt-3 border-top text-center">
        <div className="col-12 col-md-4">
          <div className="p-3">
            <div className="fs-3 text-primary mb-2">🛡️</div>
            <h6 className="fw-bold mb-1">Bảo Mật Phòng Thi</h6>
            <p className="text-secondary small mb-0">
              Chế độ toàn màn hình bắt buộc, tự động thu bài nếu chuyển tab hay mở ứng dụng khác.
            </p>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="p-3">
            <div className="fs-3 text-warning mb-2">🧠</div>
            <h6 className="fw-bold mb-1">Ghi Nhớ Bền Vững</h6>
            <p className="text-secondary small mb-0">
              Thuật toán lặp lại ngắt quãng SM-2 giúp học sinh ôn đúng lúc câu hỏi sắp quên.
            </p>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="p-3">
            <div className="fs-3 text-success mb-2">📊</div>
            <h6 className="fw-bold mb-1">Báo Cáo Giáo Viên</h6>
            <p className="text-secondary small mb-0">
              Theo dõi bảng điểm cả lớp, phân tích câu hỏi khó nhất và xuất file Excel .xlsx dễ dàng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

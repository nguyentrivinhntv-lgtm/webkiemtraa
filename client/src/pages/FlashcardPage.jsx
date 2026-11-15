import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FaArrowLeft, FaArrowRight, FaSync, FaStar, FaRegStar,
  FaRandom, FaCheck, FaTimes, FaLightbulb, FaVolumeUp,
  FaHome, FaBookOpen
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getQuizAdmin, toggleBookmarkApi, getBookmarksApi, submitSpacedRepReviewApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function FlashcardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [bookmarkedSet, setBookmarkedSet] = useState(new Set());
  const [masteredCount, setMasteredCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    loadQuiz();
    if (isLoggedIn) {
      loadBookmarks();
    }
  }, [id, isLoggedIn]);

  const loadQuiz = async () => {
    try {
      const res = await getQuizAdmin(id);
      setQuiz(res.data);
    } catch (err) {
      toast.error('Không tìm thấy bài thi');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      const res = await getBookmarksApi();
      const currentQuizBm = res.data
        .filter(b => b.quizId === id)
        .map(b => b.questionIndex);
      setBookmarkedSet(new Set(currentQuizBm));
    } catch (err) {
      console.warn('Could not load bookmarks:', err);
    }
  };

  // Flatten all questions
  const rawQuestions = useMemo(() => {
    if (!quiz) return [];
    if (quiz.type === 'multiple-choice') return quiz.questions || [];
    return quiz.passages?.flatMap(p =>
      p.questions.map(q => ({ ...q, passageTitle: p.title, passageText: p.text }))
    ) || [];
  }, [quiz]);

  const questions = useMemo(() => {
    if (shuffle) {
      return [...rawQuestions].sort(() => Math.random() - 0.5);
    }
    return rawQuestions;
  }, [rawQuestions, shuffle]);

  const currentQ = questions[currentIndex];
  const isBookmarked = bookmarkedSet.has(currentIndex);

  const handleFlip = () => {
    setIsFlipped(prev => !prev);
  };

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      toast.info('🎉 Bạn đã đi hết bộ thẻ ghi nhớ này!');
    }
  }, [currentIndex, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleRateQuality = async (quality) => {
    if (quality >= 3) {
      setMasteredCount(prev => prev + 1);
    }

    if (isLoggedIn && currentQ) {
      try {
        await submitSpacedRepReviewApi({
          quizId: id,
          quizTitle: quiz.title,
          questionIndex: currentIndex,
          questionData: {
            question: currentQ.question,
            options: currentQ.options,
            correctAnswer: currentQ.correctAnswer,
            unit: currentQ.unit || ''
          }
        }, quality);
      } catch (err) {
        console.warn('Spaced rep error:', err);
      }
    }

    handleNext();
  };

  const handleToggleBookmark = async () => {
    if (!isLoggedIn) {
      toast.warning('Vui lòng đăng nhập để lưu câu hỏi yêu thích!');
      return;
    }

    try {
      const res = await toggleBookmarkApi({
        quizId: id,
        quizTitle: quiz.title,
        questionIndex: currentIndex,
        questionData: {
          question: currentQ.question,
          options: currentQ.options,
          correctAnswer: currentQ.correctAnswer,
          unit: currentQ.unit || ''
        }
      });

      setBookmarkedSet(prev => {
        const next = new Set(prev);
        if (res.data.action === 'added') {
          next.add(currentIndex);
          toast.success('⭐ Đã đánh dấu câu hỏi này!');
        } else {
          next.delete(currentIndex);
          toast.info('Đã bỏ đánh dấu.');
        }
        return next;
      });
    } catch (err) {
      toast.error('Lỗi bookmark: ' + err.message);
    }
  };

  // Text-to-Speech (Pronunciation)
  const handleSpeak = (text) => {
    if (!window.speechSynthesis) {
      toast.warning('Trình duyệt không hỗ trợ phát âm.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (isFlipped) {
        if (e.key === '1') handleRateQuality(1);
        else if (e.key === '2') handleRateQuality(2);
        else if (e.key === '3') handleRateQuality(3);
        else if (e.key === '4') handleRateQuality(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, questions.length, handleNext, handlePrev]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-custom"></div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="container text-center py-5">
        <h4>Không có câu hỏi nào để học flashcard.</h4>
        <Link to="/" className="btn btn-primary-custom mt-3"><FaHome className="me-2" /> Về trang chủ</Link>
      </div>
    );
  }

  const correctOpt = currentQ.options?.[currentQ.correctAnswer];
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="container py-4 pb-5">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <Link to="/" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 mb-1">
            <FaArrowLeft /> Về trang chủ
          </Link>
          <h3 className="fw-bold mb-0 d-flex align-items-center gap-2">
            🃏 Flashcard: {quiz.title}
          </h3>
        </div>

        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm ${shuffle ? 'btn-warning' : 'btn-outline-secondary'}`}
            onClick={() => { setShuffle(p => !p); setCurrentIndex(0); setIsFlipped(false); }}
            title="Xáo trộn câu hỏi"
          >
            <FaRandom className="me-1" /> {shuffle ? 'Đang xáo' : 'Xáo trộn'}
          </button>
          <Link to={`/review/${id}`} className="btn btn-sm btn-outline-primary">
            <FaBookOpen className="me-1" /> Chế độ ôn tập
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card-custom p-3 mb-4 border shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-2 small">
          <span className="text-secondary fw-semibold">
            Thẻ {currentIndex + 1} / {questions.length}
          </span>
          <span className="badge bg-success bg-opacity-10 text-success border border-success">
            ✨ Đã thuộc: {masteredCount} câu
          </span>
        </div>
        <div className="progress" style={{ height: '8px' }}>
          <div
            className="progress-bar bg-primary"
            style={{ width: `${progressPercent}%`, transition: 'width 0.3s' }}
          ></div>
        </div>
      </div>

      {/* Flashcard Area */}
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
          {/* Card Container */}
          <div
            className={`flashcard-card card-custom p-4 p-md-5 border mb-4 text-center ${isFlipped ? 'flipped' : ''}`}
            onClick={handleFlip}
            style={{
              minHeight: '340px',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.3s ease',
              boxShadow: isFlipped ? '0 12px 36px rgba(6, 214, 160, 0.15)' : '0 8px 30px rgba(67, 97, 238, 0.12)'
            }}
          >
            {/* Top Toolbar */}
            <div
              className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom"
              onClick={e => e.stopPropagation()}
            >
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">
                  {currentQ.unit || `Câu ${currentIndex + 1}`}
                </span>
                <span className="small text-secondary">
                  {isFlipped ? '💡 MẶT SAU (ĐÁP ÁN)' : '❓ MẶT TRƯỚC (CÂU HỎI)'}
                </span>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light rounded-circle border"
                  style={{ width: 34, height: 34 }}
                  onClick={() => handleSpeak(currentQ.question)}
                  title="Nghe phát âm tiếng Anh"
                >
                  <FaVolumeUp className={speaking ? 'text-primary' : 'text-secondary'} />
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-light rounded-circle border"
                  style={{ width: 34, height: 34 }}
                  onClick={handleToggleBookmark}
                  title="Đánh dấu câu hỏi này"
                >
                  {isBookmarked ? (
                    <FaStar className="text-warning" />
                  ) : (
                    <FaRegStar className="text-secondary" />
                  )}
                </button>
              </div>
            </div>

            {/* Front of Card (Question) */}
            {!isFlipped ? (
              <div className="d-flex flex-column justify-content-center flex-1 py-4">
                {currentQ.passageText && (
                  <div className="p-3 mb-3 bg-light rounded-3 text-start small border border-warning border-opacity-50">
                    <strong className="text-warning d-block mb-1">📖 {currentQ.passageTitle}:</strong>
                    <p className="mb-0 text-secondary" style={{ whiteSpace: 'pre-line', maxHeight: '120px', overflowY: 'auto' }}>
                      {currentQ.passageText}
                    </p>
                  </div>
                )}

                <h4 className="fw-bold mb-3 text-dark lh-base" style={{ fontSize: '1.25rem' }}>
                  {currentQ.question}
                </h4>

                <div className="text-secondary small mt-4 pt-3">
                  <FaSync className="me-2 text-primary fa-spin-hover" />
                  Chạm vào thẻ hoặc bấm <strong>Space / Enter</strong> để lật xem đáp án
                </div>
              </div>
            ) : (
              /* Back of Card (Answer & Options) */
              <div className="d-flex flex-column justify-content-center flex-1 py-3 text-start">
                <div className="p-3 rounded-3 bg-success bg-opacity-10 border border-success mb-3 text-center">
                  <span className="badge bg-success mb-2 px-3 py-1">ĐÁP ÁN ĐÚNG</span>
                  <h4 className="fw-bold text-success mb-0">
                    {correctOpt?.label}. {correctOpt?.text}
                  </h4>
                </div>

                <div className="options-list mb-3">
                  {currentQ.options?.map((opt, i) => (
                    <div
                      key={i}
                      className={`option-btn py-2 ${i === currentQ.correctAnswer ? 'correct' : ''}`}
                      style={{ cursor: 'default' }}
                    >
                      <span className="option-label">{opt.label}</span>
                      <span className="flex-1">{opt.text}</span>
                      {i === currentQ.correctAnswer && (
                        <span className="badge bg-success text-white ms-2">✓ Đúng</span>
                      )}
                    </div>
                  ))}
                </div>

                {currentQ.explanation && (
                  <div className="p-2 mb-3 rounded-2 bg-primary bg-opacity-10 border border-primary border-opacity-25 small text-dark">
                    <strong className="text-primary d-flex align-items-center gap-1 mb-1">
                      <FaLightbulb /> Giải thích & Mẹo ngữ pháp:
                    </strong>
                    <span style={{ whiteSpace: 'pre-line' }}>{currentQ.explanation}</span>
                  </div>
                )}

                <div className="text-center text-secondary small">
                  Chạm vào thẻ để lật lại mặt câu hỏi
                </div>
              </div>
            )}
          </div>

          {/* SM-2 Evaluation Buttons (Visible when flipped) */}
          {isFlipped ? (
            <div className="card-custom p-3 border mb-4 text-center">
              <div className="small fw-bold text-secondary mb-2">
                BẠN NHỚ CÂU NÀY NHƯ THẾ NÀO? (Hệ thống sẽ tự lên lịch ôn tập SM-2)
              </div>
              <div className="row g-2">
                <div className="col-3">
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100 py-2 small fw-semibold d-flex flex-column align-items-center"
                    onClick={() => handleRateQuality(1)}
                  >
                    <span>❌ Chưa nhớ</span>
                    <span className="badge bg-danger bg-opacity-25 text-danger mt-1">Học lại ngay</span>
                  </button>
                </div>
                <div className="col-3">
                  <button
                    type="button"
                    className="btn btn-outline-warning w-100 py-2 small fw-semibold d-flex flex-column align-items-center"
                    onClick={() => handleRateQuality(2)}
                  >
                    <span>🤔 Khó</span>
                    <span className="badge bg-warning bg-opacity-25 text-dark mt-1">Ôn lại sớm</span>
                  </button>
                </div>
                <div className="col-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary w-100 py-2 small fw-semibold d-flex flex-column align-items-center"
                    onClick={() => handleRateQuality(3)}
                  >
                    <span>👍 Tốt</span>
                    <span className="badge bg-primary bg-opacity-25 text-primary mt-1">Nhớ tạm ổn</span>
                  </button>
                </div>
                <div className="col-3">
                  <button
                    type="button"
                    className="btn btn-outline-success w-100 py-2 small fw-semibold d-flex flex-column align-items-center"
                    onClick={() => handleRateQuality(4)}
                  >
                    <span>⚡ Quá dễ</span>
                    <span className="badge bg-success bg-opacity-25 text-success mt-1">Đã thuộc làu</span>
                  </button>
                </div>
              </div>
              <span className="form-text small text-secondary mt-2 d-block">
                Mẹo phím tắt: Bấm phím <strong>1, 2, 3, 4</strong> tương ứng với mức độ nhớ
              </span>
            </div>
          ) : (
            /* Bottom Prev / Next Nav Controls */
            <div className="d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-outline-secondary px-4 py-2"
                disabled={currentIndex === 0}
                onClick={handlePrev}
              >
                <FaArrowLeft className="me-2" /> Thẻ trước
              </button>

              <button
                type="button"
                className="btn btn-primary-custom px-4 py-2"
                onClick={handleFlip}
              >
                <FaSync className="me-2" /> Lật Thẻ
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary px-4 py-2"
                disabled={currentIndex === questions.length - 1}
                onClick={handleNext}
              >
                Thẻ tiếp <FaArrowRight className="ms-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


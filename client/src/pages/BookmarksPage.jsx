import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaStar, FaTrash, FaEdit, FaSave, FaVolumeUp, FaBookOpen,
  FaArrowLeft, FaFilter, FaCheckCircle, FaExclamationCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getBookmarksApi, updateBookmarkNoteApi, toggleBookmarkApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function BookmarksPage() {
  const { isLoggedIn } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editNote, setEditNote] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      loadBookmarks();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const loadBookmarks = async () => {
    try {
      const res = await getBookmarksApi();
      setBookmarks(res.data);
    } catch (err) {
      toast.error('Lỗi tải câu hỏi đã đánh dấu: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const uniqueQuizzes = useMemo(() => {
    const map = new Map();
    bookmarks.forEach(b => {
      if (b.quizId && !map.has(b.quizId)) {
        map.set(b.quizId, b.quizTitle || b.quizId);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    if (selectedQuiz === 'all') return bookmarks;
    return bookmarks.filter(b => b.quizId === selectedQuiz);
  }, [bookmarks, selectedQuiz]);

  const handleDelete = async (bm) => {
    try {
      await toggleBookmarkApi({
        quizId: bm.quizId,
        questionIndex: bm.questionIndex
      });
      setBookmarks(prev => prev.filter(b => b.id !== bm.id));
      toast.success('Đã bỏ đánh dấu câu hỏi.');
    } catch (err) {
      toast.error('Lỗi khi xóa: ' + err.message);
    }
  };

  const handleStartEdit = (bm) => {
    setEditingId(bm.id);
    setEditNote(bm.note || '');
  };

  const handleSaveNote = async (bmId) => {
    try {
      await updateBookmarkNoteApi(bmId, editNote);
      setBookmarks(prev => prev.map(b => (b.id === bmId ? { ...b, note: editNote } : b)));
      setEditingId(null);
      toast.success('Đã lưu ghi chú!');
    } catch (err) {
      toast.error('Lỗi lưu ghi chú: ' + err.message);
    }
  };

  const handleSpeak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  if (!isLoggedIn) {
    return (
      <div className="container py-5 text-center">
        <div className="card-custom p-5 max-w-md mx-auto border">
          <FaStar size={48} className="text-warning mb-3" />
          <h4 className="fw-bold mb-2">Vui Lòng Đăng Nhập</h4>
          <p className="text-secondary mb-4">
            Tính năng đánh dấu câu hỏi khó và ghi chú cá nhân yêu cầu đăng nhập tài khoản.
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
            <FaStar className="text-warning" /> Câu Hỏi Đã Đánh Dấu ({filteredBookmarks.length})
          </h3>
          <p className="text-secondary small mb-0">
            Xem lại các câu hỏi khó bạn đã lưu và ghi chú giải thích cá nhân
          </p>
        </div>

        {/* Filter by quiz */}
        {uniqueQuizzes.length > 1 && (
          <div className="d-flex align-items-center gap-2">
            <FaFilter className="text-secondary" />
            <select
              className="form-select form-select-sm"
              value={selectedQuiz}
              onChange={e => setSelectedQuiz(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="all">Tất cả đề thi ({bookmarks.length})</option>
              {uniqueQuizzes.map(q => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bookmarks List */}
      {filteredBookmarks.length === 0 ? (
        <div className="card-custom p-5 text-center border">
          <div className="empty-icon">⭐</div>
          <h5 className="fw-bold mb-2">Chưa có câu hỏi nào được đánh dấu</h5>
          <p className="text-secondary mb-4">
            Khi đang ôn tập hoặc học Flashcard, bấm vào biểu tượng ngôi sao để lưu lại câu hỏi khó!
          </p>
          <Link to="/" className="btn btn-primary-custom">
            Khám phá các đề thi
          </Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filteredBookmarks.map((bm, index) => {
            const qData = bm.questionData;
            if (!qData) return null;

            return (
              <div key={bm.id || index} className="card-custom p-4 border shadow-sm">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">
                      {bm.quizTitle || 'Đề thi'}
                    </span>
                    {qData.unit && (
                      <span className="badge bg-light text-secondary border">
                        {qData.unit}
                      </span>
                    )}
                    <span className="small text-secondary">
                      Câu {bm.questionIndex + 1}
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-light border rounded-circle"
                      style={{ width: 32, height: 32 }}
                      onClick={() => handleSpeak(qData.question)}
                      title="Nghe phát âm"
                    >
                      <FaVolumeUp className="text-secondary" />
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger border-0 rounded-circle"
                      style={{ width: 32, height: 32 }}
                      onClick={() => handleDelete(bm)}
                      title="Bỏ đánh dấu"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <h6 className="fw-bold text-dark mb-3 lh-base">
                  {qData.question}
                </h6>

                {/* Options List with Highlighted Correct Answer */}
                <div className="options-list mb-3">
                  {qData.options?.map((opt, oi) => {
                    const isCorrect = oi === qData.correctAnswer;
                    return (
                      <div
                        key={oi}
                        className={`option-btn py-2 ${isCorrect ? 'correct' : ''}`}
                        style={{ cursor: 'default' }}
                      >
                        <span className="option-label">{opt.label}</span>
                        <span className="flex-1">{opt.text}</span>
                        {isCorrect && (
                          <span className="badge bg-success text-white ms-auto">
                            ✓ Đáp án đúng
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Personal Note */}
                <div className="p-3 rounded-3 bg-light border">
                  {editingId === bm.id ? (
                    <div>
                      <label className="form-label small fw-bold text-secondary mb-1">
                        GHI CHÚ / MẸO NHỚ CỦA BẠN:
                      </label>
                      <textarea
                        className="form-control form-control-sm mb-2"
                        rows={2}
                        value={editNote}
                        onChange={e => setEditNote(e.target.value)}
                        placeholder="Ví dụ: Cấu trúc to be going to dùng cho dự định có sẵn..."
                      />
                      <div className="d-flex gap-2 justify-content-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setEditingId(null)}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary-custom"
                          onClick={() => handleSaveNote(bm.id)}
                        >
                          <FaSave className="me-1" /> Lưu ghi chú
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="small">
                        <strong className="text-secondary d-block">📝 Ghi chú cá nhân:</strong>
                        <span className="text-dark">
                          {bm.note || <em className="text-secondary">Chưa có ghi chú nào. Nhấn chỉnh sửa để thêm mẹo nhớ!</em>}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary ms-3"
                        onClick={() => handleStartEdit(bm)}
                      >
                        <FaEdit className="me-1" /> Sửa
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                  <Link
                    to={`/flashcards/${bm.quizId}`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    🃏 Mở Flashcard đề này
                  </Link>
                  <Link
                    to={`/review/${bm.quizId}`}
                    className="btn btn-sm btn-primary-custom"
                  >
                    <FaBookOpen className="me-1" /> Vào ôn tập
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

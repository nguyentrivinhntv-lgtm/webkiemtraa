import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FaClipboardList, FaClock, FaPlay, FaBookOpen, FaQuestionCircle,
  FaBookReader, FaLink, FaCheck
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import { getQuizList } from '../services/api'

function HomePage() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    loadQuizzes()
  }, [])

  const loadQuizzes = async () => {
    try {
      const res = await getQuizList()
      setQuizzes(res.data)
    } catch (err) {
      console.error('Error loading quizzes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = (quizId, title) => {
    const url = `${window.location.origin}/quiz/${quizId}`
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(quizId)
        toast.success(`Đã sao chép link đề thi "${title}"!`)
        setTimeout(() => setCopiedId(null), 2500)
      }).catch(() => {
        prompt('Sao chép link làm bài thi:', url)
      })
    } else {
      prompt('Sao chép link làm bài thi:', url)
    }
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-custom"></div>
      </div>
    )
  }

  return (
    <div className="container py-3">
      {/* Hero Section */}
      <div className="text-center mb-4 mb-md-5">
        <h1 className="fw-bold mb-2 fs-2 fs-md-1">
          🎓 Hệ Thống Kiểm Tra Trắc Nghiệm
        </h1>
        <p className="text-secondary fs-6 mb-0">
          Chọn bài thi để ôn tập trước hoặc bấm vào thi chính thức. Chúc bạn đạt kết quả cao!
        </p>
      </div>

      {/* Quiz List */}
      {quizzes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h4>Chưa có bài thi nào</h4>
          <p className="text-secondary">
            Hãy vào trang <Link to="/admin">Quản lý</Link> để tải file Word hoặc dán câu hỏi tạo đề thi.
          </p>
        </div>
      ) : (
        <div className="row g-3 g-md-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="col-md-6 col-lg-4">
              <div className="card-custom h-100 border">
                <div className="card-header-custom py-2 px-3 d-flex justify-content-between align-items-center">
                  <span className={`quiz-type-badge ${quiz.type === 'multiple-choice' ? 'badge-mc' : 'badge-rc'}`}
                    style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}>
                    {quiz.type === 'multiple-choice' ? (
                      <><FaQuestionCircle className="me-1" /> Trắc nghiệm</>
                    ) : (
                      <><FaBookOpen className="me-1" /> Đọc hiểu</>
                    )}
                  </span>
                  <span className="badge bg-white bg-opacity-25 text-white small">
                    {quiz.totalQuestions} câu
                  </span>
                </div>

                <div className="card-body p-3 p-md-4 d-flex flex-column">
                  <h5 className="fw-bold mb-3 fs-6 text-dark lh-base flex-1">
                    {quiz.title}
                  </h5>

                  <div className="d-flex flex-column gap-2 mb-3 small text-secondary">
                    <div className="d-flex align-items-center">
                      <FaClipboardList className="me-2 text-primary" />
                      <span>{quiz.totalQuestions} câu hỏi trắc nghiệm</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <FaClock className="me-2 text-warning" />
                      <span>{quiz.timeLimit} phút làm bài</span>
                    </div>
                  </div>

                  {/* Main Action Buttons */}
                  <div className="d-flex gap-2 mb-2">
                    <Link
                      to={`/review/${quiz.id}`}
                      className="btn btn-outline-primary flex-fill d-flex align-items-center justify-content-center gap-1 py-2 fw-semibold"
                      style={{ borderRadius: '10px' }}
                    >
                      <FaBookReader /> Ôn tập
                    </Link>
                    <Link
                      to={`/quiz/${quiz.id}`}
                      className="btn btn-primary-custom flex-fill d-flex align-items-center justify-content-center gap-1 py-2 fw-semibold"
                    >
                      <FaPlay /> Vào thi
                    </Link>
                  </div>

                  {/* Share Link Button */}
                  <button
                    type="button"
                    className="btn btn-light btn-sm text-secondary border w-100 d-flex align-items-center justify-content-center gap-1 py-1"
                    onClick={() => handleCopyLink(quiz.id, quiz.title)}
                  >
                    {copiedId === quiz.id ? (
                      <><FaCheck className="text-success" /> <span className="text-success fw-bold">Đã chép link!</span></>
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
    </div>
  )
}

export default HomePage

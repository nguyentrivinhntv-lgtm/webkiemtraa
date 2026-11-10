import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaClipboardList, FaClock, FaPlay, FaBookOpen, FaQuestionCircle, FaBookReader } from 'react-icons/fa'
import { getQuizList } from '../services/api'

function HomePage() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-custom"></div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Hero Section */}
      <div className="text-center mb-5">
        <h1 className="fw-bold mb-3">
          🎓 Hệ Thống Kiểm Tra Trắc Nghiệm
        </h1>
        <p className="text-secondary fs-5">
          Chọn bài thi để ôn tập hoặc bắt đầu làm bài. Chúc bạn đạt kết quả tốt!
        </p>
      </div>

      {/* Quiz List */}
      {quizzes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h4>Chưa có bài thi nào</h4>
          <p className="text-secondary">
            Hãy vào trang <Link to="/admin">Quản lý</Link> để upload file Word và tạo bài thi.
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="col-md-6 col-lg-4">
              <div className="card-custom h-100">
                <div className="card-header-custom">
                  <span className={`quiz-type-badge ${quiz.type === 'multiple-choice' ? 'badge-mc' : 'badge-rc'}`}
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                    {quiz.type === 'multiple-choice' ? (
                      <><FaQuestionCircle className="me-1" /> Trắc nghiệm</>
                    ) : (
                      <><FaBookOpen className="me-1" /> Đọc hiểu</>
                    )}
                  </span>
                </div>
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-3">{quiz.title}</h5>
                  <div className="d-flex flex-column gap-2 mb-4">
                    <div className="d-flex align-items-center text-secondary">
                      <FaClipboardList className="me-2" />
                      <span>{quiz.totalQuestions} câu hỏi</span>
                    </div>
                    <div className="d-flex align-items-center text-secondary">
                      <FaClock className="me-2" />
                      <span>{quiz.timeLimit} phút</span>
                    </div>
                  </div>

                  {/* Two action buttons */}
                  <div className="d-flex gap-2">
                    <Link to={`/review/${quiz.id}`} className="btn btn-outline-primary flex-fill d-flex align-items-center justify-content-center gap-2 py-2" style={{ borderRadius: '10px' }}>
                      <FaBookReader /> Ôn tập
                    </Link>
                    <Link to={`/quiz/${quiz.id}`} className="btn btn-primary-custom flex-fill d-flex align-items-center justify-content-center gap-2 py-2">
                      <FaPlay /> Vào thi
                    </Link>
                  </div>
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

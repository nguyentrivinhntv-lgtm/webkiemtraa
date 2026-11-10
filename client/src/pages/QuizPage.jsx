import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FaClock, FaCheckCircle, FaUser, FaArrowLeft, FaArrowRight,
  FaListOl, FaExclamationTriangle, FaEye
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import { getQuiz, submitQuiz } from '../services/api'

function QuizPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [studentInfo, setStudentInfo] = useState({ name: '', studentId: '', classRoom: '' })
  const [started, setStarted] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    loadQuiz()
  }, [id])

  // Timer countdown
  useEffect(() => {
    if (!started || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [started, timeLeft])

  const loadQuiz = async () => {
    try {
      const res = await getQuiz(id)
      setQuiz(res.data)
      setTimeLeft(res.data.timeLimit * 60)
    } catch (err) {
      toast.error('Không tìm thấy bài thi')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  // Flatten questions list
  const getAllQuestions = () => {
    if (!quiz) return []
    if (quiz.type === 'multiple-choice') {
      return quiz.questions || []
    }
    return quiz.passages?.flatMap(p => p.questions) || []
  }

  const allQuestions = getAllQuestions()
  const answeredCount = Object.keys(answers).length
  const progressPercent = allQuestions.length > 0 ? Math.round((answeredCount / allQuestions.length) * 100) : 0

  const handleSelectOption = (questionIndex, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }))
  }

  const handleStart = (e) => {
    e.preventDefault()
    if (!studentInfo.name.trim()) {
      toast.warning('Vui lòng nhập họ và tên sinh viên')
      return
    }
    setStarted(true)
    toast.info('Bắt đầu làm bài! Chúc bạn làm bài tốt!')
  }

  const handleAutoSubmit = async () => {
    toast.error('Đã hết thời gian làm bài! Hệ thống đang tự động nộp bài...')
    await executeSubmit()
  }

  const executeSubmit = async () => {
    try {
      const timeSpent = quiz.timeLimit * 60 - timeLeft
      const res = await submitQuiz(id, {
        studentName: studentInfo.name + (studentInfo.studentId ? ` (${studentInfo.studentId})` : ''),
        answers,
        timeSpent
      })
      navigate('/result', { state: { result: res.data } })
    } catch (err) {
      toast.error('Lỗi khi nộp bài: ' + (err.response?.data?.error || err.message))
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-custom"></div>
      </div>
    )
  }

  // Pre-test registration modal
  if (!started) {
    return (
      <div className="entrance-overlay">
        <div className="entrance-modal">
          <div className="text-center mb-4">
            <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
              <FaUser size={36} />
            </div>
            <h3 className="fw-bold mb-1">Thông Tin Thí Sinh</h3>
            <p className="text-secondary small">{quiz.title}</p>
          </div>

          <form onSubmit={handleStart}>
            <div className="mb-3">
              <label className="form-label fw-bold small text-secondary">HỌ VÀ TÊN *</label>
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Ví dụ: Nguyễn Văn An"
                required
                value={studentInfo.name}
                onChange={e => setStudentInfo({ ...studentInfo, name: e.target.value })}
              />
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label fw-bold small text-secondary">MÃ SINH VIÊN</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="22DVT0123"
                  value={studentInfo.studentId}
                  onChange={e => setStudentInfo({ ...studentInfo, studentId: e.target.value })}
                />
              </div>
              <div className="col-6">
                <label className="form-label fw-bold small text-secondary">LỚP HỌC</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tiếng Anh B1"
                  value={studentInfo.classRoom}
                  onChange={e => setStudentInfo({ ...studentInfo, classRoom: e.target.value })}
                />
              </div>
            </div>

            <div className="p-3 mb-4 rounded-3 bg-light border">
              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-secondary">Tổng số câu:</span>
                <span className="fw-bold text-dark">{quiz.totalQuestions} câu</span>
              </div>
              <div className="d-flex justify-content-between small">
                <span className="text-secondary">Thời gian làm bài:</span>
                <span className="fw-bold text-primary">{quiz.timeLimit} phút</span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary-custom w-100 py-3 fs-6">
              Bắt Đầu Làm Bài Ngay
            </button>
          </form>
        </div>
      </div>
    )
  }

  const currentQ = allQuestions[currentQIndex]

  // Detect which passage this question belongs to (for reading comprehension)
  let currentPassage = null
  if (quiz.type === 'reading-comprehension') {
    let qCount = 0
    for (const p of quiz.passages) {
      if (currentQIndex < qCount + p.questions.length) {
        currentPassage = p
        break
      }
      qCount += p.questions.length
    }
  }

  return (
    <div>
      {/* Sticky Header with Timer & Progress */}
      <div className="timer-bar mb-4 shadow-sm border-bottom">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center py-1">
            <div className="d-flex align-items-center gap-2">
              <FaUser className="text-primary" />
              <span className="fw-bold text-dark">{studentInfo.name}</span>
              {studentInfo.studentId && <span className="badge bg-secondary">{studentInfo.studentId}</span>}
            </div>

            <div className={`timer-display px-3 py-1 rounded-pill ${
              timeLeft < 300 ? 'danger bg-danger bg-opacity-10' :
              timeLeft < 600 ? 'warning bg-warning bg-opacity-10' : 'bg-light'
            }`}>
              <FaClock className="me-2" />
              {formatTime(timeLeft)}
            </div>

            <button
              className="btn btn-danger-custom d-flex align-items-center gap-2"
              onClick={() => setShowConfirmModal(true)}
            >
              <FaCheckCircle /> Nộp bài
            </button>
          </div>

          {/* Progress bar */}
          <div className="progress mt-2" style={{ height: '6px' }}>
            <div
              className="progress-bar bg-success"
              role="progressbar"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="container pb-5">
        <div className="row g-4">
          {/* Main Question Column */}
          <div className="col-lg-8">
            {/* Reading Passage Container */}
            {currentPassage && (
              <div className="card-custom mb-4 border border-warning border-opacity-50">
                <div className="card-header bg-warning bg-opacity-10 border-bottom border-warning border-opacity-25 py-3">
                  <h6 className="fw-bold text-dark mb-0">📖 {currentPassage.title}</h6>
                </div>
                <div className="card-body p-4">
                  <p className="lh-lg mb-0 text-dark" style={{ whiteSpace: 'pre-line', fontSize: '1.02rem' }}>
                    {currentPassage.text}
                  </p>
                </div>
              </div>
            )}

            {/* Current Question */}
            {currentQ && (
              <div className="question-card shadow-sm border">
                <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                  <div className="d-flex align-items-center">
                    <span className="question-number">{currentQIndex + 1}</span>
                    <span className="badge bg-light text-secondary border">
                      {currentQ.unit || currentQ.section || `Câu ${currentQIndex + 1} / ${allQuestions.length}`}
                    </span>
                  </div>
                  {answers[currentQIndex] !== undefined ? (
                    <span className="badge bg-success bg-opacity-10 text-success border border-success">
                      ✓ Đã trả lời
                    </span>
                  ) : (
                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning">
                      Chưa làm
                    </span>
                  )}
                </div>

                <h5 className="fw-bold mb-4 text-dark lh-base">
                  {currentQ.question}
                </h5>

                {/* Option Buttons */}
                <div className="options-list">
                  {currentQ.options?.map((opt, optIndex) => {
                    const isSelected = answers[currentQIndex] === optIndex
                    return (
                      <button
                        key={optIndex}
                        type="button"
                        className={`option-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(currentQIndex, optIndex)}
                      >
                        <span className="option-label">{opt.label}</span>
                        <span className="flex-1">{opt.text}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Navigation Controls */}
                <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                  <button
                    className="btn btn-outline-secondary px-4"
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex(prev => prev - 1)}
                  >
                    <FaArrowLeft className="me-2" /> Câu trước
                  </button>

                  <span className="text-secondary small">
                    {currentQIndex + 1} trên {allQuestions.length}
                  </span>

                  <button
                    className="btn btn-primary-custom px-4"
                    disabled={currentQIndex === allQuestions.length - 1}
                    onClick={() => setCurrentQIndex(prev => prev + 1)}
                  >
                    Câu tiếp <FaArrowRight className="ms-2" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Question Map Sidebar */}
          <div className="col-lg-4">
            <div className="card-custom p-4 sticky-top" style={{ top: '80px' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaListOl className="text-primary" /> Mục lục câu hỏi
                </h6>
                <span className="small text-secondary fw-semibold">
                  {answeredCount}/{allQuestions.length} ({progressPercent}%)
                </span>
              </div>

              {/* Scrollable button grid */}
              <div className="question-nav mb-4" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {allQuestions.map((_, index) => {
                  const isAnswered = answers[index] !== undefined
                  const isCurrent = currentQIndex === index
                  return (
                    <button
                      key={index}
                      className={`question-nav-btn ${isAnswered ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}
                      onClick={() => setCurrentQIndex(index)}
                      title={`Câu ${index + 1}`}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>

              <div className="p-3 bg-light rounded-3 mb-3 border">
                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-secondary">Đã hoàn thành:</span>
                  <span className="fw-bold text-success">{answeredCount} câu</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-secondary">Chưa làm:</span>
                  <span className="fw-bold text-danger">{allQuestions.length - answeredCount} câu</span>
                </div>
              </div>

              <button
                className="btn btn-danger-custom w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                onClick={() => setShowConfirmModal(true)}
              >
                <FaCheckCircle /> Nộp Bài Thi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="entrance-overlay">
          <div className="entrance-modal">
            <div className="text-center mb-3">
              <FaExclamationTriangle size={48} className="text-warning mb-2" />
              <h4 className="fw-bold">Xác Nhận Nộp Bài</h4>
              <p className="text-secondary mb-0">Bạn có chắc chắn muốn kết thúc bài thi không?</p>
            </div>

            <div className="p-3 bg-light rounded-3 my-3">
              <div className="d-flex justify-content-between mb-2">
                <span>Số câu đã làm:</span>
                <strong className="text-success">{answeredCount} / {allQuestions.length}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Số câu chưa làm:</span>
                <strong className="text-danger">{allQuestions.length - answeredCount}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span>Thời gian còn lại:</span>
                <strong>{formatTime(timeLeft)}</strong>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-secondary flex-1"
                onClick={() => setShowConfirmModal(false)}
              >
                Tiếp tục làm
              </button>
              <button
                className="btn btn-danger-custom flex-1"
                onClick={() => {
                  setShowConfirmModal(false)
                  executeSubmit()
                }}
              >
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuizPage

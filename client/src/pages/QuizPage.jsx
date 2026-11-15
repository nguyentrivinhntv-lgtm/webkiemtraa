import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FaClock, FaCheckCircle, FaUser, FaArrowLeft, FaArrowRight,
  FaListOl, FaExclamationTriangle, FaEye, FaKeyboard,
  FaShieldAlt, FaExpand, FaBan, FaTimes, FaChevronUp, FaChevronDown
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import { getQuiz, submitQuiz } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function QuizPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [studentInfo, setStudentInfo] = useState({
    name: user?.name || '',
    studentId: user?.studentId || '',
    classRoom: user?.classRoom || ''
  })
  const [started, setStarted] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [drawerFilter, setDrawerFilter] = useState('all') // 'all' | 'unanswered'
  const [passageExpanded, setPassageExpanded] = useState(true)

  // 3-Warning Proctoring System: Warn students up to 3 times before auto-submitting
  const MAX_VIOLATIONS = 3
  const [violationsCount, setViolationsCount] = useState(0)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [violationReason, setViolationReason] = useState('')

  const isSubmittingRef = useRef(false)
  const startedRef = useRef(false)
  const enteredFullscreenRef = useRef(false)
  const violationsCountRef = useRef(0)
  const showViolationModalRef = useRef(false)

  useEffect(() => {
    violationsCountRef.current = violationsCount
  }, [violationsCount])

  useEffect(() => {
    showViolationModalRef.current = showViolationModal
  }, [showViolationModal])

  useEffect(() => {
    startedRef.current = started
  }, [started])

  // Update studentInfo when user loads
  useEffect(() => {
    if (user) {
      setStudentInfo(prev => ({
        name: prev.name || user.name || '',
        studentId: prev.studentId || user.studentId || '',
        classRoom: prev.classRoom || user.classRoom || ''
      }))
    }
  }, [user])

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
          handleAutoSubmit('Hết thời gian làm bài')
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

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!started || showConfirmModal) return

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentQIndex(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentQIndex(prev => Math.min(allQuestions.length - 1, prev + 1))
      } else if (['1', 'a', 'A'].includes(e.key)) {
        handleSelectOption(currentQIndex, 0)
      } else if (['2', 'b', 'B'].includes(e.key)) {
        handleSelectOption(currentQIndex, 1)
      } else if (['3', 'c', 'C'].includes(e.key)) {
        handleSelectOption(currentQIndex, 2)
      } else if (['4', 'd', 'D'].includes(e.key)) {
        handleSelectOption(currentQIndex, 3)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [started, showConfirmModal, currentQIndex, allQuestions.length])

  // Fullscreen helper
  const enterFullscreen = () => {
    try {
      const docEl = document.documentElement
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {})
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen()
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen()
      }
    } catch (err) {
      console.warn('Fullscreen request error:', err)
    }
  }

  // Warning Proctoring: Warn up to 3 times before auto-submitting
  const handleViolation = useCallback((reason) => {
    if (!startedRef.current || isSubmittingRef.current || showViolationModalRef.current) return

    const newCount = violationsCountRef.current + 1
    violationsCountRef.current = newCount
    setViolationsCount(newCount)

    if (newCount >= MAX_VIOLATIONS) {
      toast.error(`❌ BẠN ĐÃ VI PHẠM QUY CHẾ QUÁ ${MAX_VIOLATIONS} LẦN! Hệ thống tự động thu bài.`)
      executeSubmit(newCount, `Bị thu bài do vi phạm quy chế quá ${MAX_VIOLATIONS} lần (${reason})`)
    } else {
      setViolationReason(reason)
      setShowViolationModal(true)
      toast.warning(`⚠️ CẢNH BÁO VI PHẠM (Lần ${newCount}/${MAX_VIOLATIONS}): ${reason}`)
    }
  }, [MAX_VIOLATIONS])

  // Proctoring Listeners with Fair Warning System
  useEffect(() => {
    if (!started) return

    // 1. Detect exiting fullscreen mode -> Warn student!
    const handleFullscreenChange = () => {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement)
      if (isFS) {
        enteredFullscreenRef.current = true
      } else if (enteredFullscreenRef.current && startedRef.current && !isSubmittingRef.current) {
        handleViolation('Thoát chế độ toàn màn hình')
      }
    }

    // 2. Detect switching tab, minimizing, or switching apps on mobile -> Warn student!
    const handleVisibilityChange = () => {
      if (document.hidden && startedRef.current && !isSubmittingRef.current) {
        handleViolation('Rời khỏi màn hình bài thi / Chuyển sang tab hoặc ứng dụng khác')
      }
    }

    // 3. Prevent right click
    const handleContextMenu = (e) => {
      e.preventDefault()
      toast.warning('⚠️ Chuột phải bị khóa trong phòng thi!')
    }

    // 4. Prevent copying text
    const handleCopy = (e) => {
      e.preventDefault()
      toast.warning('⚠️ Tính năng sao chép bị vô hiệu hóa trong phòng thi!')
    }

    // 5. Prevent reload or leaving page
    const handleBeforeUnload = (e) => {
      if (!isSubmittingRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    // 6. Lock mobile / browser Back button (popstate trap)
    window.history.pushState(null, '', window.location.href)
    const handlePopState = (e) => {
      e.preventDefault()
      window.history.pushState(null, '', window.location.href)
      if (startedRef.current && !isSubmittingRef.current) {
        handleViolation('Bấm nút Quay lại (Back) của trình duyệt')
      }
    }

    // 7. Window Blur (Instantly catch when window loses focus to other tab / app)
    const handleWindowBlur = () => {
      if (startedRef.current && !isSubmittingRef.current) {
        if (document.hidden) {
          handleViolation('Mất tiêu điểm cửa sổ bài thi / Mở ứng dụng khác')
        } else {
          // On touch devices (iOS/Android), scrolling might fire blur during URL bar collapse. Only penalize if not touch device.
          const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
          if (!isTouch) {
            handleViolation('Click chuột ra ngoài cửa sổ bài thi')
          }
        }
      }
    }

    // 8. Prevent mouse side navigation buttons (Mouse 3 & 4: Back / Forward)
    const handleMouseButtons = (e) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // 9. Prevent horizontal swipe gestures (trackpad / sideways mouse wheel swipe)
    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
      }
    }

    // 10. Prevent browser shortcut keys that navigate (Alt+Left/Right, Ctrl+W, Ctrl+T, Ctrl+R, F5)
    const handleSpecialKeys = (e) => {
      if (
        (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
        (e.ctrlKey && (e.key === 'r' || e.key === 'R' || e.key === 'w' || e.key === 'W' || e.key === 't' || e.key === 'T' || e.key === 'n' || e.key === 'N')) ||
        e.key === 'F5' ||
        e.key === 'F12'
      ) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopy)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('mouseup', handleMouseButtons, true)
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleSpecialKeys, true)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopy)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('mouseup', handleMouseButtons, true)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleSpecialKeys, true)
    }
  }, [started])

  const handleStart = (e) => {
    e.preventDefault()
    if (!studentInfo.name.trim()) {
      toast.warning('Vui lòng nhập họ và tên sinh viên')
      return
    }
    setStarted(true)
    enterFullscreen()
    toast.info('🛡️ Chế độ phòng thi nghiêm ngặt đã bật. Tuyệt đối không thoát màn hình hoặc mở ứng dụng khác!')
  }

  const handleAutoSubmit = async (reason) => {
    toast.error('Đang tự động nộp bài: ' + reason)
    await executeSubmit(1, reason)
  }

  const executeSubmit = async (tabSwitchesCount = 0, violationReason = '') => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    try {
      const timeSpent = quiz.timeLimit * 60 - timeLeft
      const res = await submitQuiz(id, {
        studentName: studentInfo.name + (studentInfo.studentId ? ` (${studentInfo.studentId})` : ''),
        studentId: studentInfo.studentId || '',
        answers,
        timeSpent,
        tabSwitches: tabSwitchesCount
      })

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }

      navigate('/result', {
        state: {
          result: res.data,
          violationReason
        }
      })
    } catch (err) {
      toast.error('Lỗi khi nộp bài: ' + (err.response?.data?.error || err.message))
      isSubmittingRef.current = false
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
        <div className="entrance-modal" style={{ maxWidth: '480px' }}>
          <div className="text-center mb-3">
            <div className="d-inline-flex p-3 rounded-circle bg-danger bg-opacity-10 text-danger mb-2">
              <FaShieldAlt size={40} />
            </div>
            <h3 className="fw-bold mb-1">Quy Chế Phòng Thi Nghiêm Ngặt</h3>
            <p className="text-secondary small">{quiz.title}</p>
          </div>

          {/* Proctoring Notice with 3 Warnings */}
          <div className="p-3 mb-3 rounded-3 bg-warning bg-opacity-10 border border-warning small text-start">
            <strong className="text-dark d-block mb-1 fs-6">
              🛡️ QUY CHẾ GIÁM SÁT PHÒNG THI (TỐI ĐA 3 LẦN CẢNH BÁO):
            </strong>
            <ul className="mb-0 ps-3 text-dark fw-medium" style={{ fontSize: '0.85rem' }}>
              <li className="mb-1 text-danger fw-bold">
                Hệ thống cảnh báo tối đa 3 lần. Nếu vi phạm quá 3 lần, bài thi sẽ tự động bị thu bài và chấm điểm!
              </li>
              <li className="mb-1">
                Các hành vi bị tính vi phạm: Thoát toàn màn hình, chuyển tab, mở app khác (Zalo, Messenger, ChatGPT, Google...).
              </li>
              <li className="mb-1">
                Khi có cảnh báo vi phạm, hãy bấm <strong>"Tiếp tục làm bài"</strong> ngay để không bị gián đoạn.
              </li>
              <li>Chức năng sao chép, bôi đen và chuột phải đã bị khóa trong phòng thi.</li>
            </ul>
          </div>

          <form onSubmit={handleStart}>
            <div className="mb-2">
              <label className="form-label fw-bold small text-secondary">HỌ VÀ TÊN THÍ SINH *</label>
              <input
                type="text"
                className="form-control"
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
                  className="form-control form-control-sm"
                  placeholder="22DVT0123"
                  value={studentInfo.studentId}
                  onChange={e => setStudentInfo({ ...studentInfo, studentId: e.target.value })}
                />
              </div>
              <div className="col-6">
                <label className="form-label fw-bold small text-secondary">LỚP HỌC</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Tiếng Anh B1"
                  value={studentInfo.classRoom}
                  onChange={e => setStudentInfo({ ...studentInfo, classRoom: e.target.value })}
                />
              </div>
            </div>

            <div className="p-2 px-3 mb-3 rounded-3 bg-light border d-flex justify-content-between small">
              <span>Tổng số câu: <strong>{quiz.totalQuestions} câu</strong></span>
              <span>Thời gian: <strong className="text-primary">{quiz.timeLimit} phút</strong></span>
            </div>

            <button type="submit" className="btn btn-primary-custom w-100 py-3 fs-6 d-flex align-items-center justify-content-center gap-2 fw-bold">
              <FaExpand /> Tôi Đã Hiểu Quy Chế & Bắt Đầu Làm Bài
            </button>
          </form>
        </div>
      </div>
    )
  }

  const currentQ = allQuestions[currentQIndex]

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
    <div className="exam-room-locked">
      {/* Sticky Header with Timer & Strict Proctoring Badge */}
      <div className="timer-bar mb-3 mb-md-4 shadow-sm border-bottom">
        <div className="container">
          {/* Desktop Top Bar */}
          <div className="d-none d-md-flex justify-content-between align-items-center py-1">
            <div className="d-flex align-items-center gap-2">
              <FaUser className="text-primary" />
              <span className="fw-bold text-dark">{studentInfo.name}</span>
              {studentInfo.studentId && <span className="badge bg-secondary d-none d-sm-inline-block">{studentInfo.studentId}</span>}
              <span className={`badge ${
                violationsCount === 0 ? 'bg-success text-white' :
                violationsCount === 1 ? 'bg-warning text-dark' :
                'bg-danger text-white'
              }`}>
                🛡️ Vi phạm: {violationsCount}/{MAX_VIOLATIONS}
                {violationsCount === 0 ? ' (An toàn)' : violationsCount === 1 ? ' (Cảnh cáo lần 1)' : ' (Cảnh cáo lần 2 - Nguy cấp)'}
              </span>
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

          {/* Mobile Top Bar */}
          <div className="d-md-none py-1">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="d-flex align-items-center gap-1 text-truncate" style={{ maxWidth: '125px' }}>
                <FaUser className="text-primary flex-shrink-0" size={13} />
                <span className="fw-bold text-dark text-truncate small">{studentInfo.name}</span>
              </div>

              <div className={`timer-pill-mobile ${
                timeLeft < 300 ? 'danger' : timeLeft < 600 ? 'warning' : ''
              }`}>
                <FaClock className="me-1" size={13} />
                <span>{formatTime(timeLeft)}</span>
              </div>

              <button
                className="btn btn-danger-custom btn-sm py-1 px-3 d-flex align-items-center gap-1 fw-bold"
                onClick={() => setShowConfirmModal(true)}
              >
                <FaCheckCircle size={13} /> Nộp bài
              </button>
            </div>

            <div className="d-flex justify-content-between align-items-center small">
              <span className={`badge ${
                violationsCount === 0 ? 'bg-success bg-opacity-10 text-success border border-success' :
                violationsCount === 1 ? 'bg-warning bg-opacity-10 text-warning border border-warning' :
                'bg-danger bg-opacity-10 text-danger border border-danger'
              }`} style={{ fontSize: '0.72rem' }}>
                ⚠️ Vi phạm: {violationsCount}/{MAX_VIOLATIONS}
              </span>

              <button
                type="button"
                className="btn btn-light btn-sm border d-flex align-items-center gap-1 py-1 px-2 text-dark fw-semibold"
                style={{ fontSize: '0.75rem' }}
                onClick={() => setShowDrawer(true)}
              >
                <FaListOl className="text-primary" size={12} />
                <span>Mục lục: <strong>{answeredCount}/{allQuestions.length}</strong></span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress mt-2" style={{ height: '5px' }}>
            <div
              className="progress-bar bg-success"
              role="progressbar"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="container pb-5">
        <div className="row g-3 g-md-4">
          {/* Main Question Column */}
          <div className="col-12 col-lg-8">
            {/* Reading Passage Container */}
            {currentPassage && (
              <div className="card-custom mb-3 border border-warning border-opacity-50">
                <div
                  className="card-header bg-warning bg-opacity-10 border-bottom border-warning border-opacity-25 py-2 px-3 d-flex justify-content-between align-items-center"
                  onClick={() => setPassageExpanded(prev => !prev)}
                  style={{ cursor: 'pointer' }}
                >
                  <h6 className="fw-bold text-dark mb-0 small d-flex align-items-center gap-2">
                    📖 <span>{currentPassage.title}</span>
                  </h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0 px-2 d-flex align-items-center gap-1"
                    style={{ fontSize: '0.75rem' }}
                  >
                    {passageExpanded ? (
                      <>Thu gọn <FaChevronUp size={10} /></>
                    ) : (
                      <>Xem bài đọc <FaChevronDown size={10} /></>
                    )}
                  </button>
                </div>
                {passageExpanded && (
                  <div className="card-body p-3 p-md-4 passage-body-scroll">
                    <p className="lh-base mb-0 text-dark" style={{ whiteSpace: 'pre-line', fontSize: '0.96rem' }}>
                      {currentPassage.text}
                    </p>
                  </div>
                )}
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
                      ✓ Đã chọn
                    </span>
                  ) : (
                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning">
                      Chưa làm
                    </span>
                  )}
                </div>

                <h5 className="fw-bold mb-3 mb-md-4 text-dark lh-base">
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
                <div className="d-flex justify-content-between align-items-center mt-3 mt-md-4 pt-3 border-top">
                  <button
                    className="btn btn-outline-secondary px-3 px-md-4"
                    disabled={currentQIndex === 0}
                    onClick={() => {
                      setCurrentQIndex(prev => Math.max(0, prev - 1))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    <FaArrowLeft className="me-1 me-md-2" />
                    <span className="d-none d-sm-inline">Câu </span>trước
                  </button>

                  <button
                    type="button"
                    className="btn btn-light border d-sm-none small py-1 px-2"
                    onClick={() => setShowDrawer(true)}
                  >
                    <FaListOl className="text-primary me-1" /> {currentQIndex + 1}/{allQuestions.length}
                  </button>

                  <span className="text-secondary small d-none d-sm-inline">
                    {currentQIndex + 1} trên {allQuestions.length}
                  </span>

                  {currentQIndex < allQuestions.length - 1 ? (
                    <button
                      className="btn btn-primary-custom px-3 px-md-4"
                      onClick={() => {
                        setCurrentQIndex(prev => Math.min(allQuestions.length - 1, prev + 1))
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      <span className="d-none d-sm-inline">Câu </span>tiếp
                      <FaArrowRight className="ms-1 ms-md-2" />
                    </button>
                  ) : (
                    <button
                      className="btn btn-danger-custom px-3 px-md-4 fw-bold"
                      onClick={() => setShowConfirmModal(true)}
                    >
                      Nộp bài <FaCheckCircle className="ms-1 ms-md-2" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Question Map Sidebar - Desktop Only (Hidden on mobile to avoid duplicate bottom clutter) */}
          <div className="col-lg-4 d-none d-lg-block">
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
                      onClick={() => {
                        setCurrentQIndex(index)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
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
                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-secondary">Chưa làm:</span>
                  <span className="fw-bold text-danger">{allQuestions.length - answeredCount} câu</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-secondary">Quy chế:</span>
                  <span className="text-danger fw-bold">Rời màn hình = Thu bài ngay</span>
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

      {/* Fixed Mobile Bottom Exam Navigation Bar */}
      <div className="exam-mobile-bottom-bar d-flex d-md-none">
        <button
          type="button"
          className="btn btn-light border flex-1 d-flex align-items-center justify-content-center gap-1 py-2 fw-semibold"
          disabled={currentQIndex === 0}
          onClick={() => {
            setCurrentQIndex(prev => Math.max(0, prev - 1))
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <FaArrowLeft size={12} /> <span>Trước</span>
        </button>

        <button
          type="button"
          className="btn btn-outline-primary flex-1 d-flex align-items-center justify-content-center gap-1 py-2 fw-bold"
          onClick={() => setShowDrawer(true)}
        >
          <FaListOl size={13} />
          <span>{currentQIndex + 1}/{allQuestions.length}</span>
        </button>

        {currentQIndex < allQuestions.length - 1 ? (
          <button
            type="button"
            className="btn btn-primary-custom flex-1 d-flex align-items-center justify-content-center gap-1 py-2 fw-semibold"
            onClick={() => {
              setCurrentQIndex(prev => Math.min(allQuestions.length - 1, prev + 1))
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <span>Tiếp</span> <FaArrowRight size={12} />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-danger-custom flex-1 d-flex align-items-center justify-content-center gap-1 py-2 fw-bold"
            onClick={() => setShowConfirmModal(true)}
          >
            <span>Nộp bài</span> <FaCheckCircle size={12} />
          </button>
        )}
      </div>

      {/* Mobile Question Sheet / Drawer */}
      {showDrawer && (
        <div className="exam-drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="exam-drawer" onClick={e => e.stopPropagation()}>
            <div className="exam-drawer-header">
              <div>
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaListOl className="text-primary" /> Mục lục câu hỏi
                </h6>
                <small className="text-secondary">
                  Đã làm: <strong className="text-success">{answeredCount}</strong> / {allQuestions.length} ({progressPercent}%)
                </small>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowDrawer(false)}
              />
            </div>

            {/* Filter Tabs */}
            <div className="d-flex gap-2 p-2 px-3 bg-light border-bottom">
              <button
                type="button"
                className={`btn btn-sm ${drawerFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'} flex-1 fw-semibold`}
                onClick={() => setDrawerFilter('all')}
              >
                Tất cả ({allQuestions.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${drawerFilter === 'unanswered' ? 'btn-danger' : 'btn-outline-secondary'} flex-1 fw-semibold`}
                onClick={() => setDrawerFilter('unanswered')}
              >
                Chưa làm ({allQuestions.length - answeredCount})
              </button>
            </div>

            {/* Drawer Body - Question bubbles */}
            <div className="exam-drawer-body">
              <div className="question-nav justify-content-center">
                {allQuestions.map((_, index) => {
                  const isAnswered = answers[index] !== undefined
                  const isCurrent = currentQIndex === index

                  if (drawerFilter === 'unanswered' && isAnswered) {
                    return null
                  }

                  return (
                    <button
                      key={index}
                      type="button"
                      className={`question-nav-btn ${isAnswered ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}
                      onClick={() => {
                        setCurrentQIndex(index)
                        setShowDrawer(false)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="exam-drawer-footer">
              <button
                type="button"
                className="btn btn-danger-custom w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-bold"
                onClick={() => {
                  setShowDrawer(false)
                  setShowConfirmModal(true)
                }}
              >
                <FaCheckCircle /> Nộp bài thi ({answeredCount}/{allQuestions.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Violation Warning Modal (Warn up to 3 times before auto-submit) */}
      {showViolationModal && (
        <div className="entrance-overlay" style={{ zIndex: 3000 }}>
          <div className="entrance-modal border border-danger shadow-lg" style={{ maxWidth: '500px' }}>
            <div className="text-center mb-3">
              <div className="d-inline-flex p-3 rounded-circle bg-danger bg-opacity-10 text-danger mb-2">
                <FaExclamationTriangle size={46} className="fa-beat" />
              </div>
              <h4 className="fw-bold text-danger mb-1">CẢNH BÁO VI PHẠM QUY CHẾ</h4>
              <span className="badge bg-danger fs-6 px-3 py-1 rounded-pill">
                Lần vi phạm: {violationsCount} / {MAX_VIOLATIONS}
              </span>
            </div>

            <div className="p-3 mb-3 rounded-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 small">
              <p className="mb-2 text-dark fw-bold">
                Hệ thống phát hiện hành vi bất thường:
              </p>
              <div className="p-2 bg-white rounded border border-danger text-danger fw-semibold mb-2">
                ⚠️ {violationReason}
              </div>
              <p className="mb-0 text-secondary" style={{ fontSize: '0.85rem' }}>
                Hành vi này đã được ghi lại trong hồ sơ thi của bạn. Bạn còn <strong>{MAX_VIOLATIONS - violationsCount} lần cảnh báo nữa</strong> trước khi hệ thống tự động thu bài và chấm điểm.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-danger-custom w-100 py-3 fs-6 d-flex align-items-center justify-content-center gap-2 fw-bold"
              onClick={() => {
                setShowViolationModal(false)
                enterFullscreen()
              }}
            >
              <FaExpand /> Tôi Đã Hiểu & Tiếp Tục Làm Bài
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Submit Modal */}
      {showConfirmModal && (
        <div className="entrance-overlay">
          <div className="entrance-modal">
            <div className="text-center mb-3">
              <FaExclamationTriangle size={44} className="text-warning mb-2" />
              <h4 className="fw-bold">Xác Nhận Nộp Bài</h4>
              <p className="text-secondary small mb-0">Bạn có chắc chắn muốn kết thúc bài thi không?</p>
            </div>

            <div className="p-3 bg-light rounded-3 my-3">
              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-secondary">Số câu đã làm:</span>
                <strong className="text-success">{answeredCount} / {allQuestions.length}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-secondary">Số câu chưa làm:</span>
                <strong className="text-danger">{allQuestions.length - answeredCount} câu</strong>
              </div>
              <div className="d-flex justify-content-between small">
                <span className="text-secondary">Thời gian còn lại:</span>
                <strong className="text-primary">{formatTime(timeLeft)}</strong>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary flex-1 py-2 fw-semibold"
                onClick={() => setShowConfirmModal(false)}
              >
                Tiếp tục làm
              </button>
              <button
                type="button"
                className="btn btn-danger-custom flex-1 py-2 fw-bold"
                onClick={() => {
                  setShowConfirmModal(false)
                  executeSubmit(0, 'Thí sinh chủ động bấm nộp bài')
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

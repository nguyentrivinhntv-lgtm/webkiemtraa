import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  FaArrowLeft, FaArrowRight, FaBookOpen, FaCheck, FaTimes,
  FaRedo, FaHome, FaRandom, FaEye, FaLightbulb, FaChartBar
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import { getQuizAdmin } from '../services/api'

function ReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 })
  const [answeredMap, setAnsweredMap] = useState({}) // { index: 'correct'|'wrong' }
  const [shuffle, setShuffle] = useState(false)
  const [filterUnit, setFilterUnit] = useState('all')
  const [showPassage, setShowPassage] = useState(true)

  useEffect(() => {
    loadQuiz()
  }, [id])

  const loadQuiz = async () => {
    try {
      const res = await getQuizAdmin(id)
      setQuiz(res.data)
    } catch (err) {
      toast.error('Không tìm thấy bài thi')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  // Get all questions with correct answers included
  const allQuestionsRaw = useMemo(() => {
    if (!quiz) return []
    if (quiz.type === 'multiple-choice') return quiz.questions || []
    return quiz.passages?.flatMap((p, pi) =>
      p.questions.map(q => ({ ...q, passageTitle: p.title, passageText: p.text, passageIndex: pi }))
    ) || []
  }, [quiz])

  // Extract unique units
  const units = useMemo(() => {
    const unitSet = new Set()
    allQuestionsRaw.forEach(q => {
      if (q.unit) unitSet.add(q.unit)
      if (q.passageTitle) unitSet.add(q.passageTitle)
    })
    return ['all', ...Array.from(unitSet)]
  }, [allQuestionsRaw])

  // Filter & shuffle
  const allQuestions = useMemo(() => {
    let filtered = allQuestionsRaw
    if (filterUnit !== 'all') {
      filtered = filtered.filter(q => q.unit === filterUnit || q.passageTitle === filterUnit)
    }
    if (shuffle) {
      filtered = [...filtered].sort(() => Math.random() - 0.5)
    }
    return filtered
  }, [allQuestionsRaw, filterUnit, shuffle])

  const currentQ = allQuestions[currentQIndex]

  const handleSelect = (optIndex) => {
    if (revealed) return
    setSelectedAnswer(optIndex)
    setRevealed(true)

    const isCorrect = optIndex === currentQ.correctAnswer
    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
      total: prev.total + 1
    }))
    setAnsweredMap(prev => ({
      ...prev,
      [currentQIndex]: isCorrect ? 'correct' : 'wrong'
    }))
  }

  const handleNext = () => {
    if (currentQIndex < allQuestions.length - 1) {
      setCurrentQIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setRevealed(false)
    }
  }

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1)
      setSelectedAnswer(null)
      setRevealed(false)
    }
  }

  const handleJump = (index) => {
    setCurrentQIndex(index)
    setSelectedAnswer(null)
    setRevealed(false)
  }

  const handleReset = () => {
    setCurrentQIndex(0)
    setSelectedAnswer(null)
    setRevealed(false)
    setStats({ correct: 0, wrong: 0, total: 0 })
    setAnsweredMap({})
    toast.info('Đã reset tiến trình ôn tập!')
  }

  const handleToggleShuffle = () => {
    setShuffle(prev => !prev)
    setCurrentQIndex(0)
    setSelectedAnswer(null)
    setRevealed(false)
    toast.info(shuffle ? 'Đã tắt xáo trộn câu hỏi' : 'Đã bật xáo trộn câu hỏi')
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-custom"></div>
      </div>
    )
  }

  if (!quiz || allQuestions.length === 0) {
    return (
      <div className="container text-center py-5">
        <h4>Không có câu hỏi nào</h4>
        <Link to="/" className="btn btn-primary-custom mt-3"><FaHome className="me-2" /> Về trang chủ</Link>
      </div>
    )
  }

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <Link to="/" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 mb-1">
            <FaArrowLeft /> Về trang chủ
          </Link>
          <h3 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <FaBookOpen className="text-primary" /> Ôn Tập: {quiz.title}
          </h3>
        </div>

        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm ${shuffle ? 'btn-warning' : 'btn-outline-secondary'}`}
            onClick={handleToggleShuffle}
            title="Xáo trộn câu hỏi"
          >
            <FaRandom className="me-1" /> {shuffle ? 'Đang xáo' : 'Xáo trộn'}
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={handleReset}>
            <FaRedo className="me-1" /> Reset
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="card-custom p-3 mb-4 border">
        <div className="row g-3 text-center">
          <div className="col-3">
            <div className="small text-secondary">Tiến trình</div>
            <div className="fw-bold text-primary">{stats.total} / {allQuestions.length}</div>
          </div>
          <div className="col-3">
            <div className="small text-secondary">Đúng ✓</div>
            <div className="fw-bold text-success">{stats.correct}</div>
          </div>
          <div className="col-3">
            <div className="small text-secondary">Sai ✗</div>
            <div className="fw-bold text-danger">{stats.wrong}</div>
          </div>
          <div className="col-3">
            <div className="small text-secondary">Tỷ lệ</div>
            <div className={`fw-bold ${accuracy >= 70 ? 'text-success' : accuracy >= 50 ? 'text-warning' : 'text-danger'}`}>
              {accuracy}%
            </div>
          </div>
        </div>
        {/* Progress */}
        <div className="progress mt-3" style={{ height: '8px' }}>
          <div className="progress-bar bg-success" style={{ width: `${(stats.correct / allQuestions.length) * 100}%` }}></div>
          <div className="progress-bar bg-danger" style={{ width: `${(stats.wrong / allQuestions.length) * 100}%` }}></div>
        </div>
      </div>

      <div className="row g-4">
        {/* Main Area */}
        <div className="col-lg-8">
          {/* Unit Filter */}
          {units.length > 2 && (
            <div className="mb-3">
              <select
                className="form-select form-select-sm"
                value={filterUnit}
                onChange={e => { setFilterUnit(e.target.value); setCurrentQIndex(0); setSelectedAnswer(null); setRevealed(false) }}
              >
                {units.map(u => (
                  <option key={u} value={u}>{u === 'all' ? '📚 Tất cả các phần' : u}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reading Passage (if applicable) */}
          {currentQ.passageText && showPassage && (
            <div className="card-custom mb-3 border border-warning border-opacity-50">
              <div className="card-header bg-warning bg-opacity-10 border-bottom border-warning border-opacity-25 py-2 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold text-dark mb-0 small">📖 {currentQ.passageTitle}</h6>
                <button className="btn btn-sm btn-link text-secondary p-0" onClick={() => setShowPassage(false)}>Thu gọn</button>
              </div>
              <div className="card-body p-3">
                <p className="lh-lg mb-0 small" style={{ whiteSpace: 'pre-line' }}>{currentQ.passageText}</p>
              </div>
            </div>
          )}
          {currentQ.passageText && !showPassage && (
            <button className="btn btn-sm btn-outline-warning mb-3" onClick={() => setShowPassage(true)}>
              <FaEye className="me-1" /> Hiện đoạn văn
            </button>
          )}

          {/* Question Card */}
          <div className="question-card shadow-sm border">
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <span className="question-number">{currentQIndex + 1}</span>
                <span className="badge bg-light text-secondary border small">
                  {currentQ.unit || currentQ.section || `Câu ${currentQIndex + 1} / ${allQuestions.length}`}
                </span>
              </div>
              {answeredMap[currentQIndex] && (
                <span className={`badge ${answeredMap[currentQIndex] === 'correct' ? 'bg-success' : 'bg-danger'}`}>
                  {answeredMap[currentQIndex] === 'correct' ? '✓ Đã trả lời đúng' : '✗ Đã trả lời sai'}
                </span>
              )}
            </div>

            <h5 className="fw-bold mb-4 text-dark lh-base">{currentQ.question}</h5>

            {/* Options with instant feedback */}
            <div className="options-list">
              {currentQ.options?.map((opt, optIndex) => {
                const isSelected = selectedAnswer === optIndex
                const isCorrectOpt = currentQ.correctAnswer === optIndex

                let btnClass = 'option-btn'
                if (revealed) {
                  if (isCorrectOpt) btnClass += ' correct'
                  else if (isSelected && !isCorrectOpt) btnClass += ' wrong'
                } else if (isSelected) {
                  btnClass += ' selected'
                }

                return (
                  <button
                    key={optIndex}
                    type="button"
                    className={btnClass}
                    onClick={() => handleSelect(optIndex)}
                    style={{ cursor: revealed ? 'default' : 'pointer' }}
                  >
                    <span className="option-label">{opt.label}</span>
                    <span className="flex-1">{opt.text}</span>

                    {revealed && isCorrectOpt && (
                      <span className="badge bg-success bg-opacity-25 text-success ms-auto px-2 py-1">
                        <FaCheck className="me-1" /> Đáp án đúng
                      </span>
                    )}
                    {revealed && isSelected && !isCorrectOpt && (
                      <span className="badge bg-danger bg-opacity-25 text-danger ms-auto px-2 py-1">
                        <FaTimes className="me-1" /> Sai
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Hint when not revealed */}
            {!revealed && !answeredMap[currentQIndex] && (
              <div className="mt-3 p-2 rounded-3 bg-info bg-opacity-10 text-info small d-flex align-items-center gap-2">
                <FaLightbulb /> Hãy chọn đáp án. Kết quả sẽ hiện ngay sau khi bạn chọn!
              </div>
            )}

            {/* Revealed feedback + Next button */}
            {revealed && (
              <div className={`mt-3 p-3 rounded-3 ${selectedAnswer === currentQ.correctAnswer ? 'bg-success' : 'bg-danger'} bg-opacity-10 border`}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  {selectedAnswer === currentQ.correctAnswer ? (
                    <><FaCheck className="text-success" /> <strong className="text-success">Chính xác! 🎉</strong></>
                  ) : (
                    <><FaTimes className="text-danger" /> <strong className="text-danger">
                      Chưa đúng! Đáp án đúng là: {currentQ.options[currentQ.correctAnswer]?.label}. {currentQ.options[currentQ.correctAnswer]?.text}
                    </strong></>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
              <button className="btn btn-outline-secondary px-4" disabled={currentQIndex === 0} onClick={handlePrev}>
                <FaArrowLeft className="me-2" /> Câu trước
              </button>
              <span className="text-secondary small">{currentQIndex + 1} / {allQuestions.length}</span>
              {currentQIndex < allQuestions.length - 1 ? (
                <button className="btn btn-primary-custom px-4" onClick={handleNext}>
                  Câu tiếp <FaArrowRight className="ms-2" />
                </button>
              ) : (
                <button
                  className="btn btn-success-custom px-4"
                  onClick={() => toast.success(`Hoàn thành ôn tập! Đúng ${stats.correct}/${stats.total} (${accuracy}%)`)}
                >
                  <FaChartBar className="me-2" /> Xem tổng kết
                </button>
              )}
            </div>
          </div>

          {/* Summary when done */}
          {stats.total === allQuestions.length && (
            <div className="card-custom mt-4 p-4 text-center border border-primary">
              <h4 className="fw-bold mb-3">🏆 Hoàn Thành Ôn Tập!</h4>
              <div className="result-circle mx-auto mb-3" style={{ width: 140, height: 140 }}>
                <div className="result-score" style={{ fontSize: '3rem' }}>{accuracy}%</div>
                <span className="text-secondary small">Tỷ lệ đúng</span>
              </div>
              <p className="mb-3 text-secondary">
                Bạn đã trả lời đúng <strong className="text-success">{stats.correct}</strong> trên <strong>{stats.total}</strong> câu hỏi.
              </p>
              <div className="d-flex justify-content-center gap-3">
                <button className="btn btn-outline-primary" onClick={handleReset}>
                  <FaRedo className="me-2" /> Ôn lại từ đầu
                </button>
                <Link to={`/quiz/${id}`} className="btn btn-primary-custom">
                  Vào thi chính thức →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Question Map */}
        <div className="col-lg-4">
          <div className="card-custom p-4 sticky-top border" style={{ top: '20px' }}>
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <FaBookOpen className="text-primary" /> Mục lục ôn tập
            </h6>

            <div className="question-nav mb-3" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {allQuestions.map((_, index) => {
                const status = answeredMap[index]
                const isCurrent = currentQIndex === index
                let cls = 'question-nav-btn'
                if (status === 'correct') cls += ' answered' // green
                if (status === 'wrong') cls += ' wrong-nav'
                if (isCurrent) cls += ' current'
                return (
                  <button
                    key={index}
                    className={cls}
                    onClick={() => handleJump(index)}
                    title={`Câu ${index + 1}`}
                    style={status === 'wrong' ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' } : {}}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

            <div className="small text-secondary mb-3">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--primary)', display: 'inline-block' }}></span>
                Đúng ({stats.correct})
              </div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--danger)', display: 'inline-block' }}></span>
                Sai ({stats.wrong})
              </div>
              <div className="d-flex align-items-center gap-2">
                <span style={{ width: 14, height: 14, borderRadius: 4, background: '#e8ecf4', display: 'inline-block', border: '1px solid #ccc' }}></span>
                Chưa làm ({allQuestions.length - stats.total})
              </div>
            </div>

            <hr />

            <Link to={`/quiz/${id}`} className="btn btn-primary-custom w-100 d-flex align-items-center justify-content-center gap-2">
              📝 Vào thi chính thức
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewPage


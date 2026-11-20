import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  FaCheck, FaTimes, FaHome, FaTrophy, FaRedo, FaFilter,
  FaCheckCircle, FaTimesCircle, FaClock, FaUser, FaMedal, FaFire, FaLightbulb,
  FaRobot, FaSpinner, FaVolumeUp
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import { getAiExplanationApi } from '../services/api'

function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.result
  const [filter, setFilter] = useState('all') // 'all', 'wrong', 'correct'
  const [aiExplanations, setAiExplanations] = useState({})
  const [aiLoading, setAiLoading] = useState({})
  const [speakingIdx, setSpeakingIdx] = useState(null)

  const handleSpeakExplanation = (text, idx) => {
    if (!window.speechSynthesis) {
      toast.warning('Trình duyệt không hỗ trợ phát âm TTS.')
      return
    }

    if (speakingIdx === idx) {
      window.speechSynthesis.cancel()
      setSpeakingIdx(null)
      return
    }

    window.speechSynthesis.cancel()

    const cleanText = (text || '')
      .replace(/[#*`_~]/g, '')
      .replace(/[🎯💡📌⚡✨🎉⚠️✓✗]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)
    const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(cleanText)
    utterance.lang = isVi ? 'vi-VN' : 'en-US'
    utterance.rate = 1.0

    const voices = window.speechSynthesis.getVoices() || []
    if (voices.length > 0) {
      if (isVi) {
        const viVoice = voices.find(v => (v.lang && v.lang.startsWith('vi')) || (v.name && v.name.toLowerCase().includes('vietnam')))
        if (viVoice) utterance.voice = viVoice
      } else {
        const enVoice = voices.find(v => v.lang && v.lang.startsWith('en'))
        if (enVoice) utterance.voice = enVoice
      }
    }

    utterance.onstart = () => setSpeakingIdx(idx)
    utterance.onend = () => setSpeakingIdx(null)
    utterance.onerror = () => setSpeakingIdx(null)

    window.speechSynthesis.speak(utterance)
  }

  const handleRequestAiExplain = async (idx, item) => {
    if (aiExplanations[idx]) return
    setAiLoading(prev => ({ ...prev, [idx]: true }))
    try {
      const res = await getAiExplanationApi({
        quizId: result.quizId,
        quizTitle: result.quizTitle || '',
        questionIndex: item.questionIndex !== undefined ? item.questionIndex : idx,
        question: item.question,
        options: item.options,
        correctAnswer: item.correctAnswer,
        studentAnswer: item.studentAnswer
      })
      setAiExplanations(prev => ({ ...prev, [idx]: res.data.explanation }))
      if (res.data.fromCache) {
        toast.success('⚡ Đã tải lời giải thích (đã lưu sẵn trong CSDL)!')
      } else {
        toast.success('✨ Đã sinh lời giải thích AI và tự động lưu vào CSDL!')
      }
    } catch (err) {
      toast.error('Không thể tạo giải thích AI lúc này: ' + err.message)
    } finally {
      setAiLoading(prev => ({ ...prev, [idx]: false }))
    }
  }

  const handleRetakeWrongQuestions = () => {
    const wrongQs = (result.details || [])
      .filter(d => !d.isCorrect)
      .map((d, newIdx) => ({
        id: newIdx + 1,
        question: d.question,
        options: d.options,
        originalIndex: d.questionIndex,
        explanation: d.explanation
      }))

    if (wrongQs.length === 0) {
      toast.info('🎉 Bạn không làm sai câu nào! Xuất sắc!')
      return
    }

    const quizTargetId = result.quizId || location.state?.quizId || ''
    navigate(`/quiz/${quizTargetId}`, {
      state: { retakeQuestions: wrongQs }
    })
  }

  if (!result) {
    return (
      <div className="container text-center py-5">
        <div className="card-custom p-5 max-w-md mx-auto">
          <h4 className="fw-bold mb-3">Không tìm thấy kết quả làm bài</h4>
          <p className="text-secondary mb-4">Bạn chưa tham gia bài thi hoặc phiên làm bài đã kết thúc.</p>
          <Link to="/" className="btn btn-primary-custom">
            <FaHome className="me-2" /> Về trang chủ
          </Link>
        </div>
      </div>
    )
  }

  const formatTime = (seconds) => {
    if (!seconds) return '0 giây'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs} giây`
    return `${mins} phút ${secs} giây`
  }

  const filteredDetails = (result.details || []).filter(item => {
    if (filter === 'correct') return item.isCorrect
    if (filter === 'wrong') return !item.isCorrect
    return true
  })

  // Grade color
  const scoreNum = parseFloat(result.score)
  const isHigh = scoreNum >= 8.0
  const isPass = scoreNum >= 5.0

  return (
    <div className="container py-4">
      {/* Result Hero Banner */}
      <div className="card-custom text-center p-5 mb-5 shadow-sm border">
        <div className="mb-3">
          <div className="d-inline-flex p-3 rounded-circle bg-warning bg-opacity-10 text-warning">
            <FaTrophy size={48} />
          </div>
        </div>

        <h2 className="fw-bold mb-1">Kết Quả Bài Kiểm Tra</h2>
        <p className="text-secondary fs-5 mb-4">{result.quizTitle}</p>

        {/* Violation Warning Banner */}
        {location.state?.violationReason && location.state.violationReason.includes('Bị thu bài') && (
          <div className="alert alert-danger mx-auto mb-4 py-2 px-3 fw-bold small text-start border border-danger" style={{ maxWidth: '600px' }}>
            ⚠️ BÀI THI BỊ THU BÀI ĐỘT NGỘT: {location.state.violationReason}. Hệ thống đã tự động chấm điểm đến câu hỏi bạn đã làm trước khi vi phạm.
          </div>
        )}

        {/* Score Ring */}
        <div className="result-circle mb-4">
          <div className="result-score">{result.score}</div>
          <span className="text-secondary fw-semibold">Thang điểm 10</span>
        </div>

        {/* Rating text */}
        <div className="mb-4">
          {isHigh ? (
            <span className="badge bg-success fs-6 px-4 py-2 rounded-pill">
              🌟 Xuất sắc! Kết quả rất tốt!
            </span>
          ) : isPass ? (
            <span className="badge bg-primary fs-6 px-4 py-2 rounded-pill">
              👍 Đạt yêu cầu!
            </span>
          ) : (
            <span className="badge bg-danger fs-6 px-4 py-2 rounded-pill">
              ⚠️ Cần cố gắng ôn tập thêm!
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="row g-3 justify-content-center mb-4 text-start">
          <div className="col-6 col-md-3">
            <div className="p-3 rounded-3 bg-light border h-100">
              <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
                <FaUser /> Sinh viên
              </span>
              <strong className="fs-6 text-dark d-block text-truncate">
                {result.studentName}
              </strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-3 rounded-3 bg-light border h-100">
              <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
                <FaCheckCircle className="text-success" /> Số câu đúng
              </span>
              <strong className="fs-6 text-success d-block">
                {result.correctCount} / {result.totalQuestions}
              </strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-3 rounded-3 bg-light border h-100">
              <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
                <FaTimesCircle className="text-danger" /> Số câu sai
              </span>
              <strong className="fs-6 text-danger d-block">
                {result.wrongCount} / {result.totalQuestions}
              </strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="p-3 rounded-3 bg-light border h-100">
              <span className="text-secondary small d-flex align-items-center gap-1 mb-1">
                <FaClock /> Thời gian làm
              </span>
              <strong className="fs-6 text-dark d-block">
                {formatTime(result.timeSpent)}
              </strong>
            </div>
          </div>
        </div>

        {/* XP Reward Gamification Banner */}
        <div className="p-3 rounded-3 bg-warning bg-opacity-10 border border-warning border-opacity-50 mx-auto mb-4 d-inline-flex flex-column align-items-center" style={{ minWidth: 280 }}>
          <span className="small text-dark fw-semibold mb-1">
            🌟 Điểm Kinh Nghiệm Học Tập Tích Lũy:
          </span>
          <div className="d-flex align-items-center gap-2">
            <span className="fs-3 fw-bold text-warning">
              +{(30 + (result.correctCount || 0) * 10 + (parseFloat(result.score) === 10 ? 50 : 0) + (result.tabSwitches === 0 ? 20 : 0))} XP
            </span>
            <span className="badge bg-warning text-dark fw-bold">Level Up!</span>
          </div>
          <div className="d-flex flex-wrap justify-content-center gap-2 small text-secondary mt-1" style={{ fontSize: '0.78rem' }}>
            <span>+30 Bài thi</span> • <span>+{(result.correctCount || 0) * 10} Câu đúng</span>
            {parseFloat(result.score) === 10 && <span> • +50 Điểm 10</span>}
            {result.tabSwitches === 0 && <span> • +20 Trung thực</span>}
          </div>
        </div>

        <div className="d-flex flex-wrap justify-content-center gap-3">
          {result.wrongCount > 0 && (
            <button
              type="button"
              className="btn btn-warning text-dark fw-bold d-flex align-items-center gap-2 px-4 py-2 shadow-sm border border-warning"
              onClick={handleRetakeWrongQuestions}
            >
              <FaRedo /> Luyện Lại {result.wrongCount} Câu Sai
            </button>
          )}
          <Link to="/" className="btn btn-outline-secondary d-flex align-items-center gap-2 px-4 py-2">
            <FaHome /> Về trang chủ
          </Link>
          <Link to="/leaderboard" className="btn btn-outline-primary d-flex align-items-center gap-2 px-4 py-2 fw-semibold">
            <FaTrophy /> Bảng Xếp Hạng
          </Link>
          <Link to="/profile" className="btn btn-primary-custom d-flex align-items-center gap-2 px-4 py-2 fw-bold">
            <FaMedal /> Xem Huy Hiệu & Cấp Độ
          </Link>
        </div>
      </div>

      {/* Answer Review Section */}
      {result.showResult && result.details?.length > 0 && (
        <div className="card-custom p-4 border">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
            <h4 className="fw-bold mb-0">Chi Tiết Từng Câu Hỏi</h4>

            {/* Filter Buttons */}
            <div className="btn-group" role="group">
              <button
                type="button"
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFilter('all')}
              >
                Tất cả ({result.totalQuestions})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filter === 'wrong' ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => setFilter('wrong')}
              >
                Chỉ câu sai ({result.wrongCount})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filter === 'correct' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setFilter('correct')}
              >
                Chỉ câu đúng ({result.correctCount})
              </button>
            </div>
          </div>

          {filteredDetails.length === 0 ? (
            <div className="text-center py-5 text-secondary">
              Không có câu hỏi nào theo bộ lọc đã chọn.
            </div>
          ) : (
            filteredDetails.map((item, idx) => (
              <div key={idx} className="question-card mb-3 border">
                <div className="d-flex align-items-start mb-3 gap-3">
                  <span
                    className="question-number"
                    style={{
                      background: item.isCorrect ? 'var(--success)' : 'var(--danger)',
                      width: 32,
                      height: 32,
                      fontSize: '0.85rem'
                    }}
                  >
                    {item.isCorrect ? <FaCheck /> : <FaTimes />}
                  </span>

                  <div className="flex-1">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="fw-bold text-dark">Câu {item.questionIndex + 1}:</span>
                      <span className={`badge ${item.isCorrect ? 'bg-success' : 'bg-danger'}`}>
                        {item.isCorrect ? 'Đúng' : 'Sai'}
                      </span>
                    </div>
                    <p className="mb-0 text-dark fw-medium">{item.question}</p>
                  </div>
                </div>

                <div className="options-list ms-md-5">
                  {item.options?.map((opt, optIndex) => {
                    const isSelected = item.studentAnswer === optIndex
                    const isCorrect = item.correctAnswer === optIndex

                    let btnClass = 'option-btn'
                    if (isCorrect) btnClass += ' correct'
                    else if (isSelected && !isCorrect) btnClass += ' wrong'

                    return (
                      <div key={optIndex} className={btnClass} style={{ cursor: 'default' }}>
                        <span className="option-label">{opt.label}</span>
                        <span className="flex-1">{opt.text}</span>

                        {isCorrect && (
                          <span className="badge bg-success bg-opacity-25 text-success ms-2 px-2 py-1">
                            ✓ Đáp án đúng
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="badge bg-danger bg-opacity-25 text-danger ms-2 px-2 py-1">
                            ✗ Bạn đã chọn
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {item.explanation && (
                  <div className="mt-2 ms-md-5 p-2 rounded-2 bg-primary bg-opacity-10 border border-primary border-opacity-25 small text-dark">
                    <strong className="text-primary d-flex align-items-center gap-1 mb-1">
                      <FaLightbulb /> Giải thích & Mẹo ngữ pháp:
                    </strong>
                    <span style={{ whiteSpace: 'pre-line' }}>{item.explanation}</span>
                  </div>
                )}

                {/* AI Assistant Explanation Button & Display */}
                <div className="mt-2 ms-md-5">
                  {!aiExplanations[idx] ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-info d-flex align-items-center gap-1 fw-semibold py-1 px-3"
                      style={{ fontSize: '0.8rem', borderRadius: '16px' }}
                      disabled={aiLoading[idx]}
                      onClick={() => handleRequestAiExplain(idx, item)}
                    >
                      {aiLoading[idx] ? (
                        <><FaSpinner className="fa-spin" /> Đang phân tích AI...</>
                      ) : (
                        <><FaRobot className="text-info" /> ✨ Trợ lý AI Phân Tích Câu Này</>
                      )}
                    </button>
                  ) : (
                    <div className="p-3 rounded-3 bg-light border border-info border-opacity-50 small mt-2">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2 text-info fw-bold">
                          <FaRobot size={15} /> Phân Tích & Hướng Dẫn Chi Tiết Của AI:
                        </div>
                        <button
                          type="button"
                          className={`btn btn-sm ${speakingIdx === idx ? 'btn-info text-white' : 'btn-outline-info'} py-0 px-2 d-flex align-items-center gap-1`}
                          style={{ fontSize: '0.75rem', borderRadius: '15px' }}
                          onClick={() => handleSpeakExplanation(aiExplanations[idx], idx)}
                          title="Nghe phát âm lời giải thích của AI"
                        >
                          <FaVolumeUp /> {speakingIdx === idx ? 'Dừng đọc' : 'Nghe đọc giải thích'}
                        </button>
                      </div>
                      <div className="text-dark lh-base" style={{ whiteSpace: 'pre-line', fontSize: '0.88rem' }}>
                        {aiExplanations[idx]}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default ResultPage

import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  FaCheck, FaTimes, FaHome, FaTrophy, FaRedo, FaFilter,
  FaCheckCircle, FaTimesCircle, FaClock, FaUser
} from 'react-icons/fa'

function ResultPage() {
  const location = useLocation()
  const result = location.state?.result
  const [filter, setFilter] = useState('all') // 'all', 'wrong', 'correct'

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

        <div className="d-flex justify-content-center gap-3">
          <Link to="/" className="btn btn-primary-custom d-flex align-items-center gap-2 px-4 py-2">
            <FaHome /> Về trang chủ
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
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default ResultPage

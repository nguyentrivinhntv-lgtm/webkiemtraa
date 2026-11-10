import { useState, useEffect } from 'react'
import { FaUpload, FaTrash, FaCheck, FaTimes, FaFileWord, FaSpinner } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { uploadWordFile, confirmQuiz, getQuizList, deleteQuiz } from '../services/api'

function AdminPage() {
  const [quizzes, setQuizzes] = useState([])
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [settings, setSettings] = useState({
    title: '',
    timeLimit: 60,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResult: true
  })

  useEffect(() => {
    loadQuizzes()
  }, [])

  const loadQuizzes = async () => {
    try {
      const res = await getQuizList()
      setQuizzes(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return
    if (!file.name.endsWith('.docx')) {
      toast.error('Chỉ chấp nhận file .docx!')
      return
    }

    setUploading(true)
    setPreview(null)

    try {
      const res = await uploadWordFile(file)
      setPreview(res.data.preview)
      setSettings(prev => ({
        ...prev,
        title: res.data.preview.title || 'Bài kiểm tra'
      }))
      toast.success(`Đã phân tích ${res.data.preview.totalQuestions} câu hỏi!`)
    } catch (err) {
      toast.error('Lỗi: ' + (err.response?.data?.error || err.message))
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileUpload(file)
  }

  const handleConfirm = async () => {
    if (!preview) return

    try {
      const res = await confirmQuiz(preview, settings)
      toast.success('🎉 Đã lưu bài thi thành công!')
      setPreview(null)
      loadQuizzes()
    } catch (err) {
      toast.error('Lỗi lưu: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài thi này?')) return
    try {
      await deleteQuiz(id)
      toast.success('Đã xóa bài thi')
      loadQuizzes()
    } catch (err) {
      toast.error('Lỗi xóa')
    }
  }

  return (
    <div className="container">
      <h2 className="fw-bold mb-4">⚙️ Quản Lý Bài Thi</h2>

      {/* Upload Section */}
      <div className="card-custom mb-4">
        <div className="card-header-custom">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <FaUpload /> Upload File Word
          </h5>
        </div>
        <div className="card-body p-4">
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput').click()}
          >
            {uploading ? (
              <div>
                <FaSpinner className="upload-icon fa-spin" />
                <p className="fs-5 fw-bold">Đang phân tích file...</p>
              </div>
            ) : (
              <div>
                <div className="upload-icon">
                  <FaFileWord />
                </div>
                <p className="fs-5 fw-bold mb-1">Kéo thả file .docx vào đây</p>
                <p className="text-secondary">hoặc click để chọn file</p>
              </div>
            )}
            <input
              type="file"
              id="fileInput"
              accept=".docx"
              hidden
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />
          </div>

          <div className="mt-3 p-3 rounded" style={{ background: '#f0f8ff', border: '1px solid #d0e8ff' }}>
            <strong>📌 Định dạng file Word được hỗ trợ:</strong>
            <ul className="mb-0 mt-1">
              <li>Câu hỏi: <code>Câu 1.</code> hoặc <code>Question 1.</code></li>
              <li>Đáp án: <code>A.</code> <code>B.</code> <code>C.</code> <code>D.</code></li>
              <li>Đáp án đúng: <strong>in đậm (Bold)</strong></li>
              <li>Bài đọc hiểu: có <code>Passage</code> + đoạn văn + câu hỏi</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {preview && (
        <div className="card-custom mb-4">
          <div className="card-header-custom" style={{
            background: 'linear-gradient(135deg, #06d6a0, #05c090)'
          }}>
            <h5 className="mb-0">👁️ Xem trước - {preview.totalQuestions} câu hỏi</h5>
          </div>
          <div className="card-body p-4">
            {/* Settings */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label fw-bold">Tên bài thi</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.title}
                  onChange={e => setSettings({ ...settings, title: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-bold">Thời gian (phút)</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings.timeLimit}
                  min={1}
                  onChange={e => setSettings({ ...settings, timeLimit: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-bold">Tùy chọn</label>
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="shuffle"
                    checked={settings.shuffleQuestions}
                    onChange={e => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="shuffle">Trộn câu hỏi</label>
                </div>
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="showResult"
                    checked={settings.showResult}
                    onChange={e => setSettings({ ...settings, showResult: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="showResult">Hiện đáp án</label>
                </div>
              </div>
            </div>

            {/* Preview Questions */}
            <div className="preview-section mb-4">
              {preview.type === 'multiple-choice' && preview.questions?.slice(0, 5).map((q, i) => (
                <div key={i} className="mb-3 p-3 bg-white rounded">
                  <div className="d-flex align-items-start mb-2">
                    <span className="question-number">{q.id || i + 1}</span>
                    <strong>{q.question}</strong>
                  </div>
                  {q.options?.map((opt, j) => (
                    <div key={j} className={`ms-5 ${j === q.correctAnswer ? 'text-success fw-bold' : ''}`}>
                      {j === q.correctAnswer && <FaCheck className="me-1" />}
                      {opt.label}. {opt.text}
                    </div>
                  ))}
                </div>
              ))}

              {preview.type === 'reading-comprehension' && preview.passages?.slice(0, 2).map((p, pi) => (
                <div key={pi} className="mb-4">
                  <h6 className="fw-bold text-primary">{p.title}</h6>
                  <div className="passage-card mb-2">{p.text?.substring(0, 200)}...</div>
                  {p.questions?.slice(0, 3).map((q, qi) => (
                    <div key={qi} className="mb-2 ms-3">
                      <strong>{q.id}. {q.question}</strong>
                      {q.options?.map((opt, j) => (
                        <div key={j} className={`ms-3 ${j === q.correctAnswer ? 'text-success fw-bold' : ''}`}>
                          {j === q.correctAnswer && <FaCheck className="me-1" />}
                          {opt.label}. {opt.text}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              {preview.totalQuestions > 5 && (
                <p className="text-center text-secondary mt-3">
                  ... và {preview.totalQuestions - 5} câu hỏi khác
                </p>
              )}
            </div>

            <div className="d-flex gap-3">
              <button className="btn btn-success-custom" onClick={handleConfirm}>
                <FaCheck className="me-2" /> Xác nhận & Lưu bài thi
              </button>
              <button className="btn btn-outline-secondary" onClick={() => setPreview(null)}>
                <FaTimes className="me-2" /> Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz List */}
      <div className="card-custom">
        <div className="card-header-custom">
          <h5 className="mb-0">📋 Danh sách bài thi ({quizzes.length})</h5>
        </div>
        <div className="card-body p-4">
          {quizzes.length === 0 ? (
            <div className="empty-state py-4">
              <p className="text-secondary">Chưa có bài thi nào. Upload file Word để bắt đầu!</p>
            </div>
          ) : (
            quizzes.map(quiz => (
              <div key={quiz.id} className="quiz-card d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="fw-bold mb-1">{quiz.title}</h6>
                  <div className="d-flex gap-3 text-secondary small">
                    <span className={`quiz-type-badge ${quiz.type === 'multiple-choice' ? 'badge-mc' : 'badge-rc'}`}>
                      {quiz.type === 'multiple-choice' ? 'Trắc nghiệm' : 'Đọc hiểu'}
                    </span>
                    <span>{quiz.totalQuestions} câu</span>
                    <span>{quiz.timeLimit} phút</span>
                    <span>{new Date(quiz.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                <button
                  className="btn btn-danger-custom btn-sm"
                  onClick={() => handleDelete(quiz.id)}
                >
                  <FaTrash />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage


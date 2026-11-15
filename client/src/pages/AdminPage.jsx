import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  FaUpload, FaTrash, FaCheck, FaTimes, FaFileWord, FaFileExcel, FaDownload,
  FaSpinner, FaPaste, FaBookOpen, FaPlay, FaEye, FaPlus, FaLightbulb
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import {
  uploadWordFile, parseTextQuestions, confirmQuiz,
  getQuizList, deleteQuiz, downloadExcelTemplateApi
} from '../services/api'

function AdminPage() {
  const [quizzes, setQuizzes] = useState([])
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [activeTab, setActiveTab] = useState('file') // 'file' or 'text'
  const [pastedText, setPastedText] = useState('')
  const [pastedTitle, setPastedTitle] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const fileInputRef = useRef(null)

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

  // Handle File Upload (.docx, .xlsx, .xls)
  const handleFileUpload = async (file) => {
    if (!file) return
    setSelectedFileName(file.name)

    const lower = file.name.toLowerCase()
    const isDocx = lower.endsWith('.docx')
    const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls')

    if (!isDocx && !isExcel) {
      toast.error('Vui lòng chọn file định dạng Word (.docx) hoặc Excel (.xlsx, .xls)')
      return
    }

    setUploading(true)
    setPreview(null)

    try {
      const res = await uploadWordFile(file)
      setPreview(res.data.preview)
      setSettings(prev => ({
        ...prev,
        title: res.data.preview.title || file.name.replace(/\.[^/.]+$/, '')
      }))
      const fileTypeLabel = isExcel ? 'Excel' : 'Word'
      toast.success(`🎉 Phân tích file ${fileTypeLabel} thành công: ${res.data.preview.totalQuestions} câu hỏi!`)
    } catch (err) {
      toast.error('Lỗi phân tích: ' + (err.response?.data?.error || err.message))
    } finally {
      setUploading(false)
    }
  }

  // Handle Download Excel Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadExcelTemplateApi()
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Mau_De_Thi_Trac_Nghiem.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('📥 Đã tải file mẫu Excel (.xlsx) thành công!')
    } catch (err) {
      toast.error('Lỗi tải file mẫu: ' + (err.response?.data?.error || err.message))
    }
  }

  // Handle Direct Text Paste
  const handleParseText = async (e) => {
    e.preventDefault()
    if (!pastedText.trim()) {
      toast.warning('Vui lòng dán nội dung câu hỏi!')
      return
    }

    setUploading(true)
    setPreview(null)

    try {
      const res = await parseTextQuestions(pastedText, pastedTitle)
      setPreview(res.data.preview)
      setSettings(prev => ({
        ...prev,
        title: res.data.preview.title || pastedTitle || 'Bài kiểm tra trắc nghiệm'
      }))
      toast.success(`🎉 Phân tích thành công ${res.data.preview.totalQuestions} câu hỏi!`)
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
      await confirmQuiz(preview, settings)
      toast.success('🎉 Đã lưu bài thi vào hệ thống thành công!')
      setPreview(null)
      setPastedText('')
      setSelectedFileName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadQuizzes()
    } catch (err) {
      toast.error('Lỗi lưu: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài thi "${title}"?`)) return
    try {
      await deleteQuiz(id)
      toast.success('Đã xóa bài thi')
      loadQuizzes()
    } catch (err) {
      toast.error('Lỗi xóa: ' + err.message)
    }
  }

  return (
    <div className="container py-3 pb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1 fs-3">⚙️ Quản Lý & Thêm Đề Thi</h2>
          <p className="text-secondary small mb-0">Tải file Word hoặc dán trực tiếp câu hỏi từ điện thoại / máy tính</p>
        </div>
        <Link to="/" className="btn btn-outline-primary btn-sm d-none d-sm-inline-flex">
          ← Về trang chủ
        </Link>
      </div>

      {/* Main Upload Card */}
      <div className="card-custom mb-4 border">
        {/* Tab Selection */}
        <div className="border-bottom bg-light p-2 d-flex gap-2">
          <button
            type="button"
            className={`btn btn-sm flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
              activeTab === 'file' ? 'btn-primary' : 'btn-outline-secondary bg-white'
            }`}
            onClick={() => { setActiveTab('file'); setPreview(null); }}
          >
            <FaFileWord className="text-primary-emphasis" /> <FaFileExcel className="text-success" /> Tải file Word (.docx) / Excel (.xlsx)
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
              activeTab === 'text' ? 'btn-primary' : 'btn-outline-secondary bg-white'
            }`}
            onClick={() => { setActiveTab('text'); setPreview(null); }}
          >
            <FaPaste /> Dán văn bản (Copy/Paste)
          </button>
        </div>

        <div className="card-body p-3 p-md-4">
          {/* TAB 1: File Word & Excel Upload */}
          {activeTab === 'file' && (
            <div>
              <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''} text-center p-4 rounded-3 border-2 border-dashed`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                {uploading ? (
                  <div className="py-3">
                    <FaSpinner className="upload-icon fa-spin text-primary" size={40} />
                    <p className="fs-6 fw-bold mt-2 mb-0">Đang phân tích câu hỏi...</p>
                    <span className="text-secondary small">Vui lòng chờ trong giây lát</span>
                  </div>
                ) : (
                  <div className="py-2">
                    <div className="mb-2 d-flex justify-content-center gap-3">
                      <FaFileWord size={44} className="text-primary opacity-75" />
                      <FaFileExcel size={44} className="text-success opacity-75" />
                    </div>
                    <h6 className="fw-bold mb-1">
                      {selectedFileName ? `📄 ${selectedFileName}` : 'Chạm vào đây để chọn file Word (.docx) hoặc Excel (.xlsx, .xls)'}
                    </h6>
                    <p className="text-secondary small mb-3">
                      Hỗ trợ chọn file từ điện thoại (Zalo, Tệp, Google Drive) hoặc máy tính
                    </p>

                    <div className="d-flex flex-wrap justify-content-center gap-2">
                      <label
                        htmlFor="mobileFileInput"
                        className="btn btn-primary-custom px-4 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📁 Chọn File Từ Thiết Bị
                      </label>
                      <button
                        type="button"
                        className="btn btn-outline-success px-3 py-2 d-flex align-items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadTemplate()
                        }}
                        title="Tải template mẫu Excel để nhập đề thi"
                      >
                        <FaDownload /> Tải Mẫu Excel (.xlsx)
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      id="mobileFileInput"
                      accept=".docx,.xlsx,.xls,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0])
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-3 p-3 rounded-3 bg-light border small">
                <div className="row g-2">
                  <div className="col-12 col-md-6 border-end-md">
                    <strong className="text-primary d-flex align-items-center gap-1">
                      <FaFileWord /> Định dạng file Word (.docx):
                    </strong>
                    <ul className="mb-0 mt-1 ps-3 text-secondary">
                      <li>Câu hỏi: <code>1. She goes to...</code> hoặc <code>Câu 1.</code></li>
                      <li>Đáp án: <code>A. </code> <code>B. </code> <code>C. </code> <code>D. </code></li>
                      <li>Đáp án đúng: Bảng <code>ĐÁP ÁN: 1. A 2. B...</code> ở cuối hoặc <strong>in đậm</strong>.</li>
                      <li>Đọc hiểu: Bắt đầu bằng <code>READING 1</code> hoặc <code>Passage 1</code>.</li>
                    </ul>
                  </div>
                  <div className="col-12 col-md-6">
                    <strong className="text-success d-flex align-items-center gap-1">
                      <FaFileExcel /> Định dạng file Excel (.xlsx, .xls):
                    </strong>
                    <ul className="mb-0 mt-1 ps-3 text-secondary">
                      <li>Các cột: <code>Câu hỏi</code>, <code>A</code>, <code>B</code>, <code>C</code>, <code>D</code>.</li>
                      <li>Đáp án đúng: Cột <code>Đáp án đúng</code> (A, B, C hoặc D).</li>
                      <li>Giải thích & Mẹo: Cột <code>Giải thích</code> hoặc <code>Explanation</code>.</li>
                      <li>Phân nhóm: Cột <code>Phần / Unit</code> (tùy chọn).</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Direct Text Paste */}
          {activeTab === 'text' && (
            <form onSubmit={handleParseText}>
              <div className="mb-3">
                <label className="form-label fw-bold small text-secondary">TIÊU ĐỀ BÀI THI</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Kiểm tra 15 phút Tiếng Anh"
                  value={pastedTitle}
                  onChange={e => setPastedTitle(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold small text-secondary">DÁN NỘI DUNG CÂU HỎI VÀ ĐÁP ÁN *</label>
                <textarea
                  className="form-control"
                  rows={8}
                  placeholder={`1. She ______ to the gym every morning.
A. goes
B. go
C. going
D. gone

ĐÁP ÁN:
1. A`}
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  required
                />
                <span className="form-text small text-secondary">
                  💡 Bạn có thể sao chép văn bản từ Zalo, Word, Messenger hoặc Ghi chú và dán vào đây.
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary-custom w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                disabled={uploading}
              >
                {uploading ? (
                  <><FaSpinner className="fa-spin" /> Đang phân tích...</>
                ) : (
                  <><FaCheck /> Phân Tích & Tạo Câu Hỏi</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Preview Section (Appears after analysis) */}
      {preview && (
        <div className="card-custom mb-4 border border-success">
          <div className="card-header bg-success text-white py-3 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <FaEye /> Xem trước: {preview.totalQuestions} câu hỏi
            </h6>
            <span className="badge bg-white text-success fw-bold">
              {preview.type === 'multiple-choice' ? 'Trắc nghiệm' : 'Đọc hiểu'}
            </span>
          </div>

          <div className="card-body p-3 p-md-4">
            {/* Exam Settings */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-6">
                <label className="form-label fw-bold small text-secondary">TÊN BÀI THI</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.title}
                  onChange={e => setSettings({ ...settings, title: e.target.value })}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label fw-bold small text-secondary">THỜI GIAN (PHÚT)</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  value={settings.timeLimit}
                  onChange={e => setSettings({ ...settings, timeLimit: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label fw-bold small text-secondary">TÙY CHỌN</label>
                <div className="form-check form-switch mt-1">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="shuffleCheck"
                    checked={settings.shuffleQuestions}
                    onChange={e => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
                  />
                  <label className="form-check-label small" htmlFor="shuffleCheck">Trộn câu hỏi</label>
                </div>
              </div>
            </div>

            {/* Questions Sample */}
            <h6 className="fw-bold small text-secondary mb-2">DANH SÁCH CÂU HỎI MẪU:</h6>
            <div className="preview-section mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {preview.type === 'multiple-choice' && preview.questions?.slice(0, 5).map((q, i) => (
                <div key={i} className="p-3 mb-2 bg-light rounded-3 border">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong className="text-dark">Câu {q.id || i + 1}: {q.question}</strong>
                    {q.unit && <span className="badge bg-secondary small">{q.unit}</span>}
                  </div>
                  {q.options?.map((opt, oi) => (
                    <div key={oi} className={`small ${oi === q.correctAnswer ? 'text-success fw-bold' : 'text-secondary'}`}>
                      {oi === q.correctAnswer ? '✓ ' : '• '} {opt.label}. {opt.text}
                    </div>
                  ))}
                  {q.explanation && (
                    <div className="mt-2 p-2 rounded-2 bg-primary bg-opacity-10 text-primary small d-flex align-items-start gap-1">
                      <FaLightbulb className="mt-1 flex-shrink-0" />
                      <div><strong>Giải thích:</strong> {q.explanation}</div>
                    </div>
                  )}
                </div>
              ))}

              {preview.type === 'reading-comprehension' && preview.passages?.slice(0, 2).map((p, pi) => (
                <div key={pi} className="p-3 mb-3 bg-light rounded-3 border">
                  <h6 className="fw-bold text-primary mb-1">{p.title}</h6>
                  <p className="small text-secondary mb-2 text-truncate">{p.text}</p>
                  <span className="badge bg-secondary">{p.questions?.length} câu hỏi</span>
                </div>
              ))}

              {preview.totalQuestions > 5 && (
                <p className="text-center text-secondary small mt-2 mb-0">
                  ... và {preview.totalQuestions - 5} câu hỏi khác đã được ghi nhận.
                </p>
              )}
            </div>

            {/* Confirm Actions */}
            <div className="d-flex flex-column flex-sm-row gap-2">
              <button className="btn btn-success-custom flex-fill py-2" onClick={handleConfirm}>
                <FaCheck className="me-2" /> Xác Nhận & Lưu Vào Hệ Thống
              </button>
              <button className="btn btn-outline-secondary py-2" onClick={() => setPreview(null)}>
                <FaTimes className="me-1" /> Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz List */}
      <div className="card-custom border">
        <div className="card-header bg-light py-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold fs-6">📋 Các Đề Thi Đang Có ({quizzes.length})</h5>
          <span className="small text-secondary">Sinh viên có thể thấy các đề này</span>
        </div>

        <div className="card-body p-3 p-md-4">
          {quizzes.length === 0 ? (
            <div className="text-center py-4 text-secondary">
              Chưa có đề thi nào. Hãy tải file Word hoặc dán câu hỏi ở trên để bắt đầu!
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {quizzes.map(quiz => (
                <div key={quiz.id} className="p-3 rounded-3 border bg-white shadow-sm">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                    <div className="flex-1">
                      <h6 className="fw-bold mb-1 text-dark">{quiz.title}</h6>
                      <div className="d-flex flex-wrap gap-2 text-secondary small">
                        <span className="badge bg-primary bg-opacity-10 text-primary">
                          {quiz.type === 'multiple-choice' ? 'Trắc nghiệm' : 'Đọc hiểu'}
                        </span>
                        <span>📝 {quiz.totalQuestions} câu</span>
                        <span>⏱️ {quiz.timeLimit} phút</span>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 w-100 w-md-auto mt-2 mt-md-0">
                      <Link
                        to={`/review/${quiz.id}`}
                        className="btn btn-sm btn-outline-primary flex-fill flex-md-initial px-3"
                      >
                        <FaBookOpen className="me-1" /> Ôn tập
                      </Link>
                      <Link
                        to={`/quiz/${quiz.id}`}
                        className="btn btn-sm btn-primary-custom flex-fill flex-md-initial px-3"
                      >
                        <FaPlay className="me-1" /> Vào thi
                      </Link>
                      <button
                        className="btn btn-sm btn-outline-danger px-2"
                        onClick={() => handleDelete(quiz.id, quiz.title)}
                        title="Xóa bài thi"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage

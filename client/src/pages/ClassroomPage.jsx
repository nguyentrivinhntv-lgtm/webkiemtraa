import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaChalkboardTeacher, FaUserGraduate, FaPlus, FaCopy, FaCheck,
  FaCalendarAlt, FaClock, FaClipboardList, FaUsers, FaArrowLeft,
  FaTrashAlt, FaExclamationTriangle, FaSearch, FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  createClassroomApi,
  getTeacherClassroomsApi,
  getStudentClassroomsApi,
  joinClassroomApi,
  assignQuizToClassApi,
  getClassroomProgressApi,
  deleteClassroomApi,
  getQuizList
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function ClassroomPage() {
  const { user, isLoggedIn } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  // Student join code state
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Teacher create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [creating, setCreating] = useState(false);

  // Selected classroom detail & progress (Teacher view)
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classDetail, setClassDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'students' | 'progress'

  // Teacher assign quiz modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [assignForm, setAssignForm] = useState({ quizId: '', dueDate: '' });
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      loadClassrooms();
      if (isTeacher) {
        loadQuizzes();
      }
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, isTeacher]);

  const loadQuizzes = async () => {
    try {
      const res = await getQuizList();
      setAllQuizzes(res.data || []);
    } catch (err) {
      console.warn('Error loading quizzes list:', err);
    }
  };

  const loadClassrooms = async () => {
    setLoading(true);
    try {
      if (isTeacher) {
        const res = await getTeacherClassroomsApi();
        setClassrooms(res.data || []);
      } else {
        const res = await getStudentClassroomsApi();
        setClassrooms(res.data || []);
      }
    } catch (err) {
      toast.error('Lỗi tải danh sách lớp học: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = async (classId) => {
    setSelectedClassId(classId);
    setLoadingDetail(true);
    try {
      const res = await getClassroomProgressApi(classId);
      setClassDetail(res.data);
    } catch (err) {
      toast.error('Lỗi tải chi tiết lớp học: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      toast.success(`Đã sao chép mã lớp "${code}"!`);
      setTimeout(() => setCopiedCode(null), 2500);
    });
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      toast.warning('Vui lòng nhập tên lớp học');
      return;
    }

    setCreating(true);
    try {
      const res = await createClassroomApi({ name: newClassName.trim() });
      toast.success(`🎉 Đã tạo lớp "${res.data.classroom.name}" thành công!`);
      setNewClassName('');
      setShowCreateModal(false);
      loadClassrooms();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.warning('Vui lòng nhập mã lớp học');
      return;
    }

    setJoining(true);
    try {
      const res = await joinClassroomApi(joinCode.trim().toUpperCase());
      toast.success(res.data.message || '🎉 Đã tham gia lớp học thành công!');
      setJoinCode('');
      loadClassrooms();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleAssignQuiz = async (e) => {
    e.preventDefault();
    if (!assignForm.quizId) {
      toast.warning('Vui lòng chọn bài thi cần giao');
      return;
    }

    setAssigning(true);
    try {
      await assignQuizToClassApi(selectedClassId, assignForm);
      toast.success('🎉 Đã giao đề thi cho lớp học thành công!');
      setShowAssignModal(false);
      setAssignForm({ quizId: '', dueDate: '' });
      handleSelectClass(selectedClassId);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lớp học "${className}" không? Toàn bộ danh sách giao đề và tiến độ sẽ bị xóa.`)) {
      return;
    }

    try {
      await deleteClassroomApi(classId);
      toast.success(`Đã xóa lớp "${className}" thành công`);
      if (selectedClassId === classId) {
        setSelectedClassId(null);
        setClassDetail(null);
      }
      loadClassrooms();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container py-5 text-center">
        <div className="card-custom p-5 max-w-md mx-auto border shadow-sm">
          <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
            <FaChalkboardTeacher size={48} />
          </div>
          <h4 className="fw-bold mb-2">Quản Lý Lớp Học Trực Tuyến</h4>
          <p className="text-secondary mb-4">
            Đăng nhập tài khoản để tham gia lớp học, nhận bài tập được giao và theo dõi tiến độ thi cử.
          </p>
          <Link to="/login" className="btn btn-primary-custom px-4 py-2 fw-bold">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 pb-5">
      {/* Header Banner */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <Link to="/" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 mb-1">
            <FaArrowLeft /> Về trang chủ
          </Link>
          <h3 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <FaChalkboardTeacher className="text-primary" /> {isTeacher ? 'Quản Lý Lớp Học Giảng Dạy' : 'Lớp Học Của Tôi'}
          </h3>
          <p className="text-secondary small mb-0">
            {isTeacher
              ? 'Tạo lớp, cấp mã tham gia, giao đề thi và theo dõi tiến độ nộp bài của sinh viên'
              : 'Tham gia lớp bằng mã code và hoàn thành các bài thi được giảng viên giao'}
          </p>
        </div>

        {/* Action Button for Teacher */}
        {isTeacher && !selectedClassId && (
          <button
            type="button"
            className="btn btn-primary-custom d-flex align-items-center gap-2 px-3 py-2 fw-bold"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus /> Tạo Lớp Học Mới
          </button>
        )}
      </div>

      {/* Student: Join Class Form */}
      {!isTeacher && (
        <div className="card-custom p-4 mb-4 border shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, rgba(13, 148, 136, 0.08) 100%)' }}>
          <div className="row align-items-center g-3">
            <div className="col-12 col-md-7">
              <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <FaUserGraduate className="text-primary" /> Tham Gia Lớp Học Mới
              </h5>
              <p className="text-secondary small mb-0">
                Nhập mã lớp gồm 6 ký tự do giảng viên cung cấp để ghi danh vào lớp.
              </p>
            </div>
            <div className="col-12 col-md-5">
              <form onSubmit={handleJoinClass} className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control text-uppercase fw-bold text-center"
                  placeholder="MÃ LỚP (VD: ENG808)"
                  maxLength={10}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  style={{ letterSpacing: '2px' }}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary-custom px-4 fw-bold text-nowrap"
                  disabled={joining}
                >
                  {joining ? 'Đang vào...' : 'Tham Gia'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER VIEW: Class Details & Matrix Progress */}
      {isTeacher && selectedClassId && classDetail ? (
        <div>
          {/* Back Button & Class Summary */}
          <div className="card-custom p-4 mb-4 border shadow-sm">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm mb-2 d-flex align-items-center gap-1"
                  onClick={() => {
                    setSelectedClassId(null);
                    setClassDetail(null);
                  }}
                >
                  <FaArrowLeft /> Quay lại danh sách lớp
                </button>
                <h4 className="fw-bold mb-1 text-dark">{classDetail.classroom.name}</h4>
                <div className="d-flex flex-wrap align-items-center gap-3 small text-secondary">
                  <span>Mã lớp: <strong className="text-primary fs-6 px-2 py-0 bg-primary bg-opacity-10 rounded border border-primary border-opacity-25">{classDetail.classroom.code}</strong></span>
                  <span><FaUsers className="me-1" />{classDetail.classroom.totalStudents} sinh viên</span>
                  <span><FaClipboardList className="me-1" />{classDetail.classroom.totalAssignments} đề thi đã giao</span>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 fw-semibold"
                  onClick={() => handleCopyCode(classDetail.classroom.code)}
                >
                  {copiedCode === classDetail.classroom.code ? <><FaCheck className="text-success" /> Đã sao chép</> : <><FaCopy /> Sao chép mã lớp</>}
                </button>
                <button
                  type="button"
                  className="btn btn-primary-custom btn-sm d-flex align-items-center gap-1 fw-bold"
                  onClick={() => setShowAssignModal(true)}
                >
                  <FaPlus /> Giao Đề Thi Mới
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="d-flex gap-2 border-top mt-3 pt-3">
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'assignments' ? 'btn-primary' : 'btn-light border'} fw-semibold`}
                onClick={() => setActiveTab('assignments')}
              >
                <FaClipboardList className="me-1" /> Đề Thi Đã Giao ({classDetail.assignments?.length || 0})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'students' ? 'btn-primary' : 'btn-light border'} fw-semibold`}
                onClick={() => setActiveTab('students')}
              >
                <FaUsers className="me-1" /> Danh Sách Sinh Viên ({classDetail.classroom.totalStudents})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'progress' ? 'btn-primary' : 'btn-light border'} fw-semibold`}
                onClick={() => setActiveTab('progress')}
              >
                <FaCheckCircle className="me-1" /> Ma Trận Tiến Độ Nộp Bài
              </button>
            </div>
          </div>

          {/* TAB 1: Assignments List */}
          {activeTab === 'assignments' && (
            <div className="card-custom p-4 border shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 fs-6">Danh Sách Đề Thi Đã Giao</h5>
                <button
                  type="button"
                  className="btn btn-primary-custom btn-sm d-flex align-items-center gap-1"
                  onClick={() => setShowAssignModal(true)}
                >
                  <FaPlus /> Giao thêm đề
                </button>
              </div>

              {classDetail.assignments.length === 0 ? (
                <div className="text-center py-5 text-secondary">
                  <p className="mb-3">Chưa có đề thi nào được giao cho lớp này.</p>
                  <button
                    type="button"
                    className="btn btn-primary-custom btn-sm"
                    onClick={() => setShowAssignModal(true)}
                  >
                    Giao đề thi đầu tiên
                  </button>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {classDetail.assignments.map((assign, idx) => (
                    <div key={assign.id || idx} className="p-3 rounded-3 border bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div>
                        <h6 className="fw-bold text-dark mb-1">{assign.quizTitle}</h6>
                        <div className="small text-secondary d-flex flex-wrap gap-3">
                          <span>
                            <FaCalendarAlt className="me-1" />
                            Giao ngày: {new Date(assign.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                          {assign.dueDate && (
                            <span className="text-danger fw-semibold">
                              <FaClock className="me-1" />
                              Hạn chót: {new Date(assign.dueDate).toLocaleString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <Link to={`/teacher`} className="btn btn-outline-secondary btn-sm">
                          Xem bảng điểm
                        </Link>
                        <Link to={`/quiz/${assign.quizId}`} className="btn btn-primary-custom btn-sm" target="_blank">
                          Xem đề thi
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Students List */}
          {activeTab === 'students' && (
            <div className="card-custom p-4 border shadow-sm">
              <h5 className="fw-bold mb-3 fs-6">Danh Sách Sinh Viên Trong Lớp</h5>

              {classDetail.progressMatrix.length === 0 ? (
                <div className="text-center py-5 text-secondary">
                  <p className="mb-2">Chưa có sinh viên nào ghi danh vào lớp.</p>
                  <p className="small">Gửi mã lớp <strong>{classDetail.classroom.code}</strong> cho sinh viên để họ tham gia!</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th style={{ width: '60px' }}>STT</th>
                        <th>Họ Và Tên</th>
                        <th>Mã Sinh Viên</th>
                        <th>Email</th>
                        <th>Ngày Tham Gia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classDetail.progressMatrix.map((item, idx) => (
                        <tr key={item.student.userId || idx}>
                          <td className="fw-bold text-secondary">{idx + 1}</td>
                          <td>
                            <strong className="text-dark">{item.student.name}</strong>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {item.student.studentId || '-'}
                            </span>
                          </td>
                          <td className="small text-secondary">{item.student.email}</td>
                          <td className="small text-secondary">
                            {new Date(item.student.joinedAt).toLocaleDateString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Matrix Progress (Who submitted, who hasn't) */}
          {activeTab === 'progress' && (
            <div className="card-custom p-4 border shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 fs-6">Tiến Độ Làm Bài Của Toàn Lớp</h5>
                <span className="small text-secondary">Ma trận sinh viên vs bài kiểm tra</span>
              </div>

              {classDetail.assignments.length === 0 ? (
                <div className="text-center py-5 text-secondary">
                  <p>Hãy giao đề thi cho lớp để xem ma trận tiến độ.</p>
                </div>
              ) : classDetail.progressMatrix.length === 0 ? (
                <div className="text-center py-5 text-secondary">
                  <p>Lớp chưa có sinh viên tham gia.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered align-middle text-center mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th style={{ minWidth: 160 }} className="text-start">Sinh Viên</th>
                        {classDetail.assignments.map((assign, i) => (
                          <th key={assign.quizId || i} style={{ minWidth: 140 }}>
                            <div className="text-truncate" title={assign.quizTitle} style={{ maxWidth: 160 }}>
                              {assign.quizTitle}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classDetail.progressMatrix.map((item, idx) => (
                        <tr key={item.student.userId || idx}>
                          <td className="text-start">
                            <strong className="text-dark d-block">{item.student.name}</strong>
                            <small className="text-secondary">{item.student.studentId || item.student.email}</small>
                          </td>
                          {item.quizzes.map((qStatus, qIdx) => (
                            <td key={qIdx}>
                              {qStatus.isSubmitted ? (
                                <div>
                                  <span className={`badge fs-6 ${qStatus.score >= 8 ? 'bg-success' : qStatus.score >= 5 ? 'bg-primary' : 'bg-danger'}`}>
                                    {qStatus.score} / 10
                                  </span>
                                  {qStatus.tabSwitches > 0 && (
                                    <div className="small text-danger fw-bold mt-1" style={{ fontSize: '0.7rem' }}>
                                      ⚠️ Rời tab: {qStatus.tabSwitches}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 small">
                                  Chưa nộp
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* MAIN CLASSROOM LIST VIEW (Both Teacher and Student) */
        <div>
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner-custom"></div>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="card-custom p-5 text-center border shadow-sm">
              <div className="d-inline-flex p-3 rounded-circle bg-light text-secondary mb-3">
                <FaChalkboardTeacher size={48} />
              </div>
              <h5 className="fw-bold mb-2">
                {isTeacher ? 'Bạn chưa tạo lớp học nào' : 'Bạn chưa tham gia lớp học nào'}
              </h5>
              <p className="text-secondary mb-4">
                {isTeacher
                  ? 'Bấm nút "Tạo Lớp Học Mới" để tạo lớp và chia sẻ mã lớp cho học viên.'
                  : 'Hãy nhập mã lớp học gồm 6 ký tự ở trên để bắt đầu nhận bài tập và tham gia thi.'}
              </p>
              {isTeacher && (
                <button
                  type="button"
                  className="btn btn-primary-custom px-4 py-2 fw-bold"
                  onClick={() => setShowCreateModal(true)}
                >
                  <FaPlus className="me-2" /> Tạo Lớp Học Mới
                </button>
              )}
            </div>
          ) : (
            <div className="row g-3">
              {classrooms.map((cls) => {
                const studentCount = cls.students?.length || 0;
                const assignmentCount = cls.assignments?.length || 0;

                return (
                  <div key={cls.id} className="col-12 col-md-6 col-lg-4">
                    <div className="card-custom p-4 border shadow-sm h-100 d-flex flex-column justify-content-between">
                      <div>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">
                            Lớp học
                          </span>
                          {isTeacher && (
                            <button
                              type="button"
                              className="btn btn-link text-danger p-0 small"
                              title="Xóa lớp học"
                              onClick={() => handleDeleteClass(cls.id, cls.name)}
                            >
                              <FaTrashAlt />
                            </button>
                          )}
                        </div>

                        <h5 className="fw-bold text-dark mb-1">{cls.name}</h5>
                        {cls.teacherName && (
                          <p className="small text-secondary mb-3">
                            Giảng viên: <strong>{cls.teacherName}</strong>
                          </p>
                        )}

                        {/* Class Code Box */}
                        <div className="p-2 px-3 rounded-3 bg-light border d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <span className="small text-secondary d-block" style={{ fontSize: '0.7rem' }}>MÃ LỚP HỌC</span>
                            <strong className="fs-5 text-primary" style={{ letterSpacing: '1px' }}>{cls.code}</strong>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleCopyCode(cls.code)}
                            title="Sao chép mã lớp"
                          >
                            {copiedCode === cls.code ? <FaCheck className="text-success" /> : <FaCopy />}
                          </button>
                        </div>

                        <div className="d-flex justify-content-between small text-secondary mb-3">
                          <span><FaUsers className="me-1" />{studentCount} sinh viên</span>
                          <span><FaClipboardList className="me-1" />{assignmentCount} bài thi</span>
                        </div>

                        {/* Student View: Assignments in this class */}
                        {!isTeacher && assignmentCount > 0 && (
                          <div className="mb-3">
                            <span className="small fw-bold text-dark d-block mb-1">Đề thi được giao:</span>
                            <div className="d-flex flex-column gap-1">
                              {cls.assignments.map((as, idx) => (
                                <Link
                                  key={as.quizId || idx}
                                  to={`/quiz/${as.quizId}`}
                                  className="p-2 rounded border bg-light text-decoration-none d-flex justify-content-between align-items-center small"
                                >
                                  <span className="text-dark text-truncate fw-semibold" style={{ maxWidth: '180px' }}>
                                    {as.quizTitle}
                                  </span>
                                  <span className="badge bg-primary">Vào thi</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Teacher Action Button */}
                      {isTeacher && (
                        <button
                          type="button"
                          className="btn btn-primary-custom w-100 py-2 small fw-bold d-flex align-items-center justify-content-center gap-2"
                          onClick={() => handleSelectClass(cls.id)}
                        >
                          <FaUsers /> Quản Lý & Xem Tiến Độ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE CLASSROOM MODAL (Teacher) */}
      {showCreateModal && (
        <div className="entrance-overlay">
          <div className="entrance-modal" style={{ maxWidth: '480px' }}>
            <h4 className="fw-bold mb-3">Tạo Lớp Học Mới</h4>
            <form onSubmit={handleCreateClass}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">TÊN LỚP HỌC *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Tiếng Anh Chuyên Ngành B1 - Nhóm 2"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  required
                />
                <small className="text-secondary">Hệ thống sẽ tự động tạo một mã lớp gồm 6 ký tự viết hoa.</small>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary-custom flex-1 fw-bold"
                  disabled={creating}
                >
                  {creating ? 'Đang tạo...' : 'Tạo Lớp Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN QUIZ MODAL (Teacher) */}
      {showAssignModal && (
        <div className="entrance-overlay">
          <div className="entrance-modal" style={{ maxWidth: '500px' }}>
            <h4 className="fw-bold mb-3">Giao Đề Thi Cho Lớp</h4>
            <form onSubmit={handleAssignQuiz}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">CHỌN ĐỀ THI *</label>
                <select
                  className="form-select"
                  value={assignForm.quizId}
                  onChange={e => setAssignForm({ ...assignForm, quizId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn đề thi có sẵn --</option>
                  {allQuizzes.map(q => (
                    <option key={q.id} value={q.id}>{q.title} ({q.totalQuestions} câu)</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">HẠN NỘP (DEADLINE) - TÙY CHỌN</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={assignForm.dueDate}
                  onChange={e => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                />
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary flex-1"
                  onClick={() => setShowAssignModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary-custom flex-1 fw-bold"
                  disabled={assigning}
                >
                  {assigning ? 'Đang giao...' : 'Xác Nhận Giao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

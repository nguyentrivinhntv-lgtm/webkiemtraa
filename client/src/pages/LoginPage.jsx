import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaChalkboardTeacher, FaUserGraduate, FaArrowLeft } from 'react-icons/fa';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    studentId: '',
    classRoom: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Mật khẩu nhập lại không khớp!');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          toast.error('Mật khẩu phải có ít nhất 6 ký tự');
          setLoading(false);
          return;
        }

        await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          studentId: formData.studentId,
          classRoom: formData.classRoom
        });

        toast.success(`🎉 Chào mừng ${formData.name}! Đăng ký thành công!`);
        navigate(from, { replace: true });
      } else {
        const user = await login(formData.email, formData.password);
        toast.success(`👋 Chào mừng ${user.name} đã quay trở lại!`);
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-5">
          <div className="card-custom p-4 p-md-5 border shadow-sm">
            {/* Back link */}
            <Link to="/" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 mb-3">
              <FaArrowLeft /> Về trang chủ
            </Link>

            {/* Header */}
            <div className="text-center mb-4">
              <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-2">
                <FaUserGraduate size={36} />
              </div>
              <h3 className="fw-bold mb-1">
                {isRegister ? 'Tạo Tài Khoản Mới' : 'Đăng Nhập Hệ Thống'}
              </h3>
              <p className="text-secondary small mb-0">
                {isRegister
                  ? 'Tạo tài khoản để lưu lại lịch sử ôn thi và kết quả bài làm'
                  : 'Hệ thống học tập và kiểm tra trắc nghiệm online'}
              </p>
            </div>

            {/* Toggle Tabs */}
            <div className="d-flex bg-light p-1 rounded-3 mb-4">
              <button
                type="button"
                className={`btn btn-sm flex-fill py-2 fw-semibold ${!isRegister ? 'btn-white shadow-sm text-primary fw-bold' : 'text-secondary'}`}
                style={!isRegister ? { background: 'white' } : {}}
                onClick={() => setIsRegister(false)}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                className={`btn btn-sm flex-fill py-2 fw-semibold ${isRegister ? 'btn-white shadow-sm text-primary fw-bold' : 'text-secondary'}`}
                style={isRegister ? { background: 'white' } : {}}
                onClick={() => setIsRegister(true)}
              >
                Đăng Ký
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Register Fields */}
              {isRegister && (
                <>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">HỌ VÀ TÊN *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><FaUser className="text-secondary" /></span>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        placeholder="Ví dụ: Nguyễn Văn An"
                        required
                        value={formData.name}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">VAI TRÒ</label>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className={`btn btn-sm flex-fill py-2 d-flex align-items-center justify-content-center gap-2 ${formData.role === 'student' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setFormData(p => ({ ...p, role: 'student' }))}
                      >
                        <FaUserGraduate /> Sinh viên
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm flex-fill py-2 d-flex align-items-center justify-content-center gap-2 ${formData.role === 'teacher' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setFormData(p => ({ ...p, role: 'teacher' }))}
                      >
                        <FaChalkboardTeacher /> Giáo viên
                      </button>
                    </div>
                  </div>

                  {formData.role === 'student' && (
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary">MÃ SINH VIÊN</label>
                        <input
                          type="text"
                          name="studentId"
                          className="form-control form-control-sm"
                          placeholder="22DVT0123"
                          value={formData.studentId}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary">LỚP HỌC</label>
                        <input
                          type="text"
                          name="classRoom"
                          className="form-control form-control-sm"
                          placeholder="Tiếng Anh B1"
                          value={formData.classRoom}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Common Fields */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">EMAIL *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><FaEnvelope className="text-secondary" /></span>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="email@example.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">MẬT KHẨU *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><FaLock className="text-secondary" /></span>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    placeholder="Tối thiểu 6 ký tự"
                    required
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {isRegister && (
                <div className="mb-4">
                  <label className="form-label small fw-bold text-secondary">NHẬP LẠI MẬT KHẨU *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><FaLock className="text-secondary" /></span>
                    <input
                      type="password"
                      name="confirmPassword"
                      className="form-control"
                      placeholder="Xác nhận lại mật khẩu"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary-custom w-100 py-2 fs-6 mt-2 d-flex align-items-center justify-content-center"
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : (isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập')}
              </button>
            </form>

            <div className="text-center mt-4 pt-3 border-top">
              <span className="text-secondary small">
                {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
              </span>
              <button
                type="button"
                className="btn btn-link p-0 small fw-bold text-primary"
                onClick={() => setIsRegister(!isRegister)}
              >
                {isRegister ? 'Đăng nhập ngay' : 'Đăng ký miễn phí'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

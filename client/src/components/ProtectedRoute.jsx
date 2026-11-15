import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useEffect } from 'react';

export default function ProtectedRoute({ children, requireTeacher = false }) {
  const { isLoggedIn, isTeacherOrAdmin, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      toast.info('Vui lòng đăng nhập để tiếp tục!');
    } else if (!loading && isLoggedIn && requireTeacher && !isTeacherOrAdmin) {
      toast.warning('Bạn không có quyền truy cập trang quản lý của giáo viên!');
    }
  }, [loading, isLoggedIn, isTeacherOrAdmin, requireTeacher]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-custom"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireTeacher && !isTeacherOrAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

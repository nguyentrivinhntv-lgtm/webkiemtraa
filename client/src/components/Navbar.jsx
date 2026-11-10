import { Link, useLocation } from 'react-router-dom'
import { FaGraduationCap, FaHome, FaCog } from 'react-icons/fa'

function Navbar() {
  const location = useLocation()

  return (
    <nav className="navbar navbar-expand-lg navbar-custom">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <FaGraduationCap size={28} />
          <span>QuizMaster</span>
        </Link>

        <button className="navbar-toggler border-0" type="button"
          data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className={`nav-link d-flex align-items-center gap-1 ${location.pathname === '/' ? 'active' : ''}`} to="/">
                <FaHome /> Trang chủ
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link d-flex align-items-center gap-1 ${location.pathname === '/admin' ? 'active' : ''}`} to="/admin">
                <FaCog /> Quản lý
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar


import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaGraduationCap, FaHome, FaCog, FaBars, FaTimes } from 'react-icons/fa'

function Navbar() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(prev => !prev)
  const closeMenu = () => setIsOpen(false)

  return (
    <>
      <nav className="navbar navbar-custom sticky-top">
        <div className="container d-flex justify-content-between align-items-center">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/" onClick={closeMenu}>
            <FaGraduationCap size={28} />
            <span>QuizMaster</span>
          </Link>

          {/* Desktop Nav */}
          <div className="d-none d-md-flex align-items-center gap-2">
            <Link
              className={`nav-link-custom ${location.pathname === '/' ? 'active' : ''}`}
              to="/"
            >
              <FaHome /> Trang chủ
            </Link>
            <Link
              className={`nav-link-custom ${location.pathname === '/admin' ? 'active' : ''}`}
              to="/admin"
            >
              <FaCog /> Quản lý đề thi
            </Link>
          </div>

          {/* Mobile Right Quick Action & Hamburger */}
          <div className="d-flex d-md-none align-items-center gap-2">
            <Link
              to="/admin"
              className={`btn btn-sm btn-light fw-bold px-3 py-1 text-primary ${location.pathname === '/admin' ? 'border-warning' : ''}`}
              onClick={closeMenu}
            >
              <FaCog className="me-1" /> Quản lý
            </Link>

            <button
              className="btn btn-outline-light btn-sm border-0 px-2 py-1"
              type="button"
              onClick={toggleMenu}
              aria-label="Toggle navigation"
            >
              {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (Controlled via React State) */}
        {isOpen && (
          <div className="d-md-none mobile-nav-dropdown border-top border-white border-opacity-10 py-2 mt-2 w-100">
            <div className="container d-flex flex-column gap-1">
              <Link
                className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`}
                to="/"
                onClick={closeMenu}
              >
                <FaHome className="me-2" /> Trang chủ
              </Link>
              <Link
                className={`mobile-nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
                to="/admin"
                onClick={closeMenu}
              >
                <FaCog className="me-2" /> Quản lý & Thêm đề thi
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <div className="mobile-bottom-nav d-flex d-md-none justify-content-around align-items-center">
        <Link
          to="/"
          className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <FaHome size={20} />
          <span>Trang chủ</span>
        </Link>
        <Link
          to="/admin"
          className={`bottom-nav-item ${location.pathname === '/admin' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <FaCog size={20} />
          <span>Quản lý</span>
        </Link>
      </div>
    </>
  )
}

export default Navbar

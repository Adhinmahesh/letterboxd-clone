import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './Navbar.css'

function Navbar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const username = localStorage.getItem('username') || 'USER'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    window.location.reload() // Refresh to clear state
  }
  return (
    <nav className="navbar">
      <div className="navbar-container">

        <div className="navbar-left">

          <div className="logo">
            <span className="logo-dots">
              <span className="dot orange"></span>
              <span className="dot green"></span>
              <span className="dot blue"></span>
            </span>

            <span className="logo-text">letterboxd</span>
          </div>

          <div className="nav-links">
            <Link to="/film">FILMS</Link>
            <a href="#">LISTS</a>
            <a href="#">MEMBERS</a>
            <a href="#">JOURNAL</a>
          </div>

        </div>

        <div className="navbar-right">

          {token ? (
            <div className="navbar-user-actions">
              <div className="user-profile" onClick={handleLogout} title="Click to logout for now">
                <div className="avatar"></div>
                <span className="username">{username.toUpperCase()}</span>
                <span className="dropdown-arrow">▼</span>
              </div>
              <button className="log-btn">+ LOG</button>
            </div>
          ) : (
            <>
              <Link to="/login" className="login-link">
                SIGN IN
              </Link>

              <Link to="/signup" className="signup-link">
                CREATE ACCOUNT
              </Link>
            </>
          )}

          <button className="search-btn" aria-label="Search">
            <span>⌕</span>
          </button>

        </div>

      </div>
    </nav>
  )
}

export default Navbar
import { useEffect, useState, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './UserLists.css'

function UserLists() {
  const { username: paramUsername } = useParams()
  const token = localStorage.getItem('token')
  const storedUsername = localStorage.getItem('username')
  const username = paramUsername || storedUsername || 'adhin1234'
  const isOwner = Boolean(storedUsername && storedUsername.toLowerCase() === username.toLowerCase())

  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('your-lists') // 'your-lists' or 'shared'
  const [filterVis, setFilterVis] = useState('all') // 'all', 'public', 'private'
  const [sortBy, setSortBy] = useState('updated') // 'updated', 'name', 'films', 'likes'
  const [viewMode, setViewMode] = useState('all') // 'all', 'non-empty'
  const [feedbackMsg, setFeedbackMsg] = useState('')

  // Dropdown menus
  const [showVisDropdown, setShowVisDropdown] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showViewDropdown, setShowViewDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowVisDropdown(false)
        setShowSortDropdown(false)
        setShowViewDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    fetchUserLists()
  }, [username])

  const fetchUserLists = async () => {
    try {
      setLoading(true)
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const res = await fetch(`http://localhost:5000/api/lists/user/${username}`, { headers })
      const data = await res.json()
      setLists(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setLists([])
    } finally {
      setLoading(false)
    }
  }

  const deleteList = async (id, e) => {
    e.preventDefault()
    if (!window.confirm('Are you sure you want to delete this list?')) return

    try {
      const res = await fetch(`http://localhost:5000/api/lists/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setLists(lists.filter(l => l._id !== id))
        setFeedbackMsg('List deleted successfully')
        setTimeout(() => setFeedbackMsg(''), 3000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 5-poster fan stack
  const PosterStack = ({ films = [] }) => {
    const displayFilms = films.slice(0, 5)
    return (
      <div className="user-list-poster-stack">
        {displayFilms.map((film, idx) => (
          <div key={film.movieId || idx} className={`user-stacked-poster layer-${idx}`}>
            {film.posterPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w300${film.posterPath}`}
                alt={film.title || ''}
                loading="lazy"
              />
            ) : (
              <div className="user-stacked-placeholder">🎞</div>
            )}
          </div>
        ))}
        {displayFilms.length === 0 && (
          <div className="user-empty-stack">Empty</div>
        )}
      </div>
    )
  }

  // Filter & sort
  let displayedLists = [...lists]

  if (activeTab === 'shared') {
    displayedLists = []
  } else {
    if (filterVis === 'public') {
      displayedLists = displayedLists.filter(l => l.visibility === 'public')
    } else if (filterVis === 'private') {
      displayedLists = displayedLists.filter(l => l.visibility === 'private')
    }

    if (viewMode === 'non-empty') {
      displayedLists = displayedLists.filter(l => (l.films?.length || 0) > 0)
    }

    displayedLists.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '')
      }
      if (sortBy === 'films') {
        return (b.films?.length || 0) - (a.films?.length || 0)
      }
      if (sortBy === 'likes') {
        return (b.likes?.length || 0) - (a.likes?.length || 0)
      }
      // 'updated' default
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    })
  }

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name': return 'Sort by NAME'
      case 'films': return 'Sort by FILM COUNT'
      case 'likes': return 'Sort by LIKES'
      default: return 'Sort by WHEN UPDATED'
    }
  }

  return (
    <div className="user-lists-page">
      <Navbar />

      {/* Sub-header Profile Nav Bar */}
      <div className="user-lists-subnav-container">
        <div className="user-lists-profile-bar">
          <div className="profile-bar-left">
            <div className="profile-bar-avatar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#89a">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <span className="profile-bar-username">{username}</span>
          </div>

          <div className="profile-bar-tabs">
            <Link to={`/${username}`}>Activity</Link>
            <Link to={`/${username}/films`}>Films</Link>
            <Link to={`/${username}/diary`}>Diary</Link>
            <Link to={`/${username}/reviews`}>Reviews</Link>
            <Link to={`/${username}/watchlist`}>Watchlist</Link>
            <Link to={`/${username}/lists`} className="active-tab">Lists</Link>
            <Link to={`/${username}/likes`}>Likes</Link>
            <Link to={`/${username}/network`}>Network</Link>
          </div>

          <div className="profile-bar-actions">
            <Link to="/search" className="subnav-icon-btn" title="Search">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </Link>
            <button className="subnav-icon-btn" title="RSS Feed">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <circle cx="6.18" cy="17.82" r="2.18"/>
                <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="user-lists-layout">
        <div className="user-lists-main">
          {/* Header Subtitle Row */}
          <div className="user-lists-header-row" ref={dropdownRef}>
            <div className="lists-toggle-tabs">
              <span
                className={`list-subtab ${activeTab === 'your-lists' ? 'active' : ''}`}
                onClick={() => setActiveTab('your-lists')}
              >
                YOUR LISTS
              </span>
              <span
                className={`list-subtab ${activeTab === 'shared' ? 'active' : ''}`}
                onClick={() => setActiveTab('shared')}
              >
                SHARED WITH YOU
              </span>
            </div>

            <div className="user-lists-filters">
              {/* Visibility Dropdown */}
              <div className="user-filter-dropdown-container">
                <span
                  className={`filter-pill ${filterVis !== 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setShowVisDropdown(!showVisDropdown)
                    setShowSortDropdown(false)
                    setShowViewDropdown(false)
                  }}
                >
                  Show {filterVis === 'all' ? 'ALL' : filterVis.toUpperCase()} ▾
                </span>
                {showVisDropdown && (
                  <div className="user-filter-menu">
                    <div
                      className={`user-filter-item ${filterVis === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        setFilterVis('all')
                        setShowVisDropdown(false)
                      }}
                    >
                      Show All
                    </div>
                    <div
                      className={`user-filter-item ${filterVis === 'public' ? 'active' : ''}`}
                      onClick={() => {
                        setFilterVis('public')
                        setShowVisDropdown(false)
                      }}
                    >
                      Public lists
                    </div>
                    {isOwner && (
                      <div
                        className={`user-filter-item ${filterVis === 'private' ? 'active' : ''}`}
                        onClick={() => {
                          setFilterVis('private')
                          setShowVisDropdown(false)
                        }}
                      >
                        Private lists
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="user-filter-dropdown-container">
                <span
                  className={`filter-pill ${sortBy !== 'updated' ? 'active' : ''}`}
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown)
                    setShowVisDropdown(false)
                    setShowViewDropdown(false)
                  }}
                >
                  {getSortLabel()} ▾
                </span>
                {showSortDropdown && (
                  <div className="user-filter-menu">
                    <div
                      className={`user-filter-item ${sortBy === 'updated' ? 'active' : ''}`}
                      onClick={() => {
                        setSortBy('updated')
                        setShowSortDropdown(false)
                      }}
                    >
                      When updated
                    </div>
                    <div
                      className={`user-filter-item ${sortBy === 'name' ? 'active' : ''}`}
                      onClick={() => {
                        setSortBy('name')
                        setShowSortDropdown(false)
                      }}
                    >
                      List name (A–Z)
                    </div>
                    <div
                      className={`user-filter-item ${sortBy === 'films' ? 'active' : ''}`}
                      onClick={() => {
                        setSortBy('films')
                        setShowSortDropdown(false)
                      }}
                    >
                      Film count (highest)
                    </div>
                    <div
                      className={`user-filter-item ${sortBy === 'likes' ? 'active' : ''}`}
                      onClick={() => {
                        setSortBy('likes')
                        setShowSortDropdown(false)
                      }}
                    >
                      Most likes
                    </div>
                  </div>
                )}
              </div>

              {/* View Dropdown */}
              <div className="user-filter-dropdown-container">
                <span
                  className={`filter-pill view-eye ${viewMode !== 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setShowViewDropdown(!showViewDropdown)
                    setShowVisDropdown(false)
                    setShowSortDropdown(false)
                  }}
                >
                  👁 {viewMode === 'non-empty' ? 'Non-empty' : ''} ▾
                </span>
                {showViewDropdown && (
                  <div className="user-filter-menu">
                    <div
                      className={`user-filter-item ${viewMode === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        setViewMode('all')
                        setShowViewDropdown(false)
                      }}
                    >
                      Show all
                    </div>
                    <div
                      className={`user-filter-item ${viewMode === 'non-empty' ? 'active' : ''}`}
                      onClick={() => {
                        setViewMode('non-empty')
                        setShowViewDropdown(false)
                      }}
                    >
                      Hide empty lists
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="user-lists-divider"></div>

          {feedbackMsg && (
            <div className="user-lists-toast">
              {feedbackMsg}
            </div>
          )}

          {/* List Content */}
          {loading ? (
            <div className="user-lists-empty-box">
              <p>Loading lists...</p>
            </div>
          ) : activeTab === 'shared' ? (
            <div className="user-lists-empty-box">
              <p>No lists shared with you yet.</p>
            </div>
          ) : displayedLists.length === 0 ? (
            <div className="user-lists-empty-box">
              <p>
                {lists.length === 0 ? (
                  <>No lists yet. <Link to="/list/new" className="start-one-link">Start one?</Link></>
                ) : (
                  <>No lists match your selected filter. <button className="start-one-link" onClick={() => { setFilterVis('all'); setViewMode('all') }}>Reset filters</button></>
                )}
              </p>
            </div>
          ) : (
            <div className="user-lists-grid">
              {displayedLists.map(list => (
                <div key={list._id} className="user-list-card">
                  <Link to={`/list/${list._id}`} className="user-list-link">
                    <PosterStack films={list.films} />
                    <div className="user-list-info">
                      <div className="user-list-title-row">
                        <h3 className="user-list-name">{list.name}</h3>
                        {list.visibility === 'private' && (
                          <span className="user-list-private-badge">🔒 PRIVATE</span>
                        )}
                        {list.ranked && (
                          <span className="user-list-ranked-badge">RANKED</span>
                        )}
                      </div>
                      <span className="user-list-count">
                        {list.films?.length || 0} films • ♥ {list.likes?.length || 0}
                      </span>
                      {list.description && (
                        <p className="user-list-desc">{list.description}</p>
                      )}
                    </div>
                  </Link>
                  {isOwner && (
                    <button
                      className="user-list-delete-btn"
                      onClick={(e) => deleteList(list._id, e)}
                      title="Delete this list"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <aside className="user-lists-sidebar">
          <Link to="/list/new" className="start-new-list-btn">
            Start a new list...
          </Link>
        </aside>
      </main>
    </div>
  )
}

export default UserLists

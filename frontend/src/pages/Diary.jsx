import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './Diary.css'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function renderStars(rating) {
  if (!rating || rating <= 0) return <span className="diary-unrated-dash">—</span>
  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 !== 0
  const stars = []

  for (let i = 0; i < fullStars; i++) {
    stars.push('★')
  }
  if (hasHalf) {
    stars.push('½')
  }
  return <span className="diary-stars">{stars.join('')}</span>
}

function Diary() {
  const { username: paramUsername } = useParams()
  const navigate = useNavigate()

  const token = localStorage.getItem('token')
  const storedUsername = localStorage.getItem('username')
  const username = paramUsername || storedUsername || 'adhin1234'
  const isOwner = Boolean(storedUsername && storedUsername.toLowerCase() === username.toLowerCase())

  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [movieDetails, setMovieDetails] = useState({})
  const [availableYears, setAvailableYears] = useState([])

  // Filters
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedRating, setSelectedRating] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [reviewModalEntry, setReviewModalEntry] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [editForm, setEditForm] = useState({
    watchedDate: '',
    rewatch: false,
    rating: 0,
    liked: false
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    fetchDiary()
  }, [username, selectedYear, selectedMonth, sortBy])

  const fetchDiary = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedYear !== 'all') params.append('year', selectedYear)
      if (selectedMonth !== 'all') params.append('month', selectedMonth)
      params.append('sort', sortBy)

      const res = await fetch(`http://localhost:5000/api/interactions/user/${username}/diary?${params.toString()}`)
      const data = await res.json()

      const list = data.entries || []
      setEntries(list)
      if (data.availableYears && data.availableYears.length > 0) {
        setAvailableYears(data.availableYears)
      }

      // Fetch TMDB metadata for all movies
      const apiKey = import.meta.env.VITE_TMDB_API_KEY
      if (apiKey && list.length > 0) {
        const uniqueMovieIds = Array.from(new Set(list.map(e => e.movieId)))
        const detailsObj = { ...movieDetails }
        
        await Promise.all(
          uniqueMovieIds.map(async (mId) => {
            if (detailsObj[String(mId)]) return
            try {
              const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${mId}?api_key=${apiKey}`)
              const tmdbData = await tmdbRes.json()
              if (tmdbData && !tmdbData.status_message) {
                detailsObj[String(mId)] = tmdbData
              }
            } catch (err) {
              // Ignore single failure
            }
          })
        )
        setMovieDetails(detailsObj)
      }
    } catch (err) {
      console.error('Error fetching diary:', err)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  // Filtered entries by local rating & search
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      // Rating filter
      if (selectedRating !== 'all') {
        if (selectedRating === 'unrated') {
          if (item.rating && item.rating > 0) return false
        } else {
          const minRating = parseFloat(selectedRating)
          if (!item.rating || item.rating < minRating) return false
        }
      }

      // Search query filter (movie title or release year)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const movie = movieDetails[String(item.movieId)]
        const title = (movie?.title || '').toLowerCase()
        const year = movie?.release_date ? movie.release_date.split('-')[0] : ''
        if (!title.includes(query) && !year.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [entries, selectedRating, searchQuery, movieDetails])

  // Summary stats
  const stats = useMemo(() => {
    const total = entries.length
    const thisYear = new Date().getFullYear()
    const thisYearCount = entries.filter(e => {
      const d = new Date(e.entryDate || e.watchedDate)
      return d.getFullYear() === thisYear
    }).length
    const rewatchCount = entries.filter(e => e.rewatch).length
    const reviewCount = entries.filter(e => Boolean(e.review && e.review.trim())).length
    const ratedEntries = entries.filter(e => e.rating > 0)
    const avgRating = ratedEntries.length > 0
      ? (ratedEntries.reduce((sum, e) => sum + e.rating, 0) / ratedEntries.length).toFixed(1)
      : '—'

    return { total, thisYearCount, rewatchCount, reviewCount, avgRating }
  }, [entries])

  // Delete diary entry
  const handleDeleteEntry = async (entryId, movieTitle) => {
    if (!token) return
    const confirmed = window.confirm(`Remove "${movieTitle || 'this film'}" from your diary?`)
    if (!confirmed) return

    try {
      setActionLoading(true)
      const res = await fetch(`http://localhost:5000/api/interactions/diary/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        setEntries(prev => prev.filter(e => e._id !== entryId))
        setStatusMsg('Entry removed from diary')
        setTimeout(() => setStatusMsg(''), 3000)
      } else {
        const errData = await res.json()
        alert(errData.error || 'Failed to remove entry')
      }
    } catch (err) {
      console.error('Delete diary error:', err)
      alert('Error removing entry')
    } finally {
      setActionLoading(false)
    }
  }

  // Open edit modal
  const handleOpenEdit = (entry) => {
    const dateObj = new Date(entry.watchedDate || entry.entryDate || Date.now())
    const formattedDate = dateObj.toISOString().split('T')[0]
    setEditForm({
      watchedDate: formattedDate,
      rewatch: Boolean(entry.rewatch),
      rating: entry.rating || 0,
      liked: Boolean(entry.liked)
    })
    setEditingEntry(entry)
  }

  // Save edit modal
  const handleSaveEdit = async () => {
    if (!token || !editingEntry) return
    try {
      setActionLoading(true)
      const res = await fetch(`http://localhost:5000/api/interactions/diary/${editingEntry._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })

      if (res.ok) {
        const data = await res.json()
        setEntries(prev => prev.map(e => e._id === editingEntry._id ? {
          ...e,
          ...editForm,
          entryDate: editForm.watchedDate ? new Date(editForm.watchedDate) : e.entryDate
        } : e))
        setEditingEntry(null)
        setStatusMsg('Diary entry updated successfully')
        setTimeout(() => setStatusMsg(''), 3000)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to update entry')
      }
    } catch (err) {
      console.error('Save edit error:', err)
      alert('Error saving changes')
    } finally {
      setActionLoading(false)
    }
  }

  // Clear all filters
  const handleResetFilters = () => {
    setSelectedYear('all')
    setSelectedMonth('all')
    setSelectedRating('all')
    setSortBy('newest')
    setSearchQuery('')
  }

  const hasActiveFilters = selectedYear !== 'all' || selectedMonth !== 'all' || selectedRating !== 'all' || sortBy !== 'newest' || searchQuery.trim() !== ''

  return (
    <div className="diary-page-wrapper">
      <Navbar />

      {/* Profile Bar Navigation */}
      <div className="profile-bar-container">
        <div className="profile-bar-content">
          <div className="profile-bar-user">
            <div className="profile-bar-avatar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#89a">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <Link to={`/${username}`} className="profile-bar-username-link">
              <span className="profile-bar-username">{username}</span>
            </Link>
          </div>

          <div className="profile-bar-tabs">
            <Link to={`/${username}`}>Activity</Link>
            <Link to={`/${username}/films`}>Films</Link>
            <Link to={`/${username}/diary`} className="active-tab">Diary</Link>
            <Link to={`/${username}/reviews`}>Reviews</Link>
            <Link to={`/${username}/watchlist`}>Watchlist</Link>
            <Link to={`/${username}/lists`}>Lists</Link>
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
          </div>
        </div>
      </div>

      <div className="diary-main-container">
        {/* Toast / Notification */}
        {statusMsg && <div className="diary-toast-banner">{statusMsg}</div>}

        {/* Header Title & Metric Summary */}
        <div className="diary-header-section">
          <div className="diary-title-row">
            <div>
              <h1 className="diary-main-heading">
                {isOwner ? 'MY DIARY' : `${username.toUpperCase()}'S DIARY`}
              </h1>
              <span className="diary-entry-counter">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                {hasActiveFilters && ' (filtered)'}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="diary-metric-chips">
              <div className="metric-chip">
                <span className="metric-val">{stats.total}</span>
                <span className="metric-lbl">Total Films</span>
              </div>
              <div className="metric-chip">
                <span className="metric-val">{stats.thisYearCount}</span>
                <span className="metric-lbl">This Year</span>
              </div>
              <div className="metric-chip">
                <span className="metric-val">{stats.reviewCount}</span>
                <span className="metric-lbl">Reviews</span>
              </div>
              <div className="metric-chip">
                <span className="metric-val">{stats.avgRating} ★</span>
                <span className="metric-lbl">Avg Rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Year Selector Tabs Bar */}
        <div className="diary-years-bar">
          <button
            type="button"
            className={`diary-year-btn ${selectedYear === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedYear('all')}
          >
            ALL
          </button>
          {availableYears.map(yr => (
            <button
              key={yr}
              type="button"
              className={`diary-year-btn ${String(selectedYear) === String(yr) ? 'active' : ''}`}
              onClick={() => setSelectedYear(String(yr))}
            >
              {yr}
            </button>
          ))}
        </div>

        {/* Filters and Controls Row */}
        <div className="diary-controls-bar">
          <div className="controls-left">
            {/* Month dropdown */}
            <div className="control-group">
              <label htmlFor="diary-month-select">MONTH</label>
              <select
                id="diary-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="diary-select"
              >
                <option value="all">All Months</option>
                {FULL_MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={String(idx + 1)}>{name}</option>
                ))}
              </select>
            </div>

            {/* Rating dropdown */}
            <div className="control-group">
              <label htmlFor="diary-rating-select">RATING</label>
              <select
                id="diary-rating-select"
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="diary-select"
              >
                <option value="all">All Ratings</option>
                <option value="5">★★★★★ (5 stars)</option>
                <option value="4">★★★★ (4+ stars)</option>
                <option value="3">★★★ (3+ stars)</option>
                <option value="2">★★ (2+ stars)</option>
                <option value="unrated">Unrated</option>
              </select>
            </div>

            {/* Sort dropdown */}
            <div className="control-group">
              <label htmlFor="diary-sort-select">SORT BY</label>
              <select
                id="diary-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="diary-select"
              >
                <option value="newest">Date (Newest)</option>
                <option value="oldest">Date (Oldest)</option>
                <option value="rating-high">Rating (High to Low)</option>
                <option value="rating-low">Rating (Low to High)</option>
              </select>
            </div>
          </div>

          <div className="controls-right">
            {/* Realtime title search */}
            <div className="diary-search-box">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Filter by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="diary-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="diary-clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="diary-reset-btn"
                onClick={handleResetFilters}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Diary Content / Table */}
        {loading ? (
          <div className="diary-loading-state">
            <div className="diary-spinner"></div>
            <span>Loading diary entries...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="diary-empty-state">
            <div className="empty-state-icon">📖</div>
            <h3>No diary entries found</h3>
            <p>
              {hasActiveFilters
                ? 'Try adjusting your filters or search term to see more entries.'
                : `${username} hasn't logged any films in their diary yet.`}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                className="diary-btn-primary"
                onClick={handleResetFilters}
              >
                Clear Filters
              </button>
            ) : (
              <Link to="/films" className="diary-btn-primary">
                Browse Films to Log
              </Link>
            )}
          </div>
        ) : (
          <div className="diary-table-container">
            <table className="diary-table">
              <thead>
                <tr>
                  <th className="col-date">MONTH / DAY</th>
                  <th className="col-film">FILM</th>
                  <th className="col-released">RELEASED</th>
                  <th className="col-rating">RATING</th>
                  <th className="col-like">LIKE</th>
                  <th className="col-rewatch">REWATCH</th>
                  <th className="col-review">REVIEW</th>
                  {isOwner && <th className="col-actions">ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const movie = movieDetails[String(entry.movieId)]
                  const d = new Date(entry.entryDate || entry.watchedDate || Date.now())
                  const monthName = MONTH_NAMES[d.getMonth()]
                  const dayNum = d.getDate()
                  const releaseYear = movie?.release_date ? movie.release_date.split('-')[0] : ''
                  const posterUrl = movie?.poster_path
                    ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
                    : null
                  const hasReview = Boolean(entry.review && entry.review.trim())

                  return (
                    <tr key={entry._id} className="diary-row">
                      {/* Date Badge */}
                      <td className="col-date">
                        <div className="diary-date-cell">
                          <span className="diary-month">{monthName}</span>
                          <span className="diary-day">{dayNum}</span>
                        </div>
                      </td>

                      {/* Film Column: Poster + Title */}
                      <td className="col-film">
                        <div className="diary-film-info">
                          <Link to={`/film/${entry.movieId}`} className="diary-poster-link">
                            {posterUrl ? (
                              <img
                                src={posterUrl}
                                alt={movie?.title || 'Movie'}
                                className="diary-poster-img"
                                loading="lazy"
                              />
                            ) : (
                              <div className="diary-poster-placeholder">
                                <span>🎬</span>
                              </div>
                            )}
                          </Link>
                          <div className="diary-film-text">
                            <Link to={`/film/${entry.movieId}`} className="diary-film-title">
                              {movie?.title || `Film #${entry.movieId}`}
                            </Link>
                            {releaseYear && (
                              <span className="diary-film-year-mobile">({releaseYear})</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Released Year */}
                      <td className="col-released">
                        <span className="diary-released-text">{releaseYear || '—'}</span>
                      </td>

                      {/* Rating */}
                      <td className="col-rating">
                        {renderStars(entry.rating)}
                      </td>

                      {/* Liked Heart */}
                      <td className="col-like">
                        {entry.liked ? (
                          <span className="diary-heart-liked" title="Liked">♥</span>
                        ) : (
                          <span className="diary-dash">—</span>
                        )}
                      </td>

                      {/* Rewatch */}
                      <td className="col-rewatch">
                        {entry.rewatch ? (
                          <span className="diary-rewatch-icon" title="Rewatch">🔁</span>
                        ) : (
                          <span className="diary-dash">—</span>
                        )}
                      </td>

                      {/* Review */}
                      <td className="col-review">
                        {hasReview ? (
                          <button
                            type="button"
                            className="diary-review-btn active"
                            title="Read review"
                            onClick={() => setReviewModalEntry({ ...entry, movie })}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                            </svg>
                          </button>
                        ) : (
                          <span className="diary-dash">—</span>
                        )}
                      </td>

                      {/* Actions (Owner only) */}
                      {isOwner && (
                        <td className="col-actions">
                          <div className="diary-action-btns">
                            <button
                              type="button"
                              className="diary-action-btn edit"
                              title="Edit diary entry"
                              onClick={() => handleOpenEdit(entry)}
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="diary-action-btn delete"
                              title="Delete from diary"
                              disabled={actionLoading}
                              onClick={() => handleDeleteEntry(entry._id, movie?.title)}
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModalEntry && (
        <div className="diary-modal-backdrop" onClick={() => setReviewModalEntry(null)}>
          <div className="diary-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="diary-modal-header">
              <div className="modal-film-title-wrap">
                <span className="modal-kicker">DIARY ENTRY REVIEW</span>
                <h3 className="modal-film-title">
                  {reviewModalEntry.movie?.title || `Film #${reviewModalEntry.movieId}`}
                  {reviewModalEntry.movie?.release_date && (
                    <span className="modal-year"> ({reviewModalEntry.movie.release_date.split('-')[0]})</span>
                  )}
                </h3>
              </div>
              <button
                type="button"
                className="diary-modal-close"
                onClick={() => setReviewModalEntry(null)}
              >
                ✕
              </button>
            </div>

            <div className="diary-modal-body">
              <div className="modal-entry-meta">
                <span className="modal-watched-date">
                  Watched on {new Date(reviewModalEntry.entryDate || reviewModalEntry.watchedDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <div className="modal-stars-heart">
                  {renderStars(reviewModalEntry.rating)}
                  {reviewModalEntry.liked && <span className="modal-heart">♥</span>}
                  {reviewModalEntry.rewatch && <span className="modal-rewatch">🔁 Rewatch</span>}
                </div>
              </div>

              <div className="modal-review-content">
                <p>{reviewModalEntry.review}</p>
              </div>
            </div>

            <div className="diary-modal-footer">
              <Link
                to={`/film/${reviewModalEntry.movieId}`}
                className="diary-btn-primary"
                onClick={() => setReviewModalEntry(null)}
              >
                View Film Page
              </Link>
              <button
                type="button"
                className="diary-btn-secondary"
                onClick={() => setReviewModalEntry(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="diary-modal-backdrop" onClick={() => setEditingEntry(null)}>
          <div className="diary-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="diary-modal-header">
              <div className="modal-film-title-wrap">
                <span className="modal-kicker">EDIT DIARY ENTRY</span>
                <h3 className="modal-film-title">
                  {movieDetails[String(editingEntry.movieId)]?.title || `Film #${editingEntry.movieId}`}
                </h3>
              </div>
              <button
                type="button"
                className="diary-modal-close"
                onClick={() => setEditingEntry(null)}
              >
                ✕
              </button>
            </div>

            <div className="diary-modal-body edit-form-body">
              {/* Date Input */}
              <div className="edit-form-field">
                <label className="edit-field-label">Date Watched</label>
                <input
                  type="date"
                  className="edit-date-input"
                  value={editForm.watchedDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, watchedDate: e.target.value }))}
                />
              </div>

              {/* Rating Selector */}
              <div className="edit-form-field">
                <label className="edit-field-label">Rating (0 - 5)</label>
                <div className="edit-rating-buttons">
                  {[0, 1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={`rating-pill ${editForm.rating === star ? 'active' : ''}`}
                      onClick={() => setEditForm(prev => ({ ...prev, rating: star }))}
                    >
                      {star === 0 ? 'No rating' : `${star} ★`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkboxes */}
              <div className="edit-form-checkboxes">
                <label className="edit-checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.rewatch}
                    onChange={(e) => setEditForm(prev => ({ ...prev, rewatch: e.target.checked }))}
                  />
                  <span>🔁 I've seen this film before (Rewatch)</span>
                </label>

                <label className="edit-checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.liked}
                    onChange={(e) => setEditForm(prev => ({ ...prev, liked: e.target.checked }))}
                  />
                  <span className="liked-checkbox-text">♥ Like this film</span>
                </label>
              </div>
            </div>

            <div className="diary-modal-footer">
              <button
                type="button"
                className="diary-btn-primary"
                disabled={actionLoading}
                onClick={handleSaveEdit}
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="diary-btn-secondary"
                onClick={() => setEditingEntry(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Diary

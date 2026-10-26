import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './ListDetail.css'

function ListDetail() {
  const { id, slug } = useParams()
  const listParam = id || slug
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const currentUsername = localStorage.getItem('username')

  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)

  // Watched state
  const [watchedMovieIds, setWatchedMovieIds] = useState(new Set())

  // Movie TMDB details (genres, runtime, etc.)
  const [movieDetailsMap, setMovieDetailsMap] = useState({})

  // Filters & Sorting state
  const [selectedDecade, setSelectedDecade] = useState('all')
  const [selectedGenre, setSelectedGenre] = useState('all')
  const [sortBy, setSortBy] = useState('order')
  const [viewMode, setViewMode] = useState('all') // 'all', 'fade', 'hide'
  const [layoutMode, setLayoutMode] = useState('grid') // 'grid' or 'list'

  // Dropdown visibility state
  const [showDecadeDropdown, setShowDecadeDropdown] = useState(false)
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showViewDropdown, setShowViewDropdown] = useState(false)

  // Actions loading & feedback
  const [cloning, setCloning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Comments state
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  const dropdownRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDecadeDropdown(false)
        setShowGenreDropdown(false)
        setShowSortDropdown(false)
        setShowViewDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    fetchList()
  }, [listParam])

  useEffect(() => {
    if (token) {
      fetchUserWatched()
    } else {
      setWatchedMovieIds(new Set())
    }
  }, [token])

  const fetchUserWatched = async () => {
    try {
      const res = await fetch('https://letterboxd-clone-l6rs.onrender.com/api/interactions/user/watched', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const ids = new Set(data.map(item => String(item.movieId)))
          setWatchedMovieIds(ids)
        }
      }
    } catch (err) {
      console.error('Error fetching watched films:', err)
    }
  }

  const fetchMovieDetails = async (films = []) => {
    const details = {}
    for (const film of films) {
      if (!film.movieId) continue
      try {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY
        if (!apiKey) continue
        const res = await fetch(`https://api.themoviedb.org/3/movie/${film.movieId}?api_key=${apiKey}`)
        const data = await res.json()
        if (data && !data.status_message) {
          details[String(film.movieId)] = data
        }
      } catch (err) {
        // ignore fetch failures
      }
    }
    setMovieDetailsMap(details)
  }

  const fetchList = async () => {
    try {
      setLoading(true)
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/lists/${listParam}`, { headers })
      const data = await res.json()
      if (res.ok) {
        setList(data)
        setComments(data.comments || [])
        setLikesCount(data.likes?.length || 0)
        if (token && data.likes) {
          setIsLiked(data.likes.includes(token))
        }
        if (data.films && data.films.length > 0) {
          fetchMovieDetails(data.films)
        }
      } else {
        setError(data.error || 'Failed to load list.')
      }
    } catch (err) {
      console.error(err)
      setError('Server error loading list.')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!token) {
      alert('Please log in to like this list.')
      return
    }

    try {
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/lists/${list?._id || listParam}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setIsLiked(data.isLiked)
        setLikesCount(data.likesCount)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleVisibility = async () => {
    if (!token) return
    const nextVis = list.visibility === 'public' ? 'private' : 'public'
    try {
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/lists/${list._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ visibility: nextVis })
      })
      if (res.ok) {
        setList(prev => ({ ...prev, visibility: nextVis }))
        setToastMsg(`List is now ${nextVis}`)
        setTimeout(() => setToastMsg(''), 3000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCloneList = async () => {
    if (!token) {
      alert('Please log in to clone this list.')
      return
    }
    try {
      setCloning(true)
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/lists/${list._id}/clone`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setToastMsg('List cloned successfully! Redirecting...')
        setTimeout(() => {
          navigate(`/list/${data._id}`)
        }, 800)
      } else {
        alert(data.error || 'Failed to clone list.')
      }
    } catch (err) {
      console.error('Clone error:', err)
      alert('Error cloning list.')
    } finally {
      setCloning(false)
    }
  }

  const handleImportToWatchlist = async () => {
    if (!token) {
      alert('Please log in to import films to your watchlist.')
      return
    }
    try {
      setImporting(true)
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/lists/${list._id}/import-to-watchlist`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setToastMsg(data.message || 'Films imported to your watchlist!')
        setTimeout(() => setToastMsg(''), 4000)
      } else {
        alert(data.error || 'Failed to import to watchlist.')
      }
    } catch (err) {
      console.error('Import error:', err)
      alert('Error importing to watchlist.')
    } finally {
      setImporting(false)
    }
  }

  const toggleFilmWatched = async (movieId, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!token) {
      alert('Please log in to track watched films.')
      return
    }

    const movieIdStr = String(movieId)
    const currentlyWatched = watchedMovieIds.has(movieIdStr)
    const nextWatched = !currentlyWatched

    // Optimistically update
    setWatchedMovieIds(prev => {
      const next = new Set(prev)
      if (nextWatched) next.add(movieIdStr)
      else next.delete(movieIdStr)
      return next
    })

    try {
      await fetch('https://letterboxd-clone-l6rs.onrender.com/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          movieId: movieIdStr,
          watched: nextWatched
        })
      })
    } catch (err) {
      console.error('Error toggling watched status:', err)
    }
  }

  const formatCommentDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffSec = Math.floor((now - date) / 1000)
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!token) {
      alert('Please log in to leave a comment.')
      return
    }
    if (!commentText.trim()) return

    try {
      setSubmittingComment(true)
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/lists/${list._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: commentText.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        setComments(data.comments || [])
        setCommentText('')
        setIsComposing(false)
        setToastMsg('Comment posted!')
        setTimeout(() => setToastMsg(''), 3000)
      } else {
        alert(data.error || 'Failed to post comment.')
      }
    } catch (err) {
      console.error('Post comment error:', err)
      alert('Error posting comment.')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return

    try {
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/lists/${list._id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (res.ok) {
        setComments(data.comments || [])
        setToastMsg('Comment deleted')
        setTimeout(() => setToastMsg(''), 3000)
      } else {
        alert(data.error || 'Failed to delete comment.')
      }
    } catch (err) {
      console.error('Delete comment error:', err)
    }
  }

  if (loading) {
    return (
      <div className="list-detail-page">
        <Navbar />
        <div className="list-detail-loading">Loading list...</div>
      </div>
    )
  }

  if (error || !list) {
    return (
      <div className="list-detail-page">
        <Navbar />
        <div className="list-detail-error">
          <h2>{error || 'List not found'}</h2>
          <Link to="/lists" className="back-lists-btn">← Back to Lists</Link>
        </div>
      </div>
    )
  }

  const isOwner = Boolean(currentUsername && currentUsername.toLowerCase() === list.username?.toLowerCase())
  const totalFilms = list.films?.length || 0
  const watchedInListCount = (list.films || []).filter(f => watchedMovieIds.has(String(f.movieId))).length
  const watchedPercentage = totalFilms > 0 ? Math.round((watchedInListCount / totalFilms) * 100) : 0

  // Derive unique decades from list films
  const availableDecades = Array.from(new Set(
    (list.films || [])
      .map(f => {
        const yr = parseInt(f.releaseYear, 10)
        return !isNaN(yr) ? `${Math.floor(yr / 10) * 10}s` : null
      })
      .filter(Boolean)
  )).sort().reverse()

  // Derive unique genres from fetched TMDB details
  const availableGenres = Array.from(new Set(
    (list.films || []).flatMap(f => {
      const details = movieDetailsMap[String(f.movieId)]
      return details?.genres ? details.genres.map(g => g.name) : []
    })
  )).sort()

  // Filtering films
  let displayedFilms = [...(list.films || [])]

  // 1. Decade filter
  if (selectedDecade !== 'all') {
    displayedFilms = displayedFilms.filter(f => {
      const yr = parseInt(f.releaseYear, 10)
      if (isNaN(yr)) return false
      return `${Math.floor(yr / 10) * 10}s` === selectedDecade
    })
  }

  // 2. Genre filter
  if (selectedGenre !== 'all') {
    displayedFilms = displayedFilms.filter(f => {
      const details = movieDetailsMap[String(f.movieId)]
      if (!details || !details.genres) return true
      return details.genres.some(g => g.name.toLowerCase() === selectedGenre.toLowerCase())
    })
  }

  // 3. View Mode filter (Hide watched)
  if (viewMode === 'hide') {
    displayedFilms = displayedFilms.filter(f => !watchedMovieIds.has(String(f.movieId)))
  }

  // 4. Sorting
  displayedFilms.sort((a, b) => {
    if (sortBy === 'release-new') {
      return (parseInt(b.releaseYear) || 0) - (parseInt(a.releaseYear) || 0)
    }
    if (sortBy === 'release-old') {
      return (parseInt(a.releaseYear) || 0) - (parseInt(b.releaseYear) || 0)
    }
    if (sortBy === 'title-az') {
      return (a.title || '').localeCompare(b.title || '')
    }
    if (sortBy === 'title-za') {
      return (b.title || '').localeCompare(a.title || '')
    }
    if (sortBy === 'watched') {
      const aW = watchedMovieIds.has(String(a.movieId)) ? 1 : 0
      const bW = watchedMovieIds.has(String(b.movieId)) ? 1 : 0
      return bW - aW
    }
    if (sortBy === 'unwatched') {
      const aW = watchedMovieIds.has(String(a.movieId)) ? 1 : 0
      const bW = watchedMovieIds.has(String(b.movieId)) ? 1 : 0
      return aW - bW
    }
    // Default list order
    return (a.order || 0) - (b.order || 0)
  })

  const getSortLabel = () => {
    switch (sortBy) {
      case 'release-new': return 'Sort by RELEASE (NEW)'
      case 'release-old': return 'Sort by RELEASE (OLD)'
      case 'title-az': return 'Sort by TITLE (A–Z)'
      case 'title-za': return 'Sort by TITLE (Z–A)'
      case 'watched': return 'Sort by WATCHED'
      case 'unwatched': return 'Sort by UNWATCHED'
      default: return 'Sort by LIST ORDER'
    }
  }

  return (
    <div className="list-detail-page">
      <Navbar />

      {toastMsg && (
        <div className="list-detail-toast">
          {toastMsg}
        </div>
      )}

      <main className="list-detail-container">
        <div className="list-detail-columns">
          {/* Main Column */}
          <div className="list-detail-main">
            <header className="list-detail-header">
              <div className="list-author-row">
                <Link
                  to={`/${list.username?.toLowerCase() === 'official lists' ? 'official' : list.username}`}
                  className="author-avatar"
                  style={{ textDecoration: 'none' }}
                >
                  {list.username?.[0]?.toUpperCase()}
                </Link>
                <span className="author-name">
                  List by <Link to={`/${list.username?.toLowerCase() === 'official lists' ? 'official' : list.username}`}>{list.username}</Link>
                </span>
                <span className="list-date">
                  Updated {new Date(list.updatedAt || list.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Sub-header Filter & Sort Bar */}
              <div className="list-filters-bar" ref={dropdownRef}>
                {/* Decade Filter Dropdown */}
                <div className="filter-dropdown-container">
                  <span
                    className={`filter-dropdown-btn ${selectedDecade !== 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setShowDecadeDropdown(!showDecadeDropdown)
                      setShowGenreDropdown(false)
                      setShowSortDropdown(false)
                      setShowViewDropdown(false)
                    }}
                  >
                    {selectedDecade === 'all' ? 'DECADE' : selectedDecade} ▾
                  </span>
                  {showDecadeDropdown && (
                    <div className="filter-menu">
                      <div
                        className={`filter-menu-item ${selectedDecade === 'all' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedDecade('all')
                          setShowDecadeDropdown(false)
                        }}
                      >
                        All Decades
                      </div>
                      {availableDecades.map(dec => (
                        <div
                          key={dec}
                          className={`filter-menu-item ${selectedDecade === dec ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedDecade(dec)
                            setShowDecadeDropdown(false)
                          }}
                        >
                          {dec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Genre Filter Dropdown */}
                <div className="filter-dropdown-container">
                  <span
                    className={`filter-dropdown-btn ${selectedGenre !== 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setShowGenreDropdown(!showGenreDropdown)
                      setShowDecadeDropdown(false)
                      setShowSortDropdown(false)
                      setShowViewDropdown(false)
                    }}
                  >
                    {selectedGenre === 'all' ? 'GENRE' : selectedGenre} ▾
                  </span>
                  {showGenreDropdown && (
                    <div className="filter-menu genre-menu-scrollable">
                      <div
                        className={`filter-menu-item ${selectedGenre === 'all' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedGenre('all')
                          setShowGenreDropdown(false)
                        }}
                      >
                        All Genres
                      </div>
                      {availableGenres.length > 0 ? (
                        availableGenres.map(genre => (
                          <div
                            key={genre}
                            className={`filter-menu-item ${selectedGenre === genre ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedGenre(genre)
                              setShowGenreDropdown(false)
                            }}
                          >
                            {genre}
                          </div>
                        ))
                      ) : (
                        ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'].map(genre => (
                          <div
                            key={genre}
                            className={`filter-menu-item ${selectedGenre === genre ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedGenre(genre)
                              setShowGenreDropdown(false)
                            }}
                          >
                            {genre}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="filter-dropdown-container">
                  <span
                    className={`filter-dropdown-btn ${sortBy !== 'order' ? 'active' : ''}`}
                    onClick={() => {
                      setShowSortDropdown(!showSortDropdown)
                      setShowDecadeDropdown(false)
                      setShowGenreDropdown(false)
                      setShowViewDropdown(false)
                    }}
                  >
                    {getSortLabel()} ▾
                  </span>
                  {showSortDropdown && (
                    <div className="filter-menu">
                      <div
                        className={`filter-menu-item ${sortBy === 'order' ? 'active' : ''}`}
                        onClick={() => {
                          setSortBy('order')
                          setShowSortDropdown(false)
                        }}
                      >
                        List order
                      </div>
                      <div
                        className={`filter-menu-item ${sortBy === 'release-new' ? 'active' : ''}`}
                        onClick={() => {
                          setSortBy('release-new')
                          setShowSortDropdown(false)
                        }}
                      >
                        Release date (newest)
                      </div>
                      <div
                        className={`filter-menu-item ${sortBy === 'release-old' ? 'active' : ''}`}
                        onClick={() => {
                          setSortBy('release-old')
                          setShowSortDropdown(false)
                        }}
                      >
                        Release date (oldest)
                      </div>
                      <div
                        className={`filter-menu-item ${sortBy === 'title-az' ? 'active' : ''}`}
                        onClick={() => {
                          setSortBy('title-az')
                          setShowSortDropdown(false)
                        }}
                      >
                        Film title (A–Z)
                      </div>
                      <div
                        className={`filter-menu-item ${sortBy === 'title-za' ? 'active' : ''}`}
                        onClick={() => {
                          setSortBy('title-za')
                          setShowSortDropdown(false)
                        }}
                      >
                        Film title (Z–A)
                      </div>
                      <div
                        className={`filter-menu-item ${sortBy === 'watched' ? 'active' : ''}`}
                        onClick={() => {
                          setSortBy('watched')
                          setShowSortDropdown(false)
                        }}
                      >
                        Watched first
                      </div>
                      <div
                        className={`filter-menu-item ${sortBy === 'unwatched' ? 'active' : ''}`}
                        onClick={() => {
                          setSortBy('unwatched')
                          setShowSortDropdown(false)
                        }}
                      >
                        Unwatched first
                      </div>
                    </div>
                  )}
                </div>

                {/* View Eye Dropdown */}
                <div className="filter-dropdown-container">
                  <span
                    className={`filter-dropdown-btn view-eye-btn ${viewMode !== 'all' ? 'active' : ''}`}
                    title="View options"
                    onClick={() => {
                      setShowViewDropdown(!showViewDropdown)
                      setShowDecadeDropdown(false)
                      setShowGenreDropdown(false)
                      setShowSortDropdown(false)
                    }}
                  >
                    👁 {viewMode === 'fade' ? 'Fade watched' : viewMode === 'hide' ? 'Hide watched' : ''} ▾
                  </span>
                  {showViewDropdown && (
                    <div className="filter-menu">
                      <div
                        className={`filter-menu-item ${viewMode === 'all' ? 'active' : ''}`}
                        onClick={() => {
                          setViewMode('all')
                          setShowViewDropdown(false)
                        }}
                      >
                        Show all
                      </div>
                      <div
                        className={`filter-menu-item ${viewMode === 'fade' ? 'active' : ''}`}
                        onClick={() => {
                          setViewMode('fade')
                          setShowViewDropdown(false)
                        }}
                      >
                        Fade watched
                      </div>
                      <div
                        className={`filter-menu-item ${viewMode === 'hide' ? 'active' : ''}`}
                        onClick={() => {
                          setViewMode('hide')
                          setShowViewDropdown(false)
                        }}
                      >
                        Hide watched
                      </div>
                    </div>
                  )}
                </div>

                {/* Grid / List layout toggle */}
                <div className="layout-toggle-group">
                  <button
                    type="button"
                    className={`layout-icon-btn ${layoutMode === 'grid' ? 'active' : ''}`}
                    title="Grid view"
                    onClick={() => setLayoutMode('grid')}
                  >
                    ▦
                  </button>
                  <button
                    type="button"
                    className={`layout-icon-btn ${layoutMode === 'list' ? 'active' : ''}`}
                    title="List view"
                    onClick={() => setLayoutMode('list')}
                  >
                    ☰
                  </button>
                </div>
              </div>

              {/* Title & tags */}
              <div className="list-title-row">
                <h1 className="list-title">{list.name}</h1>
                {list.visibility === 'private' && (
                  <span className="list-private-tag" title="Private list">🔒</span>
                )}
                {list.ranked && (
                  <span className="list-ranked-tag">Ranked</span>
                )}
              </div>

              {list.description && (
                <div className="list-description-text">
                  <p>{list.description}</p>
                </div>
              )}
            </header>

            {/* Films Display */}
            {displayedFilms.length === 0 ? (
              <div className="empty-list-notice">
                <p>No films match your selected filters.</p>
                {(selectedDecade !== 'all' || selectedGenre !== 'all' || viewMode !== 'all') && (
                  <button
                    className="reset-filters-btn"
                    onClick={() => {
                      setSelectedDecade('all')
                      setSelectedGenre('all')
                      setViewMode('all')
                    }}
                  >
                    Reset filters
                  </button>
                )}
                {totalFilms === 0 && isOwner && (
                  <Link to={`/list/${list._id}/edit`} className="edit-list-link">
                    + Add films to this list
                  </Link>
                )}
              </div>
            ) : layoutMode === 'grid' ? (
              /* Grid Layout */
              <div className="list-films-grid">
                {displayedFilms.map((film, index) => {
                  const isWatched = watchedMovieIds.has(String(film.movieId))
                  const isFaded = viewMode === 'fade' && isWatched
                  return (
                    <div key={film.movieId} className={`detail-film-card ${isFaded ? 'watched-faded' : ''}`}>
                      <Link to={`/film/${film.movieId}`} className="detail-poster-wrap">
                        {list.ranked && (
                          <span className="detail-rank-num">{index + 1}</span>
                        )}
                        {film.posterPath ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w342${film.posterPath}`}
                            alt={film.title}
                            loading="lazy"
                          />
                        ) : (
                          <div className="detail-no-poster">{film.title}</div>
                        )}
                        {/* Interactive Watched Eye Badge */}
                        <div
                          className={`detail-watched-badge ${isWatched ? 'active' : ''}`}
                          title={isWatched ? "You've watched this film (Click to mark unwatched)" : "Mark as watched"}
                          onClick={(e) => toggleFilmWatched(film.movieId, e)}
                        >
                          👁
                        </div>
                      </Link>
                      <div className="detail-film-footer">
                        <Link to={`/film/${film.movieId}`} className="detail-film-title">
                          {film.title}
                        </Link>
                        {film.releaseYear && (
                          <span className="detail-film-year">{film.releaseYear}</span>
                        )}
                        {film.notes && (
                          <p className="detail-film-note">"{film.notes}"</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* List Table Layout */
              <div className="list-films-table">
                {displayedFilms.map((film, index) => {
                  const isWatched = watchedMovieIds.has(String(film.movieId))
                  const isFaded = viewMode === 'fade' && isWatched
                  return (
                    <div key={film.movieId} className={`detail-table-row ${isFaded ? 'watched-faded' : ''}`}>
                      <span className="table-rank">{index + 1}</span>
                      <Link to={`/film/${film.movieId}`} className="table-poster-thumb">
                        {film.posterPath ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${film.posterPath}`}
                            alt={film.title}
                          />
                        ) : (
                          <div className="table-no-poster">🎞</div>
                        )}
                      </Link>
                      <div className="table-details">
                        <div className="table-title-row">
                          <Link to={`/film/${film.movieId}`} className="table-film-title">
                            {film.title}
                          </Link>
                          {film.releaseYear && (
                            <span className="table-film-year">{film.releaseYear}</span>
                          )}
                        </div>
                        {film.notes && (
                          <p className="table-film-note">"{film.notes}"</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`table-watched-toggle ${isWatched ? 'active' : ''}`}
                        title={isWatched ? "Watched (Click to mark unwatched)" : "Mark as watched"}
                        onClick={(e) => toggleFilmWatched(film.movieId, e)}
                      >
                        👁 {isWatched ? 'Watched' : 'Mark watched'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Comments Section matching screenshot with full functionality */}
            <div className="list-comments-section">
              <div className="comments-heading">
                <span>
                  {comments.length === 1 ? '1 COMMENT' : comments.length > 1 ? `${comments.length} COMMENTS` : 'COMMENT?'}
                </span>
                <span className="comment-green-dot">●</span>
              </div>

              {/* Compose Box */}
              <div className="comment-compose-card">
                {!isComposing && !commentText ? (
                  <div
                    className="comments-notice-clickable"
                    onClick={() => {
                      if (!token) {
                        alert('Please log in to leave a comment.')
                        return
                      }
                      setIsComposing(true)
                    }}
                  >
                    Welcome! Please enter your comment before replying.
                  </div>
                ) : (
                  <form onSubmit={handlePostComment} className="comment-compose-form">
                    <textarea
                      className="comment-textarea"
                      placeholder="Write a comment on this list..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="comment-compose-footer">
                      <span className="comment-markdown-hint">Share your thoughts on this list</span>
                      <div className="comment-compose-btns">
                        <button
                          type="button"
                          className="comment-cancel-btn"
                          onClick={() => {
                            setIsComposing(false)
                            setCommentText('')
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="comment-post-btn"
                          disabled={submittingComment || !commentText.trim()}
                        >
                          {submittingComment ? 'Posting...' : 'POST'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Comments List */}
              {comments.length > 0 && (
                <div className="comments-list">
                  {comments.map((comment) => {
                    const isAuthor = currentUsername && currentUsername.toLowerCase() === comment.username?.toLowerCase()
                    const canDelete = isAuthor || isOwner
                    return (
                      <div key={comment._id} className="comment-item">
                        <Link
                          to={`/${comment.username?.toLowerCase() === 'official lists' ? 'official' : comment.username}`}
                          className="comment-avatar"
                          style={{ textDecoration: 'none' }}
                        >
                          {comment.username?.[0]?.toUpperCase() || 'U'}
                        </Link>
                        <div className="comment-content-wrap">
                          <div className="comment-header-row">
                            <span className="comment-author-name">
                              Comment by <Link to={`/${comment.username?.toLowerCase() === 'official lists' ? 'official' : comment.username}`}>{comment.username}</Link>
                            </span>
                            <span className="comment-date">
                              {formatCommentDate(comment.createdAt)}
                            </span>
                            {canDelete && (
                              <button
                                type="button"
                                className="comment-delete-btn"
                                onClick={() => handleDeleteComment(comment._id)}
                                title="Delete comment"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div className="comment-body-text">
                            {comment.text}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="list-detail-sidebar">
            <div className="sidebar-action-card">
              <button
                type="button"
                className={`sidebar-btn like-sidebar-btn ${isLiked ? 'liked' : ''}`}
                onClick={handleLike}
              >
                ♥ {likesCount > 0 ? `${likesCount} like${likesCount > 1 ? 's' : ''}` : 'No likes yet'}
              </button>

              <button
                type="button"
                className="sidebar-btn"
                onClick={handleCloneList}
                disabled={cloning}
              >
                {cloning ? 'Cloning list...' : 'Clone this list'}
              </button>

              <button
                type="button"
                className="sidebar-btn import-watchlist-btn"
                onClick={handleImportToWatchlist}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import to watchlist...'}
              </button>

              {isOwner && (
                <>
                  <Link
                    to={`/list/${list._id}/edit`}
                    className="sidebar-btn edit-sidebar-link"
                  >
                    Edit or delete this list...
                  </Link>

                  <button
                    type="button"
                    className="sidebar-btn visibility-sidebar-btn"
                    onClick={toggleVisibility}
                  >
                    Make this list {list.visibility === 'public' ? 'private' : 'public'}
                  </button>
                </>
              )}
            </div>

            {/* Watched Progress Card - Dynamic Live Calculation */}
            <div className="sidebar-progress-card">
              <div className="progress-info">
                <span className="progress-label">You've watched</span>
                <span className="progress-fraction">
                  {watchedInListCount} of {totalFilms}
                </span>
              </div>
              <div className={`progress-circle-badge ${watchedPercentage > 0 ? 'active' : ''}`}>
                {watchedPercentage}%
              </div>
            </div>

            {/* TAGGED Section */}
            {list.tags && list.tags.length > 0 && (
              <div className="sidebar-tagged-section">
                <div className="tagged-heading">TAGGED</div>
                <div className="tagged-pills-list">
                  {list.tags.map((tag, idx) => (
                    <span key={idx} className="tagged-pill">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}

export default ListDetail

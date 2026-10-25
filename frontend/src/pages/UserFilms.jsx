import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './UserFilms.css'

const RATING_OPTIONS = [
  { id: 'all', label: 'All Ratings' },
  { id: '5', label: '★★★★★ (5 stars)' },
  { id: '4', label: '★★★★ (4+ stars)' },
  { id: '3', label: '★★★ (3+ stars)' },
  { id: '2', label: '★★ (2+ stars)' },
  { id: 'unrated', label: 'Unrated' },
]

function UserFilms() {
  const { username: paramUsername } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const token = localStorage.getItem('token')
  const storedUsername = localStorage.getItem('username')
  const username = paramUsername || storedUsername || 'adhin1234'
  const isOwner = Boolean(storedUsername && storedUsername.toLowerCase() === username.toLowerCase())

  // Detect if on /likes or /films
  const isLikesView = location.pathname.includes('/likes')

  const [interactions, setInteractions] = useState([])
  const [movieDetails, setMovieDetails] = useState({})
  const [loading, setLoading] = useState(true)

  // Filters & Sorting
  const [selectedRating, setSelectedRating] = useState('all')
  const [selectedDecade, setSelectedDecade] = useState('all')
  const [selectedGenre, setSelectedGenre] = useState('all')
  const [sortBy, setSortBy] = useState('when-added')
  const [viewMode, setViewMode] = useState('all') // 'all', 'fade-unrated', etc.

  // Dropdown states
  const [showRatingDropdown, setShowRatingDropdown] = useState(false)
  const [showDecadeDropdown, setShowDecadeDropdown] = useState(false)
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowRatingDropdown(false)
        setShowDecadeDropdown(false)
        setShowGenreDropdown(false)
        setShowSortDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    fetchFilms()
  }, [username, isLikesView])

  const fetchFilms = async () => {
    try {
      setLoading(true)
      const endpoint = isLikesView
        ? `http://localhost:5000/api/interactions/user/${username}/likes`
        : `http://localhost:5000/api/interactions/user/${username}/watched`

      const res = await fetch(endpoint)
      const data = await res.json()
      const items = Array.isArray(data) ? data : []
      setInteractions(items)

      // Fetch TMDB details in parallel
      const apiKey = import.meta.env.VITE_TMDB_API_KEY
      if (apiKey && items.length > 0) {
        const detailsObj = {}
        await Promise.all(
          items.map(async (item) => {
            try {
              const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${item.movieId}?api_key=${apiKey}`)
              const tmdbData = await tmdbRes.json()
              if (tmdbData && !tmdbData.status_message) {
                detailsObj[String(item.movieId)] = tmdbData
              }
            } catch (err) {
              // Ignore failure
            }
          })
        )
        setMovieDetails(detailsObj)
      }
    } catch (err) {
      console.error('Error fetching user films:', err)
      setInteractions([])
    } finally {
      setLoading(false)
    }
  }

  // Derive unique decades from movies
  const availableDecades = Array.from(new Set(
    interactions.map(item => {
      const movie = movieDetails[String(item.movieId)]
      if (!movie?.release_date) return null
      const yr = parseInt(movie.release_date.split('-')[0], 10)
      return !isNaN(yr) ? `${Math.floor(yr / 10) * 10}s` : null
    }).filter(Boolean)
  )).sort().reverse()

  // Derive unique genres from movies
  const availableGenres = Array.from(new Set(
    interactions.flatMap(item => {
      const movie = movieDetails[String(item.movieId)]
      return movie?.genres ? movie.genres.map(g => g.name) : []
    })
  )).sort()

  // Filtering
  let displayedItems = [...interactions]

  // Rating Filter
  if (selectedRating !== 'all') {
    if (selectedRating === 'unrated') {
      displayedItems = displayedItems.filter(i => !i.rating || i.rating === 0)
    } else {
      const threshold = parseFloat(selectedRating)
      displayedItems = displayedItems.filter(i => i.rating && i.rating >= threshold)
    }
  }

  // Decade Filter
  if (selectedDecade !== 'all') {
    displayedItems = displayedItems.filter(item => {
      const movie = movieDetails[String(item.movieId)]
      if (!movie?.release_date) return false
      const yr = parseInt(movie.release_date.split('-')[0], 10)
      return `${Math.floor(yr / 10) * 10}s` === selectedDecade
    })
  }

  // Genre Filter
  if (selectedGenre !== 'all') {
    displayedItems = displayedItems.filter(item => {
      const movie = movieDetails[String(item.movieId)]
      if (!movie?.genres) return true
      return movie.genres.some(g => g.name.toLowerCase() === selectedGenre.toLowerCase())
    })
  }

  // Sorting
  displayedItems.sort((a, b) => {
    const movieA = movieDetails[String(a.movieId)]
    const movieB = movieDetails[String(b.movieId)]

    if (sortBy === 'rating-desc') {
      return (b.rating || 0) - (a.rating || 0)
    }
    if (sortBy === 'rating-asc') {
      return (a.rating || 0) - (b.rating || 0)
    }
    if (sortBy === 'release-new') {
      const yrA = movieA?.release_date ? parseInt(movieA.release_date.split('-')[0], 10) || 0 : 0
      const yrB = movieB?.release_date ? parseInt(movieB.release_date.split('-')[0], 10) || 0 : 0
      return yrB - yrA
    }
    if (sortBy === 'release-old') {
      const yrA = movieA?.release_date ? parseInt(movieA.release_date.split('-')[0], 10) || 0 : 0
      const yrB = movieB?.release_date ? parseInt(movieB.release_date.split('-')[0], 10) || 0 : 0
      return yrA - yrB
    }
    if (sortBy === 'title-az') {
      const titleA = movieA?.title || ''
      const titleB = movieB?.title || ''
      return titleA.localeCompare(titleB)
    }
    if (sortBy === 'title-za') {
      const titleA = movieA?.title || ''
      const titleB = movieB?.title || ''
      return titleB.localeCompare(titleA)
    }
    // 'when-added' / default
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  })

  // Format star rating
  const renderStars = (rating) => {
    if (!rating || rating <= 0) return null
    const fullStars = Math.floor(rating)
    const hasHalf = rating % 1 !== 0
    return (
      <span className="film-stars-display" title={`${rating} stars`}>
        {'★'.repeat(fullStars)}
        {hasHalf && '½'}
      </span>
    )
  }

  const getSortLabel = () => {
    switch (sortBy) {
      case 'rating-desc': return 'Sort by RATING (HIGHEST)'
      case 'rating-asc': return 'Sort by RATING (LOWEST)'
      case 'release-new': return 'Sort by RELEASE (NEW)'
      case 'release-old': return 'Sort by RELEASE (OLD)'
      case 'title-az': return 'Sort by TITLE (A–Z)'
      case 'title-za': return 'Sort by TITLE (Z–A)'
      default: return isLikesView ? 'Sort by WHEN LIKED' : 'Sort by WHEN WATCHED'
    }
  }

  return (
    <div className="user-films-page">
      <Navbar />

      {/* Sub-header Profile Nav Bar */}
      <div className="user-films-subnav-container">
        <div className="user-films-profile-bar">
          <div className="profile-bar-left">
            <div className="profile-bar-avatar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#89a">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <span className="profile-bar-username">{username}</span>
          </div>

          <div className="profile-bar-tabs">
            <Link to="/profile">Activity</Link>
            <Link to={`/${username}/films`} className={!isLikesView ? 'active-tab' : ''}>Films</Link>
            <Link to={`/${username}/diary`}>Diary</Link>
            <Link to={`/${username}/reviews`}>Reviews</Link>
            <Link to={`/${username}/watchlist`}>Watchlist</Link>
            <Link to={`/${username}/lists`}>Lists</Link>
            <Link to={`/${username}/likes`} className={isLikesView ? 'active-tab' : ''}>Likes</Link>
            <Link to={`/${username}/network`}>Network</Link>
          </div>

          {/* <div className="profile-bar-actions">
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
          </div> */}
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="user-films-container">
        {/* Sub-tabs when on Likes view */}
        {isLikesView && (
          <div className="likes-subtabs-row">
            <Link to={`/${username}/likes`} className="likes-subtab active">FILMS</Link>
            <Link to="/profile" className="likes-subtab">REVIEWS</Link>
            <Link to={`/${username}/lists`} className="likes-subtab">LISTS</Link>
          </div>
        )}

        {/* Filter & Counter Row */}
        <div className="user-films-header-row" ref={dropdownRef}>
          <div className="films-count-heading">
            {isLikesView ? (
              <span>FILMS YOU LIKE • <strong>{interactions.length}</strong></span>
            ) : (
              <span>WATCHED FILMS • <strong>{interactions.length}</strong></span>
            )}
          </div>

          <div className="user-films-filters">
            {/* Rating Dropdown */}
            <div className="filter-dropdown-wrap">
              <span
                className={`filter-btn ${selectedRating !== 'all' ? 'active' : ''}`}
                onClick={() => {
                  setShowRatingDropdown(!showRatingDropdown)
                  setShowDecadeDropdown(false)
                  setShowGenreDropdown(false)
                  setShowSortDropdown(false)
                }}
              >
                {selectedRating === 'all' ? 'RATING' : selectedRating === 'unrated' ? 'UNRATED' : `${selectedRating}★+`} ▾
              </span>
              {showRatingDropdown && (
                <div className="films-filter-menu">
                  {RATING_OPTIONS.map(opt => (
                    <div
                      key={opt.id}
                      className={`films-filter-item ${selectedRating === opt.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedRating(opt.id)
                        setShowRatingDropdown(false)
                      }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decade Dropdown */}
            <div className="filter-dropdown-wrap">
              <span
                className={`filter-btn ${selectedDecade !== 'all' ? 'active' : ''}`}
                onClick={() => {
                  setShowDecadeDropdown(!showDecadeDropdown)
                  setShowRatingDropdown(false)
                  setShowGenreDropdown(false)
                  setShowSortDropdown(false)
                }}
              >
                {selectedDecade === 'all' ? 'DECADE' : selectedDecade} ▾
              </span>
              {showDecadeDropdown && (
                <div className="films-filter-menu">
                  <div
                    className={`films-filter-item ${selectedDecade === 'all' ? 'active' : ''}`}
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
                      className={`films-filter-item ${selectedDecade === dec ? 'active' : ''}`}
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

            {/* Genre Dropdown */}
            <div className="filter-dropdown-wrap">
              <span
                className={`filter-btn ${selectedGenre !== 'all' ? 'active' : ''}`}
                onClick={() => {
                  setShowGenreDropdown(!showGenreDropdown)
                  setShowRatingDropdown(false)
                  setShowDecadeDropdown(false)
                  setShowSortDropdown(false)
                }}
              >
                {selectedGenre === 'all' ? 'GENRE' : selectedGenre} ▾
              </span>
              {showGenreDropdown && (
                <div className="films-filter-menu genre-scrollable">
                  <div
                    className={`films-filter-item ${selectedGenre === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedGenre('all')
                      setShowGenreDropdown(false)
                    }}
                  >
                    All Genres
                  </div>
                  {availableGenres.length > 0 ? (
                    availableGenres.map(g => (
                      <div
                        key={g}
                        className={`films-filter-item ${selectedGenre === g ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedGenre(g)
                          setShowGenreDropdown(false)
                        }}
                      >
                        {g}
                      </div>
                    ))
                  ) : (
                    ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'].map(g => (
                      <div
                        key={g}
                        className={`films-filter-item ${selectedGenre === g ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedGenre(g)
                          setShowGenreDropdown(false)
                        }}
                      >
                        {g}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="filter-dropdown-wrap">
              <span
                className={`filter-btn ${sortBy !== 'when-added' ? 'active' : ''}`}
                onClick={() => {
                  setShowSortDropdown(!showSortDropdown)
                  setShowRatingDropdown(false)
                  setShowDecadeDropdown(false)
                  setShowGenreDropdown(false)
                }}
              >
                {getSortLabel()} ▾
              </span>
              {showSortDropdown && (
                <div className="films-filter-menu">
                  <div
                    className={`films-filter-item ${sortBy === 'when-added' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('when-added')
                      setShowSortDropdown(false)
                    }}
                  >
                    {isLikesView ? 'When liked' : 'When watched'}
                  </div>
                  <div
                    className={`films-filter-item ${sortBy === 'rating-desc' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('rating-desc')
                      setShowSortDropdown(false)
                    }}
                  >
                    Rating (highest)
                  </div>
                  <div
                    className={`films-filter-item ${sortBy === 'rating-asc' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('rating-asc')
                      setShowSortDropdown(false)
                    }}
                  >
                    Rating (lowest)
                  </div>
                  <div
                    className={`films-filter-item ${sortBy === 'release-new' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('release-new')
                      setShowSortDropdown(false)
                    }}
                  >
                    Release date (newest)
                  </div>
                  <div
                    className={`films-filter-item ${sortBy === 'release-old' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('release-old')
                      setShowSortDropdown(false)
                    }}
                  >
                    Release date (oldest)
                  </div>
                  <div
                    className={`films-filter-item ${sortBy === 'title-az' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('title-az')
                      setShowSortDropdown(false)
                    }}
                  >
                    Film title (A–Z)
                  </div>
                  <div
                    className={`films-filter-item ${sortBy === 'title-za' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('title-za')
                      setShowSortDropdown(false)
                    }}
                  >
                    Film title (Z–A)
                  </div>
                </div>
              )}
            </div>

            {/* Layout Toggle Icon */}
            <span className="layout-active-icon">▦</span>
          </div>
        </div>

        <div className="user-films-divider"></div>

        {/* Poster Grid */}
        {loading ? (
          <div className="user-films-empty-box">
            <p>Loading films...</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="user-films-empty-box">
            <p>
              {interactions.length === 0 ? (
                isLikesView ? (
                  <>No liked films yet. Browse films and hit the ♥ button!</>
                ) : (
                  <>No watched films yet. Browse films and click the 👁 button to log them!</>
                )
              ) : (
                <>
                  No films match your selected filter.{' '}
                  <button
                    className="reset-filters-link"
                    onClick={() => {
                      setSelectedRating('all')
                      setSelectedDecade('all')
                      setSelectedGenre('all')
                    }}
                  >
                    Reset filters
                  </button>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="user-films-grid">
            {displayedItems.map((item) => {
              const movie = movieDetails[String(item.movieId)]
              const posterPath = movie?.poster_path
              const title = movie?.title || `Film #${item.movieId}`
              const year = movie?.release_date ? movie.release_date.split('-')[0] : ''

              return (
                <div key={item.movieId} className="user-film-card">
                  <Link to={`/film/${item.movieId}`} className="user-film-poster-wrap">
                    {posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w342${posterPath}`}
                        alt={title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="user-film-no-poster">
                        <span>{title}</span>
                      </div>
                    )}
                    <div className="user-film-poster-overlay">
                      <span className="overlay-film-title">{title}</span>
                      {year && <span className="overlay-film-year">{year}</span>}
                    </div>
                  </Link>

                  {/* Under-poster rating, heart, review metadata */}
                  <div className="user-film-meta">
                    {item.rating > 0 && renderStars(item.rating)}
                    {item.liked && (
                      <span className="film-liked-heart" title="Liked">♥</span>
                    )}
                    {item.review && (
                      <span className="film-review-icon" title="Has review">≡</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default UserFilms

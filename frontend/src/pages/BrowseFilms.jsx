import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MovieCard from '../components/MovieCard'
import './BrowseFilms.css'

const GENRES = [
  { id: 'all', name: 'All Genres' },
  { id: '28', name: 'Action' },
  { id: '12', name: 'Adventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '99', name: 'Documentary' },
  { id: '18', name: 'Drama' },
  { id: '10751', name: 'Family' },
  { id: '14', name: 'Fantasy' },
  { id: '36', name: 'History' },
  { id: '27', name: 'Horror' },
  { id: '10402', name: 'Music' },
  { id: '9648', name: 'Mystery' },
  { id: '10749', name: 'Romance' },
  { id: '878', name: 'Sci-Fi' },
  { id: '53', name: 'Thriller' },
  { id: '10752', name: 'War' },
  { id: '37', name: 'Western' }
]

const DECADES = [
  { id: 'all', label: 'All Decades' },
  { id: '2020s', label: '2020s', gte: '2020-01-01', lte: '2029-12-31' },
  { id: '2010s', label: '2010s', gte: '2010-01-01', lte: '2019-12-31' },
  { id: '2000s', label: '2000s', gte: '2000-01-01', lte: '2009-12-31' },
  { id: '1990s', label: '1990s', gte: '1990-01-01', lte: '1999-12-31' },
  { id: '1980s', label: '1980s', gte: '1980-01-01', lte: '1989-12-31' },
  { id: '1970s', label: '1970s', gte: '1970-01-01', lte: '1979-12-31' }
]

const SORT_OPTIONS = [
  { id: 'popularity.desc', label: 'Most Popular' },
  { id: 'vote_average.desc', label: 'Highest Rated' },
  { id: 'primary_release_date.desc', label: 'Release Date' },
  { id: 'vote_count.desc', label: 'Most Reviewed' }
]

function BrowseFilms() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const apiKey = import.meta.env.VITE_TMDB_API_KEY

  // Read initial params
  const initialGenre = searchParams.get('genre') || 'all'
  const initialSort = searchParams.get('sort') === 'top_rated'
    ? 'vote_average.desc'
    : searchParams.get('sort') === 'recent'
    ? 'primary_release_date.desc'
    : 'popularity.desc'

  const [selectedGenre, setSelectedGenre] = useState(initialGenre)
  const [selectedDecade, setSelectedDecade] = useState('all')
  const [sortBy, setSortBy] = useState(initialSort)

  const [movies, setMovies] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Dropdown states
  const [genreOpen, setGenreOpen] = useState(false)
  const [decadeOpen, setDecadeOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setGenreOpen(false)
        setDecadeOpen(false)
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Sync if search params change externally
  useEffect(() => {
    const g = searchParams.get('genre')
    if (g && g !== selectedGenre) {
      setSelectedGenre(g)
    }
  }, [searchParams])

  // Fetch initial page whenever filters change
  useEffect(() => {
    setPage(1)
    fetchFilms(1, true)
  }, [selectedGenre, selectedDecade, sortBy])

  const fetchFilms = async (pageNum, isReset = false) => {
    try {
      if (isReset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      let url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&page=${pageNum}&sort_by=${sortBy}`

      if (selectedGenre !== 'all') {
        url += `&with_genres=${selectedGenre}`
      }

      const decadeObj = DECADES.find((d) => d.id === selectedDecade)
      if (decadeObj && decadeObj.gte) {
        url += `&primary_release_date.gte=${decadeObj.gte}&primary_release_date.lte=${decadeObj.lte}`
      }

      // Add minimum vote count for quality ratings when sorting by rating
      if (sortBy === 'vote_average.desc') {
        url += '&vote_count.gte=300'
      } else {
        url += '&vote_count.gte=30'
      }

      const res = await fetch(url)
      const data = await res.json()

      if (data.results) {
        const formatted = data.results.map((m) => ({
          id: m.id,
          title: m.title,
          year: m.release_date ? m.release_date.split('-')[0] : '',
          rating: m.vote_average ? (m.vote_average / 2).toFixed(1) : '',
          poster: m.poster_path
            ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
            : null
        }))

        if (isReset) {
          setMovies(formatted)
        } else {
          // Append and deduplicate
          setMovies((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            const newItems = formatted.filter((f) => !seen.has(f.id))
            return [...prev, ...newItems]
          })
        }

        setTotalPages(data.total_pages || 1)
      }
    } catch (err) {
      console.error('Failed to fetch browse films:', err)
      if (isReset) setMovies([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchFilms(nextPage, false)
  }

  const currentGenreName = GENRES.find((g) => g.id === selectedGenre)?.name || 'All'
  const currentDecadeLabel = DECADES.find((d) => d.id === selectedDecade)?.label || 'All'
  const currentSortLabel = SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'Popular'

  const getPageTitle = () => {
    if (selectedGenre !== 'all') {
      return `${currentGenreName} Films`
    }
    if (sortBy === 'vote_average.desc') {
      return 'Top Rated Films'
    }
    if (sortBy === 'primary_release_date.desc') {
      return 'Recent Films'
    }
    return 'Browse Films'
  }

  return (
    <div className="browse-films-page">
      <Navbar />

      <main className="browse-container">
        {/* Header */}
        <header className="browse-header">
          <div className="browse-header-left">
            <h1 className="browse-title">{getPageTitle()}</h1>
            <p className="browse-subtitle">
              Browse and discover films. Collect and review what you’ve seen.
            </p>
          </div>

          <div className="browse-filters" ref={dropdownRef}>
            {/* Genre Filter */}
            <div className="browse-dropdown-wrap">
              <span className="dropdown-label">GENRE</span>
              <button
                className="browse-dropdown-btn"
                onClick={() => {
                  setGenreOpen(!genreOpen)
                  setDecadeOpen(false)
                  setSortOpen(false)
                }}
              >
                {currentGenreName} <span className="arrow">▼</span>
              </button>
              {genreOpen && (
                <div className="browse-dropdown-menu">
                  {GENRES.map((g) => (
                    <div
                      key={g.id}
                      className={`dropdown-option ${selectedGenre === g.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedGenre(g.id)
                        setGenreOpen(false)
                        setSearchParams(g.id === 'all' ? {} : { genre: g.id })
                      }}
                    >
                      {g.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decade Filter */}
            <div className="browse-dropdown-wrap">
              <span className="dropdown-label">DECADE</span>
              <button
                className="browse-dropdown-btn"
                onClick={() => {
                  setDecadeOpen(!decadeOpen)
                  setGenreOpen(false)
                  setSortOpen(false)
                }}
              >
                {currentDecadeLabel} <span className="arrow">▼</span>
              </button>
              {decadeOpen && (
                <div className="browse-dropdown-menu">
                  {DECADES.map((d) => (
                    <div
                      key={d.id}
                      className={`dropdown-option ${selectedDecade === d.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDecade(d.id)
                        setDecadeOpen(false)
                      }}
                    >
                      {d.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Filter */}
            <div className="browse-dropdown-wrap">
              <span className="dropdown-label">SORT BY</span>
              <button
                className="browse-dropdown-btn"
                onClick={() => {
                  setSortOpen(!sortOpen)
                  setGenreOpen(false)
                  setDecadeOpen(false)
                }}
              >
                {currentSortLabel} <span className="arrow">▼</span>
              </button>
              {sortOpen && (
                <div className="browse-dropdown-menu">
                  {SORT_OPTIONS.map((s) => (
                    <div
                      key={s.id}
                      className={`dropdown-option ${sortBy === s.id ? 'active' : ''}`}
                      onClick={() => {
                        setSortBy(s.id)
                        setSortOpen(false)
                      }}
                    >
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Popular genre quick pills */}
        <div className="browse-genre-pills">
          {GENRES.slice(0, 10).map((g) => (
            <button
              key={g.id}
              className={`genre-pill ${selectedGenre === g.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedGenre(g.id)
                setSearchParams(g.id === 'all' ? {} : { genre: g.id })
              }}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Movie Grid */}
        {loading ? (
          <div className="browse-grid-loading">
            {[...Array(18)].map((_, i) => (
              <div key={i} className="browse-card-skeleton" />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="browse-empty">
            <h3>No films found</h3>
            <p>Try selecting a different genre or decade filter.</p>
          </div>
        ) : (
          <>
            <div className="browse-movies-grid">
              {movies.map((movie, index) => (
                <MovieCard key={`${movie.id}-${index}`} movie={movie} />
              ))}
            </div>

            {/* Load More Section */}
            <div className="browse-load-more-section">
              <span className="browse-count-label">
                Showing {movies.length} films
              </span>

              {page < totalPages && (
                <button
                  className="browse-load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'LOADING MORE FILMS...' : 'LOAD MORE FILMS'}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default BrowseFilms

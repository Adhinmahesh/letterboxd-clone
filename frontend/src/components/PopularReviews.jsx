import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ReviewCard from './ReviewCard'
import './PopularReviews.css'

function PopularReviews() {
  const [reviews, setReviews] = useState([])
  const [movieMap, setMovieMap] = useState({})
  const [popularLists, setPopularLists] = useState([])
  const [popularReviewers, setPopularReviewers] = useState([])
  const [loading, setLoading] = useState(true)

  const apiKey = import.meta.env.VITE_TMDB_API_KEY

  useEffect(() => {
    fetchRealHomeData()
  }, [])

  const fetchRealHomeData = async () => {
    try {
      setLoading(true)

      // 1. Fetch real popular reviews (sorted by most likes)
      const reviewsRes = await fetch('http://localhost:5000/api/interactions/popular-reviews?limit=5')
      const reviewsData = await reviewsRes.json()
      const reviewList = Array.isArray(reviewsData) ? reviewsData : []
      setReviews(reviewList)

      // Fetch TMDB Movie Details for these top reviews
      if (apiKey && reviewList.length > 0) {
        const detailsObj = {}
        await Promise.all(
          reviewList.map(async (rev) => {
            const movieId = rev.movieId
            if (!movieId) return
            try {
              const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}`)
              const tmdbData = await tmdbRes.json()
              if (tmdbData && !tmdbData.status_message) {
                detailsObj[String(movieId)] = {
                  id: tmdbData.id,
                  title: tmdbData.title,
                  year: tmdbData.release_date ? tmdbData.release_date.split('-')[0] : '',
                  poster: tmdbData.poster_path ? `https://image.tmdb.org/t/p/w185${tmdbData.poster_path}` : null
                }
              }
            } catch (err) {
              console.error('TMDB movie fetch error in PopularReviews:', err)
            }
          })
        )
        setMovieMap(detailsObj)
      }

      // 2. Fetch real public lists
      try {
        const listsRes = await fetch('http://localhost:5000/api/lists?type=popular&limit=3')
        if (listsRes.ok) {
          const listsData = await listsRes.json()
          if (Array.isArray(listsData) && listsData.length > 0) {
            setPopularLists(listsData)
          }
        }
      } catch (err) {
        console.error('Popular lists fetch error:', err)
      }

      // 3. Fetch real popular reviewers
      try {
        const reviewersRes = await fetch('http://localhost:5000/api/interactions/popular-reviewers')
        if (reviewersRes.ok) {
          const reviewersData = await reviewersRes.json()
          if (Array.isArray(reviewersData) && reviewersData.length > 0) {
            setPopularReviewers(reviewersData)
          }
        }
      } catch (err) {
        console.error('Popular reviewers fetch error:', err)
      }

    } catch (err) {
      console.error('Failed to load real popular reviews section:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fallback lists if none exist in DB yet
  const fallbackLists = [
    {
      _id: 'default-1',
      name: 'Letterboxd’s Top 500 Films',
      username: 'Official Lists',
      films: [
        { posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg' },
        { posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
        { posterPath: '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg' },
        { posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg' }
      ],
      likes: ['1', '2', '3', '4'],
      comments: ['1', '2']
    },
    {
      _id: 'default-2',
      name: 'Movies everyone should watch',
      username: 'filmlover',
      films: [
        { posterPath: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg' },
        { posterPath: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg' },
        { posterPath: '/velWPhVMQeQKcxggNEU8YmIo52R.jpg' },
        { posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg' }
      ],
      likes: ['1', '2'],
      comments: ['1']
    }
  ]

  const displayLists = popularLists.length > 0 ? popularLists : fallbackLists

  const fallbackReviewers = [
    { username: 'annehathaway', films: 342, reviews: 185 },
    { username: 'schaffrillas', films: 779, reviews: 610 },
    { username: 'connoreatspants', films: 542, reviews: 189 },
    { username: 'adhin1234', films: 12, reviews: 4 }
  ]

  const displayReviewers = popularReviewers.length > 0 ? popularReviewers : fallbackReviewers

  return (
    <section className="reviews-section">
      <div className="reviews-intro">
        <h2>Write and share reviews. Compile your own lists. Share your life in film.</h2>
        <p>
          Below are popular reviews and lists.
          <span> Sign up to create your own.</span>
        </p>
      </div>

      <div className="reviews-layout">
        {/* Main Column: Popular Reviews (sorted by most likes!) */}
        <div className="reviews-main">
          <div className="section-heading">
            <h2>POPULAR REVIEWS THIS WEEK</h2>
            <Link to="/reviews">MORE</Link>
          </div>

          <div className="reviews-list">
            {loading ? (
              <div className="reviews-loading-skeleton" style={{ color: '#678', padding: '20px 0' }}>
                Loading popular reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div style={{ color: '#678', padding: '20px 0' }}>
                No reviews yet. Be the first to review a film!
              </div>
            ) : (
              reviews.map((rev) => {
                const movie = movieMap[String(rev.movieId)] || {
                  id: rev.movieId,
                  title: 'Film',
                  year: '',
                  poster: null
                }

                return (
                  <ReviewCard
                    key={rev._id}
                    review={rev}
                    movie={movie}
                  />
                )
              })
            )}
          </div>
        </div>

        {/* Sidebar Column: Popular Lists & Reviewers */}
        <aside className="reviews-sidebar">
          {/* Popular Lists */}
          <div className="sidebar-section">
            <div className="section-heading">
              <h2>POPULAR LISTS</h2>
              <Link to="/lists">MORE</Link>
            </div>

            <div className="lists-container">
              {displayLists.map((list, index) => {
                const filmsCount = list.films?.length || 0
                const likesCount = list.likes?.length || list.likesCount || 0
                const commentsCount = list.comments?.length || 0
                const listUrl = list._id?.startsWith('default') ? '/lists' : `/list/${list._id}`
                const listFilms = Array.isArray(list.films) ? list.films.slice(0, 5) : []

                return (
                  <Link to={listUrl} className="list-card-link" key={list._id || index}>
                    <div className="list-card">
                      <div className="list-posters">
                        {listFilms.length > 0 ? (
                          listFilms.map((f, i) => {
                            const posterUrl = f.posterPath
                              ? f.posterPath.startsWith('http')
                                ? f.posterPath
                                : `https://image.tmdb.org/t/p/w185${f.posterPath}`
                              : null

                            return posterUrl ? (
                              <img
                                key={i}
                                src={posterUrl}
                                alt={f.title || 'Film'}
                                loading="lazy"
                              />
                            ) : (
                              <div key={i} className="list-poster-placeholder">🎞</div>
                            )
                          })
                        ) : (
                          <div className="list-poster-placeholder empty-full">No films yet</div>
                        )}
                      </div>

                      <h3>{list.name || list.title}</h3>

                      <div className="list-creator">
                        <span className="creator-icon">●</span>
                        {list.username || list.creator}
                      </div>

                      <div className="list-stats">
                        <span>{filmsCount} {filmsCount === 1 ? 'film' : 'films'}</span>
                        <span>♥ {likesCount}</span>
                        <span>▰ {commentsCount}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Popular Reviewers */}
          <div className="sidebar-section reviewers-section">
            <div className="section-heading">
              <h2>POPULAR REVIEWERS</h2>
              <Link to="/reviews">MORE</Link>
            </div>

            <div className="reviewers-list">
              {displayReviewers.map((reviewer) => {
                const username = reviewer.username || 'user'
                return (
                  <Link
                    to={`/${username}`}
                    className="reviewer-item-link"
                    key={username}
                    title={`View ${username}'s profile`}
                  >
                    <div className="reviewer">
                      <div className="reviewer-avatar">
                        {username.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <strong>{username}</strong>
                        <span>
                          {(reviewer.films || 0).toLocaleString()} films, {reviewer.reviews || 0} reviews
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default PopularReviews
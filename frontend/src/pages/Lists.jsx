import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './Lists.css'

function Lists() {
  const navigate = useNavigate()
  const [featuredLists, setFeaturedLists] = useState([])
  const [popularLists, setPopularLists] = useState([])
  const [recentlyLikedLists, setRecentlyLikedLists] = useState([])
  const [crewPicks, setCrewPicks] = useState([])
  
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [loadingPopular, setLoadingPopular] = useState(true)
  const [loadingRecent, setLoadingRecent] = useState(true)

  const [popularLimit, setPopularLimit] = useState(6)
  const [recentLimit, setRecentLimit] = useState(4)
  const [hasMorePopular, setHasMorePopular] = useState(true)
  const [hasMoreRecent, setHasMoreRecent] = useState(true)

  useEffect(() => {
    fetchFeaturedLists()
    fetchCrewPicks()
  }, [])

  useEffect(() => {
    fetchPopularLists(popularLimit)
  }, [popularLimit])

  useEffect(() => {
    fetchRecentlyLikedLists(recentLimit)
  }, [recentLimit])

  const fetchFeaturedLists = async () => {
    try {
      setLoadingFeatured(true)
      const res = await fetch('http://localhost:5000/api/lists?type=featured&limit=3')
      const data = await res.json()
      setFeaturedLists(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch featured lists:', err)
      setFeaturedLists([])
    } finally {
      setLoadingFeatured(false)
    }
  }

  const fetchPopularLists = async (limit) => {
    try {
      setLoadingPopular(true)
      const res = await fetch(`http://localhost:5000/api/lists?type=popular&limit=${limit}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setPopularLists(data)
        // If the number returned is less than the requested limit, no more items exist
        if (data.length < limit) {
          setHasMorePopular(false)
        } else {
          setHasMorePopular(true)
        }
      }
    } catch (err) {
      console.error('Failed to fetch popular lists:', err)
      setPopularLists([])
    } finally {
      setLoadingPopular(false)
    }
  }

  const fetchRecentlyLikedLists = async (limit) => {
    try {
      setLoadingRecent(true)
      const res = await fetch(`http://localhost:5000/api/lists?type=recently-liked&limit=${limit}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setRecentlyLikedLists(data)
        if (data.length < limit) {
          setHasMoreRecent(false)
        } else {
          setHasMoreRecent(true)
        }
      }
    } catch (err) {
      console.error('Failed to fetch recently liked lists:', err)
      setRecentlyLikedLists([])
    } finally {
      setLoadingRecent(false)
    }
  }

  const fetchCrewPicks = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/lists?type=featured&limit=4')
      const data = await res.json()
      setCrewPicks(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch crew picks:', err)
      setCrewPicks([])
    }
  }

  // Component to render the iconic 5-poster fan stack
  const PosterStack = ({ films = [] }) => {
    const displayFilms = films.slice(0, 5)
    return (
      <div className="poster-stack-container">
        {displayFilms.map((film, idx) => (
          <div
            key={film.movieId || idx}
            className={`stacked-poster-item layer-${idx}`}
          >
            {film.posterPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w300${film.posterPath}`}
                alt={film.title || ''}
                loading="lazy"
              />
            ) : (
              <div className="stacked-poster-placeholder">🎞</div>
            )}
          </div>
        ))}
        {displayFilms.length === 0 && (
          <div className="empty-stack-placeholder">No films yet</div>
        )}
      </div>
    )
  }

  const getCreatorUrl = (creatorName) => {
    if (!creatorName) return '/official'
    const clean = creatorName.trim().toLowerCase()
    if (clean === 'official lists' || clean === 'official') {
      return '/official'
    }
    return `/${clean.replace(/\s+/g, '')}`
  }

  const handleMorePopular = () => {
    setPopularLimit(prev => prev + 6)
  }

  const handleMoreRecent = () => {
    setRecentLimit(prev => prev + 4)
  }

  return (
    <div className="lists-page">
      <Navbar />

      {/* Hero Header */}
      <section className="lists-hero">
        <p className="lists-hero-tagline">
          Collect, curate, and share. Lists are the perfect way to group films.
        </p>
        <Link to="/list/new" className="start-list-hero-btn">
          Start your own list
        </Link>
      </section>

      <main className="lists-main-content">
        {/* FEATURED LISTS */}
        <section className="lists-section">
          <div className="section-header-row">
            <h2 className="section-title">FEATURED LISTS</h2>
            <Link to="/official" className="section-see-all">ALL • OFFICIAL</Link>
          </div>

          {loadingFeatured ? (
            <div className="lists-loading">Loading featured lists...</div>
          ) : (
            <div className="lists-cards-grid featured-grid">
              {featuredLists.map(list => (
                <div
                  key={list._id}
                  className="list-card-item"
                  onClick={() => navigate(`/list/${list._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <PosterStack films={list.films} />
                  <div className="list-card-details">
                    <h3 className="list-card-title">{list.name}</h3>
                    <div className="list-card-meta">
                      <span className="creator-text">
                        Created by{' '}
                        <strong
                          className="creator-link"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(getCreatorUrl(list.username))
                          }}
                        >
                          {list.username}
                        </strong>
                      </span>
                      <span className="list-card-stats">
                        {list.films?.length || 0} films • ♥ {list.likes?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>


        {/* POPULAR THIS WEEK (Sorted by Likes!) */}
        <section className="lists-section">
          <div className="section-header-row">
            <h2 className="section-title">POPULAR THIS WEEK</h2>
            {hasMorePopular && (
              <button 
                onClick={handleMorePopular} 
                className="section-see-all section-more-btn"
                title="Load more popular lists"
              >
                MORE
              </button>
            )}
          </div>

          {loadingPopular && popularLists.length === 0 ? (
            <div className="lists-loading">Loading popular lists...</div>
          ) : (
            <>
              <div className="lists-cards-grid popular-grid">
                {popularLists.map(list => (
                  <div
                    key={list._id}
                    className="list-card-item"
                    onClick={() => navigate(`/list/${list._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <PosterStack films={list.films} />
                    <div className="list-card-details">
                      <h3 className="list-card-title">{list.name}</h3>
                      <div className="popular-creator-row">
                        <div
                          className="creator-avatar-mini"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(getCreatorUrl(list.username))
                          }}
                          title={list.username}
                        >
                          {list.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span
                          className="creator-link"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(getCreatorUrl(list.username))
                          }}
                        >
                          {list.username}
                        </span>
                        <span className="list-card-stats">
                          {list.films?.length || 0} films • ♥ {list.likes?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasMorePopular && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                  <button 
                    onClick={handleMorePopular}
                    className="lists-load-more-btn"
                    disabled={loadingPopular}
                  >
                    {loadingPopular ? 'Loading...' : 'LOAD MORE POPULAR LISTS'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Two-column Bottom: RECENTLY LIKED & CREW PICKS */}
        <div className="lists-bottom-two-col">
          {/* Recently Liked */}
          <section className="lists-section col-section">
            <div className="section-header-row">
              <h2 className="section-title">RECENTLY LIKED</h2>
              {hasMoreRecent && (
                <button 
                  onClick={handleMoreRecent} 
                  className="section-see-all section-more-btn"
                  title="Load more recently liked lists"
                >
                  MORE
                </button>
              )}
            </div>
            
            {loadingRecent && recentlyLikedLists.length === 0 ? (
              <div className="lists-loading">Loading recently liked lists...</div>
            ) : recentlyLikedLists.length === 0 ? (
              <div className="lists-loading">No liked lists yet.</div>
            ) : (
              <>
                <div className="compact-lists-stack">
                  {recentlyLikedLists.map(list => (
                    <div
                      key={list._id}
                      className="compact-list-row"
                      onClick={() => navigate(`/list/${list._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="mini-poster-stack">
                        <PosterStack films={list.films} />
                      </div>
                      <div className="compact-list-info">
                        <h4 className="compact-list-title">{list.name}</h4>
                        <span className="compact-list-author">
                          by{' '}
                          <strong
                            className="creator-link"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(getCreatorUrl(list.username))
                            }}
                          >
                            {list.username}
                          </strong>{' '}
                          • {list.films?.length || 0} films • ♥ {list.likes?.length || 0}
                        </span>
                        {list.description && (
                          <p className="compact-list-snippet">{list.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {hasMoreRecent && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                    <button 
                      onClick={handleMoreRecent}
                      className="lists-load-more-btn-compact"
                      disabled={loadingRecent}
                    >
                      {loadingRecent ? 'Loading...' : 'MORE RECENTLY LIKED'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Crew Picks */}
          <section className="lists-section col-section">
            <div className="section-header-row">
              <h2 className="section-title">CREW PICKS</h2>
            </div>
            <div className="compact-lists-stack">
              {(crewPicks.length > 0 ? crewPicks : featuredLists).slice(0, 4).map(list => (
                <div
                  key={list._id}
                  className="compact-list-row"
                  onClick={() => navigate(`/list/${list._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="mini-poster-stack">
                    <PosterStack films={list.films} />
                  </div>
                  <div className="compact-list-info">
                    <h4 className="compact-list-title">{list.name}</h4>
                    <span className="compact-list-author">
                      Curated by{' '}
                      <strong
                        className="creator-link"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(getCreatorUrl(list.username))
                        }}
                      >
                        {list.username}
                      </strong>{' '}
                      • {list.films?.length || 0} films
                    </span>
                    {list.description && (
                      <p className="compact-list-snippet">{list.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Lists

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './Members.css'

function Members() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const currentUsername = localStorage.getItem('username')

  const [members, setMembers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeSort, setActiveSort] = useState('popular')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [followLoading, setFollowLoading] = useState({})

  // Debounce search input by 300ms
  const searchTimeoutRef = useRef(null)
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(val)
      setPage(1)
    }, 300)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setDebouncedQuery('')
    setPage(1)
  }

  // Fetch members
  useEffect(() => {
    fetchMembers(1, activeSort, debouncedQuery, true)
  }, [activeSort, debouncedQuery])

  const fetchMembers = async (targetPage = 1, sort = activeSort, query = debouncedQuery, isReset = false) => {
    try {
      if (isReset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const headers = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const params = new URLSearchParams({
        sort,
        page: targetPage.toString(),
        limit: '24'
      })
      if (query.trim()) {
        params.append('q', query.trim())
      }

      const res = await fetch(`http://localhost:5000/api/auth/members?${params.toString()}`, { headers })
      const data = await res.json()

      if (res.ok && Array.isArray(data.members)) {
        if (isReset) {
          setMembers(data.members)
        } else {
          setMembers(prev => {
            const seen = new Set(prev.map(m => m.id))
            const fresh = data.members.filter(m => !seen.has(m.id))
            return [...prev, ...fresh]
          })
        }
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setPage(targetPage)
      } else {
        if (isReset) setMembers([])
      }
    } catch (err) {
      console.error('Error fetching members:', err)
      if (isReset) setMembers([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchMembers(page + 1, activeSort, debouncedQuery, false)
    }
  }

  const handleFollowToggle = async (member) => {
    if (!token) {
      alert('Please sign in to follow community members!')
      navigate('/login')
      return
    }

    if (member.isSelf) return

    const targetUser = member.username
    const currentlyFollowing = member.isFollowing
    const endpoint = currentlyFollowing ? 'unfollow' : 'follow'

    // Optimistic UI update
    setMembers(prev =>
      prev.map(m => {
        if (m.username === targetUser) {
          return {
            ...m,
            isFollowing: !currentlyFollowing,
            followersCount: Math.max(0, m.followersCount + (currentlyFollowing ? -1 : 1))
          }
        }
        return m
      })
    )

    setFollowLoading(prev => ({ ...prev, [targetUser]: true }))

    try {
      const res = await fetch(`http://localhost:5000/api/auth/user/${targetUser}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()

      if (!res.ok) {
        // Revert on error
        setMembers(prev =>
          prev.map(m => {
            if (m.username === targetUser) {
              return {
                ...m,
                isFollowing: currentlyFollowing,
                followersCount: Math.max(0, m.followersCount + (currentlyFollowing ? 1 : -1))
              }
            }
            return m
          })
        )
        alert(data.error || 'Failed to update follow status')
      }
    } catch (err) {
      console.error('Follow error:', err)
      // Revert on network error
      setMembers(prev =>
        prev.map(m => {
          if (m.username === targetUser) {
            return {
              ...m,
              isFollowing: currentlyFollowing,
              followersCount: Math.max(0, m.followersCount + (currentlyFollowing ? 1 : -1))
            }
          }
          return m
        })
      )
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetUser]: false }))
    }
  }

  const sortTabs = [
    { key: 'popular', label: 'POPULAR', icon: '🔥', tooltip: 'All-round most popular based on reviews, films, likes and followers' },
    { key: 'reviews', label: 'MOST REVIEWS', icon: '✍️', tooltip: 'Members with the most film reviews written' },
    { key: 'films', label: 'MOST FILMS', icon: '🎬', tooltip: 'Members with the most films logged and watched' },
    { key: 'likes', label: 'MOST LIKES', icon: '♥', tooltip: 'Members whose reviews have received the most likes' },
    { key: 'followers', label: 'MOST FOLLOWERS', icon: '👥', tooltip: 'Members with the most followers' },
    { key: 'recent', label: 'NEWEST', icon: '✨', tooltip: 'Recently joined members' }
  ]

  return (
    <div className="members-page-wrapper">
      <Navbar />

      <main className="members-main-content">
        {/* Header Hero */}
        <section className="members-hero-section">
          <div className="members-hero-left">
            <span className="members-eyebrow">COMMUNITY DIRECTORY</span>
            <h1 className="members-page-title">MEMBERS</h1>
            <p className="members-page-subtitle">
              Discover and follow cinephiles, critics, and friends. Track films, read reviews, and build your film circle.
            </p>
          </div>

          <div className="members-hero-stats-badge">
            <span className="stats-number">{total.toLocaleString()}</span>
            <span className="stats-label">ACTIVE MEMBERS</span>
          </div>
        </section>

        {/* Search & Sort Controls Toolbar */}
        <section className="members-toolbar">
          <div className="members-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="members-search-input"
              placeholder="Find a member by name, username, or bio..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button
                type="button"
                className="members-clear-search-btn"
                onClick={clearSearch}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Tabs */}
          <div className="members-sort-tabs">
            {sortTabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`sort-tab-btn ${activeSort === tab.key ? 'active' : ''}`}
                onClick={() => {
                  if (activeSort !== tab.key) {
                    setActiveSort(tab.key)
                    setPage(1)
                  }
                }}
                title={tab.tooltip}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Active Filters / Status Info */}
        <div className="members-status-bar">
          <div className="status-info">
            {debouncedQuery ? (
              <span>
                Showing results for <strong>"{debouncedQuery}"</strong> ({total} {total === 1 ? 'member' : 'members'} found)
              </span>
            ) : (
              <span>
                Sorted by <strong>{sortTabs.find(t => t.key === activeSort)?.label}</strong> • {total} {total === 1 ? 'member' : 'members'}
              </span>
            )}
          </div>
        </div>

        {/* Members Cards Grid */}
        {loading ? (
          <div className="members-loading-container">
            <div className="members-spinner"></div>
            <p className="loading-text">Loading community members...</p>
          </div>
        ) : members.length > 0 ? (
          <>
            <div className="members-grid">
              {members.map(member => {
                const initial = (member.username || 'M').charAt(0).toUpperCase()
                const isCurrent = Boolean(currentUsername && currentUsername.toLowerCase() === member.username?.toLowerCase())

                return (
                  <article className="member-card" key={member.id}>
                    {/* Card Top / Header */}
                    <div className="member-card-header">
                      <Link to={`/${member.username}`} className="member-avatar-wrapper" title={`View ${member.username}'s profile`}>
                        <div className="member-avatar">
                          {initial}
                        </div>
                        {member.badge && (
                          <span className="member-badge-tag">{member.badge}</span>
                        )}
                      </Link>

                      <div className="member-identity">
                        <Link to={`/${member.username}`} className="member-name-link">
                          <h3 className="member-display-name">
                            {member.displayName || member.username}
                          </h3>
                        </Link>
                        <Link to={`/${member.username}`} className="member-username-link">
                          @{member.username}
                        </Link>
                        {member.location && (
                          <span className="member-location">📍 {member.location}</span>
                        )}
                      </div>

                      {/* Follow Button */}
                      <div className="member-action-cell">
                        {isCurrent ? (
                          <span className="member-self-badge">YOU</span>
                        ) : (
                          <button
                            type="button"
                            className={`member-follow-btn ${member.isFollowing ? 'following' : ''}`}
                            onClick={() => handleFollowToggle(member)}
                            disabled={followLoading[member.username]}
                          >
                            {member.isFollowing ? 'FOLLOWING' : '+ FOLLOW'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Member Bio */}
                    {member.bio ? (
                      <p className="member-bio">{member.bio}</p>
                    ) : (
                      <p className="member-bio empty">No bio provided.</p>
                    )}

                    {/* Key Stats Row: 4 Metric Badges */}
                    <div className="member-stats-row">
                      <div className="stat-chip" title={`${member.watchedCount} films watched`}>
                        <span className="stat-chip-icon">🎬</span>
                        <span className="stat-chip-val">{member.watchedCount.toLocaleString()}</span>
                        <span className="stat-chip-lbl">FILMS</span>
                      </div>

                      <div className="stat-chip" title={`${member.reviewsCount} reviews written`}>
                        <span className="stat-chip-icon">✍️</span>
                        <span className="stat-chip-val">{member.reviewsCount.toLocaleString()}</span>
                        <span className="stat-chip-lbl">REVIEWS</span>
                      </div>

                      <div className="stat-chip" title={`${member.likesCount.toLocaleString()} review likes received`}>
                        <span className="stat-chip-icon heart">♥</span>
                        <span className="stat-chip-val">{member.likesCount.toLocaleString()}</span>
                        <span className="stat-chip-lbl">LIKES</span>
                      </div>

                      <div className="stat-chip" title={`${member.followersCount.toLocaleString()} followers`}>
                        <span className="stat-chip-icon">👥</span>
                        <span className="stat-chip-val">{member.followersCount.toLocaleString()}</span>
                        <span className="stat-chip-lbl">FOLLOWERS</span>
                      </div>
                    </div>

                    {/* Favorite Films Mini-Posters Bar */}
                    {Array.isArray(member.favoriteFilms) && member.favoriteFilms.length > 0 && (
                      <div className="member-favs-row">
                        <span className="favs-heading">FAVORITE FILMS</span>
                        <div className="favs-posters-strip">
                          {member.favoriteFilms.slice(0, 4).map((film, idx) => (
                            <Link
                              key={`${film.movieId}-${idx}`}
                              to={`/film/${film.movieId}`}
                              className="fav-mini-poster"
                              title={film.title}
                            >
                              {film.posterPath ? (
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${film.posterPath}`}
                                  alt={film.title}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="fav-mini-placeholder">{film.title?.slice(0, 10)}</div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>

            {/* Load More Button */}
            {page < totalPages && (
              <div className="members-load-more-section">
                <button
                  type="button"
                  className="members-load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'LOADING MORE MEMBERS...' : 'LOAD MORE MEMBERS'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="members-empty-state">
            <span className="empty-icon">👥</span>
            <h3>No members found</h3>
            {debouncedQuery ? (
              <p>No community members match your search for "{debouncedQuery}".</p>
            ) : (
              <p>There are no members to display in this category.</p>
            )}
            {debouncedQuery && (
              <button type="button" className="members-reset-btn" onClick={clearSearch}>
                Clear Search Filter
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Members

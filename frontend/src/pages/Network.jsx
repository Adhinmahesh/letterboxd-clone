import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './Network.css'

function Network() {
  const { username: paramUsername } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = localStorage.getItem('token')
  const currentUsername = localStorage.getItem('username')
  const username = paramUsername || currentUsername || 'adhin1234'

  const initialTab = searchParams.get('tab') || 'following'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [sortBy, setSortBy] = useState('name')
  const [sortOpen, setSortOpen] = useState(false)

  const [networkData, setNetworkData] = useState({
    targetUser: null,
    isOwner: false,
    following: [],
    followers: [],
    blocked: []
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  // Canonical redirect when on /network without username
  useEffect(() => {
    if (!paramUsername) {
      const target = currentUsername || 'adhin1234'
      const search = searchParams.toString() ? `?${searchParams.toString()}` : ''
      navigate(`/${target}/network${search}`, { replace: true })
    }
  }, [paramUsername, currentUsername])

  useEffect(() => {
    const tabParam = searchParams.get('tab') || 'following'
    if (['following', 'followers', 'blocked'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  useEffect(() => {
    fetchNetwork()
    document.title = `${username}'s Network • Letterboxd`
  }, [username])

  const fetchNetwork = async () => {
    try {
      setLoading(true)
      const res = await fetch(`http://localhost:5000/api/auth/user/${username}/network`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (res.ok) {
        setNetworkData({
          targetUser: data.targetUser || null,
          isOwner: Boolean(data.isOwner),
          following: Array.isArray(data.following) ? data.following : [],
          followers: Array.isArray(data.followers) ? data.followers : [],
          blocked: Array.isArray(data.blocked) ? data.blocked : []
        })
      }
    } catch (err) {
      console.error('Failed to load network:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
    setSearchParams(newTab === 'following' ? {} : { tab: newTab })
  }

  // Toggle follow on a member card
  const handleFollowToggle = async (targetUser) => {
    if (!token) {
      navigate('/login')
      return
    }
    if (actionLoading) return
    setActionLoading(true)

    const isFollowing = targetUser.isFollowing
    const endpoint = isFollowing
      ? `http://localhost:5000/api/auth/user/${targetUser.username}/unfollow`
      : `http://localhost:5000/api/auth/user/${targetUser.username}/follow`

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (res.ok) {
        // Update local state across following & followers lists
        const updateList = (list) =>
          list.map((m) =>
            m.username.toLowerCase() === targetUser.username.toLowerCase()
              ? { ...m, isFollowing: !isFollowing }
              : m
          )

        setNetworkData((prev) => ({
          ...prev,
          following: updateList(prev.following),
          followers: updateList(prev.followers)
        }))

        showToast(
          !isFollowing ? `Now following ${targetUser.username}` : `Unfollowed ${targetUser.username}`
        )
      } else {
        showToast(data.error || 'Failed to update follow status')
      }
    } catch (err) {
      console.error('Follow error:', err)
      showToast('Network error')
    } finally {
      setActionLoading(false)
    }
  }

  // Unblock a member from the blocked list
  const handleUnblock = async (targetUser) => {
    if (!token) {
      navigate('/login')
      return
    }
    if (actionLoading) return
    setActionLoading(true)

    try {
      const res = await fetch(`http://localhost:5000/api/auth/user/${targetUser.username}/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (res.ok) {
        setNetworkData((prev) => ({
          ...prev,
          blocked: prev.blocked.filter(
            (m) => m.username.toLowerCase() !== targetUser.username.toLowerCase()
          )
        }))
        showToast(`Unblocked ${targetUser.displayName || targetUser.username}`)
      } else {
        showToast(data.error || 'Failed to unblock member')
      }
    } catch (err) {
      console.error('Unblock error:', err)
      showToast('Network error')
    } finally {
      setActionLoading(false)
    }
  }

  // Current tab items sorted
  const isOwner = Boolean(
    networkData.isOwner ||
    (currentUsername && currentUsername.toLowerCase() === username.toLowerCase())
  )

  const rawList =
    activeTab === 'following'
      ? networkData.following
      : activeTab === 'followers'
      ? networkData.followers
      : networkData.blocked

  const currentList = Array.isArray(rawList) ? rawList : []

  const sortedList = [...currentList].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.displayName || a.username).localeCompare(b.displayName || b.username)
    }
    return (b.followersCount || 0) - (a.followersCount || 0)
  })

  return (
    <div className="network-page">
      <Navbar />

      {/* Floating Toast */}
      {toastMsg && (
        <div className="network-toast">
          {toastMsg}
        </div>
      )}

      {/* Profile Top Subnav Bar (Matching Screenshot 2) */}
      <div className="network-subnav-container">
        <div className="network-profile-bar">
          <div className="profile-bar-left">
            <div className="profile-bar-avatar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#89a">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <Link to={`/${username}`} className="profile-bar-username-link">
              <span className="profile-bar-username">{username}</span>
            </Link>
          </div>

          <div className="profile-bar-tabs">
            <Link to={`/${username}`}>Activity</Link>
            <Link to={`/${username}/films`}>Films</Link>
            <Link to={`/${username}/diary`}>Diary</Link>
            <Link to={`/${username}/reviews`}>Reviews</Link>
            <Link to={`/${username}/watchlist`}>Watchlist</Link>
            <Link to={`/${username}/lists`}>Lists</Link>
            <Link to={`/${username}/likes`}>Likes</Link>
            <Link to={`/${username}/network`} className="active-tab">
              Network
            </Link>
          </div>

          <div className="profile-bar-actions">
            <Link to="/search" className="subnav-icon-btn" title="Search">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </Link>
            <button className="subnav-icon-btn" title="RSS Feed" type="button">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <circle cx="6.18" cy="17.82" r="2.18" />
                <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="network-container">
        {/* Network Sub-tabs & Sort Row */}
        <div className="network-header-row">
          <div className="network-subtabs">
            <button
              type="button"
              className={`network-tab-btn ${activeTab === 'following' ? 'active' : ''}`}
              onClick={() => handleTabChange('following')}
            >
              FOLLOWING
            </button>

            <button
              type="button"
              className={`network-tab-btn ${activeTab === 'followers' ? 'active' : ''}`}
              onClick={() => handleTabChange('followers')}
            >
              FOLLOWERS
            </button>

            {/* Blocked tab: Available if owner or when viewing own profile */}
            <button
              type="button"
              className={`network-tab-btn ${activeTab === 'blocked' ? 'active' : ''}`}
              onClick={() => handleTabChange('blocked')}
            >
              BLOCKED
            </button>
          </div>

          <div className="network-sort-wrap">
            <button
              type="button"
              className="network-sort-btn"
              onClick={() => setSortOpen(!sortOpen)}
            >
              Sort by {sortBy === 'name' ? 'MEMBER NAME' : 'POPULARITY'} <span className="arrow">⌵</span>
            </button>

            {sortOpen && (
              <div className="network-sort-menu">
                <div
                  className={`sort-item ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => {
                    setSortBy('name')
                    setSortOpen(false)
                  }}
                >
                  Member Name
                </div>
                <div
                  className={`sort-item ${sortBy === 'popularity' ? 'active' : ''}`}
                  onClick={() => {
                    setSortBy('popularity')
                    setSortOpen(false)
                  }}
                >
                  Popularity
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Network Body Layout: List Box + Right Promo Sidebar */}
        <div className="network-body-layout">
          {/* Main Box Column (Exact Match to Screenshot 2) */}
          <div className="network-main-column">
            {loading ? (
              <div className="network-box-container empty-box">
                <p className="empty-box-text">Loading network...</p>
              </div>
            ) : sortedList.length === 0 ? (
              <div className="network-box-container empty-box">
                <p className="empty-box-text">
                  {activeTab === 'blocked'
                    ? 'You have not blocked anyone.'
                    : activeTab === 'following'
                    ? (isOwner ? 'You are not following anyone yet.' : `${username} is not following anyone yet.`)
                    : (isOwner ? 'You do not have any followers yet.' : `${username} has no followers yet.`)}
                </p>
              </div>
            ) : (
              <div className="network-members-list">
                {sortedList.map((member) => (
                  <div key={member.id || member._id} className="network-member-row">
                    <div className="member-row-left">
                      <div className="member-avatar">
                        {member.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="member-info">
                        <div className="member-name-row">
                          <Link to={`/${member.username}`} className="member-display-name">
                            {member.displayName || member.username}
                          </Link>
                          {member.badge && <span className="member-badge">{member.badge}</span>}
                          <span className="member-username-slug">@{member.username}</span>
                        </div>
                        {member.bio && <p className="member-bio">{member.bio}</p>}
                        <div className="member-stats">
                          <span>{member.followersCount || 0} followers</span>
                          {member.location && <span> • 📍 {member.location}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="member-row-actions">
                      {activeTab === 'blocked' ? (
                        <button
                          type="button"
                          className="member-unblock-btn"
                          onClick={() => handleUnblock(member)}
                          disabled={actionLoading}
                        >
                          UNBLOCK
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`member-follow-btn ${member.isFollowing ? 'following' : ''}`}
                          onClick={() => handleFollowToggle(member)}
                          disabled={actionLoading}
                        >
                          {member.isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Network

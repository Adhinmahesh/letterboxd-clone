import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './ReviewDetail.css'

function ReviewDetail() {
  const { username, id: paramId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const currentUsername = localStorage.getItem('username')
  const currentUserId = localStorage.getItem('userId')

  const [loading, setLoading] = useState(true)
  const [review, setReview] = useState(null)
  const [movie, setMovie] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [hasLikedReview, setHasLikedReview] = useState(false)
  const [likesCount, setLikesCount] = useState(0)

  // Current user's interaction on this film
  const [userInteraction, setUserInteraction] = useState({
    watched: false,
    liked: false,
    watchlist: false,
    rating: 0
  })

  // Edit / Delete Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editRating, setEditRating] = useState(0)
  const [editLiked, setEditLiked] = useState(false)
  const [editWatched, setEditWatched] = useState(true)
  const [editReviewText, setEditReviewText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingReview, setDeletingReview] = useState(false)

  const isAuthor = Boolean(
    token && review && (
      (currentUsername && review.username && review.username.toLowerCase() === currentUsername.toLowerCase()) ||
      (currentUserId && review.userId && review.userId === currentUserId)
    )
  )

  useEffect(() => {
    fetchReviewAndMovie()
  }, [username, paramId])

  const fetchReviewAndMovie = async () => {
    try {
      setLoading(true)
      let foundReview = null
      let movieId = paramId

      // Case 1: Fetch by username and movieId if username exists
      if (username && paramId) {
        try {
          const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/interactions/review/by-user/${username}/${paramId}`)
          if (res.ok) {
            foundReview = await res.json()
            movieId = foundReview.movieId || paramId
          }
        } catch (e) {
          console.error(e)
        }
      }

      // Case 1b: If paramId is a slug (e.g. "premalu"), search TMDB first
      if (!foundReview && username && paramId && isNaN(Number(paramId)) && paramId.length !== 24) {
        try {
          const apiKey = import.meta.env.VITE_TMDB_API_KEY
          const searchRes = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(paramId)}`
          )
          const searchData = await searchRes.json()
          if (searchData.results && searchData.results.length > 0) {
            const resolvedId = searchData.results[0].id.toString()
            const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/interactions/review/by-user/${username}/${resolvedId}`)
            if (res.ok) {
              foundReview = await res.json()
              movieId = resolvedId
            }
          }
        } catch (e) {
          console.error(e)
        }
      }

      // Case 2: Fetch by interaction _id if paramId looks like a MongoDB ObjectId
      if (!foundReview && paramId && paramId.length === 24) {
        try {
          const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/interactions/review/${paramId}`)
          if (res.ok) {
            foundReview = await res.json()
            movieId = foundReview.movieId
          }
        } catch (e) {
          console.error(e)
        }
      }

      // Fallback: search reviews for movie
      if (!foundReview && movieId) {
        try {
          const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/interactions/movie/${movieId}/reviews`)
          if (res.ok) {
            const list = await res.json()
            if (username) {
              foundReview = list.find(r => r.username?.toLowerCase() === username.toLowerCase()) || list[0]
            } else {
              foundReview = list[0]
            }
          }
        } catch (e) {
          console.error(e)
        }
      }

      if (foundReview) {
        setReview(foundReview)
        setLikesCount(foundReview.reviewLikes?.length || 0)
        // Check if current user has liked this review
        const currentUserId = localStorage.getItem('userId')
        const hasLiked = (foundReview.reviewLikes || []).some(
          id => id === currentUserId || id === currentUsername
        )
        setHasLikedReview(hasLiked)
        movieId = foundReview.movieId
      }

      // Fetch TMDB Movie Details
      if (movieId) {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&append_to_response=credits,videos`)
        const tmdbData = await tmdbRes.json()
        if (tmdbData && !tmdbData.status_message) {
          setMovie(tmdbData)
          document.title = foundReview
            ? `Review by ${foundReview.username} of ${tmdbData.title} • Letterboxd`
            : `${tmdbData.title} Review • Letterboxd`
        }
      }

      // Fetch logged-in user's own interaction on this film
      if (token && movieId) {
        try {
          const userIntRes = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/interactions/${movieId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (userIntRes.ok) {
            const userIntData = await userIntRes.json()
            setUserInteraction({
              watched: Boolean(userIntData.watched),
              liked: Boolean(userIntData.liked),
              watchlist: Boolean(userIntData.watchlist),
              rating: userIntData.rating || 0
            })
          }
        } catch (e) {
          // Ignore
        }
      }
    } catch (err) {
      console.error('Error fetching review and movie:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLikeReview = async () => {
    if (!token) {
      alert('Please log in to like reviews!')
      return
    }

    if (!review?._id) return

    try {
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/interactions/${review._id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setHasLikedReview(data.liked)
        setLikesCount(data.likesCount !== undefined ? data.likesCount : (hasLikedReview ? likesCount - 1 : likesCount + 1))
      }
    } catch (err) {
      console.error('Failed to toggle like:', err)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!token) {
      navigate('/login')
      return
    }

    if (!commentText.trim() || !review?._id) return

    try {
      setSubmittingComment(true)
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/interactions/${review._id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: commentText.trim() })
      })
      const data = await res.json()
      if (res.ok && data.interaction) {
        setReview(data.interaction)
        setCommentText('')
      }
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleOpenEditModal = () => {
    if (!review) return
    setEditRating(review.rating || 0)
    setEditLiked(Boolean(review.liked))
    setEditWatched(review.watched !== undefined ? review.watched : true)
    setEditReviewText(review.review || '')
    setEditModalOpen(true)
  }

  const handleSaveReviewEdit = async (e) => {
    if (e) e.preventDefault()
    if (!token || !review?._id) return

    setSavingEdit(true)
    try {
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/interactions/review/${review._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          review: editReviewText.trim(),
          rating: editRating,
          liked: editLiked,
          watched: editWatched
        })
      })

      const data = await res.json()
      if (res.ok) {
        setReview(data.interaction)
        setUserInteraction(prev => ({
          ...prev,
          rating: editRating,
          liked: editLiked,
          watched: editWatched
        }))
        setEditModalOpen(false)
        alert('Review updated successfully!')
      } else {
        alert(data.error || 'Failed to update review')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to update review.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!token || !review?._id) return

    setDeletingReview(true)
    try {
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/interactions/review/${review._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (res.ok) {
        alert('Review deleted.')
        navigate(`/${review.username || currentUsername}/reviews`)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete review')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to delete review.')
    } finally {
      setDeletingReview(false)
      setDeleteConfirmOpen(false)
    }
  }

  const renderStars = (rating) => {
    if (!rating || rating <= 0) return ''
    const full = Math.floor(rating)
    const half = rating % 1 !== 0
    return `${'★'.repeat(full)}${half ? '½' : ''}`
  }

  const formatRelativeTime = (dateString) => {
    if (!dateString) return ''
    const diffMs = new Date() - new Date(dateString)
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return 'now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d`
    const diffMonths = Math.floor(diffDays / 30)
    return `${diffMonths}mo`
  }

  const formatReviewDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="review-detail-page">
        <Navbar />
        <div className="review-loading-spinner">Loading review...</div>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="review-detail-page">
        <Navbar />
        <div className="review-not-found">
          <h2>Review not found</h2>
          <p>We couldn't find this review. It may have been removed or updated.</p>
          <Link to="/" className="back-home-btn">Return to Home</Link>
        </div>
      </div>
    )
  }

  const backdropPath = movie?.backdrop_path
  const posterPath = movie?.poster_path
  const title = movie?.title || 'Film'
  const releaseYear = movie?.release_date ? movie.release_date.split('-')[0] : ''
  const movieId = review.movieId || paramId
  const replies = review.replies || []

  return (
    <div className="review-detail-page">
      <Navbar />

      {/* Cinematic Movie Backdrop Hero */}
      {backdropPath && (
        <div className="review-backdrop-hero">
          <img
            src={`https://image.tmdb.org/t/p/original${backdropPath}`}
            alt={title}
            className="review-backdrop-img"
          />
          <div className="review-backdrop-overlay" />
        </div>
      )}

      <main className="review-detail-container">
        <div className="review-detail-layout">
          {/* Left Column: Movie Poster & Links */}
          <aside className="review-poster-col">
            <Link to={`/film/${movieId}`} className="review-poster-link" title={`View ${title}`}>
              {posterPath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w342${posterPath}`}
                  alt={title}
                  className="review-movie-poster"
                />
              ) : (
                <div className="review-no-poster-box">🎞</div>
              )}
            </Link>

            <div className="poster-action-buttons">
              <button
                type="button"
                className="trailer-link-btn"
                onClick={() => {
                  const trailer = movie?.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')
                  if (trailer) window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank')
                  else alert('Trailer not available')
                }}
              >
                ▶ Trailer
              </button>
              <span className="not-streaming-text">Not streaming.</span>
              <a
                href={`https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}`}
                target="_blank"
                rel="noreferrer"
                className="justwatch-link"
              >
                More... JustWatch
              </a>
            </div>
          </aside>

          {/* Center Column: The Review Content & Comments */}
          <div className="review-center-col">
            <article className="main-review-card">
              {/* Reviewer Header Row */}
              <div className="reviewer-header-row">
                <Link to={`/${review.username}`} className="reviewer-avatar-bubble">
                  {review.username ? review.username[0].toUpperCase() : 'U'}
                </Link>

                <div className="reviewer-meta-text">
                  <span className="review-by-label">
                    Review by{' '}
                    <Link to={`/${review.username}`} className="reviewer-name-link">
                      <strong>{review.username}</strong>
                    </Link>
                    {review.username?.toLowerCase() === 'schaffrillas' && (
                      <span className="patron-badge">PATRON</span>
                    )}
                    {review.username?.toLowerCase() === 'connoreatspants' && (
                      <span className="pro-badge">PRO</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Movie Title & Release Year */}
              <div className="review-film-headline">
                <h1 className="review-film-title">
                  <Link to={`/film/${movieId}`}>{title}</Link>
                  {releaseYear && <span className="review-film-year"> {releaseYear}</span>}
                </h1>
              </div>

              {/* Stars & Heart & Watched Date */}
              <div className="review-rating-bar">
                {review.rating > 0 && (
                  <span className="review-stars-green">{renderStars(review.rating)}</span>
                )}
                {review.liked && (
                  <span className="review-liked-heart" title="Liked this film">♥</span>
                )}
                <span className="review-watched-date">
                  Watched {formatReviewDate(review.updatedAt || review.createdAt)}
                </span>
              </div>

              {/* Review Body Text */}
              <div className="review-full-text">
                <p>{review.review}</p>
              </div>

              {/* Review Like Action & Stats */}
              <div className="review-actions-bar">
                <button
                  type="button"
                  className={`review-like-btn ${hasLikedReview ? 'liked' : ''}`}
                  onClick={handleLikeReview}
                >
                  <span className="heart-icon">♥</span> {hasLikedReview ? 'Liked' : 'Like review'}
                </button>
                <span className="review-likes-counter">
                  {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
                </span>
                <button type="button" className="review-report-btn" title="Report review">⚑</button>
              </div>
            </article>

            {/* COMMENTS SECTION (Matching Screenshot 4) */}
            <section className="review-comments-section" id="comments">
              <div className="comments-section-header">
                <h3 className="comments-count-title">
                  {replies.length} {replies.length === 1 ? 'COMMENT' : 'COMMENTS'}
                </h3>
                <span className="comments-bell-icon" title="Notifications">🔔</span>
              </div>

              {/* List of Comments */}
              <div className="review-comments-list">
                {replies.map((reply, idx) => (
                  <div key={reply._id || idx} className="review-comment-row">
                    <Link
                      to={`/${reply.username}`}
                      className="comment-user-avatar"
                      title={reply.username}
                    >
                      {reply.username ? reply.username[0].toUpperCase() : 'U'}
                    </Link>

                    <div className="comment-text-bubble">
                      <div className="comment-author-line">
                        <Link to={`/${reply.username}`} className="comment-author-name">
                          {reply.username}
                        </Link>
                        {reply.badge && <span className="crew-badge">{reply.badge}</span>}
                        <span className="comment-time-ago">
                          {formatRelativeTime(reply.createdAt)}
                        </span>
                      </div>
                      <p className="comment-message-body">{reply.text}</p>
                    </div>
                  </div>
                ))}

                {replies.length === 0 && (
                  <p className="no-comments-yet-text">
                    No comments on this review yet. Be the first to share your thoughts!
                  </p>
                )}
              </div>

              {/* Add Comment Form */}
              <div className="add-comment-wrapper">
                {token ? (
                  <form onSubmit={handleAddComment} className="add-comment-form">
                    <div className="comment-form-avatar">
                      {currentUsername ? currentUsername[0].toUpperCase() : 'U'}
                    </div>
                    <div className="comment-form-inputs">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Leave a comment..."
                        rows={3}
                        required
                        className="comment-textarea"
                      />
                      <div className="comment-submit-row">
                        <button
                          type="submit"
                          className="post-comment-btn"
                          disabled={submittingComment || !commentText.trim()}
                        >
                          {submittingComment ? 'POSTING...' : 'POST'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="comment-login-notice">
                    <p>
                      Welcome! Please <Link to="/login">sign in</Link> to join the discussion and comment on this review.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Sidebar: Interaction Panel & Links */}
          <aside className="review-sidebar-col">
            <div className="sidebar-action-panel">
              <div className="action-icons-row">
                <div className={`action-icon-pill ${userInteraction.watched ? 'active' : ''}`}>
                  <span className="icon">👁</span>
                  <span className="label">Reviewed</span>
                </div>
                <div className={`action-icon-pill ${userInteraction.liked ? 'active' : ''}`}>
                  <span className="icon">♥</span>
                  <span className="label">Like</span>
                </div>
                <div className={`action-icon-pill ${userInteraction.watchlist ? 'active' : ''}`}>
                  <span className="icon">◷</span>
                  <span className="label">Watchlist</span>
                </div>
              </div>

              <div className="sidebar-star-rate-row">
                <span className="rate-hint">Rate</span>
                <span className="sidebar-stars">
                  {userInteraction.rating > 0
                    ? renderStars(userInteraction.rating)
                    : '☆☆☆☆☆'}
                </span>
              </div>

              <div className="sidebar-menu-links">
                <Link to={`/${currentUsername || review.username}`} className="sidebar-menu-item">
                  Show your activity
                </Link>

                {isAuthor && (
                  <button
                    type="button"
                    className="sidebar-menu-item btn-link sidebar-edit-delete-btn"
                    onClick={handleOpenEditModal}
                  >
                    Edit or delete review...
                  </button>
                )}

                <Link to={`/film/${movieId}`} className="sidebar-menu-item">
                  Review or log again...
                </Link>
                <Link to={`/film/${movieId}`} className="sidebar-menu-item">
                  Add film to lists...
                </Link>

                {/* Share Link Box (Matching Screenshot 2) */}
                <div className="sidebar-share-row">
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className="sidebar-share-input"
                    onClick={(e) => {
                      e.target.select()
                      navigator.clipboard?.writeText(window.location.href)
                    }}
                    title="Click to copy link"
                  />
                  <button
                    type="button"
                    className="sidebar-share-icon"
                    title="Share on X"
                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`, '_blank')}
                  >
                    𝕏
                  </button>
                  <button
                    type="button"
                    className="sidebar-share-icon"
                    title="Share on Facebook"
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                  >
                    f
                  </button>
                </div>
              </div>
            </div>

            {/* Reviewer's Films Showcase */}
            <div className="sidebar-reviewer-films">
              <div className="widget-header-line">
                <Link to={`/${review.username}/films`} className="widget-heading">
                  {review.username.toUpperCase()}'S FILMS
                </Link>
              </div>
              <div className="reviewer-films-grid">
                <Link to={`/film/${movieId}`} className="film-mini-thumb">
                  {posterPath ? (
                    <img src={`https://image.tmdb.org/t/p/w154${posterPath}`} alt={title} />
                  ) : (
                    <div className="mini-thumb-fallback">🎞</div>
                  )}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* EDIT REVIEW MODAL */}
      {editModalOpen && (
        <div className="review-modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <span className="modal-title">EDIT REVIEW</span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditModalOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReviewEdit} className="review-modal-body">
              {/* Film Header inside modal */}
              <div className="modal-film-preview">
                {posterPath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${posterPath}`}
                    alt={title}
                    className="modal-film-poster"
                  />
                ) : (
                  <div className="modal-poster-placeholder">🎞</div>
                )}
                <div className="modal-film-info">
                  <h3 className="modal-film-title">{title}</h3>
                  {releaseYear && <span className="modal-film-year">{releaseYear}</span>}
                </div>
              </div>

              {/* Star Rating Selector */}
              <div className="modal-control-group">
                <label className="modal-control-label">Rating:</label>
                <div className="modal-star-picker">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      className={`star-pick-btn ${editRating >= starVal ? 'filled' : ''} ${
                        editRating === starVal - 0.5 ? 'half' : ''
                      }`}
                      onClick={() => {
                        if (editRating === starVal) setEditRating(starVal - 0.5)
                        else if (editRating === starVal - 0.5) setEditRating(0)
                        else setEditRating(starVal)
                      }}
                      title={`${starVal} Stars (click again for half-star)`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-indicator-text">
                    {editRating > 0 ? `${editRating} / 5` : 'No rating'}
                  </span>
                  {editRating > 0 && (
                    <button
                      type="button"
                      className="clear-rating-btn"
                      onClick={() => setEditRating(0)}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Liked & Watched Toggles */}
              <div className="modal-toggles-row">
                <button
                  type="button"
                  className={`modal-toggle-btn heart-toggle ${editLiked ? 'active' : ''}`}
                  onClick={() => setEditLiked(!editLiked)}
                >
                  <span className="toggle-icon">♥</span> {editLiked ? 'Liked' : 'Like'}
                </button>

                <button
                  type="button"
                  className={`modal-toggle-btn watched-toggle ${editWatched ? 'active' : ''}`}
                  onClick={() => setEditWatched(!editWatched)}
                >
                  <span className="toggle-icon">👁</span> Watched
                </button>
              </div>

              {/* Review Textarea */}
              <div className="modal-control-group">
                <label className="modal-control-label">Review:</label>
                <textarea
                  className="modal-review-textarea"
                  rows={6}
                  value={editReviewText}
                  onChange={(e) => setEditReviewText(e.target.value)}
                  placeholder="Write your review here..."
                  required
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="modal-footer-row">
                <button
                  type="button"
                  className="modal-delete-link"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Delete review...
                </button>

                <div className="modal-save-actions">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setEditModalOpen(false)}
                    disabled={savingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="modal-save-btn"
                    disabled={savingEdit || !editReviewText.trim()}
                  >
                    {savingEdit ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmOpen && (
        <div className="review-modal-backdrop" onClick={() => !deletingReview && setDeleteConfirmOpen(false)}>
          <div className="review-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">Delete Review?</h3>
            <p className="confirm-text">
              Are you sure you want to delete this review? This action cannot be undone.
            </p>
            <div className="confirm-buttons-row">
              <button
                type="button"
                className="confirm-cancel-btn"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deletingReview}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-delete-btn"
                onClick={handleDeleteReview}
                disabled={deletingReview}
              >
                {deletingReview ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewDetail

import { Link } from 'react-router-dom'
import './ReviewCard.css'

function ReviewCard({ review, movie }) {
  if (!review) return null

  const title = movie?.title || review.movieTitle || 'Film'
  const year = movie?.year || (movie?.release_date ? movie.release_date.split('-')[0] : '')
  const poster = movie?.poster || (movie?.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : null)
  const username = review.username || 'Anonymous'
  const rating = review.rating || 0
  const likesCount = review.likesCount !== undefined ? review.likesCount : (review.reviewLikes?.length || 0)
  const movieId = review.movieId || movie?.id

  const formatLikes = (count) => {
    if (!count) return '0 likes'
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K likes`
    return `${count} ${count === 1 ? 'like' : 'likes'}`
  }

  const reviewDetailUrl = movieId && username
    ? `/${username}/film/${movieId}`
    : review._id
    ? `/review/${review._id}`
    : `/film/${movieId}`

  return (
    <article className="review-card">
      <Link to={`/film/${movieId}`} className="review-poster-link">
        {poster ? (
          <img
            className="review-poster"
            src={poster}
            alt={title}
            loading="lazy"
          />
        ) : (
          <div className="review-poster-fallback">🎞</div>
        )}
      </Link>

      <div className="review-content">
        <div className="review-title">
          <Link to={`/film/${movieId}`} className="review-title-link">
            <h3>{title}</h3>
          </Link>
          {year && <span>{year}</span>}
        </div>

        <div className="review-user">
          <Link to={`/${username}`} className="user-avatar-link">
            <div className="user-avatar">
              {username.charAt(0).toUpperCase()}
            </div>
          </Link>

          <Link to={`/${username}`} className="user-name-link">
            <strong>{username}</strong>
          </Link>

          {rating > 0 && (
            <div className="review-rating">
              {'★'.repeat(Math.floor(rating))}
              {rating % 1 !== 0 && '½'}
            </div>
          )}

          {review.liked && <span className="like-icon" title="Liked">♥</span>}
        </div>

        <Link to={reviewDetailUrl} className="review-text-link">
          <p>{review.review}</p>
        </Link>

        <div className="review-likes">
          <Link to={reviewDetailUrl} className="review-likes-link">
            <span className="heart-symbol">♥</span> {formatLikes(likesCount)}
          </Link>
        </div>
      </div>
    </article>
  )
}

export default ReviewCard
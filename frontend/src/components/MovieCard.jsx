import { Link } from 'react-router-dom'
import './MovieCard.css'

function MovieCard({ movie }) {
  if (!movie) return null

  const posterSrc = movie.poster || (movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null)
  const movieId = movie.id || movie.movieId

  return (
    <Link to={`/film/${movieId}`} className="movie-card-link" title={movie.title}>
      <div className="movie-card">
        {posterSrc ? (
          <img
            src={posterSrc}
            alt={movie.title}
            className="movie-poster"
            loading="lazy"
          />
        ) : (
          <div className="movie-poster-fallback">🎞</div>
        )}

        <div className="movie-info">
          <h3>{movie.title}</h3>
          {movie.year && <p>{movie.year}</p>}
          {movie.rating && <span>★ {movie.rating}</span>}
        </div>
      </div>
    </Link>
  )
}

export default MovieCard
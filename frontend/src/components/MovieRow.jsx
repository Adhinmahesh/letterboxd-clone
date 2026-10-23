import { Link } from 'react-router-dom'
import MovieCard from './MovieCard'
import './MovieRow.css'

function MovieRow({ title, subtitle, movies = [], loading = false, moreLink = '/film' }) {
  return (
    <section className="movie-section">
      <div className="section-heading">
        <div className="section-heading-left">
          <h2>{title}</h2>
          {subtitle && <span className="section-heading-subtitle">{subtitle}</span>}
        </div>
        <Link to={moreLink} className="section-more-link">MORE</Link>
      </div>

      <div className="movie-row">
        {loading ? (
          <div className="movie-row-loading">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="movie-card-skeleton">
                <div className="skeleton-poster" />
                <div className="skeleton-text line1" />
                <div className="skeleton-text line2" />
              </div>
            ))}
          </div>
        ) : movies && movies.length > 0 ? (
          movies.map((movie, index) => (
            <MovieCard
              key={movie.id || index}
              movie={movie}
            />
          ))
        ) : (
          <div className="movie-row-empty">No films available right now.</div>
        )}
      </div>
    </section>
  )
}

export default MovieRow
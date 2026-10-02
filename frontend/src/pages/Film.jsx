import './Film.css'
import Navbar from '../components/Navbar'

function Film() {
  return (
    <div className="film-page">
      <Navbar />
      
      <div className="film-backdrop">
        <img 
          src="https://image.tmdb.org/t/p/original/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" 
          alt="Backdrop" 
          className="backdrop-image"
        />
        <div className="backdrop-gradient"></div>
      </div>
      
      <main className="film-content">
        <div className="film-sidebar">
          <div className="poster-container">
            <img 
              className="film-poster" 
              src="https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" 
              alt="Poster" 
            />
          </div>
          <div className="film-stats">
            <span className="stat-item"><span className="icon green">👁</span> 448K</span>
            <span className="stat-item"><span className="icon orange">♥</span> 83K</span>
            <span className="stat-item"><span className="icon blue">◷</span> 153K</span>
          </div>
          
          <div className="where-to-watch">
            <button className="watch-btn">WHERE TO WATCH</button>
            <button className="trailer-btn">Trailer</button>
          </div>
        </div>

        <div className="film-main-info">
          <div className="film-header">
            <h1 className="film-title">Primetime</h1>
            <span className="film-year">2026</span>
            <span className="film-director">Directed by <a href="#">Lance Oppenheim</a></span>
          </div>

          <p className="film-tagline">ARE YOU READY TO MAKE TELEVISION HISTORY?</p>
          <p className="film-description">
            In 2006, To Catch a Predator host Chris Hansen sets out to make television history, turning an undercover investigation into one of the most controversial cultural phenomena of the decade.
          </p>
        </div>

        <div className="film-actions-panel">
          <div className="action-icons">
            <button className="action-icon-btn">
              <span className="icon">👁</span>
              <span className="label">Watched</span>
            </button>
            <button className="action-icon-btn">
              <span className="icon">♥</span>
              <span className="label">Liked</span>
            </button>
            <button className="action-icon-btn">
              <span className="icon">◷</span>
              <span className="label">Watchlist</span>
            </button>
          </div>
          
          <div className="rating-section">
            <span className="rating-label">Rated</span>
            <div className="stars">
              <span className="star active">★</span>
              <span className="star active">★</span>
              <span className="star active">★</span>
              <span className="star active">★</span>
              <span className="star">★</span>
            </div>
          </div>
          
          <div className="action-buttons">
            <button className="panel-btn">Show your activity</button>
            <button className="panel-btn">Review or log...</button>
            <button className="panel-btn">Add to lists...</button>
            <button className="panel-btn">Share</button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Film

import { useEffect, useState } from 'react'
import './Hero.css'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280'
const ROTATION_INTERVAL_MS = 20000
const BACKDROP_POOL_SIZE = 12

function shuffle(items) {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function Hero() {
  const [backdrops, setBackdrops] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loadedUrls, setLoadedUrls] = useState({})
  const [failedUrls, setFailedUrls] = useState({})

  const activeBackdrop = backdrops[activeIndex]
  const displayedBackdrop = activeBackdrop && loadedUrls[activeBackdrop.url] && !failedUrls[activeBackdrop.url]
    ? activeBackdrop
    : null

  useEffect(() => {
    let cancelled = false

    async function loadPopularBackdrops() {
      if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key_here') {
        console.warn('Add a valid VITE_TMDB_API_KEY to frontend/.env to enable rotating hero backdrops.')
        return
      }

      try {
        const pages = await Promise.all([1, 2, 3].map(async (page) => {
          const response = await fetch(
            `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
          )
          if (!response.ok) throw new Error(`TMDB returned ${response.status}`)
          return response.json()
        }))

        if (cancelled) return

        const uniqueMovies = new Map()
        pages.flatMap((page) => page.results || []).forEach((movie) => {
          if (movie.backdrop_path && !uniqueMovies.has(movie.id)) {
            uniqueMovies.set(movie.id, movie)
          }
        })

        const pool = [...uniqueMovies.values()]
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, BACKDROP_POOL_SIZE)
          .map((movie) => ({
            id: movie.id,
            title: movie.title,
            url: `${BACKDROP_BASE_URL}${movie.backdrop_path}`
          }))

        if (!cancelled && pool.length > 0) {
          setBackdrops(shuffle(pool))
        }
      } catch (error) {
        console.error('Unable to load hero backdrops from TMDB:', error)
      }
    }

    loadPopularBackdrops()
    return () => {
      cancelled = true
    }
  }, [])

  // Preload each backdrop before displaying it.
  useEffect(() => {
    if (!activeBackdrop?.url || loadedUrls[activeBackdrop.url] || failedUrls[activeBackdrop.url]) {
      return undefined
    }

    let cancelled = false
    const image = new Image()

    image.onload = () => {
      if (!cancelled) {
        setLoadedUrls((previous) => ({ ...previous, [activeBackdrop.url]: true }))
      }
    }

    image.onerror = () => {
      if (!cancelled) {
        setFailedUrls((previous) => ({ ...previous, [activeBackdrop.url]: true }))
      }
    }

    image.src = activeBackdrop.url

    return () => {
      cancelled = true
    }
  }, [activeBackdrop, loadedUrls, failedUrls])

  // Warm the next image while the current one is visible.
  useEffect(() => {
    if (backdrops.length < 2) return undefined

    const nextBackdrop = backdrops[(activeIndex + 1) % backdrops.length]
    if (!nextBackdrop?.url || loadedUrls[nextBackdrop.url] || failedUrls[nextBackdrop.url]) {
      return undefined
    }

    let cancelled = false
    const image = new Image()

    image.onload = () => {
      if (!cancelled) {
        setLoadedUrls((previous) => ({ ...previous, [nextBackdrop.url]: true }))
      }
    }

    image.onerror = () => {
      if (!cancelled) {
        setFailedUrls((previous) => ({ ...previous, [nextBackdrop.url]: true }))
      }
    }

    image.src = nextBackdrop.url

    return () => {
      cancelled = true
    }
  }, [backdrops, activeIndex, loadedUrls, failedUrls])

  useEffect(() => {
    if (backdrops.length < 2) return undefined

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        for (let offset = 1; offset <= backdrops.length; offset++) {
          const candidateIndex = (current + offset) % backdrops.length
          const candidate = backdrops[candidateIndex]
          if (candidate && loadedUrls[candidate.url] && !failedUrls[candidate.url]) {
            return candidateIndex
          }
        }
        return current
      })
    }, ROTATION_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [backdrops, loadedUrls, failedUrls])

  return (
    <section className="hero" aria-label="Letterboxd film discovery">
      {displayedBackdrop && (
        <div
          key={displayedBackdrop.id}
          className="hero-backdrop"
          style={{ backgroundImage: `url("${displayedBackdrop.url}")` }}
          role="img"
          aria-label={`Popular film backdrop: ${displayedBackdrop.title}`}
        />
      )}

      <div className="hero-overlay"></div>

      <div className="hero-content">
        <h1>Track films you've watched.</h1>
        <h2>Save those you want to see.</h2>
        <h2>Tell your friends what's good.</h2>
      </div>
    </section>
  )
}

export default Hero
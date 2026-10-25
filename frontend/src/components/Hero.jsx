import { useEffect, useRef, useState } from 'react'
import './Hero.css'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280'
const ROTATION_INTERVAL_MS = 20000

function Hero() {
  const [backdrops, setBackdrops] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loadedImages, setLoadedImages] = useState({})
  const [imageError, setImageError] = useState(false)
  const preloadedRef = useRef(new Set())

  useEffect(() => {
    let cancelled = false

    async function fetchBackdrops() {
      if (!TMDB_API_KEY) {
        console.warn('VITE_TMDB_API_KEY is missing; using a plain hero background.')
        return
      }

      try {
        // Fetch several popular pages so the hero has a curated pool to rotate through.
        const pages = await Promise.all([1, 2, 3].map(async (page) => {
          const response = await fetch(
            `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
          )
          if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`)
          return response.json()
        }))

        if (cancelled) return

        const seen = new Set()
        const eligible = pages
          .flatMap((page) => page.results || [])
          .filter((movie) => {
            if (!movie.backdrop_path || seen.has(movie.backdrop_path)) return false
            seen.add(movie.backdrop_path)
            return true
          })
          // Keep the larger landscape images, and favour established titles.
          .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
          .slice(0, 12)
          .map((movie) => ({
            id: movie.id,
            title: movie.title,
            url: `${BACKDROP_BASE_URL}${movie.backdrop_path}`
          }))

        if (eligible.length > 0) {
          // Shuffle once per page load so visits do not always start with the same film.
          for (let i = eligible.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[eligible[i], eligible[j]] = [eligible[j], eligible[i]]
          }
          setBackdrops(eligible)
        }
      } catch (error) {
        console.error('Failed to load homepage backdrops:', error)
        // The hero remains readable on its plain dark background if TMDB is unavailable.
      }
    }

    fetchBackdrops()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (backdrops.length < 2) return undefined

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % backdrops.length)
    }, ROTATION_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [backdrops])

  useEffect(() => {
    if (backdrops.length === 0) return

    const nextIndex = (activeIndex + 1) % backdrops.length
    const nextUrl = backdrops[nextIndex]?.url
    if (!nextUrl || preloadedRef.current.has(nextUrl)) return

    const image = new Image()
    image.onload = () => preloadedRef.current.add(nextUrl)
    image.onerror = () => preloadedRef.current.add(nextUrl)
    image.src = nextUrl
  }, [activeIndex, backdrops])

  const activeBackdrop = backdrops[activeIndex]
  const backgroundImage = !imageError && activeBackdrop && loadedImages[activeBackdrop.url]
    ? activeBackdrop.url
    : undefined

  return (
    <section
      className="hero"
      style={backgroundImage ? { backgroundImage: `url("${backgroundImage}")` } : undefined}
      aria-label="Letterboxd film discovery"
    >
      {/* Hidden image probe ensures we only show successfully loaded backdrops. */}
      {activeBackdrop && (
        <img
          key={activeBackdrop.url}
          className="hero-backdrop-preload"
          src={activeBackdrop.url}
          alt=""
          aria-hidden="true"
          onLoad={() => {
            setLoadedImages((current) => ({ ...current, [activeBackdrop.url]: true }))
            setImageError(false)
          }}
          onError={() => setImageError(true)}
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
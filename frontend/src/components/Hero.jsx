import { useEffect, useMemo, useState } from 'react'
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
  const [nextReady, setNextReady] = useState(false)

  const activeBackdrop = backdrops[activeIndex]
  const displayedBackdrop = activeBackdrop && loadedUrls[activeBackdrop.url] && !failedUrls[activeBackdrop.url]
    ? activeBackdrop.url
    : ''

  const nextIndex = backdrops.length > 0 ? (activeIndex + 1) % backdrops.length : 0
  const nextBackdrop = backdrops[nextIndex]

  useEffect(() => {
    let cancelled = false

    async function loadPopularBackdrops() {
      if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key_here') {
        console.warn('Add a valid VITE_TMDB_API_KEY to frontend/.env to enable rotating hero backdrops.')
        return
      }

      try {
        // Fetch multiple popular pages, then prefer films with vote history and landscape images.
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
          .sort((a, b) => {
            const popularityDifference = (b.popularity || 0) - (a.popularity || 0)
            if (popularityDifference !== 0) return popularityDifference
            return (b.vote_count || 0) - (a.vote_count || 0)
          })
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
        // CSS provides a plain dark background if TMDB cannot be reached.
      }
    }

    loadPopularBackdrops()
    return () => {
      cancelled = true
    }
  }, [])

  // Preload the current image and keep the previous background until it is ready.
  useEffect(() => {
    if (!activeBackdrop?.url || loadedUrls[activeBackdrop.url] || failedUrls[activeBackdrop.url]) {
      return
    }

    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      setLoadedUrls((previous) => ({ ...previous, [activeBackdrop.url]: true }))
    }
    image.onerror = () => {
      if (cancelled) return
      setFailedUrls((previous) => ({ ...previous, [activeBackdrop.url]: true }))
    }
    image.src = activeBackdrop.url

    return () => {
      cancelled = true
    }
  }, [activeBackdrop, loadedUrls, failedUrls])

  // Preload the next backdrop before the rotation timer reaches it.
  useEffect(() => {
    if (!nextBackdrop?.url || nextIndex === activeIndex) return

    let cancelled = false
    setNextReady(Boolean(loadedUrls[nextBackdrop.url]))

    if (loadedUrls[nextBackdrop.url] || failedUrls[nextBackdrop.url]) return

    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      setLoadedUrls((previous) => ({ ...previous, [nextBackdrop.url]: true }))
      setNextReady(true)
    }
    image.onerror = () => {
      if (cancelled) return
      setFailedUrls((previous) => ({ ...previous, [nextBackdrop.url]: true }))
      setNextReady(false)
    }
    image.src = nextBackdrop.url

    return () => {
      cancelled = true
    }
  }, [nextBackdrop, nextIndex, activeIndex, loadedUrls, failedUrls])

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
      setNextReady(false)
    }, ROTATION_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [backdrops, loadedUrls, failedUrls])

  const heroStyle = useMemo(
    () => displayedBackdrop ? { backgroundImage: `url("${displayedBackdrop}")` } : undefined,
    [displayedBackdrop]
  )

  return (
    <section
      className={`hero${displayedBackdrop ? ' hero-has-backdrop' : ''}`}
      style={heroStyle}
      aria-label="Letterboxd film discovery"
    >
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
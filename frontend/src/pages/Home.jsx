import { useState, useEffect } from 'react'
import FeatureGrid from '../components/FeatureGrid'
import PopularReviews from '../components/PopularReviews'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import MovieRow from '../components/MovieRow'

function Home() {
  const [popularFilms, setPopularFilms] = useState([])
  const [recommendedFilms, setRecommendedFilms] = useState([])
  const [topGenreId, setTopGenreId] = useState(null)
  const [topGenreName, setTopGenreName] = useState('')
  const [recentFilms, setRecentFilms] = useState([])

  const [loadingPopular, setLoadingPopular] = useState(true)
  const [loadingRecommended, setLoadingRecommended] = useState(true)
  const [loadingRecent, setLoadingRecent] = useState(true)

  const apiKey = import.meta.env.VITE_TMDB_API_KEY
  const token = localStorage.getItem('token')
  const currentUsername = localStorage.getItem('username') || 'adhin1234'

  useEffect(() => {
    fetchPopularMovies()
    fetchGenreBasedRecommendations()
    fetchRecentlyReviewed()
  }, [])

  // 1. Fetch Popular Films worldwide from TMDB
  const fetchPopularMovies = async () => {
    try {
      setLoadingPopular(true)
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=en-US&page=1`
      )
      const data = await res.json()
      if (data.results) {
        const formatted = data.results.slice(0, 6).map((m) => ({
          id: m.id,
          title: m.title,
          year: m.release_date ? m.release_date.split('-')[0] : '',
          rating: m.vote_average ? (m.vote_average / 2).toFixed(1) : '',
          poster: m.poster_path
            ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
            : null
        }))
        setPopularFilms(formatted)
      }
    } catch (err) {
      console.error('Failed to fetch popular films:', err)
    } finally {
      setLoadingPopular(false)
    }
  }

  // 2. Fetch "Films you like" based on the user's most liked genre
  const fetchGenreBasedRecommendations = async () => {
    try {
      setLoadingRecommended(true)

      // Get user's liked and high-rated films
      const likedRes = await fetch(
        `http://localhost:5000/api/interactions/user-liked-films?username=${currentUsername}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      )
      const likedData = await likedRes.json()
      const likedIds = likedData.movieIds || []

      let topGenreId = null
      let identifiedGenreName = ''

      if (likedIds.length > 0) {
        // Tally genre frequencies among user's liked movies
        const genreFrequency = {}
        const genreNameMap = {}

        await Promise.all(
          likedIds.slice(0, 8).map(async (movieId) => {
            try {
              const tmdbRes = await fetch(
                `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}`
              )
              const tmdbData = await tmdbRes.json()
              if (tmdbData && tmdbData.genres) {
                tmdbData.genres.forEach((g) => {
                  genreFrequency[g.id] = (genreFrequency[g.id] || 0) + 1
                  genreNameMap[g.id] = g.name
                })
              }
            } catch (e) {
              // Ignore single movie error
            }
          })
        )

        // Find the genre with the highest count
        let highestCount = -1
        for (const [id, count] of Object.entries(genreFrequency)) {
          if (count > highestCount) {
            highestCount = count
            topGenreId = id
            identifiedGenreName = genreNameMap[id]
          }
        }
      }

      if (topGenreId && identifiedGenreName) {
        // Fetch recommendations matching the user's top liked genre
        const discoverRes = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_genres=${topGenreId}&sort_by=popularity.desc&vote_count.gte=80&page=1`
        )
        const discoverData = await discoverRes.json()

        const alreadyLikedSet = new Set(likedIds.map(String))
        const filtered = (discoverData.results || [])
          .filter((m) => !alreadyLikedSet.has(String(m.id)))
          .slice(0, 6)
          .map((m) => ({
            id: m.id,
            title: m.title,
            year: m.release_date ? m.release_date.split('-')[0] : '',
            rating: m.vote_average ? (m.vote_average / 2).toFixed(1) : '',
            poster: m.poster_path
              ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
              : null
          }))

        if (filtered.length > 0) {
          setRecommendedFilms(filtered)
          setTopGenreId(topGenreId)
          setTopGenreName(identifiedGenreName)
          return
        }
      }

      // Fallback: If no liked genre yet, fetch top rated films
      const topRatedRes = await fetch(
        `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&language=en-US&page=1`
      )
      const topRatedData = await topRatedRes.json()
      if (topRatedData.results) {
        const formatted = topRatedData.results.slice(0, 6).map((m) => ({
          id: m.id,
          title: m.title,
          year: m.release_date ? m.release_date.split('-')[0] : '',
          rating: m.vote_average ? (m.vote_average / 2).toFixed(1) : '',
          poster: m.poster_path
            ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
            : null
        }))
        setRecommendedFilms(formatted)
        setTopGenreName('')
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
    } finally {
      setLoadingRecommended(false)
    }
  }

  // 3. Fetch Recently Reviewed Films on this platform
  const fetchRecentlyReviewed = async () => {
    try {
      setLoadingRecent(true)
      const res = await fetch('http://localhost:5000/api/interactions/recent-reviews?limit=6')
      const recentReviews = await res.json()

      if (Array.isArray(recentReviews) && recentReviews.length > 0) {
        const uniqueMovieIds = Array.from(
          new Set(recentReviews.map((r) => String(r.movieId)))
        )

        const recentMovies = await Promise.all(
          uniqueMovieIds.slice(0, 6).map(async (movieId) => {
            try {
              const tmdbRes = await fetch(
                `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}`
              )
              const m = await tmdbRes.json()
              if (m && !m.status_message) {
                return {
                  id: m.id,
                  title: m.title,
                  year: m.release_date ? m.release_date.split('-')[0] : '',
                  rating: m.vote_average ? (m.vote_average / 2).toFixed(1) : '',
                  poster: m.poster_path
                    ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
                    : null
                }
              }
            } catch (e) {
              return null
            }
          })
        )

        const validRecent = recentMovies.filter(Boolean)
        if (validRecent.length > 0) {
          setRecentFilms(validRecent)
          return
        }
      }

      // Fallback if no recent reviews yet
      const fallbackRes = await fetch(
        `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}`
      )
      const fallbackData = await fallbackRes.json()
      if (fallbackData.results) {
        const formatted = fallbackData.results.slice(0, 6).map((m) => ({
          id: m.id,
          title: m.title,
          year: m.release_date ? m.release_date.split('-')[0] : '',
          rating: m.vote_average ? (m.vote_average / 2).toFixed(1) : '',
          poster: m.poster_path
            ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
            : null
        }))
        setRecentFilms(formatted)
      }
    } catch (err) {
      console.error('Failed to fetch recently reviewed films:', err)
    } finally {
      setLoadingRecent(false)
    }
  }

  return (
    <>
      <Navbar />

      <main>
        <Hero />

        {/* 1. Real Popular Films */}
        <MovieRow
          title="Popular films"
          subtitle="Trending worldwide this week"
          movies={popularFilms}
          loading={loadingPopular}
          moreLink="/films?sort=popular"
        />

        {/* 2. Films you like (Based on the genre you liked most!) */}
        <MovieRow
          title="Films you like"
          subtitle={
            topGenreName
              ? `Based on your favorite genre: ${topGenreName}`
              : 'Critically acclaimed picks for you'
          }
          movies={recommendedFilms}
          loading={loadingRecommended}
          moreLink={topGenreId ? `/films?genre=${topGenreId}` : '/films?sort=top_rated'}
        />

        {/* 3. Popular Reviews (Sorted by most likes!), Popular Lists, and Reviewers */}
        <PopularReviews />

        {/* 4. Real Recently Reviewed Films */}
        <MovieRow
          title="Recently reviewed"
          subtitle="Films recently logged by members"
          movies={recentFilms}
          loading={loadingRecent}
          moreLink="/reviews"
        />

        <FeatureGrid />
      </main>
    </>
  )
}

export default Home
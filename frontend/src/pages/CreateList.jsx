import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './CreateList.css'

function CreateList() {
  const navigate = useNavigate()
  const { id, slug } = useParams()
  const listId = id || slug
  const isEditMode = Boolean(listId)

  const token = localStorage.getItem('token')
  const username = localStorage.getItem('username') || 'adhin1234'

  // Loading state for edit mode
  const [loadingList, setLoadingList] = useState(isEditMode)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeNoteId, setActiveNoteId] = useState(null)

  // Form Fields
  const [name, setName] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [tags, setTags] = useState([])
  const [visibility, setVisibility] = useState('public')
  const [ranked, setRanked] = useState(false)
  const [description, setDescription] = useState('')

  // Search & Film addition
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [films, setFilms] = useState([])
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState(isEditMode ? 'list' : 'grid') // 'grid' or 'list'

  // Import Modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState('')

  // Tag Handling
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault()
      const trimmed = tagsInput.trim().replace(/^,|,$/g, '')
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed])
        setTagsInput('')
      }
    }
  }

  const removeTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove))
  }

  // Load list for editing if in Edit Mode
  useEffect(() => {
    if (!listId) return
    setLoadingList(true)
    fetch(`https://letterboxd-clone-l6rs.onrender.com/api/lists/${listId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setName(data.name || '')
          setDescription(data.description || '')
          setTags(data.tags || [])
          setVisibility(data.visibility || 'public')
          setRanked(Boolean(data.ranked))
          setFilms(data.films || [])
          setViewMode('list')
        } else {
          alert(data?.error || 'List not found')
          navigate('/lists')
        }
      })
      .catch(err => {
        console.error(err)
        alert('Error loading list')
      })
      .finally(() => setLoadingList(false))
  }, [listId])

  // Delete List
  const handleDeleteList = async () => {
    if (!token) {
      alert('Please log in first.')
      navigate('/login')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`https://letterboxd-clone-l6rs.onrender.com/api/lists/${listId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        navigate(`/${username}/lists`)
      } else {
        alert(data.error || 'Failed to delete list.')
      }
    } catch (err) {
      console.error(err)
      alert('Server error deleting list.')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Live TMDB Movie Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      setSearchLoading(true)
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${import.meta.env.VITE_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults((data.results || []).slice(0, 6))
          setSearchLoading(false)
        })
        .catch(err => {
          console.error(err)
          setSearchLoading(false)
        })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Add a movie to this list
  const addMovieToList = (movie) => {
    const movieIdStr = movie.id.toString()
    if (films.some(f => f.movieId === movieIdStr)) {
      alert('This film is already in the list.')
      return
    }

    const newFilm = {
      movieId: movieIdStr,
      title: movie.title,
      posterPath: movie.poster_path || '',
      releaseYear: movie.release_date ? movie.release_date.split('-')[0] : '',
      order: films.length + 1,
      notes: ''
    }

    setFilms([...films, newFilm])
    setSearchQuery('')
    setSearchResults([])
  }

  // Remove a film from this list
  const removeFilm = (movieId) => {
    const updated = films.filter(f => f.movieId !== movieId)
    // Recalculate order
    setFilms(updated.map((f, idx) => ({ ...f, order: idx + 1 })))
  }

  // Reorder films (Move up/down)
  const moveFilm = (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= films.length) return
    const reordered = [...films]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp
    setFilms(reordered.map((f, idx) => ({ ...f, order: idx + 1 })))
  }

  // Update notes for a film
  const updateFilmNotes = (movieId, notes) => {
    setFilms(films.map(f => f.movieId === movieId ? { ...f, notes } : f))
  }

  // Batch Import
  const handleBatchImport = async () => {
    const titles = importText.split(/\r?\n/).map(t => t.trim()).filter(Boolean)
    if (titles.length === 0) return

    setImporting(true)
    const newItems = []

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i]
      setImportStatus(`Finding "${title}" (${i + 1}/${titles.length})...`)
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${import.meta.env.VITE_TMDB_API_KEY}&query=${encodeURIComponent(title)}`)
        const data = await res.json()
        const match = data.results?.[0]
        if (match && !films.some(f => f.movieId === match.id.toString()) && !newItems.some(f => f.movieId === match.id.toString())) {
          newItems.push({
            movieId: match.id.toString(),
            title: match.title,
            posterPath: match.poster_path || '',
            releaseYear: match.release_date ? match.release_date.split('-')[0] : '',
            order: films.length + newItems.length + 1,
            notes: ''
          })
        }
      } catch (err) {
        console.error(err)
      }
    }

    setFilms(prev => [...prev, ...newItems].map((f, idx) => ({ ...f, order: idx + 1 })))
    setImporting(false)
    setShowImportModal(false)
    setImportText('')
  }

  // Save List to Backend
  const handleSaveList = async () => {
    if (!name.trim()) {
      alert('Please enter a name for your list.')
      return
    }

    if (!token) {
      alert('Please log in to save your list.')
      navigate('/login')
      return
    }

    setSaving(true)
    try {
      const url = isEditMode
        ? `https://letterboxd-clone-l6rs.onrender.com/api/lists/${listId}`
        : 'https://letterboxd-clone-l6rs.onrender.com/api/lists'
      const method = isEditMode ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          tags,
          ranked,
          visibility,
          films
        })
      })

      const data = await res.json()
      if (res.ok) {
        navigate(`/list/${data._id || listId}`)
      } else {
        alert(data.error || 'Failed to save list.')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred while saving the list.')
    } finally {
      setSaving(false)
    }
  }

  if (loadingList) {
    return (
      <div className="new-list-page">
        <Navbar />
        <div className="new-list-container" style={{ textAlign: 'center', paddingTop: '60px' }}>
          <h2>Loading list details...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="new-list-page">
      <Navbar />

      <main className="new-list-container">
        <h1 className="new-list-title">{isEditMode ? 'Edit List' : 'New List'}</h1>

        {/* List Details Form */}
        <div className="new-list-form-grid">
          {/* Left Column */}
          <div className="new-list-left-col">
            <div className="form-group">
              <label className="form-label required">
                <span className="required-dot">•</span> Name
              </label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=""
                autoFocus
              />
            </div>

            <div className="form-group">
              <div className="label-with-hint">
                <label className="form-label">Tags</label>
                <span className="form-hint">Press Tab to complete, Enter to create</span>
              </div>
              <div className="tags-container">
                {tags.map((t, idx) => (
                  <span key={idx} className="tag-pill">
                    {t}
                    <button type="button" onClick={() => removeTag(idx)}>✕</button>
                  </span>
                ))}
                <input
                  type="text"
                  className="tags-input"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? "eg. top 10" : ""}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Who can view</label>
              <select
                className="form-select"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="public">Anyone — Public list</option>
                <option value="friends">Friends only</option>
                <option value="private">You — Private list</option>
              </select>
            </div>

            <div className="form-checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={ranked}
                  onChange={(e) => setRanked(e.target.checked)}
                />
                <span className="checkbox-text">Ranked list</span>
              </label>
              <span className="checkbox-hint">Show position for each film.</span>
            </div>
          </div>

          {/* Right Column: Description */}
          <div className="new-list-right-col">
            <div className="form-group">
              <div className="label-with-hint">
                <label className="form-label">Description</label>
                <a href="#" onClick={(e) => { e.preventDefault(); alert('Supported HTML: <b>, <i>, <a>, <p>, <blockquote>'); }} className="form-hint-link">
                  Show supported HTML
                </a>
              </div>
              <textarea
                className="description-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="10"
              />
            </div>
          </div>
        </div>

        {/* Film Management Toolbar */}
        <div className="film-toolbar">
          <div className="toolbar-left">
            <button className="add-btn" type="button">Add</button>
            <div className="toolbar-search-wrap">
              <input
                type="text"
                placeholder="Find by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="toolbar-search-input"
              />
              {searchLoading && <span className="toolbar-search-spinner">...</span>}
              {searchResults.length > 0 && (
                <div className="toolbar-search-results">
                  {searchResults.map(movie => (
                    <div
                      key={movie.id}
                      className="search-result-row"
                      onClick={() => addMovieToList(movie)}
                    >
                      {movie.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt="" />
                      ) : (
                        <div className="no-thumb">🎞</div>
                      )}
                      <div className="result-info">
                        <span className="result-title">{movie.title}</span>
                        <span className="result-year">{movie.release_date?.split('-')[0]}</span>
                      </div>
                      <span className="add-text">+ Add</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="toolbar-or">or</span>
            <button 
              className="import-btn" 
              type="button"
              onClick={() => setShowImportModal(true)}
            >
              Import
            </button>
          </div>

          <div className="toolbar-right">
            <div className="view-mode-buttons">
              <button 
                type="button" 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                ☰
              </button>
              <button 
                type="button" 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                ⊞
              </button>
            </div>

            <div className="toolbar-sort">
              <span className="sort-label">Sort by ▾</span>
            </div>

            {isEditMode ? (
              <>
                <button 
                  type="button" 
                  className="toolbar-delete-btn"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleting}
                  title="Delete this list"
                >
                  Delete
                </button>
                <Link 
                  to={`/list/${listId}`}
                  className="toolbar-view-btn"
                >
                  View list
                </Link>
              </>
            ) : (
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
            )}

            <button 
              type="button" 
              className="save-btn"
              onClick={handleSaveList}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Film Items Container */}
        <div className="list-items-container">
          {films.length === 0 ? (
            <div className="empty-list-prompt">
              <h3>Your list is empty</h3>
              <p>Get started by <strong>adding titles</strong> above.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="films-grid">
              {films.map((film, index) => (
                <div key={film.movieId} className="film-card">
                  <div className="poster-wrap">
                    {ranked && <span className="rank-badge">{index + 1}</span>}
                    {film.posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w342${film.posterPath}`}
                        alt={film.title}
                      />
                    ) : (
                      <div className="no-poster-box">{film.title}</div>
                    )}
                    <button
                      type="button"
                      className="remove-film-btn"
                      onClick={() => removeFilm(film.movieId)}
                      title="Remove film"
                    >
                      ✕
                    </button>
                    <div className="order-controls">
                      {index > 0 && (
                        <button type="button" onClick={() => moveFilm(index, -1)} title="Move left">◀</button>
                      )}
                      {index < films.length - 1 && (
                        <button type="button" onClick={() => moveFilm(index, 1)} title="Move right">▶</button>
                      )}
                    </div>
                  </div>
                  <div className="film-card-footer">
                    <span className="film-card-title">{film.title}</span>
                    <span className="film-card-year">{film.releaseYear}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="films-list-view">
              {films.map((film, index) => (
                <div key={film.movieId} className="film-list-row">
                  <div className="row-drag-handle" title="Reorder film">⠿</div>
                  {ranked && <span className="row-rank">{index + 1}</span>}
                  {film.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${film.posterPath}`}
                      alt={film.title}
                      className="row-poster"
                    />
                  ) : (
                    <div className="row-no-poster">🎞</div>
                  )}
                  <div className="row-info">
                    <div className="row-title-line">
                      <strong className="row-title">{film.title}</strong>
                      <span className="row-year">{film.releaseYear}</span>
                    </div>
                    {activeNoteId === film.movieId ? (
                      <div className="row-note-input-wrap">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Add a note for this film..."
                          value={film.notes || ''}
                          onChange={(e) => updateFilmNotes(film.movieId, e.target.value)}
                          onBlur={() => setActiveNoteId(null)}
                          className="row-notes-input"
                        />
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        className="row-note-toggle-btn"
                        onClick={() => setActiveNoteId(film.movieId)}
                      >
                        ✎ {film.notes ? `Note: "${film.notes}"` : 'Add note'}
                      </button>
                    )}
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={() => moveFilm(index, -1)} disabled={index === 0} title="Move up">▲</button>
                    <button type="button" onClick={() => moveFilm(index, 1)} disabled={index === films.length - 1} title="Move down">▼</button>
                    <button type="button" className="row-trash-btn" onClick={() => removeFilm(film.movieId)} title="Remove film from list">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="import-modal-overlay" onClick={() => !importing && setShowImportModal(false)}>
          <div className="import-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="import-modal-header">
              <h3>IMPORT FILMS TO LIST</h3>
              <button 
                className="import-modal-close" 
                onClick={() => !importing && setShowImportModal(false)}
                disabled={importing}
              >
                ✕
              </button>
            </div>
            <div className="import-modal-body">
              <p className="import-modal-intro">
                Paste titles (one per line) to search and add them directly into this list.
              </p>
              <textarea
                className="import-textarea"
                rows="6"
                placeholder="Inception&#10;Parasite&#10;Interstellar&#10;The Dark Knight"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                disabled={importing}
              />
              {importing && (
                <div className="import-progress-box">
                  <div className="import-spinner"></div>
                  <span className="import-progress-text">{importStatus}</span>
                </div>
              )}
            </div>
            <div className="import-modal-footer">
              <button 
                type="button" 
                className="modal-btn-cancel" 
                onClick={() => setShowImportModal(false)}
                disabled={importing}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="modal-btn-primary" 
                onClick={handleBatchImport}
                disabled={importing || !importText.trim()}
              >
                {importing ? 'Importing...' : 'Add to List'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete List Modal */}
      {showDeleteModal && (
        <div className="import-modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="delete-modal-card" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h3>DELETE LIST</h3>
              <button 
                type="button" 
                className="import-modal-close" 
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
              >
                ✕
              </button>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to delete <strong>{name || 'this list'}</strong>?</p>
              <p className="delete-warning">This action cannot be undone and will permanently remove this list.</p>
            </div>
            <div className="delete-modal-footer">
              <button 
                type="button" 
                className="modal-btn-cancel" 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="delete-modal-confirm-btn" 
                onClick={handleDeleteList}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateList

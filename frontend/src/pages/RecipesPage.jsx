import { useRef, useState } from 'react'
import RecipeCard from '../components/RecipeCard.jsx'
import { recipes } from '../data/recipes.js'
import '../styles/recipes.css'

const PAGE_SIZE = 6
const QUICK_MINUTES = 30
const regions = [...new Set(recipes.map(({ region }) => region))].sort((a, b) => a.localeCompare(b, 'es'))

const filters = [
  { id: 'all', label: 'Todas', matches: () => true },
  { id: 'traditional', label: 'Tradicionales', matches: (recipe) => recipe.traditional },
  { id: 'quick', label: 'Rápidas', hint: `Hasta ${QUICK_MINUTES} min`, matches: (recipe) => recipe.durationMinutes <= QUICK_MINUTES },
  { id: 'video', label: 'Con video', hint: 'Disponibilidad de video de demostración', matches: (recipe) => recipe.hasVideo },
  { id: 'sweets', label: 'Dulces', matches: (recipe) => recipe.category === 'Dulces' },
  { id: 'drinks', label: 'Bebidas', matches: (recipe) => recipe.category === 'Bebidas' },
]

function normalize(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim()
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  if (!hours) return `${minutes} min`
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`
}

function includesTerms(recipe, terms) {
  const searchable = [
    recipe.name, recipe.catalogName, recipe.region, recipe.category,
    formatDuration(recipe.durationMinutes), ...recipe.ingredients,
  ].filter(Boolean).join(' ')
  const normalized = normalize(searchable)

  return terms.every((term) => normalized.includes(term))
}

function CatalogPagination({ page, pageCount, onPageChange }) {
  return (
    <nav className="catalog-pagination" aria-label="Paginación de recetas">
      <button className="site-button" type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </button>
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
        <button
          className="catalog-pagination__number"
          type="button"
          key={number}
          aria-label={`Página ${number}`}
          aria-current={number === page ? 'page' : undefined}
          onClick={() => onPageChange(number)}
        >
          {number}
        </button>
      ))}
      <button className="site-button" type="button" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  )
}

export default function RecipesPage() {
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [region, setRegion] = useState('')
  const [page, setPage] = useState(1)
  const searchInput = useRef(null)
  const resultsHeading = useRef(null)

  const terms = normalize(query).split(/\s+/).filter(Boolean)
  const activeFilter = filters.find(({ id }) => id === filter)
  const results = recipes.filter((recipe) =>
    activeFilter.matches(recipe) && (!region || region === recipe.region) && includesTerms(recipe, terms),
  )
  const pageCount = Math.ceil(results.length / PAGE_SIZE)
  const visibleRecipes = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = Boolean(query || draft || region || filter !== 'all')

  function submitSearch(event) {
    event.preventDefault()
    setQuery(draft.trim())
    setPage(1)
  }

  function clearFilters() {
    setDraft('')
    setQuery('')
    setFilter('all')
    setRegion('')
    setPage(1)
    searchInput.current.focus()
  }

  function changePage(number) {
    if (number === page) return
    setPage(number)
    resultsHeading.current.focus()
  }

  return (
    <section className="catalog" aria-labelledby="catalog-title">
      <p className="catalog-eyebrow">RECETARIO</p>
      <h1 id="catalog-title">Explora recetas de Oaxaca</h1>
      <p className="catalog-intro">Encuentra un platillo por nombre, ingrediente, tiempo o región.</p>

      <form className="catalog-search" role="search" aria-label="Catálogo de recetas" onSubmit={submitSearch}>
        <label className="catalog-sr-only" htmlFor="recipe-search">Buscar por nombre, ingrediente, región o categoría</label>
        <div className="catalog-search__field">
          <span aria-hidden="true">⌕</span>
          <input
            id="recipe-search"
            type="search"
            ref={searchInput}
            value={draft}
            placeholder="Nombre, ingrediente, región o categoría..."
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <button className="site-button site-button--clay" type="submit">Buscar recetas</button>
      </form>

      <div className="catalog-toolbar">
        <div className="catalog-filters" role="group" aria-label="Filtros de recetas">
          {filters.map(({ id, label, hint }) => (
            <button
              className="site-button"
              type="button"
              key={id}
              title={hint}
              aria-pressed={filter === id}
              onClick={() => {
                setFilter(id)
                setPage(1)
              }}
            >
              {label}
            </button>
          ))}
          <button className="site-button" type="button" disabled title="La página de tradiciones aún no está disponible">
            Por región
          </button>
        </div>
        <div className="catalog-toolbar__extras">
          <label className="catalog-region">
            Región
            <select
              value={region}
              onChange={(event) => {
                setRegion(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Todas las regiones</option>
              {regions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <button className="site-button catalog-clear" type="button" disabled={!hasFilters} onClick={clearFilters}>
            Limpiar filtros
          </button>
        </div>
      </div>

      <h2 className="catalog-results" ref={resultsHeading} tabIndex={-1}>
        Recetas destacadas
        <span role="status">
          {' · '}{results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          {pageCount > 1 && <span className="catalog-sr-only">{` · Página ${page} de ${pageCount}`}</span>}
        </span>
      </h2>

      {results.length ? (
        <>
          <ul className="catalog-grid">
            {visibleRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                id={recipe.id}
                title={recipe.catalogName ?? recipe.name}
                description={recipe.catalogDescription ?? recipe.description}
                region={recipe.region}
                time={formatDuration(recipe.durationMinutes)}
                tone={recipe.tone}
              />
            ))}
          </ul>
          <CatalogPagination page={page} pageCount={pageCount} onPageChange={changePage} />
        </>
      ) : (
        <div className="catalog-empty">
          <h3>No encontramos recetas</h3>
          <p>Prueba con otro término, cambia de región o limpia los filtros para ver todas las recetas.</p>
          <button className="site-button site-button--green" type="button" onClick={clearFilters}>Limpiar filtros</button>
        </div>
      )}
    </section>
  )
}

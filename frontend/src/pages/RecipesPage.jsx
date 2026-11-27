import { useCallback, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import RecipeCard from '../components/RecipeCard.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import FavoritesStatus from '../components/FavoritesStatus.jsx'
import RequestError from '../components/RequestError.jsx'
import { usePublicRequest } from '../hooks/usePublicRequest.js'
import { useRecipeCovers } from '../hooks/useRecipeCovers.js'
import { getCategories, getRecipes, readCatalogFilters, recipeTypes } from '../services/recipesService.js'
import '../styles/recipes.css'

function CatalogPagination({ page, pageCount, onPageChange }) {
  return (
    <nav className="catalog-pagination" aria-label="Paginación de recetas">
      <button className="site-button" type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </button>
      <span aria-current="page">Página {page} de {pageCount}</span>
      <button className="site-button" type="button" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  )
}

export default function RecipesPage() {
  const { key: locationKey } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { titulo, categoria, tipo, pagina } = readCatalogFilters(searchParams)
  const [search, setSearch] = useState({ title: titulo, draft: titulo })
  if (search.title !== titulo) setSearch({ title: titulo, draft: titulo })
  const searchInput = useRef(null)
  const resultsHeading = useRef(null)
  const loadRecipes = useCallback(
    (signal) => getRecipes({ titulo, categoria, tipo, pagina }, signal),
    [titulo, categoria, tipo, pagina],
  )
  const recipes = usePublicRequest(loadRecipes)
  const categories = usePublicRequest(getCategories)
  const selectedCategory = categories.data?.find(({ id }) => id === categoria)
  const legacyRegion = searchParams.has('region')

  function changeFilter(name, value) {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      if (value) params.set(name, value)
      else params.delete(name)
      params.delete('pagina')
      return params
    })
  }

  function clearFilters() {
    setSearch({ title: titulo, draft: '' })
    searchInput.current.focus()
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      for (const key of ['titulo', 'categoria', 'tipo', 'pagina', 'region']) params.delete(key)
      return params
    })
  }

  function changePage(number) {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      if (number === 1) params.delete('pagina')
      else params.set('pagina', number - 1)
      return params
    })
    resultsHeading.current.focus()
  }

  const { contenido, totalElementos, totalPaginas } = recipes.data ?? {}
  const page = (recipes.data?.pagina ?? pagina) + 1
  const outsideCatalog = Boolean(recipes.data && pagina > 0 && page > totalPaginas)
  const covers = useRecipeCovers(outsideCatalog ? null : contenido, locationKey)

  return (
    <section className="catalog" aria-labelledby="catalog-title">
      <p className="catalog-eyebrow">RECETARIO</p>
      <h1 id="catalog-title">Explora recetas de Oaxaca</h1>
      <p className="catalog-intro">Busca por título o explora por tipo y categoría.</p>
      {legacyRegion && (
        <p className="catalog-notice" role="status">
          El filtro por región aún no está disponible. <Link to="/recetas">Explorar el catálogo completo</Link>.
        </p>
      )}

      <form className="catalog-search" role="search" aria-label="Catálogo de recetas" onSubmit={(event) => {
        event.preventDefault()
        const value = search.draft.trim()
        setSearch({ title: titulo, draft: value })
        changeFilter('titulo', value)
      }}>
        <label className="catalog-sr-only" htmlFor="recipe-search">Buscar por título</label>
        <div className="catalog-search__field">
          <svg className="catalog-search__icon" viewBox="0 0 24 24" aria-hidden="true"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="5.75" />
            <path d="m15 15 4.5 4.5" />
          </svg>
          <input id="recipe-search" ref={searchInput} type="search" maxLength={200}
            value={search.draft} onChange={(event) => setSearch({ title: titulo, draft: event.target.value })}
            placeholder="Título de la receta..." />
        </div>
        <button className="site-button site-button--clay" type="submit">Buscar recetas</button>
      </form>

      <div className="catalog-toolbar">
        <div className="catalog-filters" role="group" aria-label="Tipo de receta">
          {recipeTypes.map(({ value, label }) => (
            <button className="site-button" type="button" key={value} aria-pressed={tipo === value}
              onClick={() => changeFilter('tipo', value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="catalog-toolbar__extras">
          <div className="catalog-category">
            <label htmlFor="recipe-category">Categoría</label>
            <select id="recipe-category" value={categoria ?? ''} onChange={(event) => changeFilter('categoria', event.target.value)}>
              <option value="">Todas las categorías</option>
              {categoria && !selectedCategory && <option value={categoria}>Categoría (ID {categoria})</option>}
              {categories.data?.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
            </select>
          </div>
          <button className="site-button" type="button" onClick={clearFilters}>Limpiar filtros</button>
        </div>
      </div>
      {categories.loading && <p role="status">Cargando categorías…</p>}
      {categories.error && <RequestError error={categories.error} onRetry={categories.retry} retryLabel="Reintentar categorías" />}
      {categories.data?.length === 0 && <p className="catalog-notice">No hay categorías disponibles.</p>}
      {selectedCategory?.descripcion && <p className="catalog-notice">{selectedCategory.descripcion}</p>}

      <h2 className="catalog-results" ref={resultsHeading} tabIndex={-1}>Recetas</h2>
      <p role="status">
        {recipes.loading && 'Cargando recetas…'}
        {recipes.data && `${totalElementos} ${totalElementos === 1 ? 'resultado' : 'resultados'}`}
      </p>
      {recipes.error && <RequestError error={recipes.error} onRetry={recipes.retry} retryLabel="Reintentar recetas" />}
      <FavoritesStatus />
      {outsideCatalog ? (
        <div className="catalog-empty">
          <h3>Esta página no está disponible</h3>
          <button className="site-button" type="button" onClick={() => changePage(1)}>Ir a la primera página</button>
        </div>
      ) : contenido?.length ? (
        <>
          <ul className="catalog-grid" role="list">
            {contenido.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} image={covers?.[recipe.id]}
              favoriteAction={<FavoriteButton recipe={recipe} />} />)}
          </ul>
          {totalPaginas > 1 && <CatalogPagination page={page} pageCount={totalPaginas} onPageChange={changePage} />}
        </>
      ) : recipes.data && (
        <div className="catalog-empty">
          <h3>No encontramos recetas</h3>
          <p>{titulo || tipo || categoria ? 'Prueba otro título o cambia los filtros.' : 'Aún no hay recetas en el catálogo.'}</p>
        </div>
      )}
      <Link to="/tradiciones#regiones">Conocer las regiones de Oaxaca</Link>
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { adminRecipeError, createAdminRecipesService } from '../services/adminRecipesService.js'
import { adminEditorialStates } from '../utils/adminRules.js'

const initial = { texto: '', estado: '', baja: '', pagina: 0 }

export default function AdminRecipesPage() {
  const { user, requestAuthenticated } = useAuth()
  const [filters, setFilters] = useState(initial)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const busy = useRef(false)
  const current = result?.filters === filters && result.attempt === attempt && result.user === user ? result : null

  useEffect(() => {
    const controller = new AbortController()
    createAdminRecipesService(requestAuthenticated, user).list(filters, controller.signal).then(
      (page) => { if (!controller.signal.aborted) setResult({ filters, attempt, user, page }) },
      (error) => { if (!controller.signal.aborted && error.name !== 'AbortError') setResult({ filters, attempt, user, error }) },
    )
    return () => controller.abort()
  }, [filters, attempt, user, requestAuthenticated])

  function changeFilter(name, value) {
    setSelected(null)
    setMessage('')
    setFilters((old) => ({ ...old, [name]: value, pagina: 0 }))
  }
  async function confirm() {
    if (busy.current || !selected || !detail.trim() || detail.trim().length > 1000) return
    busy.current = true
    setPending(true)
    try {
      await createAdminRecipesService(requestAuthenticated, user).change(selected, detail)
      setMessage('El servidor confirmó la operación. Actualizando el listado.')
    } catch (error) {
      setMessage(adminRecipeError(error))
    } finally {
      setSelected(null)
      setDetail('')
      setAttempt((n) => n + 1)
      setPending(false)
      busy.current = false
    }
  }
  const page = current?.page
  return <section className="cook-view" aria-labelledby="admin-recipes-title">
    <header><p className="admin-eyebrow">Bajas lógicas</p><h1 id="admin-recipes-title">Administración de recetas</h1>
      <p className="cook-muted">Consulta las recetas registradas. La baja lógica es independiente del estado editorial.</p></header>
    <section className="cook-panel" aria-labelledby="admin-recipes-list">
      <h2 id="admin-recipes-list">Recetas registradas</h2>
      <div className="cook-filters">
        <label className="cook-field">Buscar por título o autor<input type="search" maxLength={100} value={filters.texto} onChange={(e) => changeFilter('texto', e.target.value)} /></label>
        <label className="cook-field">Estado editorial<select value={filters.estado} onChange={(e) => changeFilter('estado', e.target.value)}><option value="">Todos los estados</option>{Object.entries(adminEditorialStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="cook-field">Baja lógica<select value={filters.baja} onChange={(e) => changeFilter('baja', e.target.value)}><option value="">Todas las recetas</option><option value="false">Sin baja</option><option value="true">De baja lógica</option></select></label>
      </div>
      {message && <p role="status">{message}</p>}
      {!current && <p role="status">Cargando recetas…</p>}
      {current?.error && <><p role="alert">{adminRecipeError(current.error)}</p><button className="site-button" type="button" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button></>}
      {page && <><p className="cook-results cook-muted" role="status">{page.totalElementos ? `${page.totalElementos} recetas. Página ${page.pagina + 1} de ${page.totalPaginas}.` : 'No hay recetas que coincidan con estos filtros.'}</p>
        {page.contenido.length > 0 && <table className="cook-table admin-table"><thead><tr><th>Receta</th><th>Autor</th><th>Estado editorial</th><th>Baja lógica</th><th>Acción</th></tr></thead><tbody>
          {page.contenido.map((r) => <tr key={r.id}><th scope="row">{r.titulo}<small>{r.id}</small></th><td>{r.autor}</td><td><span className="cook-badge" data-state={r.estado}>{adminEditorialStates[r.estado]}</span></td><td>{r.eliminadoEn === null ? 'Sin baja' : 'De baja lógica'}</td><td><button className="site-button" type="button" disabled={pending} onClick={() => { setSelected(r); setDetail(''); setMessage('') }}>{r.eliminadoEn === null ? 'Preparar baja' : 'Preparar restauración'}</button></td></tr>)}
        </tbody></table>}
        <div className="cook-actions"><button className="site-button" type="button" disabled={filters.pagina === 0 || pending} onClick={() => setFilters((f) => ({ ...f, pagina: f.pagina - 1 }))}>Anterior</button><button className="site-button" type="button" disabled={filters.pagina + 1 >= page.totalPaginas || pending} onClick={() => setFilters((f) => ({ ...f, pagina: f.pagina + 1 }))}>Siguiente</button></div></>}
    </section>
    {selected && <section className="cook-panel admin-action"><h2>Confirmar {selected.eliminadoEn === null ? 'baja' : 'restauración'}</h2><p>{selected.titulo} ({selected.id}) · {adminEditorialStates[selected.estado]}</p>
      <p className="cook-muted">{selected.eliminadoEn === null ? 'La receta dejará de ser visible; sus relaciones se conservarán.' : selected.estado === 'PUBLICADA' ? 'Pasará a pendiente y requerirá una nueva aprobación.' : 'Se conservará su estado editorial.'}</p>
      <label className="cook-field">Justificación (obligatoria)<textarea maxLength={1000} value={detail} disabled={pending} onChange={(e) => setDetail(e.target.value)} /></label>
      <div className="cook-actions"><button className="site-button cook-primary" type="button" disabled={pending || !detail.trim()} onClick={confirm}>Confirmar operación</button><button className="site-button" type="button" disabled={pending} onClick={() => setSelected(null)}>Cancelar</button></div>
    </section>}
  </section>
}

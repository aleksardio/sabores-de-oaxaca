import { useLayoutEffect, useRef, useState } from 'react'
import RequestError from './RequestError.jsx'
import RecipeMedia from './RecipeMedia.jsx'
import { ingredientUnits, mediaTypes, recipeTypes } from '../data/recipeEditorOptions.js'
import { addIngredient, getIngredientChoices, searchIngredients, selectIngredient } from '../utils/ingredientSelection.js'
import { changeIngredientUnit, hasPendingMedia, maxItems, pendingMediaMessage, validateRecipeDraft } from '../utils/recipeEditorValidation.js'
import { mediaAccept } from '../utils/multimediaFiles.js'

const ingredientSearchId = 'recipe-ingredient-search'
const mediaPrivacyId = 'recipe-media-privacy'

function Field({ id, label, error, options, emptyOption, multiline, hint, children, describedBy, ...props }) {
  const attributes = {
    ...props, id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined,
  }
  return (
    <div className="cook-field">
      <label htmlFor={id}>{label}</label>
      {options || children ? (
        <select {...attributes}>
          {emptyOption && <option value="">{emptyOption}</option>}
          {children ?? Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
      ) : multiline ? <textarea {...attributes} /> : <input {...attributes} />}
      {hint && <small id={`${id}-hint`} className="cook-muted">{hint}</small>}
      {error && <span id={`${id}-error`} className="cook-error">{error}</span>}
    </div>
  )
}

export default function RecipeEditorForm({
  draft, onChange, pending, blocked, blockReason, onSave, onReview, reviewLabel, creating, categories, ingredients,
  reviewRequirements = {},
  mediaError, onSelectMedia, onUploadMedia, onCancelMedia, onRemoveMedia,
}) {
  const [ingredientQuery, setIngredientQuery] = useState('')
  const [touched, setTouched] = useState({})
  const [attempt, setAttempt] = useState(null)
  const formRef = useRef(null)
  const nextId = useRef(0)
  const focusTarget = useRef(null)
  const focusInvalid = useRef(false)
  const draftErrors = validateRecipeDraft(draft)
  const applicableErrors = attempt === 'review' ? { ...reviewRequirements, ...draftErrors } : draftErrors
  const errors = attempt ? applicableErrors : Object.fromEntries(
    Object.entries(applicableErrors).filter(([key]) => touched[key]),
  )
  useLayoutEffect(() => {
    if (focusTarget.current) {
      formRef.current?.querySelector(focusTarget.current)?.focus()
      focusTarget.current = null
    }
    if (focusInvalid.current) {
      formRef.current?.querySelector('[aria-invalid="true"]:not(:disabled), [data-invalid]')?.focus()
      focusInvalid.current = false
    }
  })

  const unresolvedMedia = hasPendingMedia(draft)
  const locked = blocked || pending || unresolvedMedia
  const status = [
    pending && 'Hay una operación en curso. Espera a que termine.',
    blocked && (blockReason || 'Resuelve el bloqueo antes de continuar.'),
    unresolvedMedia && pendingMediaMessage,
  ].filter(Boolean)
  const hasDraftErrors = Object.entries(draftErrors).some(([key, error]) => key !== 'multimedia' || error !== pendingMediaMessage)
  const reviewMessages = Object.values(reviewRequirements)

  function submit(review) {
    if (locked) return
    const invalid = hasDraftErrors || (review && reviewMessages.length > 0)
    if (invalid) {
      const action = review ? 'review' : 'save'
      if (attempt === action) formRef.current?.querySelector('[aria-invalid="true"]:not(:disabled), [data-invalid]')?.focus()
      else focusInvalid.current = true
      setAttempt(action)
      return
    }
    setAttempt(null)
    if (review) onReview()
    else onSave()
  }

  const touch = (key) => () => setTouched((previous) => previous[key] ? previous : { ...previous, [key]: true })

  function bind(field) {
    return {
      id: `recipe-${field}`, value: draft[field], error: errors[field],
      onBlur: touch(field),
      onChange: (event) => onChange((recipe) => ({ ...recipe, [field]: event.target.value })),
    }
  }

  function bindRow(collection, prefix, row, field) {
    const id = `${prefix}-${row.id}-${field}`
    return {
      id, value: row[field] ?? '', error: errors[id],
      onBlur: touch(id),
      onChange(event) {
        const value = event.target.value
        onChange((recipe) => ({ ...recipe, [collection]: recipe[collection].map((item) => {
          if (item.id !== row.id) return item
          if (field === 'unit') return changeIngredientUnit(item, value)
          return { ...item, [field]: value }
        }) }))
      },
    }
  }

  function selectResult(ingredient) {
    let id
    do { id = `new-${nextId.current++}` } while (draft.ingredients.some((row) => row.id === id))
    focusTarget.current = `[data-ingredient-quantity="${ingredient.id}"]`
    onChange((recipe) => {
      const rows = addIngredient(recipe.ingredients, ingredient, id)
      return rows === recipe.ingredients ? recipe : { ...recipe, ingredients: rows }
    })
  }

  function removeRow(collection, id, focus) {
    focusTarget.current = focus
    onChange((recipe) => ({ ...recipe, [collection]: recipe[collection].filter((row) => row.id !== id) }))
  }

  const catalog = new Map((categories.data ?? []).map((category) => [category.id, category]))
  for (const category of draft.categories) {
    if (!catalog.has(category.id)) catalog.set(category.id, category)
  }
  const ingredientCatalog = ingredients.data
  const showIngredientSearch = Boolean(ingredientCatalog?.length)
  const selectedIds = new Set(draft.ingredients.map(({ ingredientId }) => Number(ingredientId)))
  const matches = searchIngredients(ingredientCatalog ?? [], ingredientQuery).filter(({ id }) => !selectedIds.has(id))
  const maxResults = 20

  function removeIngredient(rowId) {
    const focus = showIngredientSearch ? `#${ingredientSearchId}` : '#cook-ingredients-title'
    removeRow('ingredients', rowId, focus)
  }

  function selectFile(event, row) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) onSelectMedia(file, row)
  }

  return (
    <form className="cook-editor" ref={formRef} onSubmit={(event) => { event.preventDefault(); submit(false) }} noValidate>
      <fieldset className="cook-editor-fields" disabled={pending}>
        <div className="cook-editor-grid">
          <section className="cook-panel" aria-labelledby="cook-general-title">
            <h2 id="cook-general-title">Información principal</h2>
            <Field {...bind('title')} label="Título" maxLength={200} required />
            <Field {...bind('description')} label="Descripción" multiline rows={3} required />
            <Field {...bind('type')} label="Tipo de receta" options={recipeTypes} emptyOption="Selecciona un tipo" required />
            <Field {...bind('baseServings')} label="Porciones base" inputMode="numeric" required />
            <fieldset className="cook-categories" aria-describedby="cook-category-hint">
              <legend>Categorías</legend>
              <p id="cook-category-hint" className="cook-muted">El borrador puede guardarse sin categorías. Para revisión, selecciona al menos una.</p>
              {categories.loading && <p role="status">Cargando categorías…</p>}
              {categories.error && <RequestError error={categories.error} onRetry={categories.retry} />}
              {categories.data?.length === 0 && <p>No hay categorías disponibles en el catálogo.</p>}
              {[...catalog.values()].map((category, index) => {
                const selected = draft.categories.some(({ id }) => id === category.id)
                return (
                  <label key={category.id}>
                    <input type="checkbox" checked={selected} disabled={!selected && draft.categories.length >= maxItems.categories}
                      aria-invalid={errors.categories && index === 0 ? true : undefined}
                      aria-describedby={errors.categories ? 'cook-category-error' : undefined}
                      onBlur={touch('categories')}
                      onChange={() => onChange((recipe) => ({ ...recipe, categories: selected
                        ? recipe.categories.filter(({ id }) => id !== category.id) : [...recipe.categories, category] }))} />
                    {category.nombre}
                  </label>
                )
              })}
              {errors.categories && <p className="cook-error" id="cook-category-error" data-invalid tabIndex={-1}>{errors.categories}</p>}
            </fieldset>
          </section>
          <section className="cook-panel" aria-labelledby="cook-ingredients-title">
            <h2 id="cook-ingredients-title" tabIndex={-1}>Ingredientes con cantidades</h2>
            <p className="cook-muted">Puedes guardar un borrador sin ingredientes. Para revisión, agrega al menos uno.</p>
            {ingredients.loading && <p role="status">Cargando ingredientes…</p>}
            {ingredients.error && <RequestError error={ingredients.error} onRetry={ingredients.retry} retryLabel="Reintentar consulta de ingredientes" />}
            {ingredients.data?.length === 0 && <p role="status">No hay ingredientes disponibles en el catálogo.</p>}
            {showIngredientSearch && (
              <>
                <Field id={ingredientSearchId} label="Buscar ingrediente por nombre" type="search"
                  hint="Elige un resultado para agregarlo directamente. La búsqueda no cambia las filas existentes."
                  error={errors.ingredients} onBlur={touch('ingredients')}
                  value={ingredientQuery} onChange={(event) => setIngredientQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault()
                  }} />
                <div role="status" className="cook-muted">
                  {draft.ingredients.length >= maxItems.ingredients ? `Alcanzaste el límite de ${maxItems.ingredients} ingredientes.`
                    : matches.length === 0 ? 'No hay ingredientes disponibles para agregar con esta búsqueda.'
                      : matches.length > maxResults && `Se muestran ${maxResults} resultados. Escribe un nombre más específico para acotar la búsqueda.`}
                </div>
                {matches.length > 0 && draft.ingredients.length < maxItems.ingredients && (
                  <ul className="cook-ingredient-results" aria-label="Resultados de ingredientes">
                    {matches.slice(0, maxResults).map((ingredient) => (
                      <li key={ingredient.id}>
                        <button className="site-button" type="button" onClick={() => selectResult(ingredient)}>{ingredient.nombre}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {!showIngredientSearch && errors.ingredients &&
              <p className="cook-error" data-invalid tabIndex={-1}>{errors.ingredients}</p>}
            {draft.ingredients.map((row, index) => {
              const field = (key) => bindRow('ingredients', 'ingredient', row, key)
              const choices = getIngredientChoices(ingredientCatalog, draft.ingredients, row)
              const id = `ingredient-${row.id}-ingredientId`
              return (
                <fieldset className="cook-ingredient-row" key={row.id}>
                  <legend>Ingrediente {index + 1}</legend>
                  <Field id={id} label="Ingrediente" value={row.ingredientId} error={errors[id]} required
                    onBlur={touch(id)}
                    disabled={!showIngredientSearch} onChange={(event) => {
                      const value = event.target.value
                      onChange((recipe) => {
                        const rows = selectIngredient(ingredientCatalog, recipe.ingredients, row.id, value)
                        return rows === recipe.ingredients ? recipe : { ...recipe, ingredients: rows }
                      })
                    }}>
                    <option value="" disabled>Selecciona un ingrediente</option>
                    {choices.map(({ id, label, disabled }) => <option key={id} value={id} disabled={disabled}>{label}</option>)}
                  </Field>
                  <div className="cook-two-fields">
                    <Field {...field('quantity')} label="Cantidad" inputMode="decimal" data-ingredient-quantity={row.ingredientId}
                      disabled={row.unit === 'AL_GUSTO'} required={row.unit !== 'AL_GUSTO'} />
                    <Field {...field('unit')} label="Unidad" options={ingredientUnits} required />
                  </div>
                  <Field {...field('order')} label="Orden" inputMode="numeric" required />
                  <Field {...field('note')} label="Nota (opcional)" maxLength={255} />
                  <button className="site-button" type="button" onClick={() => removeIngredient(row.id)}
                    aria-label={`Quitar ingrediente ${index + 1}`}>Quitar</button>
                </fieldset>
              )
            })}
            <h2 className="cook-preparation-heading">Preparación</h2>
            <Field {...bind('preparation')} label="Instrucciones" hint="Escribe un paso por línea." multiline rows={5} required />
          </section>
        </div>
      </fieldset>
      <section className="cook-panel" aria-labelledby="cook-media-title">
        <h2 id="cook-media-title">Multimedia</h2>
        <p id={mediaPrivacyId} className="cook-demo-notice">
          Los archivos subidos serán públicos aunque la receta todavía sea un borrador. No subas información privada ni fotografías o videos sin autorización.
        </p>
        <Field id="recipe-add-media" label="Seleccionar foto o video" type="file" accept={mediaAccept}
          describedBy={mediaPrivacyId}
          hint={`JPEG, PNG o WebP (hasta 5 MiB); MP4 o WebM (hasta 30 MiB). Hasta ${maxItems.multimedia} referencias.`}
          disabled={pending || blocked || draft.multimedia.length >= maxItems.multimedia}
          onChange={selectFile} />
        {mediaError && <p className="cook-error" role="alert">{mediaError}</p>}
        {draft.multimedia.map((row, index) => {
          const field = (key) => bindRow('multimedia', 'media', row, key)
          const uploading = row.local?.status === 'uploading'
          const locked = pending || blocked
          return (
            <fieldset className="cook-ingredient-row" key={row.id}>
              <legend>Referencia {index + 1}: {mediaTypes[row.type]}</legend>
              <RecipeMedia row={row} title={draft.title} />
              {(errors[`media-${row.id}-url`] || errors[`media-${row.id}-type`]) &&
                <p className="cook-error" data-invalid tabIndex={-1}>
                  {errors[`media-${row.id}-url`] || errors[`media-${row.id}-type`]}
                </p>}
              <div className="cook-two-fields">
                <Field {...field('order')} label="Orden" inputMode="numeric" required disabled={locked} />
                <Field {...field('alt')} label="Texto alternativo (opcional)" maxLength={255} disabled={locked} />
              </div>
              {row.local && !uploading && <Field id={`media-${row.id}-replacement`} label="Cambiar archivo" type="file"
                accept={mediaAccept} describedBy={mediaPrivacyId} disabled={locked} onChange={(event) => selectFile(event, row)} />}
              <div className="cook-actions">
                {row.local && (uploading
                  ? <button type="button" className="site-button" onClick={() => onCancelMedia(row)}>Cancelar subida</button>
                    : <button type="button" className="site-button cook-primary" aria-describedby={mediaPrivacyId}
                      disabled={locked} onClick={() => onUploadMedia(row)}>
                    {row.local.status === 'ready' ? 'Subir archivo' : 'Reintentar subida'}
                  </button>)}
                <button type="button" className="site-button" disabled={blocked || (pending && !uploading)}
                  onClick={() => {
                    focusTarget.current = '#recipe-add-media'
                    onRemoveMedia(row)
                  }} aria-label={`Quitar referencia ${index + 1}`}>Quitar referencia</button>
              </div>
            </fieldset>
          )
        })}
        {errors.multimedia && errors.multimedia !== pendingMediaMessage &&
          <p className="cook-error" data-invalid tabIndex={-1}>{errors.multimedia}</p>}
      </section>
      <div className="cook-panel cook-form-footer">
        {creating && <p className="cook-muted">Guarda el borrador para poder enviarlo a revisión desde su editor.</p>}
        {status.length > 0 && <p id="cook-action-block" className="cook-muted" role="status">{status.join(' ')}</p>}
        {hasDraftErrors && <p id="cook-save-requirements" className="cook-muted">Corrige los campos obligatorios o inválidos para guardar.</p>}
        {onReview && reviewMessages.length > 0 && <p id="cook-review-requirements" className="cook-muted">
          Requisitos adicionales para revisión: {reviewMessages.join(' ')}
        </p>}
        <div className="cook-actions">
          <button className="site-button cook-primary" type="submit"
            aria-describedby={[locked && 'cook-action-block', hasDraftErrors && 'cook-save-requirements'].filter(Boolean).join(' ') || undefined}
            disabled={locked}>{creating ? 'Guardar borrador' : 'Guardar cambios'}</button>
          {onReview && <button className="site-button" type="button"
            aria-describedby={[locked && 'cook-action-block', hasDraftErrors && 'cook-save-requirements',
              reviewMessages.length > 0 && 'cook-review-requirements'].filter(Boolean).join(' ') || undefined}
            onClick={() => submit(true)} disabled={locked}>{reviewLabel}</button>}
        </div>
        {Object.keys(errors).length > 0 && <p className="cook-error" role="status">Revisa los campos indicados.</p>}
      </div>
    </form>
  )
}

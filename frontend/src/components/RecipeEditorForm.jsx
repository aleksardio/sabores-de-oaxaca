import { useLayoutEffect, useRef, useState } from 'react'
import RequestError from './RequestError.jsx'
import RecipeMedia from './RecipeMedia.jsx'
import { ingredientUnits, mediaTypes, recipeTypes } from '../data/recipeEditorOptions.js'
import { getIngredientChoices, searchIngredients, selectIngredient } from '../utils/ingredientSelection.js'
import { changeIngredientUnit, hasPendingMedia, maxItems, nextOrder, pendingMediaMessage } from '../utils/recipeEditorValidation.js'
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
  draft, onChange, errors, pending, blocked, onSave, onReview, reviewLabel, creating, categories, ingredients,
  mediaError, onSelectMedia, onUploadMedia, onCancelMedia, onRemoveMedia,
}) {
  const [ingredientQuery, setIngredientQuery] = useState('')
  const formRef = useRef(null)
  const nextId = useRef(0)
  const focusTarget = useRef(null)
  useLayoutEffect(() => {
    if (focusTarget.current) {
      formRef.current?.querySelector(focusTarget.current)?.focus()
      focusTarget.current = null
    }
  })
  useLayoutEffect(() => {
    if (Object.keys(errors).length) formRef.current?.querySelector('[aria-invalid="true"]:not(:disabled), [role="alert"][tabindex]')?.focus()
  }, [errors])

  function bind(field) {
    return {
      id: `recipe-${field}`, value: draft[field], error: errors[field],
      onChange: (event) => onChange((recipe) => ({ ...recipe, [field]: event.target.value })),
    }
  }

  function bindRow(collection, prefix, row, field) {
    const id = `${prefix}-${row.id}-${field}`
    return {
      id, value: row[field] ?? '', error: errors[id],
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

  function addRow(collection, prefix, field, values) {
    let id
    do { id = `new-${nextId.current++}` } while (draft[collection].some((row) => row.id === id))
    focusTarget.current = `#${prefix}-${id}-${field}`
    onChange((recipe) => ({ ...recipe, [collection]: [...recipe[collection], { ...values, id, order: nextOrder(recipe[collection]) }] }))
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
  const matches = searchIngredients(ingredientCatalog ?? [], ingredientQuery)
  const canAddIngredient = (rows) => rows.length < maxItems.ingredients
    && getIngredientChoices(ingredientCatalog, rows, null, matches).some(({ disabled }) => !disabled)

  function removeIngredient(rowId) {
    const remaining = draft.ingredients.filter(({ id }) => id !== rowId)
    const focus = canAddIngredient(remaining) ? '#recipe-add-ingredient'
      : showIngredientSearch ? `#${ingredientSearchId}` : '#cook-ingredients-title'
    removeRow('ingredients', rowId, focus)
  }

  function selectFile(event, row) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) onSelectMedia(file, row)
  }

  const unresolvedMedia = hasPendingMedia(draft)

  return (
    <form className="cook-editor" ref={formRef} onSubmit={(event) => { event.preventDefault(); onSave() }} noValidate>
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
                      onChange={() => onChange((recipe) => ({ ...recipe, categories: selected
                        ? recipe.categories.filter(({ id }) => id !== category.id) : [...recipe.categories, category] }))} />
                    {category.nombre}
                  </label>
                )
              })}
              {errors.categories && <p className="cook-error" id="cook-category-error" role="alert" tabIndex={-1}>{errors.categories}</p>}
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
                  hint="Filtra las opciones de todas las filas sin cambiar los ingredientes seleccionados."
                  value={ingredientQuery} onChange={(event) => setIngredientQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault()
                  }} />
                <div role="status" className="cook-muted">
                  {matches.length === 0 && 'No hay ingredientes que coincidan con la búsqueda.'}
                </div>
              </>
            )}
            {draft.ingredients.map((row, index) => {
              const field = (key) => bindRow('ingredients', 'ingredient', row, key)
              const choices = getIngredientChoices(ingredientCatalog, draft.ingredients, row, matches)
              const id = `ingredient-${row.id}-ingredientId`
              return (
                <fieldset className="cook-ingredient-row" key={row.id}>
                  <legend>Ingrediente {index + 1}</legend>
                  <Field id={id} label="Ingrediente" value={row.ingredientId} error={errors[id]} required
                    disabled={!showIngredientSearch} onChange={(event) => {
                      const value = event.target.value
                      onChange((recipe) => {
                        const rows = selectIngredient(matches, recipe.ingredients, row.id, value)
                        return rows === recipe.ingredients ? recipe : { ...recipe, ingredients: rows }
                      })
                    }}>
                    <option value="" disabled>Selecciona un ingrediente</option>
                    {choices.map(({ id, label, disabled }) => <option key={id} value={id} disabled={disabled}>{label}</option>)}
                  </Field>
                  <div className="cook-two-fields">
                    <Field {...field('quantity')} label="Cantidad" inputMode="decimal" disabled={row.unit === 'AL_GUSTO'} required={row.unit !== 'AL_GUSTO'} />
                    <Field {...field('unit')} label="Unidad" options={ingredientUnits} required />
                  </div>
                  <Field {...field('order')} label="Orden" inputMode="numeric" required />
                  <Field {...field('note')} label="Nota (opcional)" maxLength={255} />
                  <button className="site-button" type="button" onClick={() => removeIngredient(row.id)}
                    aria-label={`Quitar ingrediente ${index + 1}`}>Quitar</button>
                </fieldset>
              )
            })}
            <button id="recipe-add-ingredient" className="site-button" type="button" disabled={!canAddIngredient(draft.ingredients)}
              aria-invalid={errors.ingredients ? true : undefined} aria-describedby={errors.ingredients ? 'cook-ingredient-error' : undefined}
              onClick={() => addRow('ingredients', 'ingredient', 'ingredientId', { ingredientId: '', name: '', quantity: '', unit: 'G', note: '' })}>+ Agregar ingrediente</button>
            {errors.ingredients && <p id="cook-ingredient-error" className="cook-error">{errors.ingredients}</p>}
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
                <p className="cook-error" role="alert" tabIndex={-1}>
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
          <p className="cook-error" role="alert" tabIndex={-1}>{errors.multimedia}</p>}
      </section>
      <div className="cook-panel cook-form-footer">
        {creating && <p className="cook-muted">Guarda el borrador para poder enviarlo a revisión desde su editor.</p>}
        {unresolvedMedia && <p className="cook-muted" role="status">{pendingMediaMessage}</p>}
        <div className="cook-actions">
          <button className="site-button cook-primary" type="submit" disabled={blocked || pending || unresolvedMedia}>{creating ? 'Guardar borrador' : 'Guardar cambios'}</button>
          {onReview && <button className="site-button" type="button" disabled={blocked || pending || unresolvedMedia} onClick={onReview}>{reviewLabel}</button>}
        </div>
        {Object.keys(errors).length > 0 && <p className="cook-error" role="status">Revisa los campos indicados.</p>}
      </div>
    </form>
  )
}

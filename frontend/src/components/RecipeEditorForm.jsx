import { useLayoutEffect, useRef } from 'react'
import RequestError from './RequestError.jsx'
import { ingredientUnits, mediaTypes, recipeTypes } from '../data/recipeEditorOptions.js'
import { changeIngredientUnit, maxItems, positiveInteger } from '../utils/recipeEditorValidation.js'

function Field({ id, label, error, options, emptyOption, multiline, hint, ...props }) {
  const attributes = {
    ...props, id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined,
  }
  return (
    <div className="cook-field">
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select {...attributes}>
          {emptyOption && <option value="">{emptyOption}</option>}
          {Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
      ) : multiline ? <textarea {...attributes} /> : <input {...attributes} />}
      {hint && <small id={`${id}-hint`} className="cook-muted">{hint}</small>}
      {error && <span id={`${id}-error`} className="cook-error">{error}</span>}
    </div>
  )
}

// A future catalogue selector only needs to set ingredientId and its display name.
function IngredientReferenceField({ binding, name }) {
  return <Field {...binding} label="ID del ingrediente" inputMode="numeric" hint={name || undefined} required />
}

function nextOrder(rows) {
  const used = new Set(rows.map(({ order }) => Number(order)))
  let order = 1
  while (used.has(order)) order++
  // Append after existing rows where possible; gaps are fine.
  const last = Math.max(0, ...rows.filter((row) => positiveInteger(row.order, 2147483647)).map((row) => Number(row.order)))
  return String(last < 2147483647 ? last + 1 : order)
}

export default function RecipeEditorForm({
  draft, onChange, errors, pending, blocked, onSave, onReview, creating, categories,
}) {
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
    if (Object.keys(errors).length) formRef.current?.querySelector('[aria-invalid="true"]:not(:disabled), [role="alert"]')?.focus()
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
          if (field === 'ingredientId') return { ...item, ingredientId: value, name: Number(value) === Number(item.ingredientId) ? item.name : '' }
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
            <h2 id="cook-ingredients-title">Ingredientes con cantidades</h2>
            <p className="cook-muted">Aún no hay un catálogo de ingredientes en la API. Introduce un ID existente proporcionado por Aleks; el servidor comprueba que exista.</p>
            {draft.ingredients.map((row, index) => {
              const field = (key) => bindRow('ingredients', 'ingredient', row, key)
              return (
                <fieldset className="cook-ingredient-row" key={row.id}>
                  <legend>Ingrediente {index + 1}</legend>
                  <IngredientReferenceField binding={field('ingredientId')} name={row.name} />
                  <div className="cook-two-fields">
                    <Field {...field('quantity')} label="Cantidad" inputMode="decimal" disabled={row.unit === 'AL_GUSTO'} required={row.unit !== 'AL_GUSTO'} />
                    <Field {...field('unit')} label="Unidad" options={ingredientUnits} required />
                  </div>
                  <Field {...field('order')} label="Orden" inputMode="numeric" required />
                  <Field {...field('note')} label="Nota (opcional)" maxLength={255} />
                  <button className="site-button" type="button" onClick={() => removeRow('ingredients', row.id, '#recipe-add-ingredient')}
                    aria-label={`Quitar ingrediente ${index + 1}`}>Quitar</button>
                </fieldset>
              )
            })}
            <button id="recipe-add-ingredient" className="site-button" type="button" disabled={draft.ingredients.length >= maxItems.ingredients}
              aria-invalid={errors.ingredients ? true : undefined} aria-describedby={errors.ingredients ? 'cook-ingredient-error' : undefined}
              onClick={() => addRow('ingredients', 'ingredient', 'ingredientId', { ingredientId: '', name: '', quantity: '', unit: 'G', note: '' })}>+ Agregar ingrediente</button>
            {errors.ingredients && <p id="cook-ingredient-error" className="cook-error">{errors.ingredients}</p>}
            <h2 className="cook-preparation-heading">Preparación</h2>
            <Field {...bind('preparation')} label="Instrucciones" hint="Escribe un paso por línea." multiline rows={5} required />
          </section>
        </div>
        <section className="cook-panel" aria-labelledby="cook-media-title">
          <h2 id="cook-media-title">Multimedia</h2>
          <p className="cook-muted">Agrega enlaces HTTPS a imágenes o videos. No se suben archivos.</p>
          {draft.multimedia.map((row, index) => {
            const field = (key) => bindRow('multimedia', 'media', row, key)
            return (
              <fieldset className="cook-ingredient-row" key={row.id}>
                <legend>Referencia {index + 1}</legend>
                <div className="cook-two-fields">
                  <Field {...field('type')} label="Tipo de multimedia" options={mediaTypes} required />
                  <Field {...field('order')} label="Orden" inputMode="numeric" required />
                </div>
                <Field {...field('url')} label="URL HTTPS" type="url" maxLength={2048} required />
                <Field {...field('alt')} label="Texto alternativo (opcional)" maxLength={255} />
                <button type="button" className="site-button" onClick={() => removeRow('multimedia', row.id, '#recipe-add-media')}
                  aria-label={`Quitar referencia ${index + 1}`}>Quitar</button>
              </fieldset>
            )
          })}
          <button id="recipe-add-media" className="site-button" type="button" disabled={draft.multimedia.length >= maxItems.multimedia}
            onClick={() => addRow('multimedia', 'media', 'url', { type: 'IMAGEN', url: '', alt: '' })}>+ Agregar referencia</button>
          {errors.multimedia && <p className="cook-error" role="alert" tabIndex={-1}>{errors.multimedia}</p>}
        </section>
        <div className="cook-panel cook-form-footer">
          {creating && <p className="cook-muted">Guarda el borrador para poder enviarlo a revisión desde su editor.</p>}
          <div className="cook-actions">
            <button className="site-button cook-primary" type="submit" disabled={blocked}>{creating ? 'Guardar borrador' : 'Guardar cambios'}</button>
            {onReview && <button className="site-button" type="button" disabled={blocked} onClick={onReview}>Enviar a revisión</button>}
          </div>
          {Object.keys(errors).length > 0 && <p className="cook-error" role="status">Revisa los campos indicados.</p>}
        </div>
      </fieldset>
    </form>
  )
}

import { useLayoutEffect, useRef, useState } from 'react'
import { demoRecipeCategories, ingredientUnits, recipeTypes } from '../data/recipeEditorOptions.js'
import { changeIngredientUnit, validateRecipeForReview } from '../utils/recipeEditorValidation.js'

function Field({ id, label, error, options, emptyOption, multiline, hint, ...props }) {
  const attributes = {
    ...props,
    id,
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

function IngredientRow({ ingredient, index, errors, onChange, onRemove }) {
  const prefix = `ingredient-${ingredient.id}`
  const alGusto = ingredient.unit === 'AL_GUSTO'
  const bind = (field) => ({
    id: `${prefix}-${field}`,
    value: ingredient[field] ?? '',
    error: errors[`${prefix}-${field}`],
    onChange: (event) => onChange(field, event.target.value),
  })

  return (
    <fieldset className="cook-ingredient-row">
      <legend>Ingrediente {index + 1}</legend>
      <Field {...bind('name')} label="Nombre" maxLength={150} required />
      <div className="cook-two-fields">
        <Field {...bind('quantity')} label="Cantidad" inputMode="decimal" disabled={alGusto} required={!alGusto}
          hint={alGusto ? 'Sin cantidad para «Al gusto».' : undefined} />
        <Field {...bind('unit')} label="Unidad" options={ingredientUnits} required />
      </div>
      <Field {...bind('note')} label="Nota (opcional)" maxLength={255} />
      <button className="site-button" type="button" onClick={onRemove} aria-label={`Quitar ingrediente ${index + 1}`}>Quitar</button>
    </fieldset>
  )
}

export default function RecipeEditorForm({ draft, onChange }) {
  const [checked, setChecked] = useState(false)
  const nextId = useRef(Math.max(0, ...draft.ingredients.map(({ id }) => id)) + 1)
  const formRef = useRef(null)
  const focusTarget = useRef(null)
  const errors = checked ? validateRecipeForReview(draft) : {}
  const hasErrors = Object.keys(errors).length > 0

  useLayoutEffect(() => {
    if (focusTarget.current) {
      formRef.current?.querySelector(focusTarget.current)?.focus()
      focusTarget.current = null
    }
  })

  const bind = (field) => ({
    id: `recipe-${field}`,
    value: draft[field],
    error: errors[field],
    onChange: (event) => onChange((recipe) => ({ ...recipe, [field]: event.target.value })),
  })

  function addIngredient() {
    const id = nextId.current++
    focusTarget.current = `#ingredient-${id}-name`
    onChange((recipe) => ({
      ...recipe,
      ingredients: [...recipe.ingredients, { id, name: '', quantity: '', unit: 'G', note: '' }],
    }))
  }

  function removeIngredient(id) {
    focusTarget.current = '#recipe-add-ingredient'
    onChange((recipe) => ({ ...recipe, ingredients: recipe.ingredients.filter((ingredient) => ingredient.id !== id) }))
  }

  function updateIngredient(id, field, value) {
    onChange((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) => {
        if (ingredient.id !== id) return ingredient
        return field === 'unit' ? changeIngredientUnit(ingredient, value) : { ...ingredient, [field]: value }
      }),
    }))
  }

  function toggleCategory(category) {
    onChange((recipe) => ({
      ...recipe,
      categories: recipe.categories.includes(category)
        ? recipe.categories.filter((selected) => selected !== category)
        : [...recipe.categories, category],
    }))
  }

  function checkRequirements(event) {
    event.preventDefault()
    const selector = '[aria-invalid="true"]'
    if (checked) formRef.current.querySelector(selector)?.focus()
    else {
      focusTarget.current = selector
      setChecked(true)
    }
  }

  return (
    <form className="cook-editor" ref={formRef} onSubmit={checkRequirements} noValidate>
      <div className="cook-editor-grid">
        <section className="cook-panel" aria-labelledby="cook-general-title">
          <h2 id="cook-general-title">Información principal</h2>
          <Field {...bind('title')} label="Título" maxLength={200} required />
          <Field {...bind('description')} label="Descripción" multiline rows={3} required />
          <Field {...bind('type')} label="Tipo de receta" options={recipeTypes} emptyOption="Selecciona un tipo" required />
          <Field {...bind('baseServings')} label="Porciones base" inputMode="numeric" required />
          <fieldset className="cook-categories" aria-describedby={`cook-category-hint${errors.categories ? ' cook-category-error' : ''}`}>
            <legend>Categorías</legend>
            <p id="cook-category-hint" className="cook-muted">Selecciona al menos una categoría de demostración.</p>
            {demoRecipeCategories.map((category, index) => (
              <label key={category}>
                <input type="checkbox" checked={draft.categories.includes(category)}
                  aria-invalid={errors.categories && index === 0 ? true : undefined}
                  aria-describedby={errors.categories && index === 0 ? 'cook-category-error' : undefined}
                  onChange={() => toggleCategory(category)} />
                {category}
              </label>
            ))}
            {errors.categories && <p className="cook-error" id="cook-category-error">{errors.categories}</p>}
          </fieldset>
        </section>

        <section className="cook-panel" aria-labelledby="cook-ingredients-title">
          <h2 id="cook-ingredients-title">Ingredientes con cantidades</h2>
          {draft.ingredients.map((ingredient, index) => (
            <IngredientRow key={ingredient.id} ingredient={ingredient} index={index} errors={errors}
              onChange={(field, value) => updateIngredient(ingredient.id, field, value)}
              onRemove={() => removeIngredient(ingredient.id)} />
          ))}
          <button id="recipe-add-ingredient" className="site-button" type="button" onClick={addIngredient}
            aria-invalid={errors.ingredients ? true : undefined}
            aria-describedby={errors.ingredients ? 'cook-ingredient-error' : undefined}>+ Agregar ingrediente</button>
          {errors.ingredients && <p id="cook-ingredient-error" className="cook-error">{errors.ingredients}</p>}
          <h2 className="cook-preparation-heading">Preparación</h2>
          <Field {...bind('preparation')} label="Instrucciones" hint="Escribe un paso por línea." multiline rows={5} required />
        </section>
      </div>
      <div className="cook-panel cook-form-footer">
        <p id="cook-unavailable" className="cook-muted">Guardar y enviar a revisión no están disponibles sin una cuenta conectada y el servidor.</p>
        <div className="cook-actions">
          <button className="site-button cook-primary" type="submit">Comprobar requisitos</button>
          <button className="site-button" type="button" disabled aria-describedby="cook-unavailable">Guardar borrador</button>
          <button className="site-button" type="button" disabled aria-describedby="cook-unavailable">Enviar a revisión</button>
        </div>
        <p className={hasErrors ? 'cook-error' : 'cook-check-ok'} role="status">
          {checked && (hasErrors
            ? 'Todavía faltan requisitos. Revisa los campos indicados.'
            : 'La receta cumple los requisitos para revisión. Esta comprobación no envía ni guarda nada.')}
        </p>
      </div>
    </form>
  )
}

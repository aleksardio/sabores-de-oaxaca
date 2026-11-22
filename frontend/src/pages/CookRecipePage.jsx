import { useState } from 'react'
import { Link, useParams } from 'react-router'
import RecipeDraftPreview from '../components/RecipeDraftPreview.jsx'
import RecipeEditorForm from '../components/RecipeEditorForm.jsx'
import { findDemoCookRecipe, isDemoRecipeEditable, recipeStates } from '../data/demoCookRecipes.js'

const listPath = '/cocinero/recetas'
const blankDraft = {
  title: '', description: '', type: '', baseServings: '', categories: [], ingredients: [], preparation: '',
}

function BackToList() {
  return <Link className="cook-back" to={listPath}>← Volver a Mis recetas</Link>
}

function RecipeEditor({ initialRecipe }) {
  const [draft, setDraft] = useState(initialRecipe || blankDraft)
  const [preview, setPreview] = useState(false)
  const state = initialRecipe?.state

  return (
    <section className="cook-view" aria-labelledby="cook-editor-title">
      <header>
        <BackToList />
        <h1 id="cook-editor-title">{initialRecipe ? 'Editar receta' : 'Crear receta'}</h1>
        {state && <span className="cook-badge" data-state={state}>{recipeStates[state].label} · Ejemplo</span>}
        {state && recipeStates[state].note && <p className="cook-muted">{recipeStates[state].note}</p>}
        <p className="cook-muted">Los cambios solo duran mientras estés en esta pantalla. No se guardan al salir o recargar.</p>
      </header>
      <div className="cook-actions cook-mode" role="group" aria-label="Modo de la receta">
        <button type="button" className="site-button" aria-pressed={!preview} onClick={() => setPreview(false)}>Editar</button>
        <button type="button" className="site-button" aria-pressed={preview} onClick={() => setPreview(true)}>Vista previa</button>
      </div>
      {preview ? (
        <RecipeDraftPreview recipe={draft} />
      ) : (
        <RecipeEditorForm draft={draft} onChange={setDraft} />
      )}
    </section>
  )
}

export default function CookRecipePage({ mode }) {
  const { id } = useParams()
  if (mode === 'create') return <RecipeEditor key="new" />

  const recipe = findDemoCookRecipe(id)
  if (!recipe) {
    return (
      <section className="cook-view" aria-labelledby="cook-missing-title">
        <header>
          <BackToList />
          <h1 id="cook-missing-title">Receta no encontrada</h1>
          <p className="cook-muted">No hay una receta de demostración con ese identificador.</p>
        </header>
      </section>
    )
  }

  const editable = isDemoRecipeEditable(recipe.state)
  if (mode === 'edit' && editable) return <RecipeEditor key={recipe.id} initialRecipe={recipe} />
  const { label, note } = recipeStates[recipe.state]

  return (
    <section className="cook-view" aria-labelledby="cook-read-title">
      <header>
        <BackToList />
        <h1 id="cook-read-title">{mode === 'edit' ? 'Receta en modo lectura' : 'Vista previa de la receta'}</h1>
        <span className="cook-badge" data-state={recipe.state}>{label} · Ejemplo</span>
        {note && !editable && <p className="cook-muted">{note}</p>}
        <p className="cook-muted">Esta receta ficticia no forma parte del catálogo público.</p>
      </header>
      <RecipeDraftPreview recipe={recipe} />
      {editable && <div><Link className="site-button cook-primary" to={`${listPath}/${recipe.id}/editar`}>Editar ejemplo</Link></div>}
    </section>
  )
}

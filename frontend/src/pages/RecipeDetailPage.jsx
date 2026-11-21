import { Link, useParams } from 'react-router'
import { recipes } from '../data/recipes.js'

export default function RecipeDetailPage() {
  const { id } = useParams()
  const recipe = recipes.find((item) => item.id === id)

  return (
    <section>
      <Link to="/recetas">Volver al catálogo</Link>
      <h1>{recipe ? recipe.name : 'Receta no encontrada'}</h1>
      {recipe ? (
        <>
          <p>{recipe.description}</p>
          <p>Los ingredientes y el procedimiento se añadirán más adelante.</p>
        </>
      ) : (
        <p>No hay una receta con ese identificador en el catálogo provisional.</p>
      )}
    </section>
  )
}

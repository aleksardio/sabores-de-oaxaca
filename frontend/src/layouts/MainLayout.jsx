import { Outlet, useMatch } from 'react-router'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'

export default function MainLayout() {
  const isHome = useMatch('/')
  const isCatalog = useMatch('/recetas')
  const isRecipeDetail = useMatch('/recetas/:id')
  const pageClass = isHome ? ' page--home' : isCatalog ? ' page--catalog' : isRecipeDetail ? ' page--recipe-detail' : ''

  return (
    <div className="site-layout">
      <Navbar />
      <main className={`container page${pageClass}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

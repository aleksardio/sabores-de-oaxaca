import { useEffect } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'

export default function MainLayout() {
  const isHome = useMatch('/')
  const isCatalog = useMatch('/recetas')
  const isRecipeDetail = useMatch('/recetas/:id')
  const pageClass = isHome ? ' page--home' : isCatalog ? ' page--catalog' : isRecipeDetail ? ' page--recipe-detail' : ''
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const target = hash && document.getElementById(hash.slice(1))
    if (target) {
      target.focus({ preventScroll: true })
      target.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])

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

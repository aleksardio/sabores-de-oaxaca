import { Outlet, useMatch } from 'react-router'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'

export default function MainLayout() {
  const isHome = useMatch('/')

  return (
    <div className="site-layout">
      <Navbar />
      <main className={isHome ? 'container page page--home' : 'container page'}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

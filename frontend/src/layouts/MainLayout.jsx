import { Outlet } from 'react-router'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'

export default function MainLayout() {
  return (
    <div className="site-layout">
      <Navbar />
      <main className="container page">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

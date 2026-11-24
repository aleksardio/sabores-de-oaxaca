import AuthProvider from './auth/AuthProvider.jsx'
import FavoritesProvider from './favorites/FavoritesProvider.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <AppRoutes />
      </FavoritesProvider>
    </AuthProvider>
  )
}

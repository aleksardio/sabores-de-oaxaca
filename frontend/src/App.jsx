import AuthProvider from './auth/AuthProvider.jsx'
import FavoritesProvider from './favorites/FavoritesProvider.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

export default function App({ readResetFlow }) {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <AppRoutes readResetFlow={readResetFlow} />
      </FavoritesProvider>
    </AuthProvider>
  )
}

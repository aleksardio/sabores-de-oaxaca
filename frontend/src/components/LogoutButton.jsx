import { useAuth } from '../auth/useAuth.js'

export default function LogoutButton() {
  const { logoutPending, signOut } = useAuth()

  return (
    <button className="site-button" type="button" disabled={logoutPending} onClick={signOut}>
      {logoutPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  )
}

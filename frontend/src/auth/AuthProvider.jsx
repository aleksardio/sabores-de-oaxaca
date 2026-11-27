import { useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { createAuthSession } from '../services/authSession.js'
import { AuthContext } from './useAuth.js'

export default function AuthProvider({ children }) {
  const [session] = useState(createAuthSession)
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const navigate = useNavigate()

  useEffect(() => () => session.dispose(), [session])

  async function signOut() {
    if (await session.signOut()) navigate('/', { replace: true })
  }

  function leaveLocally() {
    if (session.leaveLocally()) navigate('/', { replace: true })
  }

  return (
    <AuthContext.Provider value={{ ...snapshot, signIn: session.signIn, signInWithGoogle: session.signInWithGoogle, signOut, leaveLocally,
      requestAuthenticated: session.requestAuthenticated, requireFreshSignIn: session.requireFreshSignIn }}>
      {children}
    </AuthContext.Provider>
  )
}

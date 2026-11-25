import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { unstable_HistoryRouter as HistoryRouter } from 'react-router'
import './styles/global.css'
import App from './App.jsx'
import { createPasswordRecoveryHistory } from './routes/passwordRecoveryHistory.js'

// Antes de montar el router, incluso en la primera apertura del enlace.
const history = createPasswordRecoveryHistory(window)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HistoryRouter history={history}>
      <App readResetFlow={history.readResetFlow} />
    </HistoryRouter>
  </StrictMode>,
)

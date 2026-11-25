import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'

test('las rutas antiguas de autores muestran la página normal no encontrada', async (t) => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, ws: false } })
  t.after(() => vite.close())
  const { default: AppRoutes } = await vite.ssrLoadModule('/src/routes/AppRoutes.jsx')
  const { AuthContext } = await vite.ssrLoadModule('/src/auth/useAuth.js')
  for (const path of ['/autores', '/autores/ejemplo']) {
    const html = renderToStaticMarkup(createElement(AuthContext.Provider, { value: { user: null } },
      createElement(MemoryRouter, { initialEntries: [path] }, createElement(AppRoutes))))
    assert.match(html, /Página no encontrada/)
    assert.match(html, /Mi perfil/)
    assert.doesNotMatch(html, /href="\/autores/)
  }
})

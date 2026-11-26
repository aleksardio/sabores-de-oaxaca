import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { test } from 'node:test'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'

test('encabezado, pie, autenticación y panel comparten el logo oficial con nombre accesible', async (t) => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, ws: false } })
  t.after(() => vite.close())
  const [nav, footer, auth, panel, { AuthContext }] = await Promise.all([
    '/src/components/Navbar.jsx', '/src/components/Footer.jsx', '/src/layouts/AuthLayout.jsx',
    '/src/layouts/DemoPanelLayout.jsx', '/src/auth/useAuth.js',
  ].map((name) => vite.ssrLoadModule(name)))
  const render = ({ default: View }) => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(AuthContext.Provider, { value: {} }, createElement(View))))
  for (const view of [nav, footer, auth, panel]) {
    const html = render(view)
    assert.match(html, /src="\/brand\/logo-sabores-de-oaxaca\.png"/)
    assert.match(html, /width="560" height="278"/)
    assert.doesNotMatch(html, /brand-mark|vite\.svg/)
    if (view === auth) assert.match(html, /alt="Sabores de Oaxaca"/)
    else {
      assert.match(html, /aria-label="Sabores de Oaxaca, inicio"/)
      assert.match(html, /alt=""/)
    }
  }
})

test('los dos favicons PNG están declarados y conservan sus dimensiones', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  assert.doesNotMatch(html, /favicon\.svg|vite\.svg/)
  for (const size of [32, 64]) {
    assert.ok(html.includes(`sizes="${size}x${size}" href="%BASE_URL%brand/favicon-${size}.png"`))
    const png = await readFile(new URL(`../public/brand/favicon-${size}.png`, import.meta.url))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), size)
    assert.equal(png.readUInt32BE(20), size)
  }
})

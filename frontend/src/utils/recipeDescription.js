const creditLine = /^\s*Foto:\s*/i
const webUrl = /https?:\/\/[^\s<>"«»]+/gi
const structuredCredit = /^«([^»]+)»,\s*(.+?),\s*(.+?)\.\s*(CC [\w -]+ \d+(?:\.\d+)?):\s*(\S+?)\.?\s+Fuente:\s*(\S+?)(?:\s+—\s+(.+))?$/i

export function splitRecipeDescription(description) {
  const culinary = [], credits = []
  for (const line of (description ?? '').split(/\r?\n/)) {
    if (creditLine.test(line)) {
      const credit = line.replace(creditLine, '').trim()
      if (credit) credits.push(credit)
    } else culinary.push(line)
  }
  const text = culinary.join('\n').trim()
  return { text, excerpt: text.replace(webUrl, '').replace(/\s+/g, ' ').trim(), credits }
}

function httpsLink(value) {
  if (!/^https:\/\//i.test(value)) return null
  try {
    const url = new URL(value)
    return url.hostname && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function parsePhotoCredit(credit) {
  const match = structuredCredit.exec(credit)
  if (!match) return null
  const [, title, author, collection, license, licenseUrl, sourceUrl, changes] = match
  const source = httpsLink(sourceUrl), terms = httpsLink(licenseUrl)
  if (!source || !terms) return null
  return { title, author, collection, license, source, terms, changes }
}

// Preserve unstructured attribution text; turn safe URLs into labeled links.
export function creditSegments(credit) {
  const segments = []
  let end = 0
  for (const match of credit.matchAll(webUrl)) {
    const [raw] = match
    const value = raw.replace(/[.,;!)]+$/, '')
    const href = httpsLink(value)
    if (!href) continue
    segments.push({ text: credit.slice(end, match.index) })
    segments.push({ href, text: 'Consultar referencia' })
    end = match.index + value.length
  }
  segments.push({ text: credit.slice(end) })
  return segments
}

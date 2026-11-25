export function utcDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z?$/u.test(value)) return null
  const iso = value.endsWith('Z') ? value : `${value}Z`
  const timestamp = Date.parse(iso)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 19) === iso.slice(0, 19) ? iso : null
}

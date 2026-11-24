export function createLocalPreviews() {
  const urls = new Set()

  function release(src) {
    if (urls.delete(src)) URL.revokeObjectURL(src)
  }

  return {
    create(file) {
      const src = URL.createObjectURL(file)
      urls.add(src)
      return src
    },
    has: (src) => urls.has(src),
    release,
    retain(rows) {
      const inUse = new Set(rows.map(({ local }) => local?.src))
      for (const src of urls) if (!inUse.has(src)) release(src)
    },
    clear() {
      for (const src of urls) release(src)
    },
  }
}

export function markMediaSaved(draft) {
  if (!draft.multimedia.some(({ uploaded }) => uploaded)) return draft
  return { ...draft, multimedia: draft.multimedia.map((row) => {
    if (!row.uploaded) return row
    const { id, type, url, alt, order } = row
    return { id, type, url, alt, order }
  }) }
}

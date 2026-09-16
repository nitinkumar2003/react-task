export interface Item {
  id: string
  label: string
}

const ADJECTIVES = [
  'Sleek', 'Rustic', 'Vintage', 'Modern', 'Cozy', 'Bold',
  'Classic', 'Minimal', 'Elegant', 'Sturdy', 'Compact', 'Premium',
]

const NOUNS = [
  'Backpack', 'Lantern', 'Notebook', 'Sneakers', 'Headphones', 'Chair',
  'Mug', 'Jacket', 'Watch', 'Bicycle', 'Speaker', 'Desk',
]

// 12 * 12 = 144 deterministic items — enough for several pages, and every
// adjective/noun is a guaranteed-findable search term for demoing filtering.
const ALL_ITEMS: Item[] = ADJECTIVES.flatMap((adjective) =>
  NOUNS.map((noun) => ({ id: `${adjective}-${noun}`, label: `${adjective} ${noun}` })),
)

export const PAGE_SIZE = 20

export interface SearchPage {
  items: Item[]
  hasMore: boolean
}

/**
 * Stands in for a real `fetch('/api/items?q=...&page=...', { signal })`.
 * Filters the full catalog by `query`, returns one page of `PAGE_SIZE`
 * results, and honors the AbortSignal like a real fetch would (aborting
 * rejects the in-flight promise instead of letting it resolve).
 */
export function searchItems(
  query: string,
  page: number,
  signal: AbortSignal,
): Promise<SearchPage> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const latencyMs = 150 + Math.random() * 250

    const timeoutId = setTimeout(() => {
      const trimmed = query.trim().toLowerCase()
      const filtered = trimmed
        ? ALL_ITEMS.filter((item) => item.label.toLowerCase().includes(trimmed))
        : ALL_ITEMS

      const start = (page - 1) * PAGE_SIZE
      const items = filtered.slice(start, start + PAGE_SIZE)
      const hasMore = start + PAGE_SIZE < filtered.length

      resolve({ items, hasMore })
    }, latencyMs)

    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

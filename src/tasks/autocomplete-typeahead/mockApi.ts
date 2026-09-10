export interface SearchResult {
  id: string
  label: string
}

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Bangladesh', 'Belgium', 'Bhutan', 'Bolivia', 'Brazil',
  'Bulgaria', 'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Cuba', 'Denmark', 'Ecuador', 'Egypt',
  'Estonia', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana',
  'Greece', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon',
  'Libya', 'Lithuania', 'Malaysia', 'Maldives', 'Mexico', 'Mongolia',
  'Morocco', 'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria',
  'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Singapore',
  'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka',
  'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Uganda', 'Ukraine',
  'United Kingdom', 'United States', 'Uruguay', 'Vietnam', 'Yemen', 'Zimbabwe',
]

/**
 * Stands in for a real `fetch('/api/search?q=...', { signal })`. Simulates
 * network latency, and — critically — actually honors the AbortSignal the
 * same way a real fetch does: aborting rejects the in-flight promise instead
 * of letting it resolve.
 */
export function searchItems(
  query: string,
  signal: AbortSignal,
): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    const latencyMs = 200 + Math.random() * 300

    const timeoutId = setTimeout(() => {
      const matches = COUNTRIES.filter((name) =>
        name.toLowerCase().includes(query.toLowerCase()),
      )
      resolve(matches.map((name) => ({ id: name, label: name })))
    }, latencyMs)

    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

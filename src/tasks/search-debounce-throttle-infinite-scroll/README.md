# Search: Debounce + Throttle + Infinite Scroll

**Category:** Search & Async

## Requirements

Search component combining debounce (input) + throttle (scroll handler) + infinite scroll to progressively load results.

## Notes

- Debounces the text input (300ms) before searching; typing several characters fires one search, not one per keystroke.
- Throttles the scroll handler (200ms, leading + trailing edge) instead of debouncing it — scroll is continuous, so it needs periodic checks during the gesture, not just one after it stops.
- Infinite scroll triggers the next page a little before the user hits the literal bottom (80px threshold), via `scrollHeight - scrollTop - clientHeight`.
- A `loadingMoreRef` boolean guards against overlapping "load more" requests (back-pressure) — throttling limits how often the handler *runs*, not whether the previous fetch has *finished*.
- A `generationRef` counter discards stale responses (from either the initial search or a `loadMore()` page) if a newer search has started since — the same problem `AbortController` solves in the autocomplete task, applied to a request that isn't started from inside an effect.
- See `learning.ts` for full explanations of every hook/pattern used, in Q&A form.

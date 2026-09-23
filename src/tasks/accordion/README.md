# Accordion

**Category:** UI Primitives

## Requirements

Accordion component supporting single/multiple open panels, keyboard accessibility, and smooth expand/collapse.

## Notes

- `openIds: Set<string>` tracks which panels are open; a checkbox switches between single-open and multiple-open mode, resetting `openIds` on switch.
- Keyboard navigation follows the WAI-ARIA accordion pattern: ArrowUp/ArrowDown move focus between headers (wrapping at the ends via modulo), Home/End jump to the first/last header. Enter/Space toggle for free since headers are real `<button>` elements.
- Expand/collapse animates via the CSS `grid-template-rows: 0fr → 1fr` trick — no JS height measurement, no ResizeObserver. `.panelInner`'s padding transitions alongside it so the end of the animation doesn't snap; `prefers-reduced-motion: reduce` disables all of it.
- Arrow/Home/End keyboard navigation is bound on the header buttons. Panel content here is plain text with no focusable elements, so this is never exercised in practice — if a panel ever gained a focusable child (a link, a button), those keys wouldn't reach the accordion's handler while focus is inside it.
- See `learning.ts` for full explanations in Q&A form, including plain JS fundamentals (let/const, closures, arrow functions, ternary, modulo).

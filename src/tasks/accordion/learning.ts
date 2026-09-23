import type { LearningContent } from '../learning-types'

const content: LearningContent = {
  summary:
    'An accordion that supports two modes — only one panel open at a time, or several at once, switchable via ' +
    'a checkbox — full keyboard navigation following the WAI-ARIA accordion pattern (arrow keys, Home/End move ' +
    'focus between headers; Enter/Space toggle for free because headers are real <button> elements), and a ' +
    'smooth expand/collapse animation done in pure CSS (no measuring pixel heights in JS at all).',

  concepts: [
    'Set as the "which panels are open" data structure',
    'WAI-ARIA accordion keyboard pattern (ArrowUp/Down, Home, End)',
    'a ref array for imperative focus management across a list',
    'CSS grid-template-rows 0fr → 1fr trick for animating to an unknown height',
    'controlled checkbox input',
    'aria-expanded / aria-controls / role="region" wiring between header and panel',
    'let vs const, arrow functions, closures, template literals',
  ],

  codeSnippets: [
    {
      title: '1. A Set for "which panels are open" — one shape, two modes',
      code: `const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())

const toggle = (id: string) => {
  setOpenIds((prev) => {
    const isOpen = prev.has(id)
    if (allowMultiple) {
      const next = new Set(prev)
      if (isOpen) next.delete(id)
      else next.add(id)
      return next
    }
    return isOpen ? new Set() : new Set([id])   // single mode: at most one id, ever
  })
}`,
      explanation:
        'A Set answers "is this id a member?" in O(1) and has no duplicate-entry problem, which is exactly ' +
        'what "which panels are open" needs. Both modes share the same `openIds.has(id)` check on render — only ' +
        '`toggle` differs: multiple mode mutates a copy of the existing Set, single mode always replaces it with ' +
        'a brand-new Set containing at most the one id just clicked (or empty, if it was already open).',
    },
    {
      title: '2. A ref array for keyboard focus management',
      code: `const headerRefs = useRef<(HTMLButtonElement | null)[]>([])

const focusHeader = (index: number) => {
  const count = FAQ_ITEMS.length
  headerRefs.current[(index + count) % count]?.focus()   // wraps both directions
}

// on each header button:
ref={(el) => { headerRefs.current[index] = el }}`,
      explanation:
        'Moving focus between headers with ArrowUp/Down is imperative — "call .focus() on THAT specific DOM ' +
        'node" — which is what refs are for, not state. `headerRefs.current` is a plain array, one slot per ' +
        'header, filled in by each button\'s own ref callback. `(index + count) % count` wraps negative and ' +
        'overflowing indices back into range, so ArrowUp on the first header wraps to the last, and ArrowDown ' +
        'on the last wraps to the first, without an if/else for each edge.',
    },
    {
      title: '3. Expand/collapse with zero JavaScript height measurement',
      code: `.panel,
.panelOpen {
  display: grid;
  grid-template-rows: 0fr;         /* only .panelOpen overrides this, below */
  transition: grid-template-rows 200ms ease;
}
.panelOpen {
  grid-template-rows: 1fr;
}
.panelInner {
  overflow: hidden;   /* clips the row while it's animating between 0fr and 1fr */
}`,
      explanation:
        'The classic way to animate "height: auto" is to measure `scrollHeight` in JS and transition to that ' +
        'pixel value — it works, but needs a ResizeObserver to stay correct if the content changes size later. ' +
        'A CSS grid row sized in `fr` units can transition between `0fr` and `1fr` directly: the browser computes ' +
        'the actual pixel height every frame during the transition, so it is always correct for whatever content ' +
        'is inside, with no JS involved at all.',
    },
  ],

  interviewQuestions: [
    {
      question: 'Why is a Set used here instead of an array or a single string/id?',
      answer:
        'A single id (or null) can only represent single-open mode — it has nowhere to put a second open panel. ' +
        'An array could represent multiple open panels too, but checking "is this id open?" means `.includes()`, ' +
        'an O(n) scan, and preventing duplicate entries takes extra care. A `Set` gives O(1) membership checks ' +
        'via `.has()`, guarantees no duplicates by construction, and naturally represents "zero, one, or many ' +
        'open ids" — one data structure that fits both modes without a special case for single-open beyond how ' +
        '`toggle` constructs the next Set.',
    },
    {
      question: 'What is the WAI-ARIA accordion keyboard pattern, and why implement it by hand?',
      answer:
        'It is a documented convention for how keyboard users expect an accordion to behave. Unlike widgets such ' +
        'as tabs (which use a single "roving" tab stop), an accordion is NOT a roving-tabindex widget: every ' +
        'header keeps its own natural Tab stop, and Tab/Shift+Tab move through them one at a time like any other ' +
        'buttons on the page. What arrow keys add ON TOP of that is a faster way to jump directly between ' +
        'headers without tabbing through each one — ArrowUp/ArrowDown move focus to the previous/next header, ' +
        'and Home/End jump straight to the first/last. There is no native HTML element for "accordion", so none ' +
        'of this comes for free the way it does for a native `<select>` — it has to be built explicitly with ' +
        'refs and an `onKeyDown` handler.',
    },
    {
      question: 'Why do Enter and Space toggle the panel without any code for them?',
      answer:
        'The headers are real `<button type="button">` elements, and activating a focused button with Enter or ' +
        'Space — firing its `click` handler — is native browser behavior, not something React or this component ' +
        'adds. This is also a reason to insist on a real `<button>` here instead of a `<div onClick>`: a div ' +
        'gets none of this keyboard behavior for free and would need Enter/Space handled manually, plus ' +
        '`tabIndex` and a `role` just to become focusable at all.',
    },
    {
      question: 'What does aria-expanded / aria-controls / role="region" actually do for a screen reader user?',
      answer:
        '`aria-expanded="true|false"` on the header button lets a screen reader announce "expanded" or ' +
        '"collapsed" for that button, the same information a sighted user gets from the rotated chevron icon. ' +
        '`aria-controls` on the header pointing at the panel\'s id, together with `aria-labelledby` on the panel ' +
        'pointing back at the header, ties the two together so assistive tech understands "this button controls ' +
        'that content." `role="region"` on the panel marks it as a distinct, nameable landmark section rather ' +
        'than an anonymous div.',
    },
    {
      question: 'What is the difference between let, const, and var?',
      answer:
        '`var` is function-scoped (or global) and gets hoisted with an initial value of `undefined`, which lets ' +
        'it be read before its declaration line without an error — a common source of bugs. `let` and `const` ' +
        'are both BLOCK-scoped (confined to the nearest `{ }`) and live in a "temporal dead zone" from the top of ' +
        'their block until their declaration line — accessing them earlier throws a `ReferenceError` instead of ' +
        'silently giving `undefined`. The difference between `let` and `const` is just reassignment: `const` ' +
        'cannot be reassigned after declaration (`openIds = ...` would error), while `let` can. Note `const` ' +
        'does NOT make the VALUE immutable — `const next = new Set(prev)` still allows `next.add(id)`, because ' +
        'the Set object itself is being mutated, not the `next` binding being reassigned.',
    },
    {
      question: 'What is a closure, and where does one show up in this component?',
      answer:
        'A closure is a function that keeps access to variables from the scope it was created in, even after ' +
        'that outer scope has finished running. Every header\'s `onKeyDown={(e) => handleKeyDown(e, index)}` is a ' +
        'closure over that specific render\'s `index` value — when React re-renders with a new array of these ' +
        'inline functions, each one still "remembers" the exact index it was created with, which is what lets ' +
        '`focusHeader(index + 1)` know which header is "next" relative to the one that was actually pressed.',
    },
    {
      question: 'Arrow functions vs regular function declarations — what actually differs?',
      answer:
        'The most relevant difference for React code: an arrow function does not have its own `this` — it uses ' +
        '`this` from the enclosing scope (lexical `this`), whereas a regular `function` gets its own `this` ' +
        'determined by how it is CALLED. That is why event handlers in function components are almost always ' +
        'arrow functions or plain functions with no `this` usage at all — hooks-based components do not rely on ' +
        '`this` binding the way class components did. Arrow functions also cannot be used as constructors ' +
        '(`new Foo()`) and have no `arguments` object of their own.',
    },
    {
      question: 'What does the ternary operator do, and why use it instead of if/else here?',
      answer:
        '`condition ? valueIfTrue : valueIfFalse` is an EXPRESSION — it evaluates to a value — whereas `if/else` ' +
        'is a STATEMENT and cannot appear where a value is expected, like inside `className={...}` or a `return`. ' +
        '`className={isOpen ? styles.iconOpen : styles.icon}` needs a value to hand to `className`, so a ternary ' +
        'fits directly; writing it with `if/else` would need a separate variable declared beforehand just to ' +
        'hold the result.',
    },
    {
      question: 'What is the modulo operator doing in `(index + count) % count`?',
      answer:
        '`%` gives the remainder after division, which is the standard trick for "wrap a number back into a ' +
        'fixed range." `index + count` guarantees the value going into `%` is never negative for the inputs this ' +
        'code actually produces (JavaScript\'s `%` can return a negative result for a negative input, e.g. ' +
        '`-1 % 4` is `-1`, not `3`) — every call here only ever passes `index - 1` or `index + 1`, so adding one ' +
        '`count` is always enough to land back in range. It is not a general "any integer, however far out of ' +
        'range" fix — an index 2 steps out of bounds would need `2 * count` added first — but for "one step past ' +
        'either end," which is all ArrowUp/ArrowDown ever produce, it is exactly enough.',
    },
  ],
}

export default content

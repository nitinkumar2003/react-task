export interface Task {
  slug: string
  title: string
  category: string
  description: string
}

export const tasks: Task[] = [
  {
    slug: 'todo-app',
    title: 'Todo App',
    category: 'Foundations',
    description: 'Fully functional Todo App with filters (all/active/completed), bulk actions (select all, bulk complete, bulk delete), persistence (localStorage), and performance optimization using useMemo/useCallback to avoid unnecessary re-renders.',
  },
  {
    slug: 'counter',
    title: 'Counter',
    category: 'Foundations',
    description: 'Counter component covering edge cases: min/max bounds, step size, disabling buttons at limits, rapid-click handling, and reset.',
  },
  {
    slug: 'stopwatch-timer',
    title: 'Stopwatch / Timer',
    category: 'Foundations',
    description: 'Stopwatch/Timer with start, pause, resume, reset, lap tracking, and accurate elapsed time using refs + intervals (not naive setInterval drift).',
  },
  {
    slug: 'search-debounce-throttle-infinite-scroll',
    title: 'Search: Debounce + Throttle + Infinite Scroll',
    category: 'Search & Async',
    description: 'Search component combining debounce (input) + throttle (scroll handler) + infinite scroll to progressively load results.',
  },
  {
    slug: 'autocomplete-typeahead',
    title: 'Type-Ahead Autocomplete',
    category: 'Search & Async',
    description: 'Autocomplete/type-ahead search with debouncing, request cancellation (AbortController) for stale requests, full keyboard navigation (arrow keys, enter, escape), and result caching.',
  },
  {
    slug: 'accordion',
    title: 'Accordion',
    category: 'UI Primitives',
    description: 'Accordion component supporting single/multiple open panels, keyboard accessibility, and smooth expand/collapse.',
  },
  {
    slug: 'modal-basic',
    title: 'Modal',
    category: 'UI Primitives',
    description: 'Basic Modal component: open/close, backdrop click to dismiss, escape key to close.',
  },
  {
    slug: 'tabs',
    title: 'Tabs',
    category: 'UI Primitives',
    description: 'Tabs component with keyboard navigation (arrow keys) and controlled/uncontrolled active tab support.',
  },
  {
    slug: 'form-validation',
    title: 'Form Validation (No Library)',
    category: 'Forms',
    description: 'Form with validation built without any form library: field-level + form-level validation, error messages, touched/dirty state.',
  },
  {
    slug: 'form-crud-table',
    title: 'Form CRUD + Table',
    category: 'Forms',
    description: 'Simple form-driven CRUD app that displays data in a table: create, edit, delete rows via a form.',
  },
  {
    slug: 'login-form',
    title: 'Login Form',
    category: 'Forms',
    description: 'Login form with proper structure, validation, and state management (loading/error/success states).',
  },
  {
    slug: 'form-engine',
    title: 'JSON Schema Form Engine',
    category: 'Forms',
    description: 'Form Engine that, given a JSON schema, auto-renders fields, validations, error messages, and nested forms.',
  },
  {
    slug: 'drag-and-drop',
    title: 'Drag & Drop UI',
    category: 'Interaction',
    description: 'Drag & Drop UI (e.g. reorderable list or Kanban-style columns) using native HTML5 DnD or pointer events.',
  },
  {
    slug: 'file-explorer',
    title: 'File Explorer',
    category: 'Interaction',
    description: 'File Explorer with nested tree structure: recursion for rendering, expand/collapse state, and performance considerations for deep trees.',
  },
  {
    slug: 'data-table',
    title: 'Reusable Data Table',
    category: 'Tables & Pagination',
    description: 'Reusable Table component with sorting, server-side pagination, row selection, and virtualization for large datasets.',
  },
  {
    slug: 'pagination',
    title: 'Pagination',
    category: 'Tables & Pagination',
    description: 'Standalone, reusable Pagination component (page numbers, prev/next, ellipsis for large ranges).',
  },
  {
    slug: 'toast-notification-system',
    title: 'Toast / Notification System',
    category: 'Systems',
    description: 'Toast/Notification system with variants (success/error/info/warning), a global queue, auto-dismiss timers, animations, stacking behavior, custom positioning, and programmatic dismissal via refs — optimized to avoid re-rendering the whole app.',
  },
  {
    slug: 'modal-system',
    title: 'Modal System',
    category: 'Systems',
    description: 'Reusable Modal system using portals, focus trapping, scroll locking, and keyboard handling (escape, tab-cycling).',
  },
  {
    slug: 'api-polling-auto-refresh',
    title: 'API Polling + Auto Refresh',
    category: 'Systems',
    description: 'API polling / auto-refresh with exponential backoff delay and cancellation when the browser tab is inactive (Page Visibility API).',
  },
  {
    slug: 'realtime-chat',
    title: 'Real-time Chat UI',
    category: 'Systems',
    description: 'Real-time chat UI with WebSockets: optimistic updates, message retries on failure, and offline fallback/queueing.',
  },
  {
    slug: 'otp-input',
    title: 'OTP Input',
    category: 'Inputs',
    description: 'OTP input with auto-focus to next box, paste support (splitting pasted code across boxes), and backspace handling.',
  },
  {
    slug: 'star-rating',
    title: 'Star Rating',
    category: 'Inputs',
    description: 'Star Rating component with half-star support and hover preview.',
  },
  {
    slug: 'react-select-clone',
    title: 'React-Select Clone',
    category: 'Inputs',
    description: 'Reusable dropdown/select component supporting search/filter and multi-select, similar to react-select.',
  },
  {
    slug: 'progress-bar',
    title: 'Progress Bar',
    category: 'Inputs',
    description: 'Progress Bar component (determinate + indeterminate states).',
  },
  {
    slug: 'crud-favorites-store',
    title: 'Fetch + CRUD with Favorites',
    category: 'Data & CRUD',
    description: 'Fetch and render one-to-many relational data. Build a fetch + basic CRUD app with a \'mark as favorite\' feature backed by localStorage and a store (Zustand/Redux).',
  },
  {
    slug: 'product-search-filter-pagination',
    title: 'Product Search + Filter + Pagination',
    category: 'Data & CRUD',
    description: 'Fetch data from a mock API on load; debounced search input without useEffect mistakes; filter results by category; paginate 10 per page; handle loading/error states cleanly using only React (no third-party state libraries).',
  },
  {
    slug: 'infinite-scroll-feed',
    title: 'Infinite Scroll Feed',
    category: 'Lists & Feeds',
    description: 'Infinite-scroll component/product listing/feed handling data fetching and error handling, using an efficient IntersectionObserver and back-pressure handling (avoid firing duplicate/overlapping requests).',
  },
  {
    slug: 'restaurant-list',
    title: 'Restaurant List',
    category: 'Lists & Feeds',
    description: 'List of restaurants with filtering and sorting capabilities (e.g. by cuisine, rating, price).',
  },
  {
    slug: 'cart-system',
    title: 'Cart System',
    category: 'Lists & Feeds',
    description: 'Shopping cart system with real-time price updates as quantities/items change.',
  },
  {
    slug: 'flatten-nested-categories',
    title: 'Flatten Nested Categories',
    category: 'Algorithms',
    description: 'Convert a nested category list into a flattened structure (recursion + data transformation), rendered/demoed in a small component.',
  },
]

export const categories = Array.from(new Set(tasks.map((t) => t.category)))

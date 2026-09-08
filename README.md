# React Machine Coding Practice

Interview-prep workspace: React machine-coding builds + JS/DSA (LeetCode) practice.

## React tasks (`src/tasks`)

A Vite + React + TypeScript app. Home page (`/`) lists every task grouped by
category; each links to `/tasks/<slug>`. Every task is its own folder:

```
src/tasks/<slug>/
  index.tsx          # implement the task here
  index.module.css
  README.md          # requirements for that task
```

Task list lives in [src/tasks/registry.ts](src/tasks/registry.ts) — routing and
the home page are both generated from it, so adding a new task only means
adding an entry there plus a matching folder.

```bash
npm install
npm run dev      # start the app
npm run build    # type-check + production build
npm run lint      # oxlint
```

## Interview prep (`interview-prep/`)

Plain JS/TS practice, independent of the React app — JavaScript concepts and
LeetCode-style problems by topic. See [interview-prep/README.md](interview-prep/README.md).

```bash
npx tsx interview-prep/leetcode/arrays-strings/two-sum.ts
```

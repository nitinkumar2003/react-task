# Interview Prep

Separate from the React app (`src/tasks`) — this is for plain JavaScript/TypeScript
practice: core JS concepts and LeetCode-style DSA problems.

## Structure

- `javascript-concepts/` — one file per topic (closures, `this`, prototypes,
  event loop, promises, currying, polyfills like debounce/throttle/`Promise.all`, etc.)
- `leetcode/` — one file per problem, organized by topic folder
  (`arrays-strings`, `linked-list`, `trees-graphs`, `stacks-queues`, `dp`,
  `two-pointers-sliding-window`, `misc`)

## Convention for each problem file

```ts
/**
 * Problem: <name / link>
 * <short statement>
 *
 * Time:  O(?)
 * Space: O(?)
 */
function solve() {
  // implementation
}
```

Run any file directly with:

```bash
npx tsx interview-prep/leetcode/arrays-strings/two-sum.ts
```

(`tsx` runs TypeScript files without a build step — installed as a dev dependency.)

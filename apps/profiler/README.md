# apps/profiler — Welldot

Nuxt 4 web application for geological well log visualization, deployed at [welldot.org](https://welldot.org).

## Setup

```bash
pnpm install
pnpm dev        # localhost:3000
pnpm build      # production build
pnpm preview    # Cloudflare Workers preview via wrangler
pnpm lint
```

---

## Color System

Two mirrored scales handle all neutral colors. **`surface`** is for backgrounds; **`content`** is for text, borders, and icons. They flip between light and dark mode automatically — no `dark:` variants needed for neutrals.

| Token         | Light     | Dark      |
| ------------- | --------- | --------- |
| `surface-0`   | `#ffffff` | `#0d1218` |
| `surface-100` | `#eef0f3` | `#1a2230` |
| `surface-200` | `#d8dde3` | `#2a3344` |
| `content-0`   | `#0d1218` | `#ffffff` |
| `content-300` | `#3d4a60` | `#b9c0c8` |
| `content-600` | `#b9c0c8` | `#3d4a60` |

### Pairing rule

`surface-N` and `content-N` at the **same index** always contrast — the scales are inverses. A large index gap breaks contrast in one of the modes:

```
surface-100 + text-content-100  ✓  (guaranteed contrast in both modes)
surface-100 + text-content-900  ✗  (dark mode: near-black on near-black)
```

### Scale guidance

- **`surface 0–200`** — normal UI range. Higher values signal a deliberate inversion (inverted sidebar, dark hero); use sparingly.
- **`content 0`** — primary text. Higher values reduce emphasis: `100–200` secondary, `300` muted/placeholder, `600–700` subtle borders. `800+` is almost always wrong.
- **`primary`** — CTAs, active states, focus rings, interactive highlights.
- **`error / warning / success / info`** — state communication. Use `500` for text, `50–100` for bg tints, `700–800` for text on a light tint bg.

### Available Tailwind utilities

Scales are bridged from PrimeVue CSS vars by `@welldot/vue/tailwind.css` (imported in `app/assets/styles/main.css`):

```
bg-surface-{0|50|100|200|300|400|500|600|700|800|900|950}   text-surface-*  border-surface-*
bg-content-{0|50|100|200|300|400|500|600|700|800|900|950}   text-content-*  border-content-*
bg-primary-{50–950}   text-primary-*   ring-primary-*
bg-error-{50–950}     text-error-*
bg-warning-{50–950}   text-warning-*
bg-success-{50–950}   text-success-*
bg-info-{50–950}      text-info-*
```

Never use Tailwind grays, `bg-white`, or hardcoded hex — they bypass the token system and break dark mode.

For third-party libraries that require explicit values, read the resolved CSS var at runtime:

```js
getComputedStyle(document.documentElement)
  .getPropertyValue('--w-primary-500')
  .trim();
```

---

## PrimeVue components

Always prefer a PrimeVue component over a hand-rolled one. Customise in order — stop at the first layer that solves the problem:

| Layer                   | Where                                                                    | When                                                       |
| ----------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **API** — props & slots | `primevue.org/<component>`                                               | Behaviour or content changes                               |
| **Theme**               | `WelldotPreset` in `packages/vue/src/theme/preset.ts` → `components` key | Global visual change (all instances)                       |
| **Pass-through**        | `welldotPt` in `packages/vue/src/theme/pt.ts`                            | One-off Tailwind class or HTML attr on an internal element |
| **Custom component**    | New file                                                                 | Last resort — all three layers above exhausted             |

Use `severity` props (`"primary"`, `"success"`, `"warn"`, `"danger"`, `"info"`) instead of manual color classes — the theme maps them to the semantic scales automatically. Never target PrimeVue internal class names in scoped CSS; they're not stable across minor versions.

### Anti-patterns

| Wrong                                         | Right                               |
| --------------------------------------------- | ----------------------------------- |
| `text-gray-600` / `bg-white dark:bg-zinc-900` | `text-content-300` / `bg-surface-0` |
| Hardcoded `#hex`                              | Semantic token                      |
| `text-blue-600` for a CTA                     | `text-primary-600`                  |
| `bg-surface-100 text-content-900`             | `bg-surface-100 text-content-100`   |
| `bg-surface-700` in a normal card             | `bg-surface-50`                     |
| Scoped CSS targeting PrimeVue internals       | Pass-through in `welldotPt`         |

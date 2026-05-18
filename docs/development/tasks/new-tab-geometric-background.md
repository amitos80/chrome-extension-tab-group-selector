# Tasks: Animated geometric background (new tab)

| Task ID | Priority | Est. | Dependencies |
|---------|----------|------|--------------|
| BG-1 | P0 | 15m | — |
| BG-2 | P0 | 30m | BG-1 |
| BG-3 | P0 | 45m | BG-2 |
| BG-4 | P0 | 30m | BG-3 |
| BG-5 | P1 | 20m | BG-4 |

## BG-1 — Extract shape helpers

1. Add [`pages/new-tab/src/shape-types.ts`](pages/new-tab/src/shape-types.ts) exporting `shapeTypes`, `ANIMATION_KEYS`, and `pickEightRandomShapes()` (Fisher–Yates + `slice(0, 8)`).

**Done when:** Types compile; no duplicates in returned array.

## BG-2 — `AnimatedGeometricBackground`

1. Create [`pages/new-tab/src/AnimatedGeometricBackground.tsx`](pages/new-tab/src/AnimatedGeometricBackground.tsx).
2. Render `.particles` with 100 `.particle` nodes; inline `sparkle` timing (`delay` 0–8s, `duration` `random * 4 + 4`s).
3. Render `.geometric-background` with eight `.shape` nodes; random `%` position; per-shape `delay` 0–10s, `duration` `random * 10 + 10`s; map animation to timing (`linear` rotate/slide; `alternate` pulse; `ease-in-out` float).
4. Render `.gradient-overlay`.

**Done when:** DOM matches intended z-order; no React state on mousemove.

## BG-3 — Mouse + cleanup

1. `useEffect`: `window.addEventListener('mousemove', …)`; multiply `(cursorNorm - 0.5) * 0.05` into stored `%` positions; write to shape refs.
2. Remove listener on unmount.

**Done when:** Subtle drift; no leaks.

## BG-4 — Wire `NewTabSwitcherExperience`

1. Outer `fixed inset-0 overflow-hidden min-h-screen` with dark base `#1a1a2e`.
2. Mount `AnimatedGeometricBackground` behind switcher; drop commented vanilla block.

**Done when:** Switcher clickable; background fills viewport.

## BG-5 — SCSS / QA

1. Confirm keyframes names align with inline `animationName`.
2. Optional: `@media (prefers-reduced-motion: reduce)` disables motion.

**Done when:** Manual check in Chrome new tab: eight shapes, particles, overlay, performance acceptable.

### Completion checklist

- [ ] Eight distinct shapes per document load; reload gives new set.
- [ ] Particles + vignette visible; overlay modal above background.
- [ ] Mouse movement biases positions slightly.
- [ ] No console errors; listener removed on unmount.

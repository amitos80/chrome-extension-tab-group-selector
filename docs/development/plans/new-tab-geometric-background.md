# Development plan: Animated geometric background (React) on new tab

## Objective

Replace ad-hoc markup with a dedicated React background layer that mirrors [CodePen yyLoZRb](https://codepen.io/bogdansandu/pen/yyLoZRb): eight distinct random shapes per load, ~100 sparkle particles, gradient vignette overlay, and subtle mouse-driven position drift—while keeping the tab-group switcher fully interactive above the scene.

## Technical approach

- **Shapes:** Fisher–Yates sample of eight distinct CSS shape classes from `shape-types.ts`; each shape receives inline `animation*` matching one of `rotate` | `pulse` | `float` | `slide` (SCSS keyframes already defined; many classes omit default `animation`, so React assigns it explicitly).
- **Mouse:** Ref-backed base `%` positions updated on `mousemove` by mutating `style.left` / `style.top` (avoids per-frame React state).
- **Layout:** Full-viewport fixed root (`#1a1a2e`), background subtree at low z-index; switcher overlay remains at `z-index: 2147483647`.

## Risks

- React Strict Mode double-mount in development may reshuffle shapes twice (acceptable).
- Heavy CSS shapes on low-end GPUs; optional follow-up to reduce particle count or respect `prefers-reduced-motion`.

## Reference

- CodePen: https://codepen.io/bogdansandu/pen/yyLoZRb

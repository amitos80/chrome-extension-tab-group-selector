# Development plan: Theme support (popup, new-tab background, tab-group selector)

## Objective

Align extension surfaces with `exampleThemeStorage`: **dark** keeps current visuals; **light** uses light surfaces and typography while geometric **shape artwork** (SCSS fills) stays unchanged—only the ambient layer (vignette, particles, page chrome) adapts.

## Technical approach

- **Storage:** [`packages/storage/lib/impl/example-theme-storage.ts`](../../../packages/storage/lib/impl/example-theme-storage.ts) via `useStorage(exampleThemeStorage)` (`isLight`).
- **AnimatedGeometricBackground:** `isLight` prop + `data-theme` on root; [`NewTab.scss`](../../../pages/new-tab/src/NewTab.scss) overrides `.gradient-overlay` and `.particle` under `[data-theme='light']`.
- **Popup:** Conditional Tailwind tokens mirroring [`pages/options/src/Options.tsx`](../../../pages/options/src/Options.tsx); remove forced `!text-white` on theme toggle in light mode.
- **SwitcherOverlay:** Add required `isLight` prop; duplicate implementations in [`pages/new-tab/src/components/SwitcherOverlay.tsx`](../../../pages/new-tab/src/components/SwitcherOverlay.tsx) and [`pages/content-ui/src/components/SwitcherOverlay.tsx`](../../../pages/content-ui/src/components/SwitcherOverlay.tsx) stay layout-distinct but **theme tokens identical**.
- **Content UI:** Wrap root in `<Suspense>` (storage hook may suspend); [`App.tsx`](../../../pages/content-ui/src/matches/all/App.tsx) reads theme and passes `isLight`; backdrop scrim lightens in light mode.

## Risks

- Duplicate `SwitcherOverlay` files may drift—QA both surfaces.
- Contrast on light selected rows / blue accents needs spot-check.

## Success metrics

- Toggle theme in popup: popup updates immediately; new tab + shortcut overlay follow via live storage.
- Dark mode visually unchanged aside from negligible token alignment.
- Light mode: WCAG-oriented text/background contrast; shapes unchanged.

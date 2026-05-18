# Tasks: Theme support (popup, new-tab, tab-group selector)

| ID | Priority | Est. | Depends |
|----|----------|------|---------|
| T1 | P0 | 20m | — |
| T2 | P0 | 25m | T1 |
| T3 | P0 | 35m | T1 |
| T4 | P0 | 40m | T2,T3 |
| T5 | P1 | 15m | T4 |

## T1 — Documentation

1. Add plan + this tasks file under `docs/development/`.

**Done when:** Links and scope match implementation.

## T2 — Geometric background

1. Add `isLight` to [`AnimatedGeometricBackground.tsx`](../../../pages/new-tab/src/AnimatedGeometricBackground.tsx); set `data-theme` on root.
2. Extend [`NewTab.scss`](../../../pages/new-tab/src/NewTab.scss) with light vignette + particle colour under `[data-theme='light']`.
3. Pass `isLight` from [`NewTab.tsx`](../../../pages/new-tab/src/NewTab.tsx); optionally soften outer light backdrop to match (`slate`/sky).

**Done when:** Light new-tab shows light wash + visible particles; shapes unchanged.

## T3 — Popup

1. `useStorage(exampleThemeStorage)` in [`Popup.tsx`](../../../pages/popup/src/Popup.tsx).
2. Replace hardcoded dark classes with `cn(..., isLight ? … : …)` for shells, text, borders, switch ring-offset.
3. Theme-aware `ToggleButton` wrapper classes (no `!text-white` in light).

**Done when:** Popup readable in both themes.

## T4 — SwitcherOverlay (×2) + content-ui shell

1. Add `isLight` to props; apply theme variants (panel, input, rows, footer).
2. [`NewTab.tsx`](../../../pages/new-tab/src/NewTab.tsx): pass `isLight`.
3. [`content-ui/.../App.tsx`](../../../pages/content-ui/src/matches/all/App.tsx): `useStorage`, themed backdrop, pass `isLight`.
4. [`content-ui/.../index.tsx`](../../../pages/content-ui/src/matches/all/index.tsx): wrap app in `<Suspense fallback={null}>`.

**Done when:** Both overlay entry points match theme.

## T5 — QA

- [ ] Popup: toggle theme, all sections contrast OK.
- [ ] New tab: light/dark background + switcher.
- [ ] Page shortcut overlay: light/dark scrim + panel.
- [ ] Keyboard focus rings visible both themes.

# Implementation summary: New tab search focus

## What changed

| Item | Detail |
|------|--------|
| New-tab overlay | [`pages/new-tab/src/components/SwitcherOverlay.tsx`](../../../pages/new-tab/src/components/SwitcherOverlay.tsx): `focusSearchInput()` (double `requestAnimationFrame` + `focus({ preventScroll: true })`), `autoFocus` with documented eslint exception for `jsx-a11y/no-autofocus` |
| Content-ui overlay | Same pattern in [`pages/content-ui/src/components/SwitcherOverlay.tsx`](../../../pages/content-ui/src/components/SwitcherOverlay.tsx) |

## Manual QA checklist

- [ ] Preference **Show Tab Group Selector on new tab** ON → **Cmd/Ctrl+T**: caret appears in search without clicking; typed text filters the list.
- [ ] Close overlay (if applicable) → open via keyboard shortcut: search focuses again on show.
- [ ] No new console errors on new-tab load.

## Automated verification

- `pnpm run build` succeeded (run locally after changes).
- ESLint clean on touched overlay files.

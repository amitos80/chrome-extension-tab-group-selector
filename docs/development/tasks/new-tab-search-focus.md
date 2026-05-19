# Tasks: New tab search focus

| ID | Priority | Est. |
|----|----------|------|
| N1 | P0 | 15m |
| N2 | P0 | 20m |
| N3 | P0 | 15m |
| N4 | P1 | 15m |

## N1 — Docs

Add [plan](../plans/new-tab-search-focus.md) and this file.

## N2 — New-tab `SwitcherOverlay`

[`pages/new-tab/src/components/SwitcherOverlay.tsx`](../../../pages/new-tab/src/components/SwitcherOverlay.tsx):

1. Add module helper `focusSearchInput(ref)` using double `requestAnimationFrame` + `focus({ preventScroll: true })`.
2. Call it from `useEffect` on mount (keep empty deps).
3. Set `autoFocus` on the search `<input>`.

## N3 — Content-ui parity

Repeat N2 in [`pages/content-ui/src/components/SwitcherOverlay.tsx`](../../../pages/content-ui/src/components/SwitcherOverlay.tsx).

## N4 — QA + summary

1. Manual: Cmd/Ctrl+T with custom NTP; type without clicking; close overlay + reopen via shortcut.
2. [`docs/development/summaries/new-tab-search-focus.md`](../summaries/new-tab-search-focus.md): changes + checklist.

### Completion checklist

- [ ] `pnpm run build`
- [ ] ESLint on touched TSX files
- [ ] Manual QA steps recorded

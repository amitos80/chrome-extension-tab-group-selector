# Development plan: Search input focus on new tab

## Objective

When the user opens the **custom new-tab page** with the Tab Group Selector enabled, the switcher **search field** should receive **keyboard focus** so typing filters groups without an extra click.

## Current situation

[`pages/new-tab/src/components/SwitcherOverlay.tsx`](../../../pages/new-tab/src/components/SwitcherOverlay.tsx) calls `searchInputRef.current?.focus()` once on mount. Chrome sometimes ignores synchronous focus on extension override new-tabs.

## Approach

- Add **`autoFocus`** on the search `<input>`.
- Replace one-shot focus with **deferred focus**: **`requestAnimationFrame` × 2** then **`focus({ preventScroll: true })`** to run after layout/tab activation.
- Apply the **same** pattern to [`pages/content-ui/src/components/SwitcherOverlay.tsx`](../../../pages/content-ui/src/components/SwitcherOverlay.tsx) for shortcut-opened overlay parity.

## Out of scope

Native Chrome NTP when “Show Tab Group Selector on new tab” is off.

## Success criteria

- New tab (preference on): caret in search; typing filters immediately.
- Overlay remount (e.g. after hide + `TOGGLE_SWITCHER`): search focuses again.
- Build and ESLint clean.

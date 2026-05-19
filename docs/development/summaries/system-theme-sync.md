# Implementation summary: System theme sync

## Done

| Area | Notes |
|------|--------|
| Storage | `followSystemTheme` on [`ThemeStateType`](../../../packages/storage/lib/base/types.ts); [`setFollowSystemTheme`](../../../packages/storage/lib/impl/example-theme-storage.ts); `toggle` no-op while following system; `normalizeThemeState` on writes |
| Hook | [`useEffectiveTheme`](../../../packages/shared/lib/hooks/use-effective-theme.tsx): `matchMedia('(prefers-color-scheme: dark)')` + `useStorage` |
| UI | Appearance switch + effective theme in [Popup](../../../pages/popup/src/Popup.tsx) / [Options](../../../pages/options/src/Options.tsx); [`ToggleButton`](../../../packages/ui/lib/components/ToggleButton.tsx) disabled when following system |
| Surfaces | [New tab](../../../pages/new-tab/src/NewTab.tsx), [content-ui App](../../../pages/content-ui/src/matches/all/App.tsx), [side panel](../../../pages/side-panel/src/SidePanel.tsx), [devtools panel](../../../pages/devtools-panel/src/Panel.tsx) use effective `isLight` |

## Manual QA

1. With **Use system theme** off: manual toggle flips all surfaces; storage updates `theme` / `isLight`.
2. With **Use system theme** on: toggle disabled; change OS light/dark — popup/options/new-tab/overlay update live without extra storage writes for theme flip.
3. Old profile (no `followSystemTheme` key): behaves as off until user enables switch.

## Files touched

See git diff; docs under [`docs/development/plans/system-theme-sync.md`](../plans/system-theme-sync.md) and [`docs/development/tasks/system-theme-sync.md`](system-theme-sync.md).

# Development plan: Auto theme sync with OS light/dark

## Objective

Let users opt into **following the OS / browser color scheme** (`prefers-color-scheme`). While enabled, all extension UI uses effective light/dark from `matchMedia`; the manual **Toggle theme** control is disabled. When disabled, behavior matches the previous manual-only theme.

## Technical approach

- **Storage:** Extend [`ThemeStateType`](../../../packages/storage/lib/base/types.ts) with `followSystemTheme: boolean` (default `false`). Extend [`exampleThemeStorage`](../../../packages/storage/lib/impl/example-theme-storage.ts) with `setFollowSystemTheme(enabled)`. Guard `toggle()` when `followSystemTheme` is true. Normalize partial persisted objects when updating so upgrades without the field behave as `false`.
- **Derivation:** Add [`useEffectiveTheme`](../../../packages/shared/lib/hooks/use-effective-theme.tsx) in `@extension/shared`: `useStorage(exampleThemeStorage)` + `matchMedia('(prefers-color-scheme: dark)')` listener; effective `isLight = followSystemTheme ? !prefersDark : stored.isLight`. No background involvement (service worker has no `window`).
- **UI:** [Popup](../../../pages/popup/src/Popup.tsx) and [Options](../../../pages/options/src/Options.tsx): appearance section with switch bound to `setFollowSystemTheme`; [`ToggleButton`](../../../packages/ui/lib/components/ToggleButton.tsx) uses effective `isLight` and is disabled while following system. [NewTab](../../../pages/new-tab/src/NewTab.tsx) and [content-ui App](../../../pages/content-ui/src/matches/all/App.tsx) use effective `isLight` for layout and overlays.
- **i18n:** New keys in [`en/messages.json`](../../../packages/i18n/locales/en/messages.json) for section label and switch copy.

## Risks

- Content-script `matchMedia` follows normal browser behavior for the tab; acceptable for this feature.

## Success metrics

- Manual-only path unchanged when follow-system is off.
- OS theme changes update open popup/options/new-tab/content overlay without writing theme to storage on each change.
- Manual toggle disabled and non-functional while follow-system is on.

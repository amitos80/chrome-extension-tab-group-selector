# Tasks: System theme sync

| ID | Priority | Est. |
|----|----------|------|
| T1 | P0 | 15m |
| T2 | P0 | 25m |
| T3 | P0 | 20m |
| T4 | P0 | 35m |
| T5 | P1 | 15m |
| T6 | P1 | 15m |

## T1 — Docs

Add [plan](../plans/system-theme-sync.md) and this task file.

## T2 — Storage + types

1. [`packages/storage/lib/base/types.ts`](../../../packages/storage/lib/base/types.ts): add `followSystemTheme: boolean` to `ThemeStateType`; add `setFollowSystemTheme` to `ThemeStorageType`.
2. [`packages/storage/lib/impl/example-theme-storage.ts`](../../../packages/storage/lib/impl/example-theme-storage.ts): default `followSystemTheme: false`; implement `normalize()` for partial reads; `toggle` no-op when following system; implement `setFollowSystemTheme`.

## T3 — Hook

1. [`packages/shared/lib/hooks/use-effective-theme.tsx`](../../../packages/shared/lib/hooks/use-effective-theme.tsx): `useStorage` + `prefers-color-scheme` listener; return effective `isLight`, stored fields, `toggle`, `setFollowSystemTheme`.
2. Export from [`packages/shared/lib/hooks/index.ts`](../../../packages/shared/lib/hooks/index.ts).
3. Add `@extension/storage` to **`dependencies`** (not only devDependencies) in [`packages/shared/package.json`](../../../packages/shared/package.json).

## T4 — Popup + Options + ToggleButton

1. [`ToggleButton.tsx`](../../../packages/ui/lib/components/ToggleButton.tsx): use `useEffectiveTheme()` for visual `isLight`; merge `disabled` with `followSystemTheme`; optional disabled styling.
2. [`Popup.tsx`](../../../pages/popup/src/Popup.tsx): `useEffectiveTheme()` for all `isLight` styling; new “Appearance” section with system-theme switch; pass nothing extra if ToggleButton handles disable internally.
3. [`Options.tsx`](../../../pages/options/src/Options.tsx): mirror Popup appearance controls.

## T5 — New tab + content UI

Replace `useStorage(exampleThemeStorage)` `isLight` with `useEffectiveTheme().isLight` in [`NewTab.tsx`](../../../pages/new-tab/src/NewTab.tsx) and [`App.tsx`](../../../pages/content-ui/src/matches/all/App.tsx).

## T6 — i18n + QA

1. [`packages/i18n/locales/en/messages.json`](../../../packages/i18n/locales/en/messages.json): section label + switch label + description.
2. Manual QA: follow-system off → toggle works; follow-system on → toggle disabled, UI tracks OS; reopen popup after OS change; content overlay + new tab match.

### Completion checklist

- [ ] `pnpm run build` succeeds
- [ ] ESLint clean on touched files
- [ ] Manual QA matrix completed

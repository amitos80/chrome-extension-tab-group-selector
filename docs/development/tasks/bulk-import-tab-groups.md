# Tasks: Bulk import tab groups

| ID | Priority | Est. |
|----|----------|------|
| B1 | P0 | 15m |
| B2 | P0 | 25m |
| B3 | P0 | 30m |
| B4 | P0 | 35m |
| B5 | P1 | 30m |
| B6 | P1 | 20m |

## B1 — Docs

Add plan + this file under `docs/development/`.

## B2 — Storage

1. Add [`bulk-import-ui-storage.ts`](../../../packages/storage/lib/impl/bulk-import-ui-storage.ts); export from [`impl/index.ts`](../../../packages/storage/lib/impl/index.ts).
2. Persist `initialBulkImportCompleted` only after bulk import and successful `TOGGLE_SWITCHER` on the active tab—not from registry row count (startup sync would hide the CTA otherwise).

## B3 — Background import + toggle helper

1. Extract `sendToggleSwitcherToActiveTab` (optional `staggerImportReveal`).
2. `IMPORT_ALL_TAB_GROUPS_AND_OPEN_SWITCHER`: upsert all groups, send toggle with stagger, set flag only if toggle succeeds; `sendResponse` result.

## B4 — Popup

[`Popup.tsx`](../../../pages/popup/src/Popup.tsx): `useStorage`, conditional section, loading/error, `window.close()` when import finishes and switcher opens (stay open with inline error if toggle fails); i18n keys in [`messages.json`](../../../packages/i18n/locales/en/messages.json).

## B5 — Switcher stagger

[`tailwind.config.ts`](../../../packages/tailwindcss-config/tailwind.config.ts): `switcherRowImport` keyframes + animation utility.

Both [`SwitcherOverlay.tsx`](../../../pages/new-tab/src/components/SwitcherOverlay.tsx) copies: prop `staggerImportReveal`, row classes + capped delay.

[`NewTab.tsx`](../../../pages/new-tab/src/NewTab.tsx) + [`content-ui/App.tsx`](../../../pages/content-ui/src/matches/all/App.tsx): read `message.staggerImportReveal`, reset on close.

## B6 — QA

- Fresh profile: full flow.
- `chrome://` active tab: import ok, optional notification if toggle fails.
- Many groups: delays capped.
- Repeat background message: idempotent `skipped`.

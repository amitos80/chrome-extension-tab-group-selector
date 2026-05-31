# Implementation summary: Cross-device sync toggle

**Plan:** [`docs/development/plans/cross-device-sync-toggle.md`](../plans/cross-device-sync-toggle.md) · **Tasks:** [`docs/development/tasks/cross-device-sync-toggle.md`](../tasks/cross-device-sync-toggle.md)

## What was implemented

| Area | Detail |
|------|--------|
| Preference | [`cross-device-sync-preference-storage.ts`](../../packages/storage/lib/impl/cross-device-sync-preference-storage.ts) — **`crossDeviceTabGroupsSyncEnabled`** default **`false`**, key **`cross-device-sync-preference-v1`**. |
| Background gate | [`cross-device-sync-allowed.ts`](../../chrome-extension/src/background/cross-device-sync-allowed.ts) — **`resolveCrossDeviceSyncAllowed()`** (Premium + toggle). |
| Sync service | [`cross-device-sync.ts`](../../chrome-extension/src/background/cross-device-sync.ts) — all push/pull paths gated; preference **`onChanged`** triggers cold pull + push on enable; disable clears debouncer only (no cloud remove). |
| Options UI | [`CrossDeviceSyncSection.tsx`](../../pages/options/src/components/CrossDeviceSyncSection.tsx) — toggle, beta notice, Premium lock. |
| i18n | EN + KO keys: **`optionCrossDeviceSync*`** |

## Product rules

- **Default:** sync **off** until user enables in Options.
- **Requires:** Premium **and** toggle on.
- **Beta:** amber notice in Options; feature may be incomplete.
- **Disable:** stops local sync activity; **`synced_workspaces`** left in cloud for re-enable.

## Files touched (primary)

- [`packages/storage/lib/impl/cross-device-sync-preference-storage.ts`](../../packages/storage/lib/impl/cross-device-sync-preference-storage.ts)
- [`packages/storage/lib/impl/index.ts`](../../packages/storage/lib/impl/index.ts)
- [`chrome-extension/src/background/cross-device-sync-allowed.ts`](../../chrome-extension/src/background/cross-device-sync-allowed.ts)
- [`chrome-extension/src/background/cross-device-sync.ts`](../../chrome-extension/src/background/cross-device-sync.ts)
- [`pages/options/src/components/CrossDeviceSyncSection.tsx`](../../pages/options/src/components/CrossDeviceSyncSection.tsx)
- [`pages/options/src/Options.tsx`](../../pages/options/src/Options.tsx)
- [`packages/i18n/locales/en/messages.json`](../../packages/i18n/locales/en/messages.json)
- [`packages/i18n/locales/ko/messages.json`](../../packages/i18n/locales/ko/messages.json)
- [`README.md`](../../README.md)
- [`docs/development/specs/cross-device-sync.md`](../specs/cross-device-sync.md)

## Known limitations

- Toggle is Options-only (no popup control in v1).
- Upgraded installs also default off — users must opt in once.
- Manual dual-profile QA recommended (CDT5).

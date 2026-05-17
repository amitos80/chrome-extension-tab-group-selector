# Implementation summary: Tab group switcher — open vs closed dedupe

## Tasks completed

Aligned with [plans/tab-group-switcher-dedupe.md](../plans/tab-group-switcher-dedupe.md) and [tasks/tab-group-switcher-dedupe.md](../tasks/tab-group-switcher-dedupe.md):

| Area | What shipped |
|------|----------------|
| Registry | Reactivate closed rows on reopen (`upsertOpenFromChrome`) using fingerprint match (window + title + color + tab count + recent `closedAt`); ambiguous ties skip merge |
| Migration | One-shot fingerprint dedupe keyed by `registryDedupeVersion`; legacy migrate preserves version |
| Switcher snapshot | `dedupeSwitcherSnapshotRows` drops closed rows whose fingerprint matches an open row; entries carry `windowId` |
| Background init | Order: migrate → URL defaults → dedupe version → `reconcileRegistryWithChrome` → `runRegistryFingerprintDedupeOnce` → sync |

## Files created / modified

- Added: [`packages/storage/lib/impl/tab-group-registry-fingerprint.ts`](../../../packages/storage/lib/impl/tab-group-registry-fingerprint.ts).
- Added: [`chrome-extension/src/background/switcher-snapshot-utils.ts`](../../../chrome-extension/src/background/switcher-snapshot-utils.ts) — `dedupeSwitcherSnapshotRows`, `sortSwitcherEntries` (keeps [`tab-group-registry.ts`](../../../chrome-extension/src/background/tab-group-registry.ts) within line-count guidance).
- Modified: [`packages/storage/lib/impl/all-tab-groups-registry-types.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-types.ts), [`all-tab-groups-registry-storage.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts), [`all-tab-groups-registry-migrate.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-migrate.ts), [`packages/storage/lib/impl/index.ts`](../../../packages/storage/lib/impl/index.ts), [`chrome-extension/src/background/tab-group-registry.ts`](../../../chrome-extension/src/background/tab-group-registry.ts).

## Manual QA

Follow the checklist in [tasks/tab-group-switcher-dedupe.md](../tasks/tab-group-switcher-dedupe.md) (close/reopen same group, cross-window same fingerprint, legacy `-1` window rows, restore flow).

## Known limitations / next steps

- Fingerprint collision across genuinely different closed groups (same window/title/color/count) remains possible; ambiguous cases intentionally do not merge.
- Optional: tighten heuristics or surface merge diagnostics if users report edge cases.

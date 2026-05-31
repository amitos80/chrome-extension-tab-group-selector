# Implementation summary: Cross-device sync

**Plan:** [`docs/development/plans/cross-device-sync.md`](../plans/cross-device-sync.md) · **Spec:** [`docs/development/specs/cross-device-sync.md`](../specs/cross-device-sync.md) · **Tasks:** [`docs/development/tasks/cross-device-sync.md`](../tasks/cross-device-sync.md)

## What was implemented

| Area | Detail |
|------|--------|
| DTO / quota | [`packages/storage/lib/impl/tab-groups-sync-dto.ts`](../../packages/storage/lib/impl/tab-groups-sync-dto.ts) — **`SYNCED_WORKSPACES_KEY`**, envelope **`v:1`**, **`SYNC_WORKSPACE_ITEM_SAFE_BYTES`**, **`SYNC_STORAGE_TOTAL_SAFE_BYTES`**, **`buildEnvelopeFromRegistryGroups`**, **`parseSyncEnvelope`**, **`mergeRemoteRowsIntoLocalGroups`**. |
| Registry | [`allTabGroupsRegistryStorage.mergeRemoteSyncEnvelope`](../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts), exported **`ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY`**. |
| Background | [`chrome-extension/src/background/cross-device-sync.ts`](../../chrome-extension/src/background/cross-device-sync.ts) — **`initCrossDeviceSync`**, **`pushWorkspacesToCloud`**, **`chrome.storage.onChanged`** (sync inbound + local debounced outbound), **`applyingRemoteSync`** loop guard, cold-start **`sync.get`**. |
| Bootstrap | [`chrome-extension/src/background/index.ts`](../../chrome-extension/src/background/index.ts) — **`initCrossDeviceSync()`** runs in **`initTabGroupRegistry().finally(..)`** so migrations finish before sync pull/listeners (**WHY:** avoid races with lazy registry migrations). **`void initSnapshotScheduler()`** still runs immediately. |

## Product / data rules (MVP)

- **Eligible for sync:** any **`PersistedTabGroup`** row with **non-empty `urls`** (open live snapshot or closed); ordered by **`lastSeenAt`**; trimmed to fit **per-item byte budget**. Open groups on the source device are serialized from registry URL snapshots; receivers merge them as **closed restorable** rows (`remoteRowAsPersistedFromV2`).
- **Cloud shape (v2):** **`synced_workspaces`** is **`{ v: 2, m: Record<persistKey, row> }`**. Outbound push **read-merge-writes**: `sync.get` → per-key LWW with local → trim → `sync.set`. v1 array payloads are parsed and upgraded on read.
- **Conflict resolution:** per **`persistKey`**, remote row **`u`** wins over local iff **`u > lastSeenAt`**.
- **Removals:** omitting a group from sync does **not** delete it locally (additive merge).
- **Session snapshots** stay **local-only**.
- **Open-group URLs:** [`open-group-registry-urls.ts`](../../chrome-extension/src/background/open-group-registry-urls.ts) debounces tab/group events into `upsertOpenFromChrome(..., urlsSnapshot)`; [`sortedTabUrls`](../../packages/storage/lib/impl/tab-group-url-snapshot.ts) is shared with live close snapshots.
- **Inbound demotion (Set 3):** [`tab-group-open-demote.ts`](../../chrome-extension/src/background/tab-group-open-demote.ts) down-levels open rows whose `chromeGroupId` is absent locally; snapshot guardrail emits them as closed Restore rows instead of hiding them.

## Known limitations

- **`sessionSnapshots`** intentionally excluded from sync.
- Chrome Sync must be enabled; **`storage.sync`** failures are logged; local registry remains authoritative.
- Manual dual-profile QA recommended (see tasks **CD6**).

## Files touched (primary)

- [`docs/development/plans/cross-device-sync.md`](../plans/cross-device-sync.md)
- [`docs/development/tasks/cross-device-sync.md`](../tasks/cross-device-sync.md)
- [`packages/storage/lib/impl/tab-group-url-snapshot.ts`](../../packages/storage/lib/impl/tab-group-url-snapshot.ts)
- [`packages/storage/lib/impl/tab-group-open-upsert.ts`](../../packages/storage/lib/impl/tab-group-open-upsert.ts)
- [`packages/storage/lib/impl/tab-groups-sync-dto.ts`](../../packages/storage/lib/impl/tab-groups-sync-dto.ts)
- [`packages/storage/lib/impl/all-tab-groups-registry-storage.ts`](../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts)
- [`packages/storage/lib/impl/index.ts`](../../packages/storage/lib/impl/index.ts)
- [`chrome-extension/src/background/open-group-registry-urls.ts`](../../chrome-extension/src/background/open-group-registry-urls.ts)
- [`chrome-extension/src/background/tab-group-registry-events.ts`](../../chrome-extension/src/background/tab-group-registry-events.ts)
- [`chrome-extension/src/background/tab-group-reconcile-collect.ts`](../../chrome-extension/src/background/tab-group-reconcile-collect.ts)
- [`chrome-extension/src/background/tab-group-registry.ts`](../../chrome-extension/src/background/tab-group-registry.ts)
- [`chrome-extension/src/background/tab-group-live-snapshots.ts`](../../chrome-extension/src/background/tab-group-live-snapshots.ts)
- [`chrome-extension/src/background/cross-device-sync.ts`](../../chrome-extension/src/background/cross-device-sync.ts)
- [`chrome-extension/src/background/index.ts`](../../chrome-extension/src/background/index.ts)
- [`README.md`](../../README.md)

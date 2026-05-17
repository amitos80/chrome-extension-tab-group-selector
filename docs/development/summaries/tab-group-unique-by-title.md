# Implementation summary: Unique tab group rows by title

## What shipped

| Area | Details |
|------|---------|
| Canonical merge | `collapseRegistryGroupsByUniqueMergeableTitle` — one persisted row per **merge-eligible** canonical title (`normalizeGroupTitle`; excludes empty / **Untitled**). |
| Last-write-wins | Winner by `lastSeenAt`, then open, then `chromeGroupId`, then `createdAt`, then `persistKey`. |
| Stable keys | Merge-eligible rows use `persistKey` `nm_` + FNV-1a-derived hex (`persistKeyForMergeEligibleCanonicalTitle`). |
| Persistence pipe | All registry mutations + reconcile + migrations chain through `finalizeRegistryGroupsForPersistence`. |
| Version flag | `registryUniqueTitleVersion` + one-shot `runRegistryUniqueTitleCollapseOnce`. |
| Reactivation | `findReactivatableClosedRowIndex` prefers same-window when several merge-eligible closed candidates exist; single candidate may match cross-window. |

## Files

- Added: [`packages/storage/lib/impl/tab-group-registry-unique-title.ts`](../../../packages/storage/lib/impl/tab-group-registry-unique-title.ts)
- Modified: [`packages/storage/lib/impl/tab-group-registry-fingerprint.ts`](../../../packages/storage/lib/impl/tab-group-registry-fingerprint.ts), [`all-tab-groups-registry-types.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-types.ts), [`all-tab-groups-registry-storage.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts), [`all-tab-groups-registry-migrate.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-migrate.ts), [`impl/index.ts`](../../../packages/storage/lib/impl/index.ts), [`chrome-extension/src/background/tab-group-registry.ts`](../../../chrome-extension/src/background/tab-group-registry.ts), [`docs/AGENTS.md`](../../AGENTS.md)

## Known trade-offs

- Two **open** Chrome groups sharing the same **custom** title: registry retains one row — one group may not appear in the switcher until renamed (see plan).

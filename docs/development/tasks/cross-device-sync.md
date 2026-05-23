# Tasks: Cross-device sync

**Plan:** [`docs/development/plans/cross-device-sync.md`](../plans/cross-device-sync.md) · **Spec:** [`cross-device-sync.md`](../specs/cross-device-sync.md)

| ID | Priority | Estimate | Depends on |
|----|----------|----------|------------|
| CD1 | P0 | 45m | — |
| CD2 | P0 | 55m | CD1 |
| CD3 | P0 | 50m | CD2 |
| CD4 | P0 | 35m | CD3 |
| CD5 | P0 | 25m | CD4 |
| CD6 | P1 | 30m | CD5 |

---

## CD1 — Minimized envelope + quota helpers

**Goal:** Define minimized **`SyncEnvelopeV1`** row shape, **`SYNC_WORKSPACE_ITEM_SAFE_BYTES`** (under 8192), **`jsonUtf8ByteLength`**, eligible-closed-groups filter, **trim-to-budget**, **`buildEnvelopeFromRegistryGroups`**, **`parseSyncEnvelope`**.

### Steps

1. Add [`packages/storage/lib/impl/tab-groups-sync-dto.ts`](../../../packages/storage/lib/impl/tab-groups-sync-dto.ts).
2. Export sync key constant matching spec:

   ```ts
   export const SYNCED_WORKSPACES_KEY = 'synced_workspaces'
   ```

3. Eligibility MVP: **`!g.isOpen && (g.urls?.length ?? 0) > 0`**, sort **`lastSeenAt`** descending.
4. Row fields: **`k`** (**`persistKey`**), **`gt`** (title), **`c`** (color), **`u`** (timestamp for LWW — use **`Math.max(lastSeenAt, closedAt ?? 0, createdAt)`**), **`a`**: **`[url, tabTitle][]`** (tab titles may be **`''`** if unknown).
5. **`trimRowsToByteBudget`**: drop lowest-priority tail rows until **`JSON.stringify({ v:1, t, g })`** UTF-8 size **`<= SYNC_WORKSPACE_ITEM_SAFE_BYTES`**.
6. **`parseSyncEnvelope`**: structural validation (**`v === 1`**, **`Array.isArray(g)`**, minimal row guards).
7. Re-export symbols from [`packages/storage/lib/impl/index.ts`](../../../packages/storage/lib/impl/index.ts).

### Completion criteria

- [ ] No session snapshot keys referenced.
- [ ] Helpers split so functions stay within repo ESLint **`func-style`** / length norms.
- [ ] Exported types usable from **`@extension/storage`**.

---

## CD2 — Registry merge API (remote-only pathway)

**Goal:** **`allTabGroupsRegistryStorage.mergeRemoteSyncEnvelope(envelope)`** merges via **`finalizeRegistryGroupsForPersistence`** without calling background sync code.

### Steps

1. Export **`ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY`** alongside **`createStorage`** key string in [`all-tab-groups-registry-storage.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts) (single source of truth).
2. Import **`mergeRemoteRowsIntoLocalGroups`** (or equivalently named pure merge from CD1).
3. Add **`mergeRemoteSyncEnvelope`** to storage object + **`AllTabGroupsRegistryStorageType`**.
4. Merge semantics: map existing by **`persistKey`**; remote row **creates or replaces** closed snapshot when **`u > lastSeenAt`**; **`windowId: -1`**, **`chromeGroupId: null`** for inserted/updated-from-remote defensive shape (**WHY:** cross-device portability).
5. Preserve locals not mentioned in envelope (additive policy).

### Completion criteria

- [ ] **`mergeRemoteSyncEnvelope`** \< 250 lines file contribution (split if needed).
- [ ] Unit-level reasoning documented in CD6 QA (two devices conflicting timestamps).

---

## CD3 — Background sync service + loop guard

**Goal:** **`initCrossDeviceSync`**, **`pushWorkspacesToCloud`**, inbound **`chrome.storage.onChanged`** for **`sync`**, **`applyingRemoteSync`** suppression.

### Steps

1. Add [`chrome-extension/src/background/cross-device-sync.ts`](../../../chrome-extension/src/background/cross-device-sync.ts).
2. **`pushWorkspacesToCloud`**: Premium check → **`buildEnvelopeFromRegistryGroups`**, if **`null`** run **`chrome.storage.sync.remove(SYNCED_WORKSPACES_KEY)`** (best-effort) so cloud clears stale payload; else **`sync.set`** with try/catch, verify **≤102400** bytes WARN path per spec.
3. **`onChanged`**: if **`area === 'sync'`** and **`changes[SYNCED_WORKSPACES_KEY]`** → **`parseSyncEnvelope`** → **`mergeRemoteSyncEnvelope`** guarded by **`applyingRemoteSync` flip-flop**.
4. Outbound scheduler: **`area === 'local'`** **`changes[ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY]`** → debounced **`pushWorkspacesToCloud`** iff **`!applyingRemoteSync`**.
5. **Single listener attachment** guard (mirror snapshot scheduler pattern).
6. ESLint: **exports-last**, **func-style** compliance.

### Completion criteria

- [ ] Premium off → inbound handler returns early **before** merging.
- [ ] Applying remote disables outbound debounce churn.

---

## CD4 — No extra mutation hooks needed (listener-based outbound)

**Goal:** Confirm **local `onChanged` + debounce** covers **all registry writers** (**`storage.set`**), including [`tab-group-registry.ts`](../../../chrome-extension/src/background/tab-group-registry.ts), [`chrome-extension/src/background/index.ts`](../../../chrome-extension/src/background/index.ts). Document explicit **survey list** below.

### Registry mutation surfaces (survey)

- [`chrome-extension/src/background/tab-group-registry.ts`](../../../chrome-extension/src/background/tab-group-registry.ts): **`upsertOpenFromChrome`**, **`markClosedFromRemovedGroup`**, **`reconcileRegistryWithChrome`**, **`allTabGroupsRegistryStorage.set`**.
- [`chrome-extension/src/background/index.ts`](../../../chrome-extension/src/background/index.ts): **`removeByPersistKey`** message branch.

### Completion criteria

- [ ] Verified all paths flow through **`chrome.storage.local.set`** (`all-tab-groups-registry-storage-key-v1`) triggering **`chrome.storage.onChanged`**.
- [ ] Tasks note: UI pages using **`liveUpdate`**/`useStorage` also resolve to same **`local`** key—no orphaned writers.

---

## CD5 — Bootstrap + optional cold-start pull

### Steps

1. In [`chrome-extension/src/background/index.ts`](../../../chrome-extension/src/background/index.ts), **`import { initCrossDeviceSync }`** from `./cross-device-sync`.
2. After **`void initSnapshotScheduler()`** (**or beside it**—order flexible), **`void initCrossDeviceSync()`**.
3. **`initCrossDeviceSync`** registers listeners then **`coldStartPullFromSync`**: **`chrome.storage.sync.get(SYNCED_WORKSPACES_KEY)`** + merge when Premium (**WHY:** populate before first UI open). Prefer calling **`initCrossDeviceSync`** from **`initTabGroupRegistry().finally(...)`** so registry migrations precede merges.

- [ ] Service worker start does not throw if **`chrome.storage.sync`** rejects (Firefox / policy).

---

## CD6 — QA + summary + CI

### Manual QA checklist

1. Two Chrome desktops / profiles with same Google account, **Premium manual** toggled ON on both (Options).
2. Device A: close a tab group restoring URLs; observe **`chrome.storage.local`** registry + **`chrome.storage.sync`** `synced_workspaces`.
3. Device B: reload extension SW; merged closed row appears (may require cold pull + debounce latency).
4. Premium OFF on B: confirm **no** merge overwrites registry when remote changes propagate.
5. Artificially inflate payload → confirm trim + WARN paths; verify extension still usable.

### Steps

1. `pnpm eslint` touched paths · `pnpm run build`.
2. Add [`docs/development/summaries/cross-device-sync.md`](../summaries/cross-device-sync.md) linking plan/spec/tasks once implementation lands.

### Completion criteria

- [ ] ESLint + build green.
- [ ] QA checklist exercised or deviations noted in summary limits section.

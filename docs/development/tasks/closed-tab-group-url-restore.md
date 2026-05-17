# Tasks: Closed tab groups — URL snapshot and reconstruction

## Task TG-URL-1 — Schema and storage defaults

- **Priority:** P0  
- **Estimate:** 45–60 min  
- **Dependencies:** None  

### Steps

1. Extend `PersistedTabGroup` with `urls: string[]` in [`all-tab-groups-registry-storage.ts`](../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts).

```typescript
export interface PersistedTabGroup {
	// ...existing fields
	urls: string[];
}
```

2. Add `ensureUrlsFieldDefaults()` that maps existing rows missing `urls` to `urls: []` and persists once.

3. Update `upsertOpenFromChrome`, `markClosedFromRemovedGroup`, `migrateLegacyTabGroupHistoryIfNeeded` object literals to include `urls` (`[]` where unknown).

4. Extend `markClosedFromRemovedGroup(group, tabCount, urlsSnapshot?: string[])` — when closing, set `urls: urlsSnapshot ?? []` (or merge when updating existing open row).

5. Extend `SwitcherTabGroupEntry` with `hasRestorableUrls: boolean` (closed row && `urls.length > 0`).

### Completion checklist

- [ ] TypeScript builds for `@extension/storage`.
- [ ] Legacy migrated rows have `urls: []`.
- [ ] Closed rows persist snapshot URLs when provided.

---

## Task TG-URL-2 — Live snapshot module

- **Priority:** P0  
- **Estimate:** 60–90 min  
- **Dependencies:** TG-URL-1  

### Steps

1. Add [`chrome-extension/src/background/tab-group-live-snapshots.ts`](../../chrome-extension/src/background/tab-group-live-snapshots.ts):

```typescript
export function scheduleLiveSnapshotRefresh(groupId: number): void;
export function popLiveSnapshotForRemovedGroup(groupId: number): { urls: string[] } | undefined;
export async function warmLiveSnapshotsForOpenGroups(): Promise<void>;
export function initLiveGroupSnapshots(): void;
```

2. `flushLiveSnapshot(groupId)` uses `chrome.tabGroups.get` + `chrome.tabs.query({ groupId })`, sorts tabs by `index`, builds `urls` from `tab.url || tab.pendingUrl`, skips empty strings, applies `MAX_URLS_PER_GROUP_SNAPSHOT` cap.

3. Register debounced refresh on `tabs.onUpdated`, `tabs.onAttached`, `tabs.onDetached` (resolve `groupId` via `chrome.tabs.get` when needed).

4. Register `tabGroups.onUpdated` to refresh that group’s snapshot.

5. Call `initLiveGroupSnapshots()` from `initTabGroupRegistry()` **before** or alongside existing listeners; call `warmLiveSnapshotsForOpenGroups()` after initial `syncOpenGroupsFromChrome`.

### Completion checklist

- [ ] Snapshot map updates without redundant storage writes.
- [ ] Startup warm covers all currently open groups.
- [ ] No throw on invalid `groupId` during races.

---

## Task TG-URL-3 — Closure wiring

- **Priority:** P0  
- **Estimate:** 30 min  
- **Dependencies:** TG-URL-1, TG-URL-2  

### Steps

1. In [`tab-group-registry.ts`](../../chrome-extension/src/background/tab-group-registry.ts) `tabGroups.onRemoved` listener:

```typescript
const popped = popLiveSnapshotForRemovedGroup(removedGroup.id);
await allTabGroupsRegistryStorage.markClosedFromRemovedGroup(
	removedGroup,
	tabCount,
	popped?.urls,
);
```

2. Ensure snapshot pop happens **once** per removal (function clears map entry).

### Completion checklist

- [ ] Closing a multi-tab native group persists URL list matching last warm snapshot order.

---

## Task TG-URL-4 — Restore in new window

- **Priority:** P0  
- **Estimate:** 45–60 min  
- **Dependencies:** TG-URL-1  

### Steps

1. Add `windows` to [`manifest.ts`](../../chrome-extension/manifest.ts) `permissions`.

2. Implement [`restore-closed-group.ts`](../../chrome-extension/src/background/restore-closed-group.ts):

```typescript
export async function restoreClosedGroupInNewWindow(
	meta: PersistedTabGroup,
): Promise<{ success: boolean; groupId?: number; windowId?: number }>;
```

3. Algorithm:

   - Normalize URLs (cap length, replace risky schemes with `about:blank`).
   - If resulting list empty → `['about:blank']`.
   - `chrome.windows.create({ url: normalizedUrls, focused: true })`.
   - `chrome.tabs.query({ windowId })` → sort by `index` → `chrome.tabs.group({ tabIds, windowId })` → `chrome.tabGroups.update`.

4. Replace inline logic in [`index.ts`](../../chrome-extension/src/background/index.ts) `RESTORE_CLOSED_GROUP` handler with call to helper.

### Completion checklist

- [ ] Multi-tab closed group restores as grouped tabs in a **new** focused window.
- [ ] Empty snapshot path still produces one grouped blank tab (backward compatible).

---

## Task TG-URL-5 — UI hints and messaging docs

- **Priority:** P1  
- **Estimate:** 20–30 min  
- **Dependencies:** TG-URL-1  

### Steps

1. In [`SwitcherOverlay.tsx`](../../pages/new-tab/src/components/SwitcherOverlay.tsx) (and content-ui copy), for closed rows with `hasRestorableUrls`, append subtle subtitle text e.g. “Saved URLs” (keep opacity rules).

2. Update [`docs/AGENTS.md`](../../docs/AGENTS.md) `RESTORE_CLOSED_GROUP` response shape if extended (`windowId`, etc.).

### Completion checklist

- [ ] Closed rows distinguish “full restore” vs “empty shell” when possible.

---

## Manual QA matrix (TG-URL-6)

Run after implementation; record pass/fail in PR or summary doc.

| Scenario | Steps | Expected |
|----------|--------|----------|
| HTTPS group restore | Create group with 3 https tabs; close group; restore | New window; 3 tabs grouped; title/color applied |
| Empty URLs fallback | Manually clear `urls` in storage for a closed row; restore | Single `about:blank` grouped row |
| Large group | 60 tabs (if feasible) | Only first N URLs (cap) open; still groups |
| chrome:// tab in group | Include one chrome URL | Normalized away or blank; window still creates |
| Extension reload | Reload extension; immediately close group without browsing | May empty URLs — acceptable; document |
| Native close vs extension | Close via Chrome UI vs programmatic | Same persisted behaviour after snapshot warm |
| Activate open group | Regression | Still focuses window + tab |

### Limits (reference)

- **MAX_URLS_PER_GROUP_SNAPSHOT / RESTORE:** 50 (adjust only with Chrome behaviour verification).
- **Restricted schemes:** `chrome:`, `devtools:`, `chrome-extension:` (non-self), `file:` — normalize to `about:blank` unless product decision changes.

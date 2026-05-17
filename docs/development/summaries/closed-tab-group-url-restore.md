# Implementation summary: Closed tab groups — URL snapshot and reconstruction

## Tasks completed

| Task | Description |
|------|-------------|
| TG-URL-1 | `PersistedTabGroup.urls`, `ensureUrlsFieldDefaults`, `markClosedFromRemovedGroup(..., urls?)`, `SwitcherTabGroupEntry.hasRestorableUrls` |
| TG-URL-2 | [`tab-group-live-snapshots.ts`](../../../chrome-extension/src/background/tab-group-live-snapshots.ts) debounced snapshots + warm on init |
| TG-URL-3 | [`tab-group-registry.ts`](../../../chrome-extension/src/background/tab-group-registry.ts) wires `popLiveSnapshotForRemovedGroup` into `onRemoved` |
| TG-URL-4 | [`restore-closed-group.ts`](../../../chrome-extension/src/background/restore-closed-group.ts) + `windows` manifest permission |
| TG-URL-5 | UI “Saved URLs” hint; [`docs/AGENTS.md`](../../AGENTS.md) restore response |
| TG-URL-6 | QA matrix documented in [tasks/closed-tab-group-url-restore.md](../tasks/closed-tab-group-url-restore.md) |

## Files created / modified

- Added: [plans/closed-tab-group-url-restore.md](../plans/closed-tab-group-url-restore.md), [tasks/closed-tab-group-url-restore.md](../tasks/closed-tab-group-url-restore.md), this summary.
- Added: [`chrome-extension/src/background/tab-group-live-snapshots.ts`](../../../chrome-extension/src/background/tab-group-live-snapshots.ts), [`chrome-extension/src/background/restore-closed-group.ts`](../../../chrome-extension/src/background/restore-closed-group.ts).
- Modified: [`packages/storage/lib/impl/all-tab-groups-registry-storage.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts), [`chrome-extension/src/background/tab-group-registry.ts`](../../../chrome-extension/src/background/tab-group-registry.ts), [`chrome-extension/src/background/index.ts`](../../../chrome-extension/src/background/index.ts), [`chrome-extension/manifest.ts`](../../../chrome-extension/manifest.ts), [`chrome-extension/manifest.js`](../../../chrome-extension/manifest.js), new-tab and content-ui `SwitcherOverlay.tsx`, [`docs/AGENTS.md`](../../AGENTS.md).

## Usage

1. Keep groups open while browsing so snapshots refresh (debounced on tab updates).
2. Close a group via Chrome; reopen from switcher **Restore** — a **new window** opens with grouped tabs when URLs were captured.
3. Legacy closed rows without URLs still restore as a single grouped blank tab.

## Known limitations

- Snapshots are in-memory until flushed; startup `warmLiveSnapshotsForOpenGroups` mitigates gaps after worker restart.
- Only `http`, `https`, `about`, and this extension’s `chrome-extension:` URLs are restored; other schemes become `about:blank`.
- Maximum **50** URLs per group for snapshot and restore (`MAX_URLS_PER_GROUP_SNAPSHOT` / `MAX_URLS_PER_GROUP_RESTORE`).

## Next steps (optional)

- Optional: persist latest snapshot into `chrome.storage` periodically for stronger crash resilience.
- Optional: restore into current window behind a setting.

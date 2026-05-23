# Cross Device Sync
You are implementing the Cross-Device Sync engine for the TabGroup Selector extension. Your objective is to keep explicitly saved or pinned workspaces (not the heavy, rolling automated snapshots) synchronized across a user's multiple machines.

To achieve this natively without external server infrastructure, you will utilize the `chrome.storage.sync` API. This API automatically ties into the user's logged-in Google Chrome profile and mirrors data across instances.

## Critical Storage Quota Constraint
The `chrome.storage.sync` engine enforces strict data limits:
- Total quota: 102,400 bytes (100 KB).
- Per-item quota: 8,192 bytes (8 KB).
Because of this, you must never sync the automated session snapshots array here; it will immediately crash the quota limit. You will isolate and sync only the explicitly saved workspace metadata registry array (e.g., custom tab groups saved by the user).

## Strict Code Constraints
- File Length Limit: No file may exceed 250 lines.
- Function Length Limit: No function or hook may exceed 25 lines. Split data transformation and synchronization states into lean, granular helpers.
- Premium Verification: Execute `checkPremiumStatus()` before performing any push or pull syncing events.

## Step-by-Step Implementation Sequence
1.Isolate Syncable Data Model:
    Step 1.Define a highly optimized, minimized serialization schema for saved groups to fit comfortably inside the 8KB per-item quota footprint.
2.Implement Outbound Sync Pipeline:
    Step 2.Create data hooks that catch when a user saves, modifies, or deletes a workspace locally and mirror that delta up to `chrome.storage.sync`.
3.Implement Inbound Listener Loop:
    Step 3.Establish a listener for `chrome.storage.onChanged` to intercept incoming remote synchronization states and merge them smoothly into the local registry.
4.Wire Bootstrapper into Service Worker:
    Step 4.Initialize the real-time synchronization listeners inside your master background service worker entry point.


## Technical Implementation Requirements
1. Synchronization Service (`src/background/sync-service.ts`)
Write a decoupled synchronization listener and pusher module. Use conflict-resolution strategies based on timestamps to determine whether local or remote data takes precedence.
```typescript
import { checkPremiumStatus } from '../services/entitlements';
import { allTabGroupsRegistryStorage } from '@extension/storage';

const SYNC_WORKSPACES_KEY = 'synced_workspaces';

/**
 * Initializes cross-device sync synchronization listeners.
 */
export function initCrossDeviceSync(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[SYNC_WORKSPACES_KEY]) {
      void handleRemoteUpdate(changes[SYNC_WORKSPACES_KEY].newValue);
    }
  });
}

/**
 * Pushes local workspace updates up to the cloud profile.
 */
export async function pushWorkspacesToCloud(localWorkspaces: unknown[]): Promise<void> {
  const isPremium = await checkPremiumStatus();
  if (!isPremium) return;

  try {
    const payload = JSON.stringify(localWorkspaces);
    if (payload.length > 102400) {
      console.warn('[SYNC] Payload exceeds maximum synchronization quota profile limits.');
      return;
    }
    await chrome.storage.sync.set({ [SYNC_WORKSPACES_KEY]: localWorkspaces });
  } catch (error) {
    console.error('[SYNC] Outbound sync operation failed:', error);
  }
}

/**
 * Validates incoming data streams and updates local state loops safely.
 */
async function handleRemoteUpdate(remoteData: unknown[] | undefined): Promise<void> {
  const isPremium = await checkPremiumStatus();
  if (!isPremium || !remoteData) return;

  try {
    // Merge or directly overwrite local historical registries
    await allTabGroupsRegistryStorage.overwriteRegistryFromSync(remoteData);
    console.log('[SYNC] Successfully merged cloud workspace targets.');
  } catch (error) {
    console.error('[SYNC] Inbound sync operation failed:', error);
  }
}
```


2. Storage Mutation Interceptor Hook:
You must ensure that any client mutation operation (such as adding or removing a saved tab group via your UI panel or options engine) automatically schedules a cloud broadcast event.
3. Modify or extend your central registry store logic (`src/services/registry-manager.ts` or equivalent) to integrate this push step smoothly:
```typescript
import { pushWorkspacesToCloud } from '../background/sync-service';
import { allTabGroupsRegistryStorage } from '@extension/storage';

/**
 * Wrapper action for saving workspaces that triggers cloud propagation.
 */
export async function saveWorkspaceAction(newGroupMeta: unknown): Promise<void> {
  // 1. Commit changes to your current local state runner
  await allTabGroupsRegistryStorage.add(newGroupMeta);
  
  // 2. Query the updated full collection snapshot
  const rawCollection = await allTabGroupsRegistryStorage.getAll();
  
  // 3. Silently propagate state up to the cloud channel
  void pushWorkspacesToCloud(rawCollection);
}
```


## Edge-Case Reminders
When finalizing this sync implementation module, strictly enforce the following rules:
- Circular Sync Loop Prevention: The `chrome.storage.onChanged` handler fires for all changes across devices. When your local client downloads a cloud update and writes it down to local storage, make sure your local storage watcher doesn't accidentally trigger a redundant outbound cloud push back up. Keep inbound data routes strictly input-only.
- Data Compression Strategy: If users save multiple tab groups containing massive quantities of tabs, strip non-essential structural parameters (such as temporary tab icons, favicons, or tab activation hierarchies) before executing `pushWorkspacesToCloud`. Save only raw structural details: `title`, `url`, `groupTitle`, and `groupColor`.
- Graceful Degradation: If `chrome.storage.sync` throws an exception due to network latency or missing profile connections, catch it instantly and ensure the extension continues working perfectly out of `chrome.storage.local`.
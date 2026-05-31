# Instruction Set 1: Live Tab URL Tracking (Outbound Engine)
## Objective: Modify the local storage registry system to continuously capture and update active URLs for open tab groups. This ensures that when a sync is triggered, live groups actually have data to push.
## Step-by-Step Execution Plan
1. Target File: packages/storage/lib/impl/all-tab-groups-registry-storage.ts (or your local registry engine).
2. Refactor upsertOpenFromChrome: * Do not initialize urls: [] as a blank array for open groups. 
  - Introduce a background query using chrome.tabs.query({ groupId: group.id }) to fetch the live array of tabs. 
  - Map the tab array to an optimized collection of URL strings or compact structural pairs.  
3. Add Event Hooks in Service Worker:
  - In your background/runtime entry point, listen to chrome.tabs.onUpdated, chrome.tabs.onRemoved, and chrome.tabs.onAttached. 
  - Filter for events where tab.groupId is valid (not chrome.tabGroups.TAB_GROUP_ID_NONE). 
  - Trigger a debounced update to the local registry for that specific group to record the new URL array layout.

## Code Blueprint for Assistant Reference
```typescript
// Enforce helper functionality under 25 lines
export async function getGroupUrls(groupId: number): Promise<string[]> {
  if (groupId < 0) return [];
  const tabs = await chrome.tabs.query({ groupId });
  return tabs.map(t => t.url).filter(Boolean) as string[];
}
```

# Instruction Set 2: Last-Write-Wins Dictionary Overhaul (Sync Core)
## Objective: Eliminate the race condition where one machine overwrites the cloud state of another machine. Move from a destructive flat array representation to an atomic dictionary payload based on an explicit Last-Write-Wins (LWW) strategy.
## Step-by-Step Execution Plan
1. Target File: tab-groups-sync-dto.ts (or your serialization manager).
2. Redefine Cloud Schema: Change the synced_workspaces schema in chrome.storage.sync from an array to a record map keyed by the immutable persistKey.
3. Add Timestamps to Schema: Ensure every group record contains a localUpdatedAt high-precision timestamp epoch integer.
4. Implement LWW Merging Logic:
  - When handling data locally, write changes with localUpdatedAt = Date.now().
  - When processing an outbound payload merge or inbound pull, evaluate keys individually.
  - The Mutation Rule: If a remote key exists in the cloud with a newer timestamp than the local registry entry, overwrite the local cache entry. If the local entry is newer, preserve it and queue an outbound delta push.
## Code Blueprint for Assistant Reference
```typescript
// Atomic LWW Merge Engine
export function mergeWorkspaces(localMap: Record<string, any>, remoteMap: Record<string, any>) {
  const merged = { ...localMap };
  for (const [pk, remoteItem] of Object.entries(remoteMap)) {
    const localItem = merged[pk];
    if (!localItem || remoteItem.updatedAt > localItem.updatedAt) {
      merged[pk] = { ...remoteItem, isOpen: localItem?.isOpen ?? false };
    }
  }
  return merged;
}
```

# Instruction Set 3: Inbound Identity Pass-Through & Reconciliation
## Objective: Prevent the receiving machine (e.g., your M5) from dropping or hiding remote active groups because of native integer ID mismatches.
## Step-by-Step Execution Plan
1. Target File: src/background/tab-group-registry.ts (specifically inside reconcileRegistryWithChrome or mergeRemoteSyncEnvelope).
2. Isolate Active State Checking:
  - When an inbound synchronization record hits the machine with isOpen: true, check its chromeGroupId against the current local machine's window session state using chrome.tabGroups.query({}).
3. Apply State Demotion Guardrail:
  - If the incoming group's chromeGroupId does not match any active local group, safely mutate its transient runtime status: set isOpen = false and set chromeGroupId = null.
  - This preserves the item's data integrity but down-levels it safely into a cold, restorable target row.
4. Fix Snapshot Engine:
  - Confirm that buildSwitcherSnapshot does not tag these newly down-leveled items under the skippedOpenNoChrome filter block.
  - They must feed cleanly into SwitcherOverlay.tsx as standard closed rows with the Restore state action active.

IMPORTANT: Strict Verification & Guardrails: 
1. Ensure no single modification function exceeds 25 lines of execution code. Break logical components out into distinct utility modules.
2. Ensure no modified codebase file expands past 250 lines total length.
3. Explicitly verify that your premium status entitlement check (checkPremiumStatus()) is executed gracefully before allowing cloud data serialization pipelines to sync extended limits beyond your default FREE_TIER_VISIBLE_TAB_GROUPS constant thresholds.
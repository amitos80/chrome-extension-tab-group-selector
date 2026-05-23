# Session Snapshots
You are implementing the Session Snapshots engine for the TabGroup Selector extension. Your objective is to capture a complete structural backup of the user's active browser state (all windows, tabs, and their respective tab groups) at scheduled intervals using the chrome.alarms API.


## Strict Code Constraints
 - File Length Limit: No file may exceed 250 lines.
 - Function Length Limit: No function or hook may exceed 25 lines. Break down complex logic into small, single-responsibility helpers.
 - Storage Key: Persist snapshot history arrays under the 'sessionSnapshots' key in `chrome.storage.local`.
 - Retention Cap: Enforce a strict rolling maximum of 30 snapshots to protect local storage space.


## Step-by-Step Implementation Sequence
1.Update Manifest Permissions:
    Step 1.Ensure the `alarms` API permission is explicitly declared in your configuration array alongside the existing permissions.
2.Create the Scheduler Layer:
    Step 2.Implement `src/background/snapshot-scheduler.ts` to initialize and monitor the periodic alarm lifecycle.
3.Build the Snapshot Service:
    Step 3.Implement `src/background/snapshot-service.ts `to handle premium verification, inspect windows/groups, and prune storage history.
4.Wire into Service Worker Entry:
    Step 4.Export the bootstrapper and initialize it directly inside the root background worker lifecycle file.


## Technical Implementation Requirements
1. The Scheduling Routine (`src/background/snapshot-scheduler.ts`)
Write a clean initialization routine that registers a periodic alarm. You must safeguard against duplicate registrations by checking for existing tasks first.
```typescript
import { handleSnapshotAlarm } from './snapshot-service';

const SNAPSHOT_ALARM_NAME = 'automated-session-snapshot';
const DEFAULT_INTERVAL_MINUTES = 30;

/**
 * Boots the background scheduler and hooks into the alarms router.
 */
export function initSnapshotScheduler(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SNAPSHOT_ALARM_NAME) {
      void handleSnapshotAlarm();
    }
  });
  
  void ensureAlarmRegistered(DEFAULT_INTERVAL_MINUTES);
}

/**
 * Provisions a persistent backup alarm if it does not already exist.
 */
async function ensureAlarmRegistered(periodInMinutes: number): Promise<void> {
  const existing = await chrome.alarms.get(SNAPSHOT_ALARM_NAME);
  if (!existing) {
    chrome.alarms.create(SNAPSHOT_ALARM_NAME, { periodInMinutes });
  }
}
```


2. The Capture and Serialization Service (`src/background/snapshot-service.ts`)
You must orchestrate data parsing carefully to keep functions short and maintain high readability. Intercept the pipeline early using `checkPremiumStatus()` to enforce feature gating.
```typescript
import { checkPremiumStatus } from '../services/entitlements';

export interface TabBackup {
  title: string;
  url: string;
  groupTitle?: string;
  groupColor?: string;
}

export interface WindowBackup {
  id: number;
  tabs: TabBackup[];
}

export interface SessionSnapshot {
  id: string;
  timestamp: number;
  windows: WindowBackup[];
}

const MAX_SNAPSHOT_RETENTION = 30;

/**
 * Entry interceptor invoked by the scheduler loop.
 */
export async function handleSnapshotAlarm(): Promise<void> {
  const isPremium = await checkPremiumStatus();
  if (!isPremium) return;

  try {
    await processSnapshotCapture();
  } catch (error) {
    console.error('[SNAPSHOT] Automated capture pipeline aborted:', error);
  }
}

/**
 * Inspects all active window targets and correlates group visual structures.
 */
async function processSnapshotCapture(): Promise<void> {
  const windows = await chrome.windows.getAll({ populate: true });
  const groups = await chrome.tabGroups.query({});
  
  const groupMap = new Map(groups.map(g => [g.id, g]));
  const windowBackups = windows.map(w => serializeWindow(w, groupMap));

  const snapshot: SessionSnapshot = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    windows: windowBackups.filter(w => w.tabs.length > 0)
  };

  await saveSnapshotToHistory(snapshot);
}

/**
 * Transforms native window instances into lightweight layout definitions.
 */
function serializeWindow(
  win: chrome.windows.Window, 
  groupMap: Map<number, chrome.tabGroups.TabGroup>
): WindowBackup {
  const tabBackups = (win.tabs || []).map((tab): TabBackup => {
    const group = tab.groupId !== -1 ? groupMap.get(tab.groupId) : undefined;
    return {
      title: tab.title || '',
      url: tab.url || '',
      groupTitle: group?.title,
      groupColor: group?.color,
    };
  });

  return { id: win.id || -1, tabs: tabBackups };
}

/**
 * Commits state matrices to storage and rotates old entries past the 30 count limit.
 */
async function saveSnapshotToHistory(newSnapshot: SessionSnapshot): Promise<void> {
  const state = await chrome.storage.local.get({ sessionSnapshots: [] });
  const history: SessionSnapshot[] = state.sessionSnapshots;
  
  history.unshift(newSnapshot);
  
  if (history.length > MAX_SNAPSHOT_RETENTION) {
    history.splice(MAX_SNAPSHOT_RETENTION);
  }
  
  await chrome.storage.local.set({ sessionSnapshots: history });
}
```

## Edge-Case Reminders
When compiling these updates, you must fulfill the following behavioral specs:
- Discarded Tab Recovery: Tabs optimized out of memory by Chrome might lose their immediate runtime url values or default to fallback assets. Always ensure title and URL properties fall back to safe empty strings ("") rather than breaking serialization.
- Preserve Internal Pages: Do not strip `chrome://` or local extension paths from the tab array. Users expect their complete workspaces to return during manual session restorations.
- Asynchronous Initialization: Remember to run `initSnapshotScheduler()` right inside your master `src/background.ts` bundle entry point so the loop initializes immediately on extension startup.
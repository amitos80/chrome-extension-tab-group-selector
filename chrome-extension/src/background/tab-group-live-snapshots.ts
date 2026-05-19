/** Cap URLs stored per group to bound RAM and windows.create payload size. */
export const MAX_URLS_PER_GROUP_SNAPSHOT = 50

const DEBOUNCE_MS = 80

interface LiveSnapshot {
  title: string
  color: string
  urls: string[]
}

const snapshots = new Map<number, LiveSnapshot>()
const timers = new Map<number, ReturnType<typeof setTimeout>>()

async function flushLiveSnapshot(groupId: number): Promise<void> {
  try {
    const group = await chrome.tabGroups.get(groupId)
    const tabs = await chrome.tabs.query({ groupId })
    const sorted = [...tabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    const urls = sorted
      .map(t => t.url || t.pendingUrl || '')
      .filter(u => u.length > 0)
      .slice(0, MAX_URLS_PER_GROUP_SNAPSHOT)
    snapshots.set(groupId, {
      title: group.title || 'Untitled',
      color: group.color,
      urls,
    })
  } catch {
    snapshots.delete(groupId)
  }
}

export function scheduleLiveSnapshotRefresh(groupId: number): void {
  if (groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
    return
  }
  const existing = timers.get(groupId)
  if (existing !== undefined) {
    clearTimeout(existing)
  }
  timers.set(
    groupId,
    setTimeout(() => {
      timers.delete(groupId)
      void flushLiveSnapshot(groupId)
    }, DEBOUNCE_MS),
  )
}

/**
 * Reads and clears the live snapshot for a removed chrome group id.
 * WHY: onRemoved cannot query tabs; this snapshot was refreshed while the group was open.
 */
export function popLiveSnapshotForRemovedGroup(groupId: number): { urls: string[] } | undefined {
  const snap = snapshots.get(groupId)
  snapshots.delete(groupId)
  timers.delete(groupId)
  if (!snap) {
    return undefined
  }
  return { urls: [...snap.urls] }
}

export async function warmLiveSnapshotsForOpenGroups(): Promise<void> {
  const groups = await chrome.tabGroups.query({})
  await Promise.all(groups.map(g => flushLiveSnapshot(g.id)))
}

export function initLiveGroupSnapshots(): void {
  chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
    if (tab.groupId !== undefined && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      scheduleLiveSnapshotRefresh(tab.groupId)
    }
  })

  chrome.tabs.onAttached.addListener(tabId => {
    void chrome.tabs.get(tabId).then(tab => {
      if (tab.groupId !== undefined && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        scheduleLiveSnapshotRefresh(tab.groupId)
      }
    })
  })

  chrome.tabGroups.onUpdated.addListener(group => {
    scheduleLiveSnapshotRefresh(group.id)
  })
}

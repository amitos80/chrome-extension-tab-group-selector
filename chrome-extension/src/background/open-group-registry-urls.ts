import { collectChromeTabGroupsForReconcile } from './tab-group-reconcile-collect'
import { allTabGroupsRegistryStorage, sortedTabUrls } from '@extension/storage'

const OPEN_GROUP_URL_REFRESH_DEBOUNCE_MS = 60
const SYNC_ALL_OPEN_GROUPS_DEBOUNCE_MS = 40

const refreshTimers = new Map<number, ReturnType<typeof setTimeout>>()
let syncAllOpenGroupsTimer: ReturnType<typeof setTimeout> | null = null

/** Tab counts captured before tabGroups.onRemoved (tabs are already gone). */
export const tabGroupTabCounts = new Map<number, number>()

const urlsSnapshotFromTabs = (tabs: chrome.tabs.Tab[]): string[] | undefined => {
  const urls = sortedTabUrls(tabs)

  return urls.length > 0 ? urls : undefined
}

export const refreshOpenGroupUrlsInRegistry = async function refreshOpenGroupUrlsInRegistry(
  groupId: number,
): Promise<void> {
  if (groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
    return
  }
  try {
    const group = await chrome.tabGroups.get(groupId)
    const tabs = await chrome.tabs.query({ groupId })
    tabGroupTabCounts.set(groupId, tabs.length)
    await allTabGroupsRegistryStorage.upsertOpenFromChrome(group, tabs.length, urlsSnapshotFromTabs(tabs))
  } catch {
    /* Group removed between event and refresh. */
  }
}

export const scheduleRefreshOpenGroupUrlsInRegistry = function scheduleRefreshOpenGroupUrlsInRegistry(
  groupId: number,
): void {
  if (groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
    return
  }
  const existing = refreshTimers.get(groupId)
  if (existing !== undefined) {
    clearTimeout(existing)
  }
  refreshTimers.set(
    groupId,
    setTimeout(() => {
      refreshTimers.delete(groupId)
      void refreshOpenGroupUrlsInRegistry(groupId)
    }, OPEN_GROUP_URL_REFRESH_DEBOUNCE_MS),
  )
}

export const syncAllOpenGroupsFromChrome = async function syncAllOpenGroupsFromChrome(): Promise<void> {
  const chromeGroups = await collectChromeTabGroupsForReconcile()
  tabGroupTabCounts.clear()
  for (const g of chromeGroups) {
    const tabs = await chrome.tabs.query({ groupId: g.id })
    tabGroupTabCounts.set(g.id, tabs.length)
    await allTabGroupsRegistryStorage.upsertOpenFromChrome(g, tabs.length, urlsSnapshotFromTabs(tabs))
  }
}

export const scheduleSyncAllOpenGroupsFromChrome = function scheduleSyncAllOpenGroupsFromChrome(): void {
  if (syncAllOpenGroupsTimer !== null) {
    clearTimeout(syncAllOpenGroupsTimer)
  }
  syncAllOpenGroupsTimer = setTimeout(() => {
    syncAllOpenGroupsTimer = null
    void syncAllOpenGroupsFromChrome()
  }, SYNC_ALL_OPEN_GROUPS_DEBOUNCE_MS)
}

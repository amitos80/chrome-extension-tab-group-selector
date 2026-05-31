import { popLiveSnapshotForRemovedGroup } from './tab-group-live-snapshots'
import {
  refreshOpenGroupUrlsInRegistry,
  scheduleRefreshOpenGroupUrlsInRegistry,
  scheduleSyncAllOpenGroupsFromChrome,
  tabGroupTabCounts,
} from './open-group-registry-urls'
import { allTabGroupsRegistryStorage } from '@extension/storage'

export const registerTabGroupRegistryEventListeners = function registerTabGroupRegistryEventListeners(): void {
  chrome.tabs.onCreated.addListener(() => {
    scheduleSyncAllOpenGroupsFromChrome()
  })

  chrome.tabs.onRemoved.addListener(() => {
    scheduleSyncAllOpenGroupsFromChrome()
  })

  chrome.tabs.onAttached.addListener(() => {
    scheduleSyncAllOpenGroupsFromChrome()
  })

  chrome.tabs.onDetached.addListener(() => {
    scheduleSyncAllOpenGroupsFromChrome()
  })

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.groupId !== undefined) {
      scheduleSyncAllOpenGroupsFromChrome()
    }
    if (
      (changeInfo.url !== undefined || changeInfo.status === 'complete') &&
      tab.groupId !== undefined &&
      tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
    ) {
      scheduleRefreshOpenGroupUrlsInRegistry(tab.groupId)
    }
  })

  chrome.tabGroups.onCreated.addListener(async group => {
    await refreshOpenGroupUrlsInRegistry(group.id)
    console.info('[TABGROUP_SELECTOR][REGISTRY][events] tabGroups.onCreated', {
      id: group.id,
      title: group.title || '(empty)',
      windowId: group.windowId,
      tabCount: tabGroupTabCounts.get(group.id) ?? 0,
    })
  })

  chrome.tabGroups.onUpdated.addListener(async group => {
    await refreshOpenGroupUrlsInRegistry(group.id)
    console.info('[TABGROUP_SELECTOR][REGISTRY][events] tabGroups.onUpdated', {
      id: group.id,
      title: group.title || '(empty)',
      windowId: group.windowId,
      tabCount: tabGroupTabCounts.get(group.id) ?? 0,
    })
  })

  chrome.tabGroups.onRemoved.addListener(async removedGroup => {
    const popped = popLiveSnapshotForRemovedGroup(removedGroup.id)
    const state = await allTabGroupsRegistryStorage.get()
    const entry = state.groups.find(g => g.isOpen && g.chromeGroupId === removedGroup.id)
    const tabCount = entry?.tabCount ?? tabGroupTabCounts.get(removedGroup.id) ?? 0
    try {
      await allTabGroupsRegistryStorage.markClosedFromRemovedGroup(removedGroup, tabCount, popped?.urls)
    } catch {
      /* WHY: Persist errors are uncommon; avoids noisy logs in MV3 idle SW. */
    }
    tabGroupTabCounts.delete(removedGroup.id)
  })
}

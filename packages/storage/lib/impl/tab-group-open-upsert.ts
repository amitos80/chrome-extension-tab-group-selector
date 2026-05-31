import { newPersistKey } from './all-tab-groups-registry-helpers.js'
import type { PersistedTabGroup } from './all-tab-groups-registry-types.js'
import { findReactivatableClosedRowIndex } from './tab-group-registry-fingerprint.js'

const urlsForOpenUpsert = function urlsForOpenUpsert(
  existing: string[] | undefined,
  urlsSnapshot: string[] | undefined,
): string[] {
  if (urlsSnapshot !== undefined && urlsSnapshot.length > 0) {
    return urlsSnapshot
  }
  return existing ?? []
}

/** Pure registry mutation for an open Chrome tab group (used by upsertOpenFromChrome). */
export const applyOpenGroupUpsert = function applyOpenGroupUpsert(
  groups: PersistedTabGroup[],
  group: chrome.tabGroups.TabGroup,
  tabCount: number,
  urlsSnapshot?: string[],
): PersistedTabGroup[] {
  const next = [...groups]
  const idx = next.findIndex(g => g.isOpen && g.chromeGroupId === group.id)
  const now = Date.now()

  if (idx >= 0) {
    next[idx] = {
      ...next[idx],
      title: group.title || 'Untitled',
      color: group.color,
      windowId: group.windowId,
      tabCount,
      urls: urlsForOpenUpsert(next[idx].urls, urlsSnapshot),
      lastSeenAt: now,
      isOpen: true,
      closedAt: null,
      chromeGroupId: group.id,
    }
    return next
  }

  const closedIdx = findReactivatableClosedRowIndex(next, group, tabCount)
  if (closedIdx >= 0) {
    next[closedIdx] = {
      ...next[closedIdx],
      isOpen: true,
      chromeGroupId: group.id,
      windowId: group.windowId,
      title: group.title || 'Untitled',
      color: group.color,
      tabCount,
      closedAt: null,
      lastSeenAt: now,
      urls: urlsForOpenUpsert(next[closedIdx].urls, urlsSnapshot),
    }
    return next
  }

  next.push({
    persistKey: newPersistKey(),
    chromeGroupId: group.id,
    windowId: group.windowId,
    title: group.title || 'Untitled',
    color: group.color,
    tabCount,
    urls: urlsForOpenUpsert(undefined, urlsSnapshot),
    isOpen: true,
    closedAt: null,
    createdAt: now,
    lastSeenAt: now,
  })
  return next
}

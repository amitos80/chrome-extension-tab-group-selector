import {
  bookmarkFolderPersistKey,
  listBookmarkBarSavedTabGroupSlots,
  urlsFingerprintForSavedGroup,
} from './bookmark-saved-tab-groups'
import { dedupeSwitcherSnapshotRows, sortSwitcherEntries } from './switcher-snapshot-utils'
import {
  initLiveGroupSnapshots,
  popLiveSnapshotForRemovedGroup,
  warmLiveSnapshotsForOpenGroups,
} from './tab-group-live-snapshots'
import { allTabGroupsRegistryStorage, finalizeRegistryGroupsForPersistence } from '@extension/storage'
import type { SwitcherTabGroupEntry } from '@extension/storage'

const tabGroupTabCounts = new Map<number, number>()

let syncOpenGroupsTimer: ReturnType<typeof setTimeout> | null = null

/**
 * UNION of chrome.tabGroups.query and any group IDs referenced by open tabs.
 * WHY: Synced/native groups can briefly be visible to users but omitted from tabGroups.query
 * until the group is interacted with; tabs still expose a valid groupId and tabGroups.get works.
 */
const collectChromeTabGroupsForReconcile = async (): Promise<chrome.tabGroups.TabGroup[]> => {
  const fromQuery = await chrome.tabGroups.query({})
  const byId = new Map(fromQuery.map(g => [g.id, g]))
  const tabs = await chrome.tabs.query({})

  for (const t of tabs) {
    if (t.groupId === undefined || t.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
      continue
    }
    const id = t.groupId
    if (byId.has(id)) {
      continue
    }
    try {
      const g = await chrome.tabGroups.get(id)
      byId.set(id, g)
    } catch {
      /* Race: tab list and group teardown; ignore. */
    }
  }

  return [...byId.values()]
}

/**
 * Refreshes tab counts and open-group rows in storage after tab moves / creates / closes.
 * WHY: Tab membership changes do not always emit tabGroups.onUpdated; a debounced pass keeps counts correct before onRemoved runs.
 */
const syncOpenGroupsFromChrome = async (): Promise<void> => {
  const chromeGroups = await collectChromeTabGroupsForReconcile()
  tabGroupTabCounts.clear()
  for (const g of chromeGroups) {
    const tabs = await chrome.tabs.query({ groupId: g.id })
    tabGroupTabCounts.set(g.id, tabs.length)
    await allTabGroupsRegistryStorage.upsertOpenFromChrome(g, tabs.length)
  }
}

const scheduleSyncOpenGroupsFromChrome = (): void => {
  if (syncOpenGroupsTimer !== null) {
    clearTimeout(syncOpenGroupsTimer)
  }
  syncOpenGroupsTimer = setTimeout(() => {
    syncOpenGroupsTimer = null
    void syncOpenGroupsFromChrome()
  }, 40)
}

export const reconcileRegistryWithChrome = async (): Promise<void> => {
  const chromeGroups = await collectChromeTabGroupsForReconcile()
  const openIds = new Set(chromeGroups.map(g => g.id))

  console.info('[TABGROUP_SELECTOR][REGISTRY][reconcile] collectChromeTabGroupsForReconcile', {
    chromeOpenCount: chromeGroups.length,
    chromeIdsTitles: chromeGroups.map(g => ({ id: g.id, title: g.title || '(empty)', wid: g.windowId })),
  })

  await allTabGroupsRegistryStorage.set(prev => {
    const groups = prev.groups.map(entry => {
      if (entry.isOpen && entry.chromeGroupId != null && !openIds.has(entry.chromeGroupId)) {
        return {
          ...entry,
          isOpen: false,
          chromeGroupId: null,
          closedAt: entry.closedAt ?? Date.now(),
          urls: entry.urls ?? [],
        }
      }
      return entry
    })
    return { ...prev, groups: finalizeRegistryGroupsForPersistence(groups) }
  })

  const state = await allTabGroupsRegistryStorage.get()
  const knownOpenIds = new Set(
    state.groups.filter(g => g.isOpen && g.chromeGroupId != null).map(g => g.chromeGroupId as number),
  )

  console.info('[TABGROUP_SELECTOR][REGISTRY][reconcile] after close-stale pass', {
    registryOpenWithChromeIds: [...knownOpenIds].sort((a, b) => a - b),
    registryRowCount: state.groups.length,
  })

  for (const cg of chromeGroups) {
    if (!knownOpenIds.has(cg.id)) {
      const tabs = await chrome.tabs.query({ groupId: cg.id })
      console.info('[TABGROUP_SELECTOR][REGISTRY][reconcile] upsertOpenFromChrome (Chrome group unknown to registry)', {
        chromeGroupId: cg.id,
        title: cg.title || '(empty)',
        windowId: cg.windowId,
        tabCount: tabs.length,
      })
      await allTabGroupsRegistryStorage.upsertOpenFromChrome(cg, tabs.length)
    }
  }
}

export const buildSwitcherSnapshot = async (): Promise<{
  entries: SwitcherTabGroupEntry[]
  activeGroupId: number | null
}> => {
  await reconcileRegistryWithChrome()

  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  let activeGroupId: number | null = null
  if (currentTab?.groupId !== undefined && currentTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
    activeGroupId = currentTab.groupId
  }

  const state = await allTabGroupsRegistryStorage.get()
  const chromeGroups = await collectChromeTabGroupsForReconcile()
  const chromeById = new Map(chromeGroups.map(g => [g.id, g]))

  const rows: SwitcherTabGroupEntry[] = []

  let skippedOpenNoChrome = 0
  for (const p of state.groups) {
    if (p.isOpen && p.chromeGroupId != null) {
      const cg = chromeById.get(p.chromeGroupId)
      if (!cg) {
        skippedOpenNoChrome += 1
        console.info(
          '[TABGROUP_SELECTOR][REGISTRY][snapshot] skip row: persisted open but no matching Chrome tab group',
          {
            persistKeySlice: p.persistKey.slice(0, 12),
            chromeGroupId: p.chromeGroupId,
            title: p.title || '(empty)',
          },
        )
        continue
      }
      const tabs = await chrome.tabs.query({ groupId: cg.id })
      rows.push({
        persistKey: p.persistKey,
        chromeGroupId: cg.id,
        windowId: cg.windowId,
        title: cg.title || 'Untitled',
        color: cg.color,
        isOpen: true,
        tabCount: tabs.length,
        closedAt: null,
        hasRestorableUrls: false,
      })
    } else if (!p.isOpen) {
      const captured = p.urls ?? []
      rows.push({
        persistKey: p.persistKey,
        chromeGroupId: null,
        windowId: p.windowId,
        title: p.title || 'Untitled',
        color: p.color,
        isOpen: false,
        tabCount: p.tabCount,
        closedAt: p.closedAt,
        hasRestorableUrls: captured.length > 0,
      })
    }
  }

  const idsFromOpenRows = new Set(
    rows.filter(r => r.isOpen && r.chromeGroupId != null).map(r => r.chromeGroupId as number),
  )

  let injectedChromeOrphans = 0
  for (const cg of chromeGroups) {
    if (idsFromOpenRows.has(cg.id)) {
      continue
    }
    const tabs = await chrome.tabs.query({ groupId: cg.id })
    injectedChromeOrphans += 1
    console.info(
      '[TABGROUP_SELECTOR][REGISTRY][snapshot] inject row + upsert Chrome group missing from registry snapshot slice',
      { chromeGroupId: cg.id, title: cg.title || '(empty)', tabCount: tabs.length },
    )
    rows.push({
      persistKey: `orphan-live-${cg.id}`,
      chromeGroupId: cg.id,
      windowId: cg.windowId,
      title: cg.title || 'Untitled',
      color: cg.color,
      isOpen: true,
      tabCount: tabs.length,
      closedAt: null,
      hasRestorableUrls: false,
    })
    idsFromOpenRows.add(cg.id)
    await allTabGroupsRegistryStorage.upsertOpenFromChrome(cg, tabs.length)
  }

  const instantiatedUrlFingerprints = new Set<string>()
  for (const cg of chromeGroups) {
    const tabsForFp = await chrome.tabs.query({ groupId: cg.id })
    const hrefs = tabsForFp.map(t => String(t.url ?? '').trim()).filter(Boolean)
    if (hrefs.length > 0) {
      instantiatedUrlFingerprints.add(urlsFingerprintForSavedGroup(hrefs))
    }
  }

  let injectedBookmarkSavedGroups = 0
  const bookmarkSlots = await listBookmarkBarSavedTabGroupSlots(instantiatedUrlFingerprints)
  for (const slot of bookmarkSlots) {
    rows.push({
      persistKey: bookmarkFolderPersistKey(slot.bookmarkFolderId),
      chromeGroupId: null,
      windowId: -1,
      title: slot.title,
      color: 'grey',
      isOpen: false,
      tabCount: slot.urls.length,
      closedAt: slot.closedAt,
      hasRestorableUrls: slot.urls.length > 0,
    })
    injectedBookmarkSavedGroups += 1
  }

  const entries = sortSwitcherEntries(dedupeSwitcherSnapshotRows(rows), activeGroupId)

  console.info('[TABGROUP_SELECTOR][REGISTRY][snapshot] buildSwitcherSnapshot', {
    activeGroupId,
    chromeOpenCount: chromeGroups.length,
    registryRowCount: state.groups.length,
    snapshotRowCount: entries.length,
    skippedOpenNoChrome,
    injectedChromeOrphans,
    injectedBookmarkSavedGroups,
    openEntryIds: entries.filter(e => e.isOpen).map(e => e.chromeGroupId),
  })

  return {
    entries,
    activeGroupId,
  }
}

export const initTabGroupRegistry = async (): Promise<void> => {
  await allTabGroupsRegistryStorage.migrateLegacyTabGroupHistoryIfNeeded()
  await allTabGroupsRegistryStorage.ensureUrlsFieldDefaults()
  await allTabGroupsRegistryStorage.ensureRegistryDedupeVersionDefault()
  await allTabGroupsRegistryStorage.ensureRegistryUniqueTitleVersionDefault()
  await allTabGroupsRegistryStorage.runRegistryUniqueTitleCollapseOnce()
  await reconcileRegistryWithChrome()
  await allTabGroupsRegistryStorage.runRegistryFingerprintDedupeOnce()
  await syncOpenGroupsFromChrome()

  initLiveGroupSnapshots()
  await warmLiveSnapshotsForOpenGroups()

  chrome.tabs.onCreated.addListener(() => {
    scheduleSyncOpenGroupsFromChrome()
  })

  chrome.tabs.onRemoved.addListener(() => {
    scheduleSyncOpenGroupsFromChrome()
  })

  chrome.tabs.onAttached.addListener(() => {
    scheduleSyncOpenGroupsFromChrome()
  })

  chrome.tabs.onDetached.addListener(() => {
    scheduleSyncOpenGroupsFromChrome()
  })

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (changeInfo.groupId !== undefined) {
      scheduleSyncOpenGroupsFromChrome()
    }
  })

  chrome.tabGroups.onCreated.addListener(async group => {
    const tabs = await chrome.tabs.query({ groupId: group.id })
    const count = tabs.length
    tabGroupTabCounts.set(group.id, count)
    console.info('[TABGROUP_SELECTOR][REGISTRY][events] tabGroups.onCreated', {
      id: group.id,
      title: group.title || '(empty)',
      windowId: group.windowId,
      tabCount: count,
    })
    await allTabGroupsRegistryStorage.upsertOpenFromChrome(group, count)
  })

  chrome.tabGroups.onUpdated.addListener(async group => {
    const tabs = await chrome.tabs.query({ groupId: group.id })
    tabGroupTabCounts.set(group.id, tabs.length)
    console.info('[TABGROUP_SELECTOR][REGISTRY][events] tabGroups.onUpdated', {
      id: group.id,
      title: group.title || '(empty)',
      windowId: group.windowId,
      tabCount: tabs.length,
    })
    await allTabGroupsRegistryStorage.upsertOpenFromChrome(group, tabs.length)
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

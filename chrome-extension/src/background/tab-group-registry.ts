import {
  bookmarkFolderPersistKey,
  listBookmarkBarSavedTabGroupSlots,
  urlsFingerprintForSavedGroup,
} from './bookmark-saved-tab-groups'
import { dedupeSwitcherSnapshotRows, sortSwitcherEntries } from './switcher-snapshot-utils'
import {
  initLiveGroupSnapshots,
  warmLiveSnapshotsForOpenGroups,
} from './tab-group-live-snapshots'
import { demoteStaleOpenRowsInRegistry } from './tab-group-open-demote'
import { registerTabGroupRegistryEventListeners } from './tab-group-registry-events'
import { collectChromeTabGroupsForReconcile } from './tab-group-reconcile-collect'
import { snapshotRowFromPersistedGroup } from './tab-group-snapshot-rows'
import { syncAllOpenGroupsFromChrome } from './open-group-registry-urls'
import { allTabGroupsRegistryStorage, finalizeRegistryGroupsForPersistence, sortedTabUrls } from '@extension/storage'
import type { PersistedTabGroup, SwitcherTabGroupEntry } from '@extension/storage'

const urlsSnapshotFromTabs = (tabs: chrome.tabs.Tab[]): string[] | undefined => {
  const urls = sortedTabUrls(tabs)

  return urls.length > 0 ? urls : undefined
}

const persistDemotedOpenRows = async (demoted: PersistedTabGroup[]): Promise<void> => {
  if (demoted.length === 0) return

  await allTabGroupsRegistryStorage.set(prev => {
    const byPk = new Map(demoted.map(row => [row.persistKey, row]))
    const groups = prev.groups.map(g => byPk.get(g.persistKey) ?? g)

    return { ...prev, groups: finalizeRegistryGroupsForPersistence(groups) }
  })
}

export const reconcileRegistryWithChrome = async (): Promise<void> => {
  const chromeGroups = await collectChromeTabGroupsForReconcile()
  const openIds = new Set(chromeGroups.map(g => g.id))

  console.info('[TABGROUP_SELECTOR][REGISTRY][reconcile] collectChromeTabGroupsForReconcile', {
    chromeOpenCount: chromeGroups.length,
    chromeIdsTitles: chromeGroups.map(g => ({ id: g.id, title: g.title || '(empty)', wid: g.windowId })),
  })

  await allTabGroupsRegistryStorage.set(prev => ({
    ...prev,
    groups: finalizeRegistryGroupsForPersistence(demoteStaleOpenRowsInRegistry(prev.groups, openIds)),
  }))

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
      await allTabGroupsRegistryStorage.upsertOpenFromChrome(cg, tabs.length, urlsSnapshotFromTabs(tabs))
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
  const openIds = new Set(chromeGroups.map(g => g.id))

  const rows: SwitcherTabGroupEntry[] = []
  const demotedForPersist: PersistedTabGroup[] = []

  let demotedOpenNoChrome = 0
  for (const p of state.groups) {
    const { row, meta } = await snapshotRowFromPersistedGroup(p, chromeById, openIds)
    if (row) rows.push(row)
    if (meta.demotedForPersist) {
      demotedForPersist.push(meta.demotedForPersist)
      demotedOpenNoChrome += meta.demotedOpenNoChrome
    }
  }

  if (demotedForPersist.length > 0) {
    console.info('[TABGROUP_SELECTOR][REGISTRY][snapshot] demote open rows without local Chrome match', {
      count: demotedForPersist.length,
      persistKeySlices: demotedForPersist.map(d => d.persistKey.slice(0, 12)),
    })
    await persistDemotedOpenRows(demotedForPersist)
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
    await allTabGroupsRegistryStorage.upsertOpenFromChrome(cg, tabs.length, urlsSnapshotFromTabs(tabs))
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
    demotedOpenNoChrome,
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
  await syncAllOpenGroupsFromChrome()

  initLiveGroupSnapshots()
  await warmLiveSnapshotsForOpenGroups()
  registerTabGroupRegistryEventListeners()
}

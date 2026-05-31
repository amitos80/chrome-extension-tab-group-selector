import {
  closedSwitcherEntryFromPersisted,
  demoteOpenRowWithoutChromeMatch,
  needsOpenRowDemotion,
} from './tab-group-open-demote'
import type { PersistedTabGroup, SwitcherTabGroupEntry } from '@extension/storage'

export const openSwitcherEntryFromChrome = async (
  persistKey: string,
  cg: chrome.tabGroups.TabGroup,
): Promise<SwitcherTabGroupEntry> => {
  const tabs = await chrome.tabs.query({ groupId: cg.id })

  return {
    persistKey,
    chromeGroupId: cg.id,
    windowId: cg.windowId,
    title: cg.title || 'Untitled',
    color: cg.color,
    isOpen: true,
    tabCount: tabs.length,
    closedAt: null,
    hasRestorableUrls: false,
  }
}

export type SnapshotPersistedRowResult = {
  demotedForPersist?: PersistedTabGroup
  demotedOpenNoChrome: number
}

export const snapshotRowFromPersistedGroup = async (
  entry: PersistedTabGroup,
  chromeById: Map<number, chrome.tabGroups.TabGroup>,
  openChromeGroupIds: ReadonlySet<number>,
): Promise<{ row: SwitcherTabGroupEntry | null; meta: SnapshotPersistedRowResult }> => {
  if (!entry.isOpen) {
    return { row: closedSwitcherEntryFromPersisted(entry), meta: { demotedOpenNoChrome: 0 } }
  }

  const cg = entry.chromeGroupId != null ? chromeById.get(entry.chromeGroupId) : undefined
  if (cg) {
    return {
      row: await openSwitcherEntryFromChrome(entry.persistKey, cg),
      meta: { demotedOpenNoChrome: 0 },
    }
  }

  if (!needsOpenRowDemotion(entry, openChromeGroupIds)) {
    return { row: null, meta: { demotedOpenNoChrome: 0 } }
  }

  const demoted = demoteOpenRowWithoutChromeMatch(entry)
  const urls = demoted.urls ?? []

  return {
    row: urls.length > 0 ? closedSwitcherEntryFromPersisted(demoted) : null,
    meta: { demotedForPersist: demoted, demotedOpenNoChrome: 1 },
  }
}

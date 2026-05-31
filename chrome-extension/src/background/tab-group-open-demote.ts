import type { PersistedTabGroup, SwitcherTabGroupEntry } from '@extension/storage'

/** True when a persisted "open" row cannot bind to a live Chrome tab group on this machine. */
export const needsOpenRowDemotion = (
  entry: PersistedTabGroup,
  openChromeGroupIds: ReadonlySet<number>,
): boolean =>
  entry.isOpen && (entry.chromeGroupId == null || !openChromeGroupIds.has(entry.chromeGroupId))

/** Down-level transient open state into a cold, restorable closed row (URLs preserved). */
export const demoteOpenRowWithoutChromeMatch = (
  entry: PersistedTabGroup,
  now = Date.now(),
): PersistedTabGroup => ({
  ...entry,
  isOpen: false,
  chromeGroupId: null,
  closedAt: entry.closedAt ?? now,
  urls: entry.urls ?? [],
})

export const demoteStaleOpenRowsInRegistry = (
  groups: PersistedTabGroup[],
  openChromeGroupIds: ReadonlySet<number>,
): PersistedTabGroup[] =>
  groups.map(entry =>
    needsOpenRowDemotion(entry, openChromeGroupIds)
      ? demoteOpenRowWithoutChromeMatch(entry)
      : entry,
  )

export const closedSwitcherEntryFromPersisted = (entry: PersistedTabGroup): SwitcherTabGroupEntry => {
  const captured = entry.urls ?? []

  return {
    persistKey: entry.persistKey,
    chromeGroupId: null,
    windowId: entry.windowId,
    title: entry.title || 'Untitled',
    color: entry.color,
    isOpen: false,
    tabCount: entry.tabCount,
    closedAt: entry.closedAt,
    hasRestorableUrls: captured.length > 0,
  }
}

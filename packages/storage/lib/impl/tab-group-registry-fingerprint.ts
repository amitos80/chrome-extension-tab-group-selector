import type { PersistedTabGroup } from './all-tab-groups-registry-types.js'

/** WHY: Ignore stale closed snapshots older than this when reactivating after Chrome assigns a new group id. */
export const MAX_CLOSED_REACTIVATION_AGE_MS = 24 * 60 * 60 * 1000

/** Bump when storage cleanup logic changes; see runRegistryOpenClosedFingerprintsDedupeIfNeeded. */
export const REGISTRY_FINGERPRINT_DEDUPE_VERSION = 1

export function normalizeGroupTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Untitled / blank groups must not collapse together — Chrome allows many unnamed groups. */
export function isMergeEligibleCanonicalTitle(canonical: string): boolean {
  return canonical.length > 0 && canonical !== normalizeGroupTitle('Untitled')
}

/** WHY: Same-window alignment avoids merging groups dragged across windows with identical titles. */
export function windowsMatchForReactivation(row: PersistedTabGroup, chromeGroup: chrome.tabGroups.TabGroup): boolean {
  return row.windowId === chromeGroup.windowId
}

export function registryRowFingerprint(
  g: Pick<PersistedTabGroup, 'windowId' | 'title' | 'color' | 'tabCount'>,
): string {
  return `${g.windowId}|${g.color}|${g.tabCount}|${normalizeGroupTitle(g.title || 'Untitled')}`
}

/**
 * Fingerprint for switcher rows (built from Chrome live title/count or persisted closed row).
 * WHY: Must stay aligned with registryRowFingerprint for defensive UI dedupe.
 */
export function switcherRowFingerprint(row: {
  windowId: number
  title: string
  color: string
  tabCount: number
}): string {
  return `${row.windowId}|${row.color}|${row.tabCount}|${normalizeGroupTitle(row.title || 'Untitled')}`
}

/**
 * Finds a unique closed row to re-open under a new Chrome group id before inserting a duplicate row.
 * WHY: After native close, persisted rows have chromeGroupId=null; new Chrome groups get new ids (see dedupe plan).
 *
 * @returns Matching row index, or -1 when none or ambiguous (multiple rows tied on latest closedAt).
 */
export function findReactivatableClosedRowIndex(
  groups: PersistedTabGroup[],
  chromeGroup: chrome.tabGroups.TabGroup,
  tabCount: number,
  maxClosedAgeMs: number = MAX_CLOSED_REACTIVATION_AGE_MS,
  nowMs: number = Date.now(),
): number {
  const wantTitle = normalizeGroupTitle(chromeGroup.title || 'Untitled')
  const mergeEligible = isMergeEligibleCanonicalTitle(wantTitle)
  const indexed: { index: number; closedAt: number }[] = []

  for (let i = 0; i < groups.length; i++) {
    const row = groups[i]
    if (row.isOpen) {
      continue
    }
    if (row.color !== chromeGroup.color) {
      continue
    }
    if (row.tabCount !== tabCount) {
      continue
    }
    if (normalizeGroupTitle(row.title || 'Untitled') !== wantTitle) {
      continue
    }
    const closedAt = row.closedAt ?? 0
    if (maxClosedAgeMs > 0 && nowMs - closedAt > maxClosedAgeMs) {
      continue
    }
    indexed.push({ index: i, closedAt })
  }

  let candidates = indexed
  if (!mergeEligible) {
    candidates = indexed.filter(c => windowsMatchForReactivation(groups[c.index], chromeGroup))
  } else if (indexed.length > 1) {
    const sameWindow = indexed.filter(c => windowsMatchForReactivation(groups[c.index], chromeGroup))
    candidates = sameWindow.length > 0 ? sameWindow : indexed
  }

  if (candidates.length === 0) {
    return -1
  }

  candidates.sort((a, b) => b.closedAt - a.closedAt)
  const newest = candidates[0].closedAt
  const tiedForNewest = candidates.filter(c => c.closedAt === newest)
  if (tiedForNewest.length !== 1) {
    return -1
  }

  return tiedForNewest[0].index
}

/** Drops closed persisted rows whose fingerprint duplicates an open row in the same registry snapshot. */
export function dropClosedRowsDuplicatingOpenFingerprints(groups: PersistedTabGroup[]): PersistedTabGroup[] {
  const openFingerprints = new Set<string>()
  for (const g of groups) {
    if (g.isOpen && g.chromeGroupId != null) {
      openFingerprints.add(registryRowFingerprint(g))
    }
  }
  return groups.filter(g => {
    if (g.isOpen) {
      return true
    }
    return !openFingerprints.has(registryRowFingerprint(g))
  })
}

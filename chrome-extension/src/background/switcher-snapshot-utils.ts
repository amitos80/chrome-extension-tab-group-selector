import { switcherRowFingerprint } from '@extension/storage'
import type { SwitcherTabGroupEntry } from '@extension/storage'

export function dedupeSwitcherSnapshotRows(rows: SwitcherTabGroupEntry[]): SwitcherTabGroupEntry[] {
  const openFingerprints = new Set(rows.filter(r => r.isOpen).map(r => switcherRowFingerprint(r)))
  return rows.filter(r => {
    if (r.isOpen) {
      return true
    }
    if (openFingerprints.has(switcherRowFingerprint(r))) {
      //console.log('[BACKGROUND] Deduped closed switcher row vs open fingerprint', r.title, r.windowId);
      return false
    }
    return true
  })
}

export function sortSwitcherEntries(
  rows: SwitcherTabGroupEntry[],
  activeChromeGroupId: number | null,
): SwitcherTabGroupEntry[] {
  return [...rows].sort((a, b) => {
    const aActive = a.isOpen && a.chromeGroupId === activeChromeGroupId ? 1 : 0
    const bActive = b.isOpen && b.chromeGroupId === activeChromeGroupId ? 1 : 0
    if (aActive !== bActive) {
      return bActive - aActive
    }
    if (a.isOpen !== b.isOpen) {
      return a.isOpen ? -1 : 1
    }
    if (a.isOpen && b.isOpen) {
      return (a.title || '').localeCompare(b.title || '')
    }
    return (b.closedAt ?? 0) - (a.closedAt ?? 0)
  })
}

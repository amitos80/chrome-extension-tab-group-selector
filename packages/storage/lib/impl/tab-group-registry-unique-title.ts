import { pruneToCap } from './all-tab-groups-registry-helpers.js'
import { isMergeEligibleCanonicalTitle, normalizeGroupTitle } from './tab-group-registry-fingerprint.js'
import type { PersistedTabGroup } from './all-tab-groups-registry-types.js'

/** Bump when unique-title collapse rules change; drives one-shot migration. */
export const REGISTRY_UNIQUE_TITLE_VERSION = 1

const FNV_OFFSET_BASIS = 2166136261
const FNV_PRIME = 16777619

/** WHY: Service-worker reducers must stay synchronous; Web Crypto digest is async-only. */
function fnv1aUtf8Hex(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i]
    hash = Math.imul(hash, FNV_PRIME)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Stable storage key for merge-eligible titles so restore + collapse stay aligned.
 * WHY: Two UUID rows with the same display name must converge on one persistKey.
 */
export function persistKeyForMergeEligibleCanonicalTitle(canonical: string): string {
  const h = fnv1aUtf8Hex(canonical) + fnv1aUtf8Hex(`${canonical}|nm`)
  return `nm_${h}`
}

function canonicalTitleForRow(g: PersistedTabGroup): string {
  return normalizeGroupTitle(g.title || 'Untitled')
}

function isBetterUniqueTitleWinner(cur: PersistedTabGroup, best: PersistedTabGroup): boolean {
  if (cur.lastSeenAt !== best.lastSeenAt) {
    return cur.lastSeenAt > best.lastSeenAt
  }
  if (cur.isOpen !== best.isOpen) {
    return cur.isOpen && !best.isOpen
  }
  const cHas = cur.chromeGroupId != null
  const bHas = best.chromeGroupId != null
  if (cHas !== bHas) {
    return cHas
  }
  if (cur.createdAt !== best.createdAt) {
    return cur.createdAt > best.createdAt
  }
  return cur.persistKey.localeCompare(best.persistKey) > 0
}

function pickUniqueTitleWinner(rows: PersistedTabGroup[]): PersistedTabGroup {
  return rows.reduce((best, cur) => (isBetterUniqueTitleWinner(cur, best) ? cur : best))
}

/**
 * One persisted row per merge-eligible canonical title; full winner row kept (last-write-wins).
 * Untitled / blank titles are unchanged (each row stays distinct).
 */
export function collapseRegistryGroupsByUniqueMergeableTitle(groups: PersistedTabGroup[]): PersistedTabGroup[] {
  const ineligible: PersistedTabGroup[] = []
  const buckets = new Map<string, PersistedTabGroup[]>()

  for (const g of groups) {
    const canonical = canonicalTitleForRow(g)
    if (!isMergeEligibleCanonicalTitle(canonical)) {
      ineligible.push(g)
      continue
    }
    const arr = buckets.get(canonical) ?? []
    arr.push(g)
    buckets.set(canonical, arr)
  }

  const merged: PersistedTabGroup[] = [...ineligible]
  for (const [canonical, arr] of buckets) {
    const winner = pickUniqueTitleWinner(arr)
    merged.push({
      ...winner,
      persistKey: persistKeyForMergeEligibleCanonicalTitle(canonical),
    })
  }
  return merged
}

export function finalizeRegistryGroupsForPersistence(groups: PersistedTabGroup[]): PersistedTabGroup[] {
  return pruneToCap(collapseRegistryGroupsByUniqueMergeableTitle(groups))
}

import { pruneToCap } from './all-tab-groups-registry-helpers.js'
import { isMergeEligibleCanonicalTitle, normalizeGroupTitle } from './tab-group-registry-fingerprint.js'
import type { PersistedTabGroup } from './all-tab-groups-registry-types.js'

/** Bump when unique-title collapse rules change; drives one-shot migration. */
const REGISTRY_UNIQUE_TITLE_VERSION = 2

const FNV_OFFSET_BASIS = 2166136261
const FNV_PRIME = 16777619

/** WHY: Service-worker reducers must stay synchronous; Web Crypto digest is async-only. */
const fnv1aUtf8Hex = (input: string): string => {
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
 * WHY: Two UUID rows with the same display name must converge on one persistKey for **closed** rows only.
 */
const persistKeyForMergeEligibleCanonicalTitle = (canonical: string): string => {
  const h = fnv1aUtf8Hex(canonical) + fnv1aUtf8Hex(`${canonical}|nm`)

  return `nm_${h}`
}

const canonicalTitleForRow = (g: PersistedTabGroup): string => normalizeGroupTitle(g.title || 'Untitled')

/** Chrome-backed LIVE groups must win duplicates vs closed placeholders (remote sync payloads, stale snapshots). */
const liveChromeBindingRank = (g: PersistedTabGroup): number => {
  if (g.isOpen && g.chromeGroupId != null) {
    return 2
  }
  if (g.isOpen) {
    return 1
  }

  return 0
}

const isBetterUniqueTitleWinner = (cur: PersistedTabGroup, best: PersistedTabGroup): boolean => {
  const curRank = liveChromeBindingRank(cur)
  const bestRank = liveChromeBindingRank(best)
  if (curRank !== bestRank) {
    return curRank > bestRank
  }

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

const pickUniqueTitleWinner = (rows: PersistedTabGroup[]): PersistedTabGroup =>
  rows.reduce((best, cur) => (isBetterUniqueTitleWinner(cur, best) ? cur : best))

/** WHY: Separate buckets ensure two open Chrome groups with the same title are not collapsed to one persisted row (sync/import case). */
const mergeEligibleCollapseBucketKey = (g: PersistedTabGroup): string | null => {
  const canonical = canonicalTitleForRow(g)
  if (!isMergeEligibleCanonicalTitle(canonical)) {
    return null
  }
  if (g.isOpen && g.chromeGroupId != null) {
    return `live:${canonical}#gid:${g.chromeGroupId}`
  }
  return `closed:${canonical}`
}

/**
 * One persisted row per merge-eligible **closed** canonical title; each **open** Chrome group keeps its own row.
 * Untitled / blank titles are unchanged (each row stays distinct).
 */
const collapseRegistryGroupsByUniqueMergeableTitle = (groups: PersistedTabGroup[]): PersistedTabGroup[] => {
  const ineligible: PersistedTabGroup[] = []
  const buckets = new Map<string, PersistedTabGroup[]>()

  for (const g of groups) {
    const key = mergeEligibleCollapseBucketKey(g)
    if (key === null) {
      ineligible.push(g)
      continue
    }
    const arr = buckets.get(key) ?? []
    arr.push(g)
    buckets.set(key, arr)
  }

  const merged: PersistedTabGroup[] = [...ineligible]
  for (const [key, arr] of buckets) {
    const winner = pickUniqueTitleWinner(arr)
    if (key.startsWith('live:')) {
      merged.push(winner)
      continue
    }
    if (!key.startsWith('closed:')) {
      merged.push(winner)
      continue
    }
    const canonical = key.slice('closed:'.length)
    merged.push({
      ...winner,
      persistKey: persistKeyForMergeEligibleCanonicalTitle(canonical),
    })
  }
  return merged
}

const finalizeRegistryGroupsForPersistence = (groups: PersistedTabGroup[]): PersistedTabGroup[] =>
  pruneToCap(collapseRegistryGroupsByUniqueMergeableTitle(groups))

export {
  collapseRegistryGroupsByUniqueMergeableTitle,
  finalizeRegistryGroupsForPersistence,
  persistKeyForMergeEligibleCanonicalTitle,
  REGISTRY_UNIQUE_TITLE_VERSION,
}

import type { PersistedTabGroup } from './all-tab-groups-registry-types.js'
import type { SyncGroupRowV1, SyncGroupRowV2 } from './tab-groups-sync-types.js'

const isUrlPair = (pair: unknown): pair is [string, string] =>
  Array.isArray(pair) &&
  pair.length === 2 &&
  typeof pair[0] === 'string' &&
  typeof pair[1] === 'string'

export const isSyncGroupRowV1 = (row: unknown): row is SyncGroupRowV1 => {
  if (!row || typeof row !== 'object') return false
  const r = row as Record<string, unknown>

  return (
    typeof r.k === 'string' &&
    r.k.length > 0 &&
    typeof r.gt === 'string' &&
    typeof r.c === 'string' &&
    typeof r.u === 'number' &&
    Number.isFinite(r.u) &&
    Array.isArray(r.a) &&
    r.a.every(isUrlPair)
  )
}

export const isSyncGroupRowV2 = (row: unknown): row is SyncGroupRowV2 => {
  if (!row || typeof row !== 'object') return false
  const r = row as Record<string, unknown>

  return (
    typeof r.gt === 'string' &&
    typeof r.c === 'string' &&
    typeof r.u === 'number' &&
    Number.isFinite(r.u) &&
    Array.isArray(r.a) &&
    r.a.every(isUrlPair)
  )
}

export const v1RowToV2 = (row: SyncGroupRowV1): SyncGroupRowV2 => ({
  gt: row.gt,
  c: row.c,
  u: row.u,
  a: row.a,
})

export const remoteRowAsPersistedFromV2 = (persistKey: string, row: SyncGroupRowV2): PersistedTabGroup => {
  const urls = row.a.map(t => t[0]).filter(u => u.length > 0)
  const incomingU = row.u

  return {
    persistKey,
    chromeGroupId: null,
    windowId: -1,
    title: row.gt || 'Untitled',
    color: row.c,
    tabCount: urls.length,
    urls,
    isOpen: false,
    closedAt: incomingU,
    createdAt: incomingU,
    lastSeenAt: incomingU,
  }
}

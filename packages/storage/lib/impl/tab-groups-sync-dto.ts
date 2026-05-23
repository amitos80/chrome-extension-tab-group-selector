import type { PersistedTabGroup } from './all-tab-groups-registry-types.js'

/** Cloud profile key matching cross-device-sync spec. */
const SYNCED_WORKSPACES_KEY = 'synced_workspaces'

/** WHY: Chromium `storage.sync` per-item quota is 8192 bytes; stay under hard limit with margin. */
const SYNC_WORKSPACE_ITEM_SAFE_BYTES = 7600

/** Spec total quota sanity check (~102KB). Single-key payloads still respect per-item cap first. */
const SYNC_STORAGE_TOTAL_SAFE_BYTES = 100_000

type SyncGroupRowV1 = {
  k: string
  gt: string
  c: string
  u: number
  a: Array<[string, string]>
}

type SyncEnvelopeV1 = {
  v: 1
  t: number
  g: SyncGroupRowV1[]
}

const jsonUtf8ByteLength = (s: string): number => new TextEncoder().encode(s).length

const envelopeJsonBytes = (g: SyncGroupRowV1[]): number => {
  const t = g.length === 0 ? 0 : Math.max(...g.map(r => r.u))
  const env: SyncEnvelopeV1 = { v: 1, t, g }

  return jsonUtf8ByteLength(JSON.stringify(env))
}

/** Closed rows only, with URLs to restore — MVP “saved workspace” heuristic. */
const selectEligibleSyncGroups = (groups: PersistedTabGroup[]): PersistedTabGroup[] =>
  groups.filter(g => !g.isOpen && (g.urls?.length ?? 0) > 0).sort((a, b) => b.lastSeenAt - a.lastSeenAt)

const toSyncRowsFromGroups = (groups: PersistedTabGroup[]): SyncGroupRowV1[] =>
  groups.map(g => ({
    k: g.persistKey,
    gt: g.title || '',
    c: g.color,
    u: Math.max(g.lastSeenAt, g.closedAt ?? 0, g.createdAt),
    a: (g.urls ?? []).map((url): [string, string] => [url, '']),
  }))

const trimRowsToByteBudget = (rows: SyncGroupRowV1[], maxBytes: number): SyncGroupRowV1[] => {
  const cur = [...rows]

  while (cur.length > 0 && envelopeJsonBytes(cur) > maxBytes) {
    cur.pop()
  }

  return cur
}

const buildEnvelopeFromRegistryGroups = (groups: PersistedTabGroup[]): SyncEnvelopeV1 | null => {
  const eligible = selectEligibleSyncGroups(groups)
  const rows = trimRowsToByteBudget(toSyncRowsFromGroups(eligible), SYNC_WORKSPACE_ITEM_SAFE_BYTES)

  if (rows.length === 0) return null

  const t = Math.max(...rows.map(r => r.u))

  return { v: 1, t, g: rows }
}

const isSyncGroupRowV1 = (row: unknown): row is SyncGroupRowV1 => {
  if (!row || typeof row !== 'object') return false
  const r = row as Record<string, unknown>

  return (
    typeof r.k === 'string' &&
    r.k.length > 0 &&
    typeof r.gt === 'string' &&
    typeof r.c === 'string' &&
    typeof r.u === 'number' &&
    Number.isFinite(r.u) &&
    Array.isArray(r.a)
  )
}

const parseSyncEnvelope = (raw: unknown): SyncEnvelopeV1 | null => {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  if (o.v !== 1 || !Array.isArray(o.g)) return null

  const g: SyncGroupRowV1[] = []

  for (const row of o.g) {
    if (!isSyncGroupRowV1(row)) return null

    for (const pair of row.a) {
      if (!Array.isArray(pair) || pair.length !== 2) return null
      if (typeof pair[0] !== 'string' || typeof pair[1] !== 'string') return null
    }

    g.push(row)
  }

  return {
    v: 1,
    t: typeof o.t === 'number' && Number.isFinite(o.t) ? o.t : Math.max(...g.map(r => r.u), 0),
    g,
  }
}

const remoteRowAsPersisted = (r: SyncGroupRowV1): PersistedTabGroup => {
  const urls = r.a.map(t => t[0]).filter(u => u.length > 0)
  const incomingU = r.u

  return {
    persistKey: r.k,
    chromeGroupId: null,
    windowId: -1,
    title: r.gt || 'Untitled',
    color: r.c,
    tabCount: urls.length,
    urls,
    isOpen: false,
    closedAt: incomingU,
    createdAt: incomingU,
    lastSeenAt: incomingU,
  }
}

/** Per-`persistKey` LWW: remote row wins iff `u` > local `lastSeenAt`. */
const mergeRemoteRowsIntoLocalGroups = (locals: PersistedTabGroup[], envelope: SyncEnvelopeV1): PersistedTabGroup[] => {
  const byPk = new Map(locals.map(g => [g.persistKey, { ...g }]))

  for (const r of envelope.g) {
    const existing = byPk.get(r.k)
    const incoming = remoteRowAsPersisted(r)

    if (!existing) {
      byPk.set(r.k, incoming)
      continue
    }

    if (r.u <= existing.lastSeenAt) continue

    byPk.set(r.k, {
      ...existing,
      ...incoming,
      persistKey: r.k,
    })
  }

  return [...byPk.values()]
}

export type { SyncEnvelopeV1, SyncGroupRowV1 }

export {
  buildEnvelopeFromRegistryGroups,
  jsonUtf8ByteLength,
  mergeRemoteRowsIntoLocalGroups,
  parseSyncEnvelope,
  SYNC_STORAGE_TOTAL_SAFE_BYTES,
  SYNC_WORKSPACE_ITEM_SAFE_BYTES,
  SYNCED_WORKSPACES_KEY,
}

import { isSyncGroupRowV1, isSyncGroupRowV2, v1RowToV2 } from './tab-groups-sync-row-v2.js'
import type { SyncEnvelopeV1, SyncEnvelopeV2, SyncGroupRowV2 } from './tab-groups-sync-types.js'

const parseV1Envelope = (raw: Record<string, unknown>): SyncEnvelopeV2 | null => {
  if (raw.v !== 1 || !Array.isArray(raw.g)) return null

  const map: Record<string, SyncGroupRowV2> = {}

  for (const row of raw.g) {
    if (!isSyncGroupRowV1(row)) return null
    map[row.k] = v1RowToV2(row)
  }

  return { v: 2, m: map }
}

const parseV2Envelope = (raw: Record<string, unknown>): SyncEnvelopeV2 | null => {
  if (raw.v !== 2 || !raw.m || typeof raw.m !== 'object' || Array.isArray(raw.m)) return null

  const map: Record<string, SyncGroupRowV2> = {}

  for (const [pk, row] of Object.entries(raw.m as Record<string, unknown>)) {
    if (pk.length === 0 || !isSyncGroupRowV2(row)) return null
    map[pk] = row
  }

  return { v: 2, m: map }
}

/** Normalize v1 array or v2 map payloads into a v2 dictionary envelope. */
export const parseSyncPayload = (raw: unknown): SyncEnvelopeV2 | null => {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  if (o.v === 2) return parseV2Envelope(o)
  if (o.v === 1) return parseV1Envelope(o)

  return null
}

/** @deprecated Prefer parseSyncPayload — kept for callers expecting v1 shape. */
export const parseSyncEnvelope = (raw: unknown): SyncEnvelopeV1 | null => {
  const v2 = parseSyncPayload(raw)
  if (!v2) return null

  const g = Object.entries(v2.m).map(([k, row]) => ({
    k,
    gt: row.gt,
    c: row.c,
    u: row.u,
    a: row.a,
  }))
  const t = g.length === 0 ? 0 : Math.max(...g.map(r => r.u))

  return { v: 1, t, g }
}

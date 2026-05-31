/** Cloud profile key matching cross-device-sync spec. */
export const SYNCED_WORKSPACES_KEY = 'synced_workspaces'

/** WHY: Chromium `storage.sync` per-item quota is 8192 bytes; stay under hard limit with margin. */
export const SYNC_WORKSPACE_ITEM_SAFE_BYTES = 7600

/** Spec total quota sanity check (~102KB). Single-key payloads still respect per-item cap first. */
export const SYNC_STORAGE_TOTAL_SAFE_BYTES = 100_000

export type SyncGroupRowV1 = {
  k: string
  gt: string
  c: string
  u: number
  a: Array<[string, string]>
}

export type SyncEnvelopeV1 = {
  v: 1
  t: number
  g: SyncGroupRowV1[]
}

/** Per-key cloud row (v2 map value). `u` is localUpdatedAt / LWW clock. */
export type SyncGroupRowV2 = {
  gt: string
  c: string
  u: number
  a: Array<[string, string]>
}

/** Atomic dictionary payload keyed by immutable persistKey. */
export type SyncEnvelopeV2 = {
  v: 2
  m: Record<string, SyncGroupRowV2>
}

export const jsonUtf8ByteLength = (s: string): number => new TextEncoder().encode(s).length

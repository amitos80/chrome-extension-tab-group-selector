import { selectEligibleSyncGroups } from './tab-groups-sync-eligible.js'
import { mergeSyncMaps } from './tab-groups-sync-lww-merge.js'
import { envelopeV2JsonBytes, toSyncMapFromGroups, trimMapToByteBudget } from './tab-groups-sync-map-v2.js'
import { parseSyncPayload } from './tab-groups-sync-parse.js'
import type { PersistedTabGroup } from './all-tab-groups-registry-types.js'
import type { SyncEnvelopeV2 } from './tab-groups-sync-types.js'
import { SYNC_WORKSPACE_ITEM_SAFE_BYTES } from './tab-groups-sync-types.js'

const logTrimIfNeeded = (before: number, after: number, eligible: PersistedTabGroup[]): void => {
  if (after >= before) return
  const openEligible = eligible.filter(g => g.isOpen).length
  console.info('[TABGROUP_SELECTOR][SYNC][envelope] trimMapToByteBudget dropped keys', {
    dropped: before - after,
    kept: after,
    eligibleOpen: openEligible,
    eligibleClosed: eligible.length - openEligible,
  })
}

/**
 * Build outbound v2 envelope: merge eligible local rows with existing cloud map (per-key LWW), then trim.
 */
export const buildOutboundSyncEnvelope = (
  groups: PersistedTabGroup[],
  remoteRaw: unknown,
): SyncEnvelopeV2 | null => {
  const eligible = selectEligibleSyncGroups(groups)
  const localMap = toSyncMapFromGroups(eligible)
  const remoteMap = parseSyncPayload(remoteRaw)?.m ?? {}
  const merged = mergeSyncMaps(localMap, remoteMap)
  const trimmed = trimMapToByteBudget(merged, SYNC_WORKSPACE_ITEM_SAFE_BYTES)
  const kept = Object.keys(trimmed).length

  logTrimIfNeeded(Object.keys(merged).length, kept, eligible)

  if (kept === 0) return null

  return { v: 2, m: trimmed }
}

/** Local-only envelope (no remote merge) — tests and legacy callers. */
export const buildEnvelopeFromRegistryGroups = (groups: PersistedTabGroup[]): SyncEnvelopeV2 | null =>
  buildOutboundSyncEnvelope(groups, undefined)

export { envelopeV2JsonBytes, toSyncMapFromGroups, trimMapToByteBudget }

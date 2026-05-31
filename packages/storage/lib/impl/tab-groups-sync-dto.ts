import { mergeRemoteMapIntoLocalGroups } from './tab-groups-sync-lww-merge.js'
import type { SyncEnvelopeV1, SyncEnvelopeV2, SyncGroupRowV1, SyncGroupRowV2 } from './tab-groups-sync-types.js'

export type { SyncEnvelopeV1, SyncEnvelopeV2, SyncGroupRowV1, SyncGroupRowV2 }

export {
  SYNC_STORAGE_TOTAL_SAFE_BYTES,
  SYNC_WORKSPACE_ITEM_SAFE_BYTES,
  SYNCED_WORKSPACES_KEY,
  jsonUtf8ByteLength,
} from './tab-groups-sync-types.js'

export { selectEligibleSyncGroups, groupSyncUpdatedAt } from './tab-groups-sync-eligible.js'

export {
  buildEnvelopeFromRegistryGroups,
  buildOutboundSyncEnvelope,
  envelopeV2JsonBytes,
  toSyncMapFromGroups,
  trimMapToByteBudget,
} from './tab-groups-sync-outbound.js'

export { parseSyncEnvelope, parseSyncPayload } from './tab-groups-sync-parse.js'

export { mergeSyncMaps, mergeRemoteMapIntoLocalGroups } from './tab-groups-sync-lww-merge.js'

/** @deprecated Use mergeRemoteMapIntoLocalGroups with SyncEnvelopeV2.m */
export const mergeRemoteRowsIntoLocalGroups = (
  locals: Parameters<typeof mergeRemoteMapIntoLocalGroups>[0],
  envelope: SyncEnvelopeV1,
): ReturnType<typeof mergeRemoteMapIntoLocalGroups> => {
  const remoteMap: Record<string, SyncGroupRowV2> = {}

  for (const row of envelope.g) {
    remoteMap[row.k] = { gt: row.gt, c: row.c, u: row.u, a: row.a }
  }

  return mergeRemoteMapIntoLocalGroups(locals, remoteMap)
}

import type { PersistedTabGroup } from './all-tab-groups-registry-types.js'
import { remoteRowAsPersistedFromV2 } from './tab-groups-sync-row-v2.js'
import type { SyncGroupRowV2 } from './tab-groups-sync-types.js'

/** Per-key LWW for cloud map: local wins when `u` is newer or equal (outbound push after local edit). */
export const mergeSyncMaps = (
  localMap: Record<string, SyncGroupRowV2>,
  remoteMap: Record<string, SyncGroupRowV2>,
): Record<string, SyncGroupRowV2> => {
  const merged: Record<string, SyncGroupRowV2> = { ...remoteMap }

  for (const [pk, localItem] of Object.entries(localMap)) {
    const remoteItem = merged[pk]
    if (!remoteItem || localItem.u >= remoteItem.u) {
      merged[pk] = localItem
    }
  }

  return merged
}

/** Per-`persistKey` LWW into local registry: remote wins iff `u` > local `lastSeenAt`. */
export const mergeRemoteMapIntoLocalGroups = (
  locals: PersistedTabGroup[],
  remoteMap: Record<string, SyncGroupRowV2>,
): PersistedTabGroup[] => {
  const byPk = new Map(locals.map(g => [g.persistKey, { ...g }]))

  for (const [pk, row] of Object.entries(remoteMap)) {
    const existing = byPk.get(pk)
    const incoming = remoteRowAsPersistedFromV2(pk, row)

    if (!existing) {
      byPk.set(pk, incoming)
      continue
    }

    if (row.u <= existing.lastSeenAt) continue

    byPk.set(pk, {
      ...existing,
      ...incoming,
      persistKey: pk,
    })
  }

  return [...byPk.values()]
}

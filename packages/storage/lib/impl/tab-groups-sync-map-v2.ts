import type { PersistedTabGroup } from './all-tab-groups-registry-types.js'
import { groupSyncUpdatedAt } from './tab-groups-sync-eligible.js'
import type { SyncEnvelopeV2, SyncGroupRowV2 } from './tab-groups-sync-types.js'
import { jsonUtf8ByteLength } from './tab-groups-sync-types.js'

export const toSyncMapFromGroups = (groups: PersistedTabGroup[]): Record<string, SyncGroupRowV2> => {
  const map: Record<string, SyncGroupRowV2> = {}

  for (const g of groups) {
    map[g.persistKey] = {
      gt: g.title || '',
      c: g.color,
      u: groupSyncUpdatedAt(g),
      a: (g.urls ?? []).map((url): [string, string] => [url, '']),
    }
  }

  return map
}

export const envelopeV2JsonBytes = (map: Record<string, SyncGroupRowV2>): number => {
  const env: SyncEnvelopeV2 = { v: 2, m: map }

  return jsonUtf8ByteLength(JSON.stringify(env))
}

const sortedMapEntriesByUpdatedAtAsc = (map: Record<string, SyncGroupRowV2>): Array<[string, SyncGroupRowV2]> =>
  Object.entries(map).sort((a, b) => a[1].u - b[1].u)

export const trimMapToByteBudget = (
  map: Record<string, SyncGroupRowV2>,
  maxBytes: number,
): Record<string, SyncGroupRowV2> => {
  const cur: Record<string, SyncGroupRowV2> = { ...map }

  while (Object.keys(cur).length > 0 && envelopeV2JsonBytes(cur) > maxBytes) {
    const [dropKey] = sortedMapEntriesByUpdatedAtAsc(cur)[0]
    delete cur[dropKey]
  }

  return cur
}

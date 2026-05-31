import type { PersistedTabGroup } from './all-tab-groups-registry-types.js'

/** Any registry row with URLs (open snapshot or closed). */
export const selectEligibleSyncGroups = (groups: PersistedTabGroup[]): PersistedTabGroup[] =>
  groups.filter(g => (g.urls?.length ?? 0) > 0).sort((a, b) => b.lastSeenAt - a.lastSeenAt)

/** High-precision LWW timestamp for sync rows. */
export const groupSyncUpdatedAt = (g: PersistedTabGroup): number =>
  Math.max(g.lastSeenAt, g.closedAt ?? 0, g.createdAt)

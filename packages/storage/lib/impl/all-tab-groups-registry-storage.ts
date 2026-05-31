import { newPersistKey } from './all-tab-groups-registry-helpers.js'
import {
  ensureRegistryDedupeVersionDefault as runEnsureRegistryDedupeVersionDefault,
  ensureRegistryUniqueTitleVersionDefault as runEnsureRegistryUniqueTitleVersionDefault,
  ensureUrlsFieldDefaults as runEnsureUrlsFieldDefaults,
  migrateLegacyTabGroupHistoryIfNeeded as runMigrateLegacyTabGroupHistoryIfNeeded,
  runRegistryOpenClosedFingerprintsDedupeIfNeeded as runRegistryFingerprintDedupeIfNeeded,
  runRegistryUniqueTitleCollapseIfNeeded as runRegistryUniqueTitleCollapseIfNeeded,
} from './all-tab-groups-registry-migrate.js'
import { applyOpenGroupUpsert } from './tab-group-open-upsert.js'
import { finalizeRegistryGroupsForPersistence } from './tab-group-registry-unique-title.js'
import { mergeRemoteMapIntoLocalGroups } from './tab-groups-sync-dto.js'
import { createStorage, StorageEnum } from '../base/index.js'
import type { AllTabGroupsRegistryState, PersistedTabGroup } from './all-tab-groups-registry-types.js'
import type { SyncEnvelopeV2 } from './tab-groups-sync-dto.js'

const ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY = 'all-tab-groups-registry-storage-key-v1'

const storage = createStorage<AllTabGroupsRegistryState>(
  ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY,
  {
    groups: [],
    migratedFromLegacyHistoryAt: null,
    registryDedupeVersion: 0,
    registryUniqueTitleVersion: 0,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
)

type AllTabGroupsRegistryStorageType = typeof storage & {
  upsertOpenFromChrome: (
    group: chrome.tabGroups.TabGroup,
    tabCount: number,
    urlsSnapshot?: string[],
  ) => Promise<void>
  markClosedFromRemovedGroup: (
    group: chrome.tabGroups.TabGroup,
    tabCount: number,
    urlsSnapshot?: string[],
  ) => Promise<void>
  removeByPersistKey: (persistKey: string) => Promise<void>
  getPersistedByKey: (persistKey: string) => Promise<PersistedTabGroup | undefined>
  migrateLegacyTabGroupHistoryIfNeeded: () => Promise<void>
  ensureUrlsFieldDefaults: () => Promise<void>
  ensureRegistryDedupeVersionDefault: () => Promise<void>
  runRegistryFingerprintDedupeOnce: () => Promise<void>
  ensureRegistryUniqueTitleVersionDefault: () => Promise<void>
  runRegistryUniqueTitleCollapseOnce: () => Promise<void>
  mergeRemoteSyncEnvelope: (envelope: SyncEnvelopeV2) => Promise<void>
}

const allTabGroupsRegistryStorage: AllTabGroupsRegistryStorageType = {
  ...storage,
  upsertOpenFromChrome: async (group, tabCount, urlsSnapshot) => {
    await storage.set(prev => ({
      ...prev,
      groups: finalizeRegistryGroupsForPersistence(
        applyOpenGroupUpsert(prev.groups, group, tabCount, urlsSnapshot),
      ),
    }))
  },

  markClosedFromRemovedGroup: async (group: chrome.tabGroups.TabGroup, tabCount: number, urlsSnapshot?: string[]) => {
    await storage.set(prev => {
      const groups = [...prev.groups]
      const idx = groups.findIndex(g => g.isOpen && g.chromeGroupId === group.id)
      const now = Date.now()
      const urlsForClosed = urlsSnapshot !== undefined ? urlsSnapshot : idx >= 0 ? (groups[idx].urls ?? []) : []
      if (idx >= 0) {
        groups[idx] = {
          ...groups[idx],
          isOpen: false,
          chromeGroupId: null,
          closedAt: now,
          tabCount,
          urls: urlsForClosed,
          title: group.title || groups[idx].title,
          color: group.color,
          windowId: group.windowId,
          lastSeenAt: now,
        }
      } else {
        groups.push({
          persistKey: newPersistKey(),
          chromeGroupId: null,
          windowId: group.windowId,
          title: group.title || 'Untitled',
          color: group.color,
          tabCount,
          urls: urlsForClosed,
          isOpen: false,
          closedAt: now,
          createdAt: now,
          lastSeenAt: now,
        })
      }
      return { ...prev, groups: finalizeRegistryGroupsForPersistence(groups) }
    })
  },

  removeByPersistKey: async (persistKey: string) => {
    await storage.set(prev => ({
      ...prev,
      groups: finalizeRegistryGroupsForPersistence(prev.groups.filter(g => g.persistKey !== persistKey)),
    }))
  },

  getPersistedByKey: async (persistKey: string) => {
    const state = await storage.get()
    return state.groups.find(g => g.persistKey === persistKey)
  },

  migrateLegacyTabGroupHistoryIfNeeded: async () => {
    await runMigrateLegacyTabGroupHistoryIfNeeded(storage.get.bind(storage), storage.set.bind(storage))
  },

  ensureUrlsFieldDefaults: async () => {
    await runEnsureUrlsFieldDefaults(storage.set.bind(storage))
  },

  ensureRegistryDedupeVersionDefault: async () => {
    await runEnsureRegistryDedupeVersionDefault(storage.set.bind(storage))
  },

  runRegistryFingerprintDedupeOnce: async () => {
    await runRegistryFingerprintDedupeIfNeeded(storage.get.bind(storage), storage.set.bind(storage))
  },

  ensureRegistryUniqueTitleVersionDefault: async () => {
    await runEnsureRegistryUniqueTitleVersionDefault(storage.set.bind(storage))
  },

  runRegistryUniqueTitleCollapseOnce: async () => {
    await runRegistryUniqueTitleCollapseIfNeeded(storage.get.bind(storage), storage.set.bind(storage))
  },

  mergeRemoteSyncEnvelope: async envelope => {
    await storage.set(prev => ({
      ...prev,
      groups: finalizeRegistryGroupsForPersistence(mergeRemoteMapIntoLocalGroups(prev.groups, envelope.m)),
    }))
  },
}

export type {
  AllTabGroupsRegistryState,
  PersistedTabGroup,
  SwitcherTabGroupEntry,
  TabGroupsSnapshotResponse,
} from './all-tab-groups-registry-types.js'

export type { AllTabGroupsRegistryStorageType }

export { ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY, allTabGroupsRegistryStorage }

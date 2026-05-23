import { createStorage, StorageEnum } from '../base/index.js'

const AUTO_GROUPING_PREFERENCE_STORAGE_KEY = 'auto-grouping-preference-v1'

interface AutoGroupingPreferenceState {
  /** When false, the background skips auto-group even if Premium rules exist. */
  autoGroupingEnabled: boolean
}

const fallback: AutoGroupingPreferenceState = {
  autoGroupingEnabled: true,
}

const storage = createStorage<AutoGroupingPreferenceState>(AUTO_GROUPING_PREFERENCE_STORAGE_KEY, fallback, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
})

type AutoGroupingPreferenceStorageType = typeof storage & {
  setAutoGroupingEnabled: (enabled: boolean) => Promise<void>
}

const autoGroupingPreferenceStorage: AutoGroupingPreferenceStorageType = {
  ...storage,
  setAutoGroupingEnabled: async enabled => {
    const prev = await storage.get()

    await storage.set({ ...fallback, ...prev, autoGroupingEnabled: enabled })
  },
}

export type { AutoGroupingPreferenceState }

export type { AutoGroupingPreferenceStorageType }

export { AUTO_GROUPING_PREFERENCE_STORAGE_KEY, autoGroupingPreferenceStorage }

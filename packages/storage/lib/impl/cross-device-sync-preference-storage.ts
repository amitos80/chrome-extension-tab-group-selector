import { createStorage, StorageEnum } from '../base/index.js'

/** WHY: Background `onChanged` and E2E can target the same chrome.storage.local key. */
export const CROSS_DEVICE_SYNC_PREFERENCE_STORAGE_KEY = 'cross-device-sync-preference-v1'

export interface CrossDeviceSyncPreferenceState {
  /** User opt-in for extension-managed tab group sync; default off on install. */
  crossDeviceTabGroupsSyncEnabled: boolean
}

const storage = createStorage<CrossDeviceSyncPreferenceState>(
  CROSS_DEVICE_SYNC_PREFERENCE_STORAGE_KEY,
  {
    crossDeviceTabGroupsSyncEnabled: false,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
)

export type CrossDeviceSyncPreferenceStorageType = typeof storage & {
  setCrossDeviceTabGroupsSyncEnabled: (value: boolean) => Promise<void>
}

export const crossDeviceSyncPreferenceStorage: CrossDeviceSyncPreferenceStorageType = {
  ...storage,
  setCrossDeviceTabGroupsSyncEnabled: async (value: boolean) => {
    await storage.set({ crossDeviceTabGroupsSyncEnabled: value })
  },
}

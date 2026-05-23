import { createStorage, StorageEnum } from '../base/index.js'

const PREMIUM_ENTITLEMENT_STORAGE_KEY = 'premium-entitlement-v1'

interface PremiumEntitlementState {
  /**
   * When true, treat extension as Premium (dev/testing until Chrome Web Store / license API replaces this).
   */
  manualPremiumUnlock: boolean
}

const fallback: PremiumEntitlementState = {
  manualPremiumUnlock: false,
}

const storage = createStorage<PremiumEntitlementState>(PREMIUM_ENTITLEMENT_STORAGE_KEY, fallback, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
})

type PremiumEntitlementStorageType = typeof storage & {
  setManualPremiumUnlock: (enabled: boolean) => Promise<void>
}

const premiumEntitlementStorage: PremiumEntitlementStorageType = {
  ...storage,
  setManualPremiumUnlock: async enabled => {
    const prev = await storage.get()

    await storage.set({ ...fallback, ...prev, manualPremiumUnlock: enabled })
  },
}

export type { PremiumEntitlementState }

export type { PremiumEntitlementStorageType }

export { PREMIUM_ENTITLEMENT_STORAGE_KEY, premiumEntitlementStorage }

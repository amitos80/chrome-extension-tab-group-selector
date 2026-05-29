import { createStorage, StorageEnum } from '../base/index.js'

const PREMIUM_ENTITLEMENT_STORAGE_KEY = 'premium-entitlement-v1'

export type LicenseType = 'none' | 'subscription' | 'lifetime'

export interface PremiumEntitlementState {
  trialStartedAt: number | null
  licenseKey: string | null
  licenseInstanceId: string | null
  licenseType: LicenseType
  subscriptionExpiresAt: number | null
  lastValidatedAt: number | null
  /** Dev/testing override; production UI hides the toggle. */
  manualPremiumUnlock: boolean
}

export type LicenseValidationPatch = {
  licenseKey: string
  licenseInstanceId: string
  licenseType: LicenseType
  subscriptionExpiresAt: number | null
  lastValidatedAt: number
}

const fallback: PremiumEntitlementState = {
  trialStartedAt: null,
  licenseKey: null,
  licenseInstanceId: null,
  licenseType: 'none',
  subscriptionExpiresAt: null,
  lastValidatedAt: null,
  manualPremiumUnlock: false,
}

const normalizeEntitlementState = function normalizeEntitlementState(
  raw: Partial<PremiumEntitlementState> & { manualPremiumUnlock?: boolean },
): PremiumEntitlementState {
  return {
    trialStartedAt: raw.trialStartedAt ?? null,
    licenseKey: raw.licenseKey ?? null,
    licenseInstanceId: raw.licenseInstanceId ?? null,
    licenseType: raw.licenseType ?? 'none',
    subscriptionExpiresAt: raw.subscriptionExpiresAt ?? null,
    lastValidatedAt: raw.lastValidatedAt ?? null,
    manualPremiumUnlock: raw.manualPremiumUnlock === true,
  }
}

const migrateLegacyEntitlement = function migrateLegacyEntitlement(
  raw: Partial<PremiumEntitlementState>,
): PremiumEntitlementState {
  if (raw.trialStartedAt !== undefined || raw.licenseType !== undefined) {
    return normalizeEntitlementState(raw)
  }
  return normalizeEntitlementState({ manualPremiumUnlock: raw.manualPremiumUnlock })
}

const baseStorage = createStorage<PremiumEntitlementState>(PREMIUM_ENTITLEMENT_STORAGE_KEY, fallback, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
})

type PremiumEntitlementStorageType = typeof baseStorage & {
  setManualPremiumUnlock: (enabled: boolean) => Promise<void>
  startTrialOnFreshInstall: () => Promise<void>
  setLicenseFromValidation: (patch: LicenseValidationPatch) => Promise<void>
  clearLicense: () => Promise<void>
}

const getMigrated = async (): Promise<PremiumEntitlementState> => {
  const prev = await baseStorage.get()
  const migrated = migrateLegacyEntitlement(prev)
  const isLegacyShape = prev.trialStartedAt === undefined && prev.licenseType === undefined
  if (isLegacyShape) {
    await baseStorage.set(migrated)
  }
  return migrated
}

const premiumEntitlementStorage: PremiumEntitlementStorageType = {
  get: getMigrated,
  set: baseStorage.set.bind(baseStorage),
  getSnapshot: baseStorage.getSnapshot.bind(baseStorage),
  subscribe: baseStorage.subscribe.bind(baseStorage),
  setManualPremiumUnlock: async enabled => {
    const prev = await getMigrated()
    await baseStorage.set({ ...prev, manualPremiumUnlock: enabled })
  },
  startTrialOnFreshInstall: async () => {
    const prev = await getMigrated()
    if (prev.trialStartedAt != null) {
      return
    }
    await baseStorage.set({ ...prev, trialStartedAt: Date.now() })
  },
  setLicenseFromValidation: async patch => {
    const prev = await getMigrated()
    await baseStorage.set({
      ...prev,
      licenseKey: patch.licenseKey,
      licenseInstanceId: patch.licenseInstanceId,
      licenseType: patch.licenseType,
      subscriptionExpiresAt: patch.subscriptionExpiresAt,
      lastValidatedAt: patch.lastValidatedAt,
    })
  },
  clearLicense: async () => {
    const prev = await getMigrated()
    await baseStorage.set({
      ...prev,
      licenseKey: null,
      licenseInstanceId: null,
      licenseType: 'none',
      subscriptionExpiresAt: null,
      lastValidatedAt: null,
    })
  },
}

export type { PremiumEntitlementStorageType }

export { PREMIUM_ENTITLEMENT_STORAGE_KEY, premiumEntitlementStorage }

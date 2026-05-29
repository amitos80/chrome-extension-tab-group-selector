import { premiumEntitlementStorage, resolvePremiumAccess } from '@extension/storage'
import type { PremiumAccessStatus } from '@extension/storage'

/** Resolves Premium tier; used by auto-grouping, sync, snapshots, and UI hooks. */
export const checkPremiumStatus = async (): Promise<boolean> => {
  const state = await premiumEntitlementStorage.get()
  return resolvePremiumAccess(state).isPremium
}

export const getEntitlementStatus = async (): Promise<PremiumAccessStatus> => {
  const state = await premiumEntitlementStorage.get()
  return resolvePremiumAccess(state)
}

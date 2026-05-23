import { premiumEntitlementStorage } from '@extension/storage'

/** Resolves Premium tier; Free tier skips auto-grouping and other gated features. */
export const checkPremiumStatus = async (): Promise<boolean> => {
  const s = await premiumEntitlementStorage.get()

  return s.manualPremiumUnlock === true
}

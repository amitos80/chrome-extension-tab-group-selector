import { checkPremiumStatus } from './entitlements'
import { crossDeviceSyncPreferenceStorage } from '@extension/storage'

export type CrossDeviceSyncSkipReason = 'premium_off' | 'toggle_off'

/** Sync runs only when Premium is active and the user opted in via Options. */
export const resolveCrossDeviceSyncAllowed = async (): Promise<{
  allowed: boolean
  skipReason?: CrossDeviceSyncSkipReason
}> => {
  const [premium, prefs] = await Promise.all([checkPremiumStatus(), crossDeviceSyncPreferenceStorage.get()])

  if (!premium) {
    return { allowed: false, skipReason: 'premium_off' }
  }

  if (!prefs.crossDeviceTabGroupsSyncEnabled) {
    return { allowed: false, skipReason: 'toggle_off' }
  }

  return { allowed: true }
}

export const isCrossDeviceSyncAllowed = async (): Promise<boolean> => {
  const { allowed } = await resolveCrossDeviceSyncAllowed()

  return allowed
}

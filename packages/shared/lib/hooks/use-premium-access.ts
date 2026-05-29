import { premiumEntitlementStorage, resolvePremiumAccess } from '@extension/storage'
import type { PremiumAccessStatus } from '@extension/storage'
import { useMemo } from 'react'
import { useStorage } from './use-storage.js'

/** Reactive Premium tier for UI (trial, subscription, lifetime, dev, free). */
export const usePremiumAccess = function usePremiumAccess(): PremiumAccessStatus {
  const state = useStorage(premiumEntitlementStorage)
  return useMemo(() => resolvePremiumAccess(state), [state])
}

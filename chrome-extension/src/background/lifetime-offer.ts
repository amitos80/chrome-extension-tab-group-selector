import {
  LIFETIME_LAUNCH_MAX_PURCHASES,
  PRICE_LIFETIME_LAUNCH_USD,
  PRICE_LIFETIME_USD,
  type LifetimeOfferStatus,
} from '@extension/storage'
import { lsLifetimeLaunchActive } from './lemon-squeezy-config.js'

export const getLifetimeOfferStatus = function getLifetimeOfferStatus(): LifetimeOfferStatus {
  return {
    launchActive: lsLifetimeLaunchActive(),
    launchPriceUsd: PRICE_LIFETIME_LAUNCH_USD,
    standardPriceUsd: PRICE_LIFETIME_USD,
    launchMaxPurchases: LIFETIME_LAUNCH_MAX_PURCHASES,
  }
}

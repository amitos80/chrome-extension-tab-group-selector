/** 14-day full-feature trial length. */
export const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000

/** Subscription revalidation may fail offline; honor last good validation for this window. */
export const LICENSE_OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000

/** Display-only; Lemon Squeezy checkout is authoritative. */
export const PRICE_YEARLY_USD = 17.99

/** Standard lifetime price after launch offer ends. */
export const PRICE_LIFETIME_USD = 36.99

/** Limited launch lifetime price (first tranche of buyers). */
export const PRICE_LIFETIME_LAUNCH_USD = 24.99

/** Max lifetime licenses sold at launch price before reverting to {@link PRICE_LIFETIME_USD}. */
export const LIFETIME_LAUNCH_MAX_PURCHASES = 2500

export type LifetimeOfferStatus = {
  launchActive: boolean
  launchPriceUsd: number
  standardPriceUsd: number
  launchMaxPurchases: number
}

/** Default UI snapshot when background offer status has not loaded yet. */
export const defaultLifetimeOfferStatus = function defaultLifetimeOfferStatus(): LifetimeOfferStatus {
  return {
    launchActive: true,
    launchPriceUsd: PRICE_LIFETIME_LAUNCH_USD,
    standardPriceUsd: PRICE_LIFETIME_USD,
    launchMaxPurchases: LIFETIME_LAUNCH_MAX_PURCHASES,
  }
}

export const LICENSE_VALIDATION_ALARM_NAME = 'license-validation-daily'

/** Daily license revalidation interval (Chrome alarms minimum is 1 minute in dev; 24h in prod). */
export const LICENSE_VALIDATION_PERIOD_MINUTES = 24 * 60

const formatUsdPrice = function formatUsdPrice(price: number): string {
  return price.toFixed(2)
}

export const yearlyCheckoutButtonLabel = function yearlyCheckoutButtonLabel(): string {
  return `Subscribe - $${formatUsdPrice(PRICE_YEARLY_USD)}/year`
}

export const lifetimeCheckoutButtonLabel = function lifetimeCheckoutButtonLabel(offer: LifetimeOfferStatus): string {
  if (offer.launchActive) {
    return `Lifetime - $${formatUsdPrice(offer.launchPriceUsd)} launch offer`
  }
  return `Lifetime - $${formatUsdPrice(offer.standardPriceUsd)} one-time`
}

export const lifetimeLaunchOfferNotice = function lifetimeLaunchOfferNotice(offer: LifetimeOfferStatus): string {
  return `Limited launch pricing: lifetime for $${formatUsdPrice(offer.launchPriceUsd)} for the first ${offer.launchMaxPurchases} customers only — then $${formatUsdPrice(offer.standardPriceUsd)}. Same Premium features, one payment, yours forever.`
}

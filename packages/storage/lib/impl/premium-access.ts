import { LICENSE_OFFLINE_GRACE_MS, TRIAL_DURATION_MS } from '../billing-constants.js'
import type { PremiumEntitlementState } from './premium-entitlement-storage.js'

export type PremiumAccessReason = 'trial' | 'subscription' | 'lifetime' | 'dev' | 'free'

export type PremiumAccessStatus = {
  isPremium: boolean
  reason: PremiumAccessReason
  trialEndsAt: number | null
  daysLeftInTrial: number | null
}

const msPerDay = 24 * 60 * 60 * 1000

const trialEndsAt = function trialEndsAt(state: PremiumEntitlementState): number | null {
  if (state.trialStartedAt == null) {
    return null
  }
  return state.trialStartedAt + TRIAL_DURATION_MS
}

const isTrialActive = function isTrialActive(state: PremiumEntitlementState, now: number): boolean {
  const ends = trialEndsAt(state)
  return ends != null && now < ends
}

const daysLeftInTrial = function daysLeftInTrial(state: PremiumEntitlementState, now: number): number | null {
  const ends = trialEndsAt(state)
  if (ends == null || now >= ends) {
    return null
  }
  return Math.max(0, Math.ceil((ends - now) / msPerDay))
}

const subscriptionStillValid = function subscriptionStillValid(state: PremiumEntitlementState, now: number): boolean {
  if (state.licenseType !== 'subscription' || !state.licenseKey) {
    return false
  }
  if (state.subscriptionExpiresAt != null && state.subscriptionExpiresAt > now) {
    return true
  }
  if (state.lastValidatedAt != null && now - state.lastValidatedAt <= LICENSE_OFFLINE_GRACE_MS) {
    return true
  }
  return false
}

const lifetimeStillValid = function lifetimeStillValid(state: PremiumEntitlementState): boolean {
  return state.licenseType === 'lifetime' && Boolean(state.licenseKey) && state.lastValidatedAt != null
}

/** Single source of truth for Premium tier (UI + background). */
export const resolvePremiumAccess = function resolvePremiumAccess(
  state: PremiumEntitlementState,
  now = Date.now(),
): PremiumAccessStatus {
  if (state.manualPremiumUnlock) {
    return {
      isPremium: true,
      reason: 'dev',
      trialEndsAt: trialEndsAt(state),
      daysLeftInTrial: daysLeftInTrial(state, now),
    }
  }

  if (lifetimeStillValid(state)) {
    return {
      isPremium: true,
      reason: 'lifetime',
      trialEndsAt: trialEndsAt(state),
      daysLeftInTrial: daysLeftInTrial(state, now),
    }
  }

  if (subscriptionStillValid(state, now)) {
    return {
      isPremium: true,
      reason: 'subscription',
      trialEndsAt: trialEndsAt(state),
      daysLeftInTrial: daysLeftInTrial(state, now),
    }
  }

  if (isTrialActive(state, now)) {
    return {
      isPremium: true,
      reason: 'trial',
      trialEndsAt: trialEndsAt(state),
      daysLeftInTrial: daysLeftInTrial(state, now),
    }
  }

  return {
    isPremium: false,
    reason: 'free',
    trialEndsAt: trialEndsAt(state),
    daysLeftInTrial: daysLeftInTrial(state, now),
  }
}

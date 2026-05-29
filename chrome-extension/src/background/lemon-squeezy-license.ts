import type { LicenseType, LicenseValidationPatch } from '@extension/storage'
import { premiumEntitlementStorage } from '@extension/storage'
import {
  lsApiConfigured,
  lsApiKey,
  lsVariantLifetimeId,
  lsVariantLifetimeLaunchId,
  lsVariantYearlyId,
} from './lemon-squeezy-config.js'

const LS_ACTIVATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/activate'
const LS_VALIDATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate'

type LsLicensePayload = {
  error?: string | null
  activated?: boolean
  valid?: boolean
  license_key?: { status?: string; expires_at?: string | null }
  instance?: { id?: string }
  meta?: { variant_id?: number }
}

const instanceLabel = function instanceLabel(): string {
  return `tabgroup-selector-${chrome.runtime.id}`
}

const postLicense = async function postLicense(
  url: string,
  body: Record<string, string>,
): Promise<LsLicensePayload> {
  const apiKey = lsApiKey()
  if (!apiKey) {
    return { error: 'Billing API is not configured.' }
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as LsLicensePayload
  if (!res.ok) {
    return { error: json.error ?? `License request failed (${res.status})` }
  }
  return json
}

const parseExpiresAt = function parseExpiresAt(iso: string | null | undefined): number | null {
  if (!iso) {
    return null
  }
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

const licenseTypeFromVariant = function licenseTypeFromVariant(variantId: number | undefined): LicenseType {
  const lifetime = lsVariantLifetimeId()
  const launchLifetime = lsVariantLifetimeLaunchId()
  const yearly = lsVariantYearlyId()
  if (launchLifetime && String(variantId) === launchLifetime) {
    return 'lifetime'
  }
  if (lifetime && String(variantId) === lifetime) {
    return 'lifetime'
  }
  if (yearly && String(variantId) === yearly) {
    return 'subscription'
  }
  return 'subscription'
}

const patchFromPayload = function patchFromPayload(
  licenseKey: string,
  payload: LsLicensePayload,
): LicenseValidationPatch | null {
  const instanceId = payload.instance?.id
  if (!instanceId) {
    return null
  }
  const licenseType = licenseTypeFromVariant(payload.meta?.variant_id)
  return {
    licenseKey,
    licenseInstanceId: instanceId,
    licenseType,
    subscriptionExpiresAt: parseExpiresAt(payload.license_key?.expires_at),
    lastValidatedAt: Date.now(),
  }
}

export const activateLicenseKey = async function activateLicenseKey(
  licenseKey: string,
): Promise<{ success: boolean; error?: string }> {
  if (!lsApiConfigured()) {
    return { success: false, error: 'Billing API is not configured.' }
  }
  const trimmed = licenseKey.trim()
  if (!trimmed) {
    return { success: false, error: 'Enter a license key.' }
  }
  const payload = await postLicense(LS_ACTIVATE_URL, {
    license_key: trimmed,
    instance_name: instanceLabel(),
  })
  if (payload.error) {
    return { success: false, error: payload.error }
  }
  if (!payload.activated) {
    return { success: false, error: payload.error ?? 'Activation failed.' }
  }
  const patch = patchFromPayload(trimmed, payload)
  if (!patch) {
    return { success: false, error: 'Invalid activation response.' }
  }
  await premiumEntitlementStorage.setLicenseFromValidation(patch)
  return { success: true }
}

export const validateStoredLicense = async function validateStoredLicense(): Promise<{
  success: boolean
  error?: string
}> {
  if (!lsApiConfigured()) {
    return { success: false, error: 'Billing API is not configured.' }
  }
  const state = await premiumEntitlementStorage.get()
  const key = state.licenseKey?.trim()
  const instanceId = state.licenseInstanceId?.trim()
  if (!key || !instanceId) {
    return { success: false, error: 'No license on this device.' }
  }
  const payload = await postLicense(LS_VALIDATE_URL, {
    license_key: key,
    instance_id: instanceId,
  })
  if (payload.error) {
    return { success: false, error: payload.error }
  }
  if (!payload.valid) {
    await premiumEntitlementStorage.clearLicense()
    return { success: false, error: payload.error ?? 'License is not valid.' }
  }
  const patch = patchFromPayload(key, payload)
  if (!patch) {
    return { success: false, error: 'Invalid validation response.' }
  }
  await premiumEntitlementStorage.setLicenseFromValidation(patch)
  return { success: true }
}

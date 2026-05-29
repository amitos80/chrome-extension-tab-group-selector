const readEnv = function readEnv(key: string): string {
  const v = process.env[key]
  return typeof v === 'string' ? v.trim() : ''
}

export const lsApiKey = (): string => readEnv('CLI_CEB_LS_API_KEY')

export const lsVariantYearlyId = (): string => readEnv('CLI_CEB_LS_VARIANT_YEARLY_ID')

export const lsVariantLifetimeId = (): string => readEnv('CLI_CEB_LS_VARIANT_LIFETIME_ID')

export const lsVariantLifetimeLaunchId = (): string => readEnv('CLI_CEB_LS_VARIANT_LIFETIME_LAUNCH_ID')

export const lsCheckoutYearlyUrl = (): string => readEnv('CLI_CEB_LS_CHECKOUT_YEARLY_URL')

export const lsCheckoutLifetimeUrl = (): string => readEnv('CLI_CEB_LS_CHECKOUT_LIFETIME_URL')

export const lsCheckoutLifetimeLaunchUrl = (): string => readEnv('CLI_CEB_LS_CHECKOUT_LIFETIME_LAUNCH_URL')

/** When false, UI and checkout use standard $37 lifetime (set after 2,500 launch sales in Lemon Squeezy). */
export const lsLifetimeLaunchActive = function lsLifetimeLaunchActive(): boolean {
  const raw = readEnv('CLI_CEB_LS_LIFETIME_LAUNCH_ACTIVE')
  if (raw.length === 0) {
    return true
  }
  return raw === 'true' || raw === '1'
}

export const lsLifetimeCheckoutUrl = function lsLifetimeCheckoutUrl(): string {
  if (lsLifetimeLaunchActive()) {
    const launch = lsCheckoutLifetimeLaunchUrl()
    if (launch.length > 0) {
      return launch
    }
  }
  return lsCheckoutLifetimeUrl()
}

export const lsApiConfigured = function lsApiConfigured(): boolean {
  return lsApiKey().length > 0
}

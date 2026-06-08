const readEnv = function readEnv(key: string): string {
  const v = process.env[key]
  return typeof v === 'string' ? v.trim() : ''
}

export const lsVariantYearlyId = (): string => readEnv('CLI_CEB_LS_VARIANT_YEARLY_ID')

export const lsVariantLifetimeId = (): string => readEnv('CLI_CEB_LS_VARIANT_LIFETIME_ID')

export const lsVariantLifetimeLaunchId = (): string => readEnv('CLI_CEB_LS_VARIANT_LIFETIME_LAUNCH_ID')

export const lsCheckoutYearlyUrl = (): string => readEnv('CLI_CEB_LS_CHECKOUT_YEARLY_URL')

export const lsCheckoutLifetimeUrl = (): string => readEnv('CLI_CEB_LS_CHECKOUT_LIFETIME_URL')

export const lsCheckoutLifetimeLaunchUrl = (): string => readEnv('CLI_CEB_LS_CHECKOUT_LIFETIME_LAUNCH_URL')

export const lsLifetimeDiscountCode = (): string => readEnv('CLI_CEB_LS_LIFETIME_DISCOUNT_CODE')

/** When false, UI and checkout use standard $37 lifetime (set after 2,500 launch sales in Lemon Squeezy). */
export const lsLifetimeLaunchActive = function lsLifetimeLaunchActive(): boolean {
  const raw = readEnv('CLI_CEB_LS_LIFETIME_LAUNCH_ACTIVE')
  if (raw.length === 0) {
    return true
  }
  return raw === 'true' || raw === '1'
}

const appendCheckoutDiscountCode = function appendCheckoutDiscountCode(url: string, code: string): string {
  if (url.length === 0 || code.length === 0) {
    return url
  }
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}checkout[discount_code]=${encodeURIComponent(code)}`
}

export const lsLifetimeCheckoutUrl = function lsLifetimeCheckoutUrl(): string {
  if (lsLifetimeLaunchActive()) {
    const launch = lsCheckoutLifetimeLaunchUrl()
    const base = launch.length > 0 ? launch : lsCheckoutLifetimeUrl()
    return appendCheckoutDiscountCode(base, lsLifetimeDiscountCode())
  }
  return lsCheckoutLifetimeUrl()
}

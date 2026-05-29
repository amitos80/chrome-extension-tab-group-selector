import type { dynamicEnvValues } from './index.js'

interface ICebEnv {
  readonly CEB_EXAMPLE: string
  readonly CEB_DEV_LOCALE: string
}

interface ICebCliEnv {
  readonly CLI_CEB_DEV: string
  readonly CLI_CEB_FIREFOX: string
  readonly CLI_CEB_LS_API_KEY: string
  readonly CLI_CEB_LS_CHECKOUT_YEARLY_URL: string
  readonly CLI_CEB_LS_CHECKOUT_LIFETIME_URL: string
  readonly CLI_CEB_LS_CHECKOUT_LIFETIME_LAUNCH_URL: string
  readonly CLI_CEB_LS_LIFETIME_LAUNCH_ACTIVE: string
  readonly CLI_CEB_LS_VARIANT_YEARLY_ID: string
  readonly CLI_CEB_LS_VARIANT_LIFETIME_ID: string
  readonly CLI_CEB_LS_VARIANT_LIFETIME_LAUNCH_ID: string
}

export type EnvType = ICebEnv & ICebCliEnv & typeof dynamicEnvValues

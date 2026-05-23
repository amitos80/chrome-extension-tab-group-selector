import { config } from '@dotenvx/dotenvx'

const baseEnv =
  config({
    path: `${import.meta.dirname}/../../../../.env`,
  }).parsed ?? {}

const dynamicEnvValues = {
  CEB_NODE_ENV: baseEnv.CEB_DEV === 'true' ? 'development' : 'production',
} as const

export { baseEnv, dynamicEnvValues }

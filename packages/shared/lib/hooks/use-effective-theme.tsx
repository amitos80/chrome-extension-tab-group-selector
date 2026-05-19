import { useStorage } from './use-storage.js'
import { exampleThemeStorage } from '@extension/storage'
import { useEffect, useState } from 'react'

/** WHY: Persisted objects from older builds may omit `followSystemTheme`; treat as false. */
const normalizeThemeState = (raw: { theme?: 'light' | 'dark'; isLight?: boolean; followSystemTheme?: boolean }) => ({
  theme: raw.theme === 'dark' ? 'dark' : 'light',
  isLight: typeof raw.isLight === 'boolean' ? raw.isLight : true,
  followSystemTheme: Boolean(raw.followSystemTheme),
})

/**
 * Effective light/dark for extension UI: follows OS when `followSystemTheme`, else manual storage.
 * WHY: Service worker has no `window`; each UI surface listens to `prefers-color-scheme` locally.
 */
export const useEffectiveTheme = () => {
  const storedRaw = useStorage(exampleThemeStorage)
  const stored = normalizeThemeState(storedRaw)

  const [prefersDark, setPrefersDark] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setPrefersDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const isLight = stored.followSystemTheme ? !prefersDark : stored.isLight

  return {
    theme: stored.theme,
    followSystemTheme: stored.followSystemTheme,
    isLight,
    toggle: () => exampleThemeStorage.toggle(),
    setFollowSystemTheme: (enabled: boolean) => exampleThemeStorage.setFollowSystemTheme(enabled),
  }
}

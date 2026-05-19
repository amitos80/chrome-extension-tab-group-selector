import { createStorage, StorageEnum } from '../base/index.js'
import type { ThemeStateType, ThemeStorageType } from '../base/index.js'

const themeFallback: ThemeStateType = {
  theme: 'light',
  isLight: true,
  followSystemTheme: false,
}

/** WHY: Upgraded profiles may lack `followSystemTheme` in the persisted object until the next write. */
const normalizeThemeState = (raw: Partial<ThemeStateType> | ThemeStateType): ThemeStateType => ({
  theme: raw.theme === 'dark' ? 'dark' : 'light',
  isLight: typeof raw.isLight === 'boolean' ? raw.isLight : true,
  followSystemTheme: Boolean(raw.followSystemTheme),
})

const storage = createStorage<ThemeStateType>('theme-storage-key', themeFallback, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
})

export const exampleThemeStorage: ThemeStorageType = {
  ...storage,
  toggle: async () => {
    await storage.set(currentState => {
      const s = normalizeThemeState(currentState)
      if (s.followSystemTheme) {
        return s
      }
      const newTheme = s.theme === 'light' ? 'dark' : 'light'

      return {
        ...s,
        theme: newTheme,
        isLight: newTheme === 'light',
      }
    })
  },
  setFollowSystemTheme: async (enabled: boolean) => {
    await storage.set(currentState => ({
      ...normalizeThemeState(currentState),
      followSystemTheme: enabled,
    }))
  },
}

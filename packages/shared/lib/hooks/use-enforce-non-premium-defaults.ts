import { exampleThemeStorage, newTabSwitcherPreferenceStorage } from '@extension/storage'
import { useEffect } from 'react'

/** WHY: Free tier policy is enforced from storage whenever `isPremium` is false (not only from popup). */
export const useEnforceNonPremiumDefaults = (isPremium: boolean) => {
  useEffect(() => {
    if (isPremium) {
      return
    }
    void exampleThemeStorage.set({
      theme: 'light',
      isLight: true,
      followSystemTheme: false,
    })
    void newTabSwitcherPreferenceStorage.setShowTabGroupSelectorOnNewTab(false)
  }, [isPremium])
}

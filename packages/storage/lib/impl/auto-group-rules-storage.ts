import { createStorage, StorageEnum } from '../base/index.js'
import type { ChromeTabGroupColor } from './tab-group-colors.js'

interface AutoGroupRule {
  id: string
  pattern: string
  groupTitle: string
  groupColor: ChromeTabGroupColor
}

interface AutoGroupRulesState {
  rules: AutoGroupRule[]
}

const AUTO_GROUP_RULES_STORAGE_KEY = 'auto-group-rules-v1'

const storage = createStorage<AutoGroupRulesState>(
  AUTO_GROUP_RULES_STORAGE_KEY,
  { rules: [] },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
)

type AutoGroupRulesStorageType = typeof storage & {
  setRules: (rules: AutoGroupRule[]) => Promise<void>
}

const autoGroupRulesStorage: AutoGroupRulesStorageType = {
  ...storage,
  setRules: async rules => {
    await storage.set({ rules })
  },
}

export type { AutoGroupRule, AutoGroupRulesState }

export type { AutoGroupRulesStorageType }

export { AUTO_GROUP_RULES_STORAGE_KEY, autoGroupRulesStorage }
export type { ChromeTabGroupColor } from './tab-group-colors.js'
export { CHROME_TAB_GROUP_COLORS, normalizeTabGroupColor, tabGroupColorCss, TAB_GROUP_COLOR_CSS } from './tab-group-colors.js'

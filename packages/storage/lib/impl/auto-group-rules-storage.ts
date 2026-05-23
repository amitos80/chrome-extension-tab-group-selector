import { createStorage, StorageEnum } from '../base/index.js'

const CHROME_TAB_GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'] as const

type ChromeTabGroupColor = (typeof CHROME_TAB_GROUP_COLORS)[number]

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

export type { AutoGroupRule, AutoGroupRulesState, ChromeTabGroupColor }

export type { AutoGroupRulesStorageType }

export { AUTO_GROUP_RULES_STORAGE_KEY, CHROME_TAB_GROUP_COLORS, autoGroupRulesStorage }

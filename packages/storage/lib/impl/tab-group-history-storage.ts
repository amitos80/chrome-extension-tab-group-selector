import { createStorage, StorageEnum } from '../base/index.js'

export interface ClosedTabGroup {
  id: string
  title: string
  color: string
  closedAt: number
  tabCount: number
}

export interface TabGroupHistoryState {
  closedGroups: ClosedTabGroup[]
}

export type TabGroupHistoryStorageType = {
  get: () => Promise<TabGroupHistoryState>
  set: (value: TabGroupHistoryState | ((prev: TabGroupHistoryState) => TabGroupHistoryState)) => Promise<void>
  getSnapshot: () => TabGroupHistoryState | null
  subscribe: (listener: () => void) => () => void
  addClosedGroup: (group: chrome.tabGroups.TabGroup, tabCount: number) => Promise<void>
  removeClosedGroup: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
}

const storage = createStorage<TabGroupHistoryState>(
  'tab-group-history-storage-key',
  {
    closedGroups: [],
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
)

export const tabGroupHistoryStorage: TabGroupHistoryStorageType = {
  ...storage,
  addClosedGroup: async (group: chrome.tabGroups.TabGroup, tabCount: number) => {
    await storage.set(currentState => {
      const newGroup: ClosedTabGroup = {
        id: `closed-${group.id}-${Date.now()}`,
        title: group.title || 'Untitled',
        color: group.color,
        closedAt: Date.now(),
        tabCount,
      }

      const updatedGroups = [newGroup, ...currentState.closedGroups].slice(0, 20)

      return {
        closedGroups: updatedGroups,
      }
    })
  },
  removeClosedGroup: async (id: string) => {
    await storage.set(currentState => ({
      closedGroups: currentState.closedGroups.filter(g => g.id !== id),
    }))
  },
  clearHistory: async () => {
    await storage.set({ closedGroups: [] })
  },
}

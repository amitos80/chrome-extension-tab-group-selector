import { allTabGroupsRegistryStorage } from '@extension/storage'
import { normalizeTabGroupColor } from '@extension/storage'

export type TabGroupMutationResult = {
  success: boolean
  error?: string
}

const normalizeTitle = function normalizeTitle(title: string): string {
  const trimmed = title.trim()
  return trimmed.length > 0 ? trimmed : 'Untitled'
}

export const updateTabGroupTitle = async function updateTabGroupTitle(args: {
  persistKey: string
  title: string
  chromeGroupId?: number | null
}): Promise<TabGroupMutationResult> {
  const title = normalizeTitle(args.title)

  if (args.chromeGroupId != null) {
    try {
      await chrome.tabGroups.update(args.chromeGroupId, { title })
      return { success: true }
    } catch {
      return { success: false, error: 'Could not update group title.' }
    }
  }

  return allTabGroupsRegistryStorage.patchByPersistKey(args.persistKey, { title })
}

export const updateTabGroupColor = async function updateTabGroupColor(args: {
  persistKey: string
  color: string
  chromeGroupId?: number | null
}): Promise<TabGroupMutationResult> {
  const color = normalizeTabGroupColor(args.color)

  if (args.chromeGroupId != null) {
    try {
      await chrome.tabGroups.update(args.chromeGroupId, { color })
      return { success: true }
    } catch {
      return { success: false, error: 'Could not update group color.' }
    }
  }

  return allTabGroupsRegistryStorage.patchByPersistKey(args.persistKey, { color })
}

export const deleteOpenTabGroup = async function deleteOpenTabGroup(
  chromeGroupId: number,
): Promise<TabGroupMutationResult> {
  try {
    const tabs = await chrome.tabs.query({ groupId: chromeGroupId })
    const tabIds = tabs.map(tab => tab.id).filter((id): id is number => id != null)
    if (tabIds.length === 0) {
      return { success: false, error: 'Group has no tabs.' }
    }
    await chrome.tabs.remove(tabIds)
    return { success: true }
  } catch {
    return { success: false, error: 'Could not delete group.' }
  }
}

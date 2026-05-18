import 'webextension-polyfill'
import { restoreClosedGroupInNewWindow } from './restore-closed-group'
import { buildSwitcherSnapshot, initTabGroupRegistry } from './tab-group-registry'
import { allTabGroupsRegistryStorage, bulkImportUiStorage } from '@extension/storage'

/** Sends TOGGLE_SWITCHER to the active tab in the current window (same path as chrome.commands). */
const sendToggleSwitcherToActiveTab = async (options?: { staggerImportReveal?: boolean }): Promise<boolean> => {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  if (!activeTab?.id) {
    console.warn('[BACKGROUND] No active tab for TOGGLE_SWITCHER')
    return false
  }

  try {
    await chrome.tabs.sendMessage(activeTab.id, {
      type: 'TOGGLE_SWITCHER',
      staggerImportReveal: options?.staggerImportReveal === true,
    })
    return true
  } catch (err) {
    console.warn('[BACKGROUND] Failed to send TOGGLE_SWITCHER:', err)
    return false
  }
}

/**
 * Handles the keyboard command trigger.
 * Sends a message to the active tab to toggle the switcher UI.
 */
const handleCommand = async (command: string) => {
  if (command !== 'open-switcher') {
    return
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  console.log('[BACKGROUND] Active tab:', {
    id: activeTab?.id,
    url: activeTab?.url,
    title: activeTab?.title,
  })

  void sendToggleSwitcherToActiveTab()
}

const performBulkImportAndOpenSwitcher = async (): Promise<{
  ok: boolean
  skipped?: boolean
  switcherOpened?: boolean
  error?: string
}> => {
  const ui = await bulkImportUiStorage.get()
  if (ui.initialBulkImportCompleted) {
    return { ok: true, skipped: true }
  }

  try {
    const chromeGroups = await chrome.tabGroups.query({})
    for (const g of chromeGroups) {
      const tabs = await chrome.tabs.query({ groupId: g.id })
      await allTabGroupsRegistryStorage.upsertOpenFromChrome(g, tabs.length)
    }
    const switcherOpened = await sendToggleSwitcherToActiveTab({ staggerImportReveal: true })
    // WHY: Registry sync on startup populates groups immediately; only user-driven success should hide the CTA.
    if (switcherOpened) {
      await bulkImportUiStorage.set({ initialBulkImportCompleted: true })
    }
    return { ok: true, switcherOpened }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[BACKGROUND] Bulk import failed:', err)
    return { ok: false, error: message }
  }
}

chrome.commands.onCommand.addListener(command => {
  void handleCommand(command)
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_TAB_GROUPS') {
    buildSwitcherSnapshot().then(sendResponse)
    return true
  }

  if (message.type === 'IMPORT_ALL_TAB_GROUPS_AND_OPEN_SWITCHER') {
    void performBulkImportAndOpenSwitcher().then(sendResponse)
    return true
  }

  if (message.type === 'GET_CURRENT_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      sendResponse(tabs[0])
    })
    return true
  }

  if (message.type === 'ACTIVATE_GROUP') {
    chrome.tabs.query({ groupId: message.groupId }).then(tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.update(tabs[0].id, { active: true })
        chrome.windows.update(tabs[0].windowId, { focused: true })
      }
    })
  }

  if (message.type === 'RESTORE_CLOSED_GROUP') {
    const persistKey = message.persistKey as string

    allTabGroupsRegistryStorage.getPersistedByKey(persistKey).then(async meta => {
      if (!meta || meta.isOpen) {
        sendResponse({ success: false })
        return
      }
      try {
        const result = await restoreClosedGroupInNewWindow(meta)
        sendResponse(result)
      } catch (err) {
        console.error('[BACKGROUND] Restore failed:', err)
        sendResponse({ success: false })
      }
    })

    return true
  }

  if (message.type === 'REMOVE_CLOSED_GROUP') {
    allTabGroupsRegistryStorage.removeByPersistKey(message.persistKey as string).then(() => {
      sendResponse({ success: true })
    })
    return true
  }

  return undefined
})

void initTabGroupRegistry()
console.log('TabGroup Switcher: Background logic initialized')

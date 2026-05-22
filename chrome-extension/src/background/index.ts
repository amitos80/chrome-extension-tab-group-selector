import 'webextension-polyfill'
import { restoreClosedGroupInNewWindow } from './restore-closed-group'
import { buildSwitcherSnapshot, initTabGroupRegistry } from './tab-group-registry'
import { allTabGroupsRegistryStorage } from '@extension/storage'

/**
 * Safely injects the switcher interface into the target tab on-demand
 */
async function injectSwitcherContext(tabId: number) {
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content.css'],
    })
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/all.iife.js', 'content-ui/all.iife.js'],
    })
  } catch (err) {
    console.error('[BACKGROUND] Runtime script injection failed:', err)
  }
}

/**
 * Handles the keyboard command trigger.
 * Probes the tab first; injects scripts if they don't exist yet.
 */
async function handleCommand(command: string) {
  if (command !== 'open-switcher') return

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  if (!activeTab?.id || activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('edge://')) {
    console.warn('[BACKGROUND] Cannot inject switcher into privileged browser pages.')
    return
  }

  try {
    // 1. Probe if the content script is already listening
    await chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_SWITCHER' })
  } catch (err) {
    // 2. Fallback: "Receiving end does not exist" -> Script isn't there yet. Inject it!
    console.log('[BACKGROUND] Content script missing on tab. Injecting context now...')
    await injectSwitcherContext(activeTab.id)

    // 3. Fire the toggle command again now that the execution context is ready
    try {
      await chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_SWITCHER' })
    } catch (retryErr) {
      console.error('[BACKGROUND] Failed to toggle switcher after injection:', retryErr)
    }
  }
}

chrome.commands.onCommand.addListener(handleCommand)

/**
 * Global Message Router for UI interactions
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // FIXED: Removed unconditional script injection from the top of this listener

  if (message.type === 'GET_TAB_GROUPS') {
    buildSwitcherSnapshot().then(sendResponse)
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
    return false
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

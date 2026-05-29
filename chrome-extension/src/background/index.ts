import 'webextension-polyfill'

import { handleTabUrlUpdate } from './auto-group/auto-group-handler'
import { BOOKMARK_SAVED_TAB_GROUP_PREFIX } from './bookmark-saved-tab-groups'
import { initCrossDeviceSync } from './cross-device-sync'
import { getEntitlementStatus } from './entitlements'
import { getLifetimeOfferStatus } from './lifetime-offer'
import { initLicenseValidationScheduler } from './license-validation-scheduler'
import { lsCheckoutYearlyUrl, lsLifetimeCheckoutUrl } from './lemon-squeezy-config'
import { activateLicenseKey, validateStoredLicense } from './lemon-squeezy-license'
import { openUrlsAsNewGroupedWindow, restoreClosedGroupInNewWindow } from './restore-closed-group'
import { initSnapshotScheduler } from './snapshot-scheduler'
import { buildSwitcherSnapshot, initTabGroupRegistry } from './tab-group-registry'
import { allTabGroupsRegistryStorage, premiumEntitlementStorage } from '@extension/storage'

/**
 * Safely injects the switcher interface into the target tab on-demand
 */
const injectSwitcherContext = async (tabId: number) => {
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content.css'],
    })
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/all.iife.js', 'content-ui/all.iife.js'],
    })
  } catch {
    //console.error('[BACKGROUND] Runtime script injection failed:', err)
  }
}

/**
 * Handles the keyboard command trigger.
 * Probes the tab first; injects scripts if they don't exist yet.
 */
const handleCommand = async (command: string) => {
  if (command !== 'open-switcher') return

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  if (!activeTab?.id || activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('edge://')) {
    //console.warn('[BACKGROUND] Cannot inject switcher into privileged browser pages.')
    return
  }

  try {
    // 1. Probe if the content script is already listening
    await chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_SWITCHER' })
  } catch {
    // 2. Fallback: "Receiving end does not exist" -> Script isn't there yet. Inject it!
    //console.log('[BACKGROUND] Content script missing on tab. Injecting context now...')
    await injectSwitcherContext(activeTab.id)

    // 3. Fire the toggle command again now that the execution context is ready
    try {
      await chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_SWITCHER' })
    } catch {
      //console.error('[BACKGROUND] Failed to toggle switcher after injection:', retryErr)
    }
  }
}

chrome.commands.onCommand.addListener(handleCommand)

/**
 * Global Message Router for UI interactions
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // FIXED: Removed unconditional script injection from the top of this listener
  if (message.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage()
  }

  if (message.type === 'GET_TAB_GROUPS') {
    console.info('[TABGROUP_SELECTOR][UI][GET_TAB_GROUPS] request')
    buildSwitcherSnapshot().then(snapshot => {
      console.info('[TABGROUP_SELECTOR][UI][GET_TAB_GROUPS] response', {
        entryCount: snapshot.entries.length,
        activeGroupId: snapshot.activeGroupId,
      })
      sendResponse(snapshot)
    })
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
    if (persistKey.startsWith(BOOKMARK_SAVED_TAB_GROUP_PREFIX)) {
      const folderId = persistKey.slice(BOOKMARK_SAVED_TAB_GROUP_PREFIX.length)
      ;(async () => {
        try {
          const nodes = await chrome.bookmarks.get(folderId)
          const folder = nodes[0]
          if (!folder?.id || typeof folder.url === 'string') {
            sendResponse({ success: false })
            return
          }
          const children = await chrome.bookmarks.getChildren(folderId)
          const urlsFromBookmarks = children
            .filter(c => typeof c.url === 'string' && c.url.length > 0)
            .map(c => String(c.url).trim())
          const result = await openUrlsAsNewGroupedWindow(folder.title?.trim() || 'Untitled', 'grey', urlsFromBookmarks)
          sendResponse(result)
        } catch {
          sendResponse({ success: false })
        }
      })()
      return true
    }
    allTabGroupsRegistryStorage.getPersistedByKey(persistKey).then(async meta => {
      if (!meta || meta.isOpen) {
        sendResponse({ success: false })
        return
      }
      try {
        const result = await restoreClosedGroupInNewWindow(meta)
        sendResponse(result)
      } catch {
        //console.error('[BACKGROUND] Restore failed:', err)
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

  if (message.type === 'GET_ENTITLEMENT_STATUS') {
    getEntitlementStatus().then(status => sendResponse(status))
    return true
  }

  if (message.type === 'GET_LIFETIME_OFFER_STATUS') {
    sendResponse(getLifetimeOfferStatus())
    return true
  }

  if (message.type === 'ACTIVATE_LICENSE') {
    const licenseKey = String(message.licenseKey ?? '')
    activateLicenseKey(licenseKey).then(result => sendResponse(result))
    return true
  }

  if (message.type === 'RESTORE_LICENSE') {
    validateStoredLicense().then(result => sendResponse(result))
    return true
  }

  if (message.type === 'OPEN_CHECKOUT') {
    const plan = message.plan as string
    const url = plan === 'lifetime' ? lsLifetimeCheckoutUrl() : lsCheckoutYearlyUrl()
    if (!url) {
      sendResponse({ success: false, error: 'Checkout URL is not configured.' })
      return true
    }
    void chrome.tabs.create({ url })
    sendResponse({ success: true })
    return true
  }

  return undefined
})

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    void premiumEntitlementStorage.startTrialOnFreshInstall()
  }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void handleTabUrlUpdate(tabId, changeInfo, tab)
})

void initSnapshotScheduler()
void initLicenseValidationScheduler()

void initTabGroupRegistry().finally(() => {
  initCrossDeviceSync()
})
//console.log('TabGroup Switcher: Background logic initialized')

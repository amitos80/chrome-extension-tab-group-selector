import 'webextension-polyfill';
import { tabGroupHistoryStorage } from '@extension/storage';

/**
 * Handles the keyboard command trigger.
 * Sends a message to the active tab to toggle the switcher UI.
 */
async function handleCommand(command: string) {
  console.log('[BACKGROUND] Command received:', command);
  
  if (command !== 'open-switcher') {
    console.log('[BACKGROUND] Command is not "open-switcher", ignoring');
    return;
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  console.log('[BACKGROUND] Active tab:', {
    id: activeTab?.id,
    url: activeTab?.url,
    title: activeTab?.title
  });

  if (activeTab?.id) {
    console.log('[BACKGROUND] Sending TOGGLE_SWITCHER message to tab:', activeTab.id);
    chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_SWITCHER' })
      .then(() => {
        console.log('[BACKGROUND] Message sent successfully');
      })
      .catch(err => {
        console.warn('[BACKGROUND] Failed to send message:', err.message);
        console.log('[BACKGROUND] This is expected for chrome:// pages and extension pages');
      });
  } else {
    console.error('[BACKGROUND] No active tab found');
  }
}

// Initialize listener
chrome.commands.onCommand.addListener(handleCommand);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_GROUPS') {
    chrome.tabGroups.query({}).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_CLOSED_GROUPS') {
    tabGroupHistoryStorage.get().then(state => {
      sendResponse(state.closedGroups);
    });
    return true;
  }

  if (message.type === 'GET_CURRENT_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      sendResponse(tabs[0]);
    });
    return true;
  }

  if (message.type === 'ACTIVATE_GROUP') {
    chrome.tabs.query({ groupId: message.groupId }).then(tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      }
    });
  }

  if (message.type === 'RESTORE_CLOSED_GROUP') {
    console.log('[BACKGROUND] Restoring closed group:', message.closedGroup);
    
    chrome.tabs.create({ url: 'about:blank', active: true }).then(async newTab => {
      if (newTab.id) {
        const groupId = await chrome.tabs.group({ tabIds: [newTab.id] });
        
        await chrome.tabGroups.update(groupId, {
          title: message.closedGroup.title,
          color: message.closedGroup.color,
        });
        
        console.log('[BACKGROUND] Restored group:', groupId);
        sendResponse({ success: true, groupId });
      }
    });
    
    return true;
  }

  if (message.type === 'REMOVE_CLOSED_GROUP') {
    tabGroupHistoryStorage.removeClosedGroup(message.groupId).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

const tabGroupTabCounts = new Map<number, number>();

chrome.tabs.onCreated.addListener(async tab => {
  if (tab.groupId && tab.groupId !== -1) {
    const currentCount = tabGroupTabCounts.get(tab.groupId) || 0;
    tabGroupTabCounts.set(tab.groupId, currentCount + 1);
    console.log('[BACKGROUND] Tab added to group', tab.groupId, '- count:', currentCount + 1);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const allTabs = await chrome.tabs.query({});
  const tab = allTabs.find(t => t.id === tabId);
  if (tab?.groupId && tab.groupId !== -1) {
    const currentCount = tabGroupTabCounts.get(tab.groupId) || 1;
    tabGroupTabCounts.set(tab.groupId, Math.max(0, currentCount - 1));
    console.log('[BACKGROUND] Tab removed from group', tab.groupId, '- count:', currentCount - 1);
  }
});

chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.groupId && tab.groupId !== -1) {
    const currentCount = tabGroupTabCounts.get(tab.groupId) || 0;
    tabGroupTabCounts.set(tab.groupId, currentCount + 1);
    console.log('[BACKGROUND] Tab attached to group', tab.groupId, '- count:', currentCount + 1);
  }
});

chrome.tabs.onDetached.addListener(async (tabId, detachInfo) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab?.groupId && tab.groupId !== -1) {
    const currentCount = tabGroupTabCounts.get(tab.groupId) || 1;
    tabGroupTabCounts.set(tab.groupId, Math.max(0, currentCount - 1));
    console.log('[BACKGROUND] Tab detached from group', tab.groupId, '- count:', currentCount - 1);
  }
});

chrome.tabGroups.onRemoved.addListener(async removedGroup => {
  console.log('[BACKGROUND] ===== Tab group removed =====');
  console.log('[BACKGROUND] Removed group data:', JSON.stringify(removedGroup, null, 2));
  
  try {
    const tabCount = tabGroupTabCounts.get(removedGroup.id) || 0;
    console.log('[BACKGROUND] Tab count for group', removedGroup.id, ':', tabCount);
    console.log('[BACKGROUND] Saving closed group:', removedGroup.title || 'Untitled', 'with', tabCount, 'tabs');
    
    await tabGroupHistoryStorage.addClosedGroup(removedGroup, tabCount);
    console.log('[BACKGROUND] ✓ Successfully saved to history');
    
    tabGroupTabCounts.delete(removedGroup.id);
  } catch (error) {
    console.error('[BACKGROUND] ✗ Error saving closed group:', error);
  }
});

async function initializeTabCounts() {
  console.log('[BACKGROUND] Initializing tab counts...');
  const allGroups = await chrome.tabGroups.query({});
  
  for (const group of allGroups) {
    const tabs = await chrome.tabs.query({ groupId: group.id });
    tabGroupTabCounts.set(group.id, tabs.length);
    console.log('[BACKGROUND] Initialized group:', group.id, group.title, '- tabs:', tabs.length);
  }
  
  console.log('[BACKGROUND] Tab counts initialized for', allGroups.length, 'groups');
}

initializeTabCounts();
console.log('TabGroup Switcher: Background logic initialized');
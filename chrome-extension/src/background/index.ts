import 'webextension-polyfill';

/**
 * Handles the keyboard command trigger.
 * Sends a message to the active tab to toggle the switcher UI.
 */
async function handleCommand(command: string) {
  if (command !== 'open-switcher') return;

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (activeTab?.id) {
    chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_SWITCHER' })
      .catch(err => console.debug("Overlay not ready on this page:", err));
  }
}

// Initialize listener
chrome.commands.onCommand.addListener(handleCommand);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_GROUPS') {
    chrome.tabGroups.query({}).then(sendResponse);
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
});

console.log('TabGroup Switcher: Background logic initialized');
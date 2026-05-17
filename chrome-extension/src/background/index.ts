import 'webextension-polyfill';
import { allTabGroupsRegistryStorage } from '@extension/storage';
import { buildSwitcherSnapshot, initTabGroupRegistry } from './tab-group-registry';

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
		currentWindow: true,
	});

	console.log('[BACKGROUND] Active tab:', {
		id: activeTab?.id,
		url: activeTab?.url,
		title: activeTab?.title,
	});

	if (activeTab?.id) {
		console.log('[BACKGROUND] Sending TOGGLE_SWITCHER message to tab:', activeTab.id);
		chrome.tabs
			.sendMessage(activeTab.id, { type: 'TOGGLE_SWITCHER' })
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

chrome.commands.onCommand.addListener(handleCommand);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type === 'GET_TAB_GROUPS') {
		buildSwitcherSnapshot().then(sendResponse);
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
		const persistKey = message.persistKey as string;
		console.log('[BACKGROUND] Restoring closed group persistKey:', persistKey);

		allTabGroupsRegistryStorage.getPersistedByKey(persistKey).then(async meta => {
			if (!meta || meta.isOpen) {
				sendResponse({ success: false });
				return;
			}
			const newTab = await chrome.tabs.create({ url: 'about:blank', active: true });
			if (!newTab.id) {
				sendResponse({ success: false });
				return;
			}
			const groupId = await chrome.tabs.group({ tabIds: [newTab.id] });
			await chrome.tabGroups.update(groupId, {
				title: meta.title,
				color: meta.color as chrome.tabGroups.Color,
			});
			console.log('[BACKGROUND] Restored group:', groupId);
			sendResponse({ success: true, groupId });
		});

		return true;
	}

	if (message.type === 'REMOVE_CLOSED_GROUP') {
		allTabGroupsRegistryStorage.removeByPersistKey(message.persistKey as string).then(() => {
			sendResponse({ success: true });
		});
		return true;
	}

	return undefined;
});

void initTabGroupRegistry();
console.log('TabGroup Switcher: Background logic initialized');

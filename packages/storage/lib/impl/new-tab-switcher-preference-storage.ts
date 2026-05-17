import { createStorage, StorageEnum } from '../base/index.js';

/** WHY: E2E and migrations can target the same chrome.storage.local key as createStorage. */
export const NEW_TAB_SWITCHER_PREFERENCE_STORAGE_KEY = 'new-tab-switcher-preference-v1';

export interface NewTabSwitcherPreferenceState {
	showTabGroupSelectorOnNewTab: boolean;
}

const storage = createStorage<NewTabSwitcherPreferenceState>(
	NEW_TAB_SWITCHER_PREFERENCE_STORAGE_KEY,
	{
		showTabGroupSelectorOnNewTab: false,
	},
	{
		storageEnum: StorageEnum.Local,
		liveUpdate: true,
	},
);

export type NewTabSwitcherPreferenceStorageType = typeof storage & {
	setShowTabGroupSelectorOnNewTab: (value: boolean) => Promise<void>;
};

export const newTabSwitcherPreferenceStorage: NewTabSwitcherPreferenceStorageType = {
	...storage,
	setShowTabGroupSelectorOnNewTab: async (value: boolean) => {
		await storage.set({ showTabGroupSelectorOnNewTab: value });
	},
};

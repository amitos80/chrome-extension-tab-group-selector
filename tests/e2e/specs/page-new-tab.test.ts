/** Sync with packages/storage `NEW_TAB_SWITCHER_PREFERENCE_STORAGE_KEY`. */
const NEW_TAB_SWITCHER_PREF_KEY = 'new-tab-switcher-preference-v1';

describe('Webextension New Tab', () => {
	it('shows extension new tab UI when preference is enabled', async () => {
		const extensionPath = await browser.getExtensionPath();

		await browser.url(`${extensionPath}/popup/index.html`);
		await browser.execute(async () => {
			await chrome.storage.local.set({
				[NEW_TAB_SWITCHER_PREF_KEY]: { showTabGroupSelectorOnNewTab: true },
			});
		});

		await browser.url(`${extensionPath}/new-tab/index.html`);

		const appDiv = await $('.App').getElement();
		await expect(appDiv).toBeExisting();
	});
});

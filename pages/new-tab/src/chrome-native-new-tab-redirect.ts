/**
 * Ordered URLs for restoring Chrome's built-in new tab when our override page exits early.
 * WHY: Chromium has used multiple NTP URLs; try primary then fallback (see plan).
 */
const CHROME_NATIVE_NEW_TAB_URLS = ['chrome://new-tab-page/', 'chrome-search://local-ntp/local-ntp.html'] as const;

export async function redirectCurrentTabToChromeNativeNewTab(): Promise<boolean> {
	try {
		const tab = await chrome.tabs.getCurrent();
		const tabId = tab?.id;
		if (tabId === undefined) {
			console.warn('[NEW-TAB] redirectNativeNtp: no tab id');
			return false;
		}
		for (const url of CHROME_NATIVE_NEW_TAB_URLS) {
			try {
				await chrome.tabs.update(tabId, { url });
				return true;
			} catch (err) {
				console.warn('[NEW-TAB] redirectNativeNtp failed for', url, err);
			}
		}
		return false;
	} catch (e) {
		console.warn('[NEW-TAB] redirectNativeNtp:', e);
		return false;
	}
}

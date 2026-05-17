import { allTabGroupsRegistryStorage, type SwitcherTabGroupEntry } from '@extension/storage';

const tabGroupTabCounts = new Map<number, number>();

let syncOpenGroupsTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Refreshes tab counts and open-group rows in storage after tab moves / creates / closes.
 * WHY: Tab membership changes do not always emit tabGroups.onUpdated; a debounced pass keeps counts correct before onRemoved runs.
 */
async function syncOpenGroupsFromChrome(): Promise<void> {
	const chromeGroups = await chrome.tabGroups.query({});
	tabGroupTabCounts.clear();
	for (const g of chromeGroups) {
		const tabs = await chrome.tabs.query({ groupId: g.id });
		tabGroupTabCounts.set(g.id, tabs.length);
		await allTabGroupsRegistryStorage.upsertOpenFromChrome(g, tabs.length);
	}
}

function scheduleSyncOpenGroupsFromChrome(): void {
	if (syncOpenGroupsTimer !== null) {
		clearTimeout(syncOpenGroupsTimer);
	}
	syncOpenGroupsTimer = setTimeout(() => {
		syncOpenGroupsTimer = null;
		void syncOpenGroupsFromChrome();
	}, 40);
}

function sortSwitcherEntries(
	rows: SwitcherTabGroupEntry[],
	activeChromeGroupId: number | null,
): SwitcherTabGroupEntry[] {
	return [...rows].sort((a, b) => {
		const aActive = a.isOpen && a.chromeGroupId === activeChromeGroupId ? 1 : 0;
		const bActive = b.isOpen && b.chromeGroupId === activeChromeGroupId ? 1 : 0;
		if (aActive !== bActive) {
			return bActive - aActive;
		}
		if (a.isOpen !== b.isOpen) {
			return a.isOpen ? -1 : 1;
		}
		if (a.isOpen && b.isOpen) {
			return (a.title || '').localeCompare(b.title || '');
		}
		return (b.closedAt ?? 0) - (a.closedAt ?? 0);
	});
}

export async function reconcileRegistryWithChrome(): Promise<void> {
	const chromeGroups = await chrome.tabGroups.query({});
	const openIds = new Set(chromeGroups.map(g => g.id));

	await allTabGroupsRegistryStorage.set(prev => {
		const groups = prev.groups.map(entry => {
			if (entry.isOpen && entry.chromeGroupId != null && !openIds.has(entry.chromeGroupId)) {
				return {
					...entry,
					isOpen: false,
					chromeGroupId: null,
					closedAt: entry.closedAt ?? Date.now(),
				};
			}
			return entry;
		});
		return { ...prev, groups };
	});

	const state = await allTabGroupsRegistryStorage.get();
	const knownOpenIds = new Set(
		state.groups.filter(g => g.isOpen && g.chromeGroupId != null).map(g => g.chromeGroupId as number),
	);

	for (const cg of chromeGroups) {
		if (!knownOpenIds.has(cg.id)) {
			const tabs = await chrome.tabs.query({ groupId: cg.id });
			await allTabGroupsRegistryStorage.upsertOpenFromChrome(cg, tabs.length);
		}
	}
}

export async function buildSwitcherSnapshot(): Promise<{ entries: SwitcherTabGroupEntry[]; activeGroupId: number | null }> {
	await reconcileRegistryWithChrome();

	const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
	let activeGroupId: number | null = null;
	if (
		currentTab?.groupId !== undefined &&
		currentTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
	) {
		activeGroupId = currentTab.groupId;
	}

	const state = await allTabGroupsRegistryStorage.get();
	const chromeGroups = await chrome.tabGroups.query({});
	const chromeById = new Map(chromeGroups.map(g => [g.id, g]));

	const rows: SwitcherTabGroupEntry[] = [];

	for (const p of state.groups) {
		if (p.isOpen && p.chromeGroupId != null) {
			const cg = chromeById.get(p.chromeGroupId);
			if (!cg) {
				continue;
			}
			const tabs = await chrome.tabs.query({ groupId: cg.id });
			rows.push({
				persistKey: p.persistKey,
				chromeGroupId: cg.id,
				title: cg.title || 'Untitled',
				color: cg.color,
				isOpen: true,
				tabCount: tabs.length,
				closedAt: null,
			});
		} else if (!p.isOpen) {
			rows.push({
				persistKey: p.persistKey,
				chromeGroupId: null,
				title: p.title || 'Untitled',
				color: p.color,
				isOpen: false,
				tabCount: p.tabCount,
				closedAt: p.closedAt,
			});
		}
	}

	return {
		entries: sortSwitcherEntries(rows, activeGroupId),
		activeGroupId,
	};
}

export async function initTabGroupRegistry(): Promise<void> {
	await allTabGroupsRegistryStorage.migrateLegacyTabGroupHistoryIfNeeded();
	await reconcileRegistryWithChrome();
	await syncOpenGroupsFromChrome();

	chrome.tabs.onCreated.addListener(() => {
		scheduleSyncOpenGroupsFromChrome();
	});

	chrome.tabs.onRemoved.addListener(() => {
		scheduleSyncOpenGroupsFromChrome();
	});

	chrome.tabs.onAttached.addListener(() => {
		scheduleSyncOpenGroupsFromChrome();
	});

	chrome.tabs.onDetached.addListener(() => {
		scheduleSyncOpenGroupsFromChrome();
	});

	chrome.tabGroups.onCreated.addListener(async group => {
		const tabs = await chrome.tabs.query({ groupId: group.id });
		const count = tabs.length;
		tabGroupTabCounts.set(group.id, count);
		await allTabGroupsRegistryStorage.upsertOpenFromChrome(group, count);
	});

	chrome.tabGroups.onUpdated.addListener(async group => {
		const tabs = await chrome.tabs.query({ groupId: group.id });
		tabGroupTabCounts.set(group.id, tabs.length);
		await allTabGroupsRegistryStorage.upsertOpenFromChrome(group, tabs.length);
	});

	chrome.tabGroups.onRemoved.addListener(async removedGroup => {
		const state = await allTabGroupsRegistryStorage.get();
		const entry = state.groups.find(g => g.isOpen && g.chromeGroupId === removedGroup.id);
		const tabCount = entry?.tabCount ?? tabGroupTabCounts.get(removedGroup.id) ?? 0;
		try {
			await allTabGroupsRegistryStorage.markClosedFromRemovedGroup(removedGroup, tabCount);
		} catch (error) {
			console.error('[BACKGROUND] Error persisting removed tab group:', error);
		}
		tabGroupTabCounts.delete(removedGroup.id);
	});

	console.log('[BACKGROUND] Tab group registry initialized');
}

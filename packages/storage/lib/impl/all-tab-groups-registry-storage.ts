import { createStorage, StorageEnum } from '../base/index.js';
import { tabGroupHistoryStorage } from './tab-group-history-storage.js';

/** Maximum persisted rows (open groups are always kept; closed rows are pruned oldest-first). */
const MAX_REGISTRY_GROUPS = 2000;

export interface PersistedTabGroup {
	persistKey: string;
	chromeGroupId: number | null;
	windowId: number;
	title: string;
	color: string;
	tabCount: number;
	isOpen: boolean;
	closedAt: number | null;
	createdAt: number;
	lastSeenAt: number;
}

export interface AllTabGroupsRegistryState {
	groups: PersistedTabGroup[];
	migratedFromLegacyHistoryAt: number | null;
}

/** Row sent to the switcher UI (open + closed unified). */
export interface SwitcherTabGroupEntry {
	persistKey: string;
	chromeGroupId: number | null;
	title: string;
	color: string;
	isOpen: boolean;
	tabCount: number;
	closedAt: number | null;
}

export interface TabGroupsSnapshotResponse {
	entries: SwitcherTabGroupEntry[];
	activeGroupId: number | null;
}

function newPersistKey(): string {
	return crypto.randomUUID();
}

function pruneToCap(groups: PersistedTabGroup[]): PersistedTabGroup[] {
	if (groups.length <= MAX_REGISTRY_GROUPS) {
		return groups;
	}
	const open = groups.filter(g => g.isOpen);
	const closed = groups
		.filter(g => !g.isOpen)
		.sort((a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0));
	const budget = Math.max(0, MAX_REGISTRY_GROUPS - open.length);
	const keptClosed = closed.slice(-budget);
	return [...open, ...keptClosed];
}

const storage = createStorage<AllTabGroupsRegistryState>(
	'all-tab-groups-registry-storage-key-v1',
	{
		groups: [],
		migratedFromLegacyHistoryAt: null,
	},
	{
		storageEnum: StorageEnum.Local,
		liveUpdate: true,
	},
);

export type AllTabGroupsRegistryStorageType = typeof storage & {
	upsertOpenFromChrome: (group: chrome.tabGroups.TabGroup, tabCount: number) => Promise<void>;
	markClosedFromRemovedGroup: (group: chrome.tabGroups.TabGroup, tabCount: number) => Promise<void>;
	removeByPersistKey: (persistKey: string) => Promise<void>;
	getPersistedByKey: (persistKey: string) => Promise<PersistedTabGroup | undefined>;
	migrateLegacyTabGroupHistoryIfNeeded: () => Promise<void>;
};

export const allTabGroupsRegistryStorage: AllTabGroupsRegistryStorageType = {
	...storage,
	upsertOpenFromChrome: async (group: chrome.tabGroups.TabGroup, tabCount: number) => {
		await storage.set(prev => {
			const groups = [...prev.groups];
			const idx = groups.findIndex(g => g.isOpen && g.chromeGroupId === group.id);
			const now = Date.now();
			if (idx >= 0) {
				groups[idx] = {
					...groups[idx],
					title: group.title || 'Untitled',
					color: group.color,
					windowId: group.windowId,
					tabCount,
					lastSeenAt: now,
					isOpen: true,
					closedAt: null,
					chromeGroupId: group.id,
				};
			} else {
				groups.push({
					persistKey: newPersistKey(),
					chromeGroupId: group.id,
					windowId: group.windowId,
					title: group.title || 'Untitled',
					color: group.color,
					tabCount,
					isOpen: true,
					closedAt: null,
					createdAt: now,
					lastSeenAt: now,
				});
			}
			return { ...prev, groups: pruneToCap(groups) };
		});
	},

	markClosedFromRemovedGroup: async (group: chrome.tabGroups.TabGroup, tabCount: number) => {
		await storage.set(prev => {
			const groups = [...prev.groups];
			const idx = groups.findIndex(g => g.isOpen && g.chromeGroupId === group.id);
			const now = Date.now();
			if (idx >= 0) {
				groups[idx] = {
					...groups[idx],
					isOpen: false,
					chromeGroupId: null,
					closedAt: now,
					tabCount,
					title: group.title || groups[idx].title,
					color: group.color,
					windowId: group.windowId,
					lastSeenAt: now,
				};
			} else {
				groups.push({
					persistKey: newPersistKey(),
					chromeGroupId: null,
					windowId: group.windowId,
					title: group.title || 'Untitled',
					color: group.color,
					tabCount,
					isOpen: false,
					closedAt: now,
					createdAt: now,
					lastSeenAt: now,
				});
			}
			return { ...prev, groups: pruneToCap(groups) };
		});
	},

	removeByPersistKey: async (persistKey: string) => {
		await storage.set(prev => ({
			...prev,
			groups: prev.groups.filter(g => g.persistKey !== persistKey),
		}));
	},

	getPersistedByKey: async (persistKey: string) => {
		const state = await storage.get();
		return state.groups.find(g => g.persistKey === persistKey);
	},

	migrateLegacyTabGroupHistoryIfNeeded: async () => {
		const state = await storage.get();
		if (state.migratedFromLegacyHistoryAt != null) {
			return;
		}
		const legacy = await tabGroupHistoryStorage.get();
		const keys = new Set(state.groups.map(g => g.persistKey));
		const imported: PersistedTabGroup[] = legacy.closedGroups
			.filter(c => !keys.has(c.id))
			.map(c => ({
				persistKey: c.id,
				chromeGroupId: null,
				windowId: -1,
				title: c.title,
				color: c.color,
				tabCount: c.tabCount,
				isOpen: false,
				closedAt: c.closedAt,
				createdAt: c.closedAt,
				lastSeenAt: c.closedAt,
			}));
		await storage.set({
			...state,
			groups: pruneToCap([...state.groups, ...imported]),
			migratedFromLegacyHistoryAt: Date.now(),
		});
	},
};

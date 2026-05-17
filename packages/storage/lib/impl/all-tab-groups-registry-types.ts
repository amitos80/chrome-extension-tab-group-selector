export interface PersistedTabGroup {
	persistKey: string;
	chromeGroupId: number | null;
	windowId: number;
	title: string;
	color: string;
	tabCount: number;
	/** Captured tab URLs when the group was closed (live snapshot); empty if unknown or legacy row. */
	urls: string[];
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
	/** True when closed row has a non-empty captured URL list for full restore. */
	hasRestorableUrls: boolean;
}

export interface TabGroupsSnapshotResponse {
	entries: SwitcherTabGroupEntry[];
	activeGroupId: number | null;
}

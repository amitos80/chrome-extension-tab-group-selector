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
	/** Incremented when fingerprint dedupe migration runs; absent on legacy persisted JSON until defaulted. */
	registryDedupeVersion?: number;
	/** Incremented when unique-mergeable-title collapse migration runs. */
	registryUniqueTitleVersion?: number;
}

/** Row sent to the switcher UI (open + closed unified). */
export interface SwitcherTabGroupEntry {
	persistKey: string;
	chromeGroupId: number | null;
	title: string;
	color: string;
	/** Chrome window id (-1 legacy imported rows). Used for defensive dedupe vs closed snapshots. */
	windowId: number;
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

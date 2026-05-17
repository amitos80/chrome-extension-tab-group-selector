import type { PersistedTabGroup } from './all-tab-groups-registry-types.js';

/** Maximum persisted rows (open groups are always kept; closed rows are pruned oldest-first). */
export const MAX_REGISTRY_GROUPS = 2000;

export function newPersistKey(): string {
	return crypto.randomUUID();
}

export function pruneToCap(groups: PersistedTabGroup[]): PersistedTabGroup[] {
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

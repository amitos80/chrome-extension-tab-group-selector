import type { ValueOrUpdateType } from '../base/types.js';
import type { AllTabGroupsRegistryState, PersistedTabGroup } from './all-tab-groups-registry-types.js';
import { pruneToCap } from './all-tab-groups-registry-helpers.js';
import {
	dropClosedRowsDuplicatingOpenFingerprints,
	REGISTRY_FINGERPRINT_DEDUPE_VERSION,
} from './tab-group-registry-fingerprint.js';
import { tabGroupHistoryStorage } from './tab-group-history-storage.js';

type RegistrySetter = (
	valueOrUpdate: ValueOrUpdateType<AllTabGroupsRegistryState>,
) => Promise<void>;

type RegistryGetter = () => Promise<AllTabGroupsRegistryState>;

export async function migrateLegacyTabGroupHistoryIfNeeded(
	get: RegistryGetter,
	set: RegistrySetter,
): Promise<void> {
	const state = await get();
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
			urls: [],
			isOpen: false,
			closedAt: c.closedAt,
			createdAt: c.closedAt,
			lastSeenAt: c.closedAt,
		}));
	await set({
		...state,
		groups: pruneToCap([...state.groups, ...imported]),
		migratedFromLegacyHistoryAt: Date.now(),
		registryDedupeVersion: state.registryDedupeVersion ?? 0,
	});
}

export async function ensureUrlsFieldDefaults(set: RegistrySetter): Promise<void> {
	await set(prev => {
		let changed = false;
		const groups = prev.groups.map(g => {
			const raw = g as PersistedTabGroup & { urls?: string[] };
			if (!Array.isArray(raw.urls)) {
				changed = true;
				return { ...g, urls: [] };
			}
			return g;
		});
		if (!changed) {
			return prev;
		}
		return { ...prev, groups };
	});
}

export async function ensureRegistryDedupeVersionDefault(set: RegistrySetter): Promise<void> {
	await set(prev => {
		if (typeof prev.registryDedupeVersion === 'number') {
			return prev;
		}
		return { ...prev, registryDedupeVersion: 0 };
	});
}

export async function runRegistryOpenClosedFingerprintsDedupeIfNeeded(
	get: RegistryGetter,
	set: RegistrySetter,
): Promise<void> {
	const state = await get();
	const v = state.registryDedupeVersion ?? 0;
	if (v >= REGISTRY_FINGERPRINT_DEDUPE_VERSION) {
		return;
	}
	const cleaned = dropClosedRowsDuplicatingOpenFingerprints(state.groups);
	await set({
		...state,
		groups: pruneToCap(cleaned),
		registryDedupeVersion: REGISTRY_FINGERPRINT_DEDUPE_VERSION,
	});
}


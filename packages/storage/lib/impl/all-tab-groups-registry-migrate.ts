import { tabGroupHistoryStorage } from './tab-group-history-storage.js'
import {
  dropClosedRowsDuplicatingOpenFingerprints,
  REGISTRY_FINGERPRINT_DEDUPE_VERSION,
} from './tab-group-registry-fingerprint.js'
import {
  finalizeRegistryGroupsForPersistence,
  REGISTRY_UNIQUE_TITLE_VERSION,
} from './tab-group-registry-unique-title.js'
import type { AllTabGroupsRegistryState, PersistedTabGroup } from './all-tab-groups-registry-types.js'
import type { ValueOrUpdateType } from '../base/types.js'

type RegistrySetter = (valueOrUpdate: ValueOrUpdateType<AllTabGroupsRegistryState>) => Promise<void>

type RegistryGetter = () => Promise<AllTabGroupsRegistryState>

export async function migrateLegacyTabGroupHistoryIfNeeded(get: RegistryGetter, set: RegistrySetter): Promise<void> {
  const state = await get()
  if (state.migratedFromLegacyHistoryAt != null) {
    return
  }
  const legacy = await tabGroupHistoryStorage.get()
  const keys = new Set(state.groups.map(g => g.persistKey))
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
    }))
  await set({
    ...state,
    groups: finalizeRegistryGroupsForPersistence([...state.groups, ...imported]),
    migratedFromLegacyHistoryAt: Date.now(),
    registryDedupeVersion: state.registryDedupeVersion ?? 0,
    registryUniqueTitleVersion: state.registryUniqueTitleVersion ?? 0,
  })
}

export async function ensureUrlsFieldDefaults(set: RegistrySetter): Promise<void> {
  await set(prev => {
    let changed = false
    const groups = prev.groups.map(g => {
      const raw = g as PersistedTabGroup & { urls?: string[] }
      if (!Array.isArray(raw.urls)) {
        changed = true
        return { ...g, urls: [] }
      }
      return g
    })
    if (!changed) {
      return prev
    }
    return { ...prev, groups: finalizeRegistryGroupsForPersistence(groups) }
  })
}

export async function ensureRegistryDedupeVersionDefault(set: RegistrySetter): Promise<void> {
  await set(prev => {
    if (typeof prev.registryDedupeVersion === 'number') {
      return prev
    }
    return { ...prev, registryDedupeVersion: 0 }
  })
}

export async function ensureRegistryUniqueTitleVersionDefault(set: RegistrySetter): Promise<void> {
  await set(prev => {
    if (typeof prev.registryUniqueTitleVersion === 'number') {
      return prev
    }
    return { ...prev, registryUniqueTitleVersion: 0 }
  })
}

export async function runRegistryUniqueTitleCollapseIfNeeded(get: RegistryGetter, set: RegistrySetter): Promise<void> {
  const state = await get()
  const v = state.registryUniqueTitleVersion ?? 0
  if (v >= REGISTRY_UNIQUE_TITLE_VERSION) {
    return
  }
  await set({
    ...state,
    groups: finalizeRegistryGroupsForPersistence(state.groups),
    registryUniqueTitleVersion: REGISTRY_UNIQUE_TITLE_VERSION,
  })
}

export async function runRegistryOpenClosedFingerprintsDedupeIfNeeded(
  get: RegistryGetter,
  set: RegistrySetter,
): Promise<void> {
  const state = await get()
  const v = state.registryDedupeVersion ?? 0
  if (v >= REGISTRY_FINGERPRINT_DEDUPE_VERSION) {
    return
  }
  const cleaned = dropClosedRowsDuplicatingOpenFingerprints(state.groups)
  await set({
    ...state,
    groups: finalizeRegistryGroupsForPersistence(cleaned),
    registryDedupeVersion: REGISTRY_FINGERPRINT_DEDUPE_VERSION,
  })
}

import { reconcileRegistryWithChrome } from './tab-group-registry'
import { resolveCrossDeviceSyncAllowed } from './cross-device-sync-allowed'
import {
  ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY,
  allTabGroupsRegistryStorage,
  buildOutboundSyncEnvelope,
  CROSS_DEVICE_SYNC_PREFERENCE_STORAGE_KEY,
  jsonUtf8ByteLength,
  parseSyncPayload,
  SYNC_STORAGE_TOTAL_SAFE_BYTES,
  SYNCED_WORKSPACES_KEY,
} from '@extension/storage'

/** WHY: Lets rapid registry batches coalesce into a single chrome.storage.sync write. */
const WORKSPACE_SYNC_PUSH_DEBOUNCE_MS = 550

let crossDeviceListenersAttached = false
let applyingRemoteSync = false
let pushDebouncer: ReturnType<typeof setTimeout> | null = null

export const clearCrossDeviceSyncPushDebouncer = (): void => {
  if (pushDebouncer !== null) {
    clearTimeout(pushDebouncer)
    pushDebouncer = null
  }
}

const logSyncSkipped = (path: string, skipReason: 'premium_off' | 'toggle_off'): void => {
  console.info(`[TABGROUP_SELECTOR][SYNC][${path}] skipped (${skipReason === 'premium_off' ? 'premium off' : 'toggle off'})`)
}

export const pushWorkspacesToCloud = async (): Promise<void> => {
  try {
    const gate = await resolveCrossDeviceSyncAllowed()
    if (!gate.allowed) {
      logSyncSkipped('outbound', gate.skipReason ?? 'premium_off')

      return
    }

    const blob = await chrome.storage.sync.get(SYNCED_WORKSPACES_KEY)
    const groups = (await allTabGroupsRegistryStorage.get()).groups
    const env = buildOutboundSyncEnvelope(groups, blob[SYNCED_WORKSPACES_KEY])

    if (!env) {
      console.info('[TABGROUP_SELECTOR][SYNC][outbound] envelope empty → chrome.storage.sync.remove', {
        key: SYNCED_WORKSPACES_KEY,
      })
      await chrome.storage.sync.remove(SYNCED_WORKSPACES_KEY)

      return
    }

    const json = JSON.stringify(env)
    const keys = Object.keys(env.m)

    console.info('[TABGROUP_SELECTOR][SYNC][outbound] prepared v2 map', {
      keyCount: keys.length,
      tabGroupTitlesSample: keys.slice(0, 12).map(pk => ({
        pk: pk.slice(0, 8),
        gt: env.m[pk].gt,
        u: env.m[pk].u,
      })),
      bytesUtf8: jsonUtf8ByteLength(json),
    })

    if (jsonUtf8ByteLength(json) > SYNC_STORAGE_TOTAL_SAFE_BYTES) {
      console.warn('[TABGROUP_SELECTOR][SYNC][outbound] payload exceeds SYNC_STORAGE_TOTAL_SAFE_BYTES — not writing')

      return
    }

    await chrome.storage.sync.set({ [SYNCED_WORKSPACES_KEY]: env })
    console.info('[TABGROUP_SELECTOR][SYNC][outbound] chrome.storage.sync.set OK', { key: SYNCED_WORKSPACES_KEY, v: 2 })
  } catch (error) {
    console.error('[TABGROUP_SELECTOR][SYNC][outbound] failed', error)
  }
}

const scheduleDebouncedPush = (): void => {
  void (async () => {
    const gate = await resolveCrossDeviceSyncAllowed()
    if (!gate.allowed) {
      return
    }

    clearCrossDeviceSyncPushDebouncer()
    console.info('[TABGROUP_SELECTOR][SYNC][outbound] registry local change → debounced push (~550ms)', {
      debounceMs: WORKSPACE_SYNC_PUSH_DEBOUNCE_MS,
    })
    pushDebouncer = setTimeout(() => {
      pushDebouncer = null
      void pushWorkspacesToCloud()
    }, WORKSPACE_SYNC_PUSH_DEBOUNCE_MS)
  })()
}

const mergeInboundPayload = async (raw: unknown): Promise<void> => {
  console.info('[TABGROUP_SELECTOR][SYNC][inbound] mergeInboundPayload', {
    rawKind: raw === undefined ? 'undefined' : raw === null ? 'null' : typeof raw === 'object' ? 'object' : typeof raw,
  })

  const env = parseSyncPayload(raw)

  if (!env) {
    console.info('[TABGROUP_SELECTOR][SYNC][inbound] aborted — parseSyncPayload null (invalid payload)')

    return
  }

  const gate = await resolveCrossDeviceSyncAllowed()
  if (!gate.allowed) {
    logSyncSkipped('inbound', gate.skipReason ?? 'premium_off')

    return
  }

  const sampleKeys = Object.keys(env.m).slice(0, 12)

  console.info('[TABGROUP_SELECTOR][SYNC][inbound] envelope v2 map', {
    v: env.v,
    keyCount: Object.keys(env.m).length,
    groupsSample: sampleKeys.map(pk => ({
      pk: pk.slice(0, 8),
      gt: env.m[pk].gt,
      color: env.m[pk].c,
      u: env.m[pk].u,
      urlPairs: env.m[pk].a.length,
    })),
  })

  applyingRemoteSync = true

  try {
    await allTabGroupsRegistryStorage.mergeRemoteSyncEnvelope(env)
    console.info('[TABGROUP_SELECTOR][SYNC][inbound] mergeRemoteSyncEnvelope done')
    await reconcileRegistryWithChrome()
    console.info('[TABGROUP_SELECTOR][SYNC][inbound] reconcileRegistryWithChrome done')
  } catch (error) {
    console.error('[TABGROUP_SELECTOR][SYNC][inbound] merge path failed', error)
  } finally {
    applyingRemoteSync = false
    console.info('[TABGROUP_SELECTOR][SYNC][inbound] applyingRemoteSync=false')
  }
}

const onStorageChanged = (
  changes: Record<string, chrome.storage.StorageChange | undefined>,
  areaName: chrome.storage.AreaName,
): void => {
  try {
    if (areaName === 'sync') {
      const ch = changes[SYNCED_WORKSPACES_KEY]

      console.info('[TABGROUP_SELECTOR][SYNC][onChanged]', {
        area: areaName,
        keys: Object.keys(changes).join(',') || '(none)',
        syncedWorkspacesHit: !!ch,
        oldKind: ch?.oldValue === undefined ? 'undefined' : typeof ch.oldValue,
        newKind: ch?.newValue === undefined ? 'undefined' : typeof ch.newValue,
      })

      if (ch) void mergeInboundPayload(ch.newValue)

      return
    }

    const prefHit = changes[CROSS_DEVICE_SYNC_PREFERENCE_STORAGE_KEY]
    if (areaName === 'local' && prefHit !== undefined) {
      const enabled = Boolean(
        prefHit.newValue &&
          typeof prefHit.newValue === 'object' &&
          (prefHit.newValue as { crossDeviceTabGroupsSyncEnabled?: boolean }).crossDeviceTabGroupsSyncEnabled,
      )

      if (!enabled) {
        clearCrossDeviceSyncPushDebouncer()
        console.info('[TABGROUP_SELECTOR][SYNC][preference] cross-device sync disabled — outbound debounce cleared')
      } else {
        void (async () => {
          if (!(await resolveCrossDeviceSyncAllowed()).allowed) {
            return
          }
          console.info('[TABGROUP_SELECTOR][SYNC][preference] cross-device sync enabled — cold pull + push')
          await coldStartPullFromSync()
          await pushWorkspacesToCloud()
        })()
      }
    }

    const regHit = changes[ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY]

    if (areaName === 'local' && regHit !== undefined && !applyingRemoteSync) {
      console.info('[TABGROUP_SELECTOR][SYNC][onChanged]', {
        area: areaName,
        registryWrite: ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY,
        applyingRemoteSync,
      })
      scheduleDebouncedPush()
    }
  } catch (e) {
    console.warn('[TABGROUP_SELECTOR][SYNC][onChanged] error (non-fatal)', e)
  }
}

export const coldStartPullFromSync = async (): Promise<void> => {
  try {
    const gate = await resolveCrossDeviceSyncAllowed()
    if (!gate.allowed) {
      logSyncSkipped('coldStart', gate.skipReason ?? 'premium_off')

      return
    }

    const blob = await chrome.storage.sync.get(SYNCED_WORKSPACES_KEY)

    console.info('[TABGROUP_SELECTOR][SYNC][coldStart] sync.get', {
      key: SYNCED_WORKSPACES_KEY,
      hasValue: blob[SYNCED_WORKSPACES_KEY] !== undefined,
    })

    await mergeInboundPayload(blob[SYNCED_WORKSPACES_KEY])
  } catch (error) {
    console.error('[TABGROUP_SELECTOR][SYNC][coldStart] failed', error)
  }
}

const initCrossDeviceSync = (): void => {
  if (crossDeviceListenersAttached) return

  crossDeviceListenersAttached = true
  chrome.storage.onChanged.addListener(onStorageChanged)
  console.info('[TABGROUP_SELECTOR][SYNC][init] chrome.storage.onChanged listener registered', {
    SYNCED_WORKSPACES_KEY,
    LOCAL_REGISTRY_KEY: ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY,
    PREFERENCE_KEY: CROSS_DEVICE_SYNC_PREFERENCE_STORAGE_KEY,
  })
  void coldStartPullFromSync()
}

export { initCrossDeviceSync }

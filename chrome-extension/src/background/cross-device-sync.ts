import { checkPremiumStatus } from './entitlements'
import { reconcileRegistryWithChrome } from './tab-group-registry'
import {
  ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY,
  allTabGroupsRegistryStorage,
  buildEnvelopeFromRegistryGroups,
  jsonUtf8ByteLength,
  parseSyncEnvelope,
  SYNC_STORAGE_TOTAL_SAFE_BYTES,
  SYNCED_WORKSPACES_KEY,
} from '@extension/storage'

/** WHY: Lets rapid registry batches coalesce into a single chrome.storage.sync write. */
const WORKSPACE_SYNC_PUSH_DEBOUNCE_MS = 550

let crossDeviceListenersAttached = false
let applyingRemoteSync = false
let pushDebouncer: ReturnType<typeof setTimeout> | null = null

const clearPushDebouncer = (): void => {
  if (pushDebouncer !== null) {
    clearTimeout(pushDebouncer)
    pushDebouncer = null
  }
}

const pushWorkspacesToCloud = async (): Promise<void> => {
  try {
    const premium = await checkPremiumStatus()
    if (!premium) {
      console.info('[TABGROUP_SELECTOR][SYNC][outbound] skipped (premium off)')

      return
    }

    const groups = (await allTabGroupsRegistryStorage.get()).groups
    const env = buildEnvelopeFromRegistryGroups(groups)

    if (!env) {
      console.info('[TABGROUP_SELECTOR][SYNC][outbound] envelope empty → chrome.storage.sync.remove', {
        key: SYNCED_WORKSPACES_KEY,
      })
      await chrome.storage.sync.remove(SYNCED_WORKSPACES_KEY)

      return
    }

    const json = JSON.stringify(env)

    console.info('[TABGROUP_SELECTOR][SYNC][outbound] prepared', {
      rowCount: env.g.length,
      tabGroupTitlesSample: env.g.slice(0, 12).map(r => ({ pk: r.k.slice(0, 8), gt: r.gt, u: r.u })),
      bytesUtf8: jsonUtf8ByteLength(json),
    })

    if (jsonUtf8ByteLength(json) > SYNC_STORAGE_TOTAL_SAFE_BYTES) {
      console.warn('[TABGROUP_SELECTOR][SYNC][outbound] payload exceeds SYNC_STORAGE_TOTAL_SAFE_BYTES — not writing')

      return
    }

    await chrome.storage.sync.set({ [SYNCED_WORKSPACES_KEY]: env })
    console.info('[TABGROUP_SELECTOR][SYNC][outbound] chrome.storage.sync.set OK', { key: SYNCED_WORKSPACES_KEY })
  } catch (error) {
    console.error('[TABGROUP_SELECTOR][SYNC][outbound] failed', error)
  }
}

const scheduleDebouncedPush = (): void => {
  clearPushDebouncer()
  console.info('[TABGROUP_SELECTOR][SYNC][outbound] registry local change → debounced push (~550ms)', {
    debounceMs: WORKSPACE_SYNC_PUSH_DEBOUNCE_MS,
  })
  pushDebouncer = setTimeout(() => {
    pushDebouncer = null
    void pushWorkspacesToCloud()
  }, WORKSPACE_SYNC_PUSH_DEBOUNCE_MS)
}

const mergeInboundPayload = async (raw: unknown): Promise<void> => {
  console.info('[TABGROUP_SELECTOR][SYNC][inbound] mergeInboundPayload', {
    rawKind: raw === undefined ? 'undefined' : raw === null ? 'null' : typeof raw === 'object' ? 'object' : typeof raw,
  })

  const env = parseSyncEnvelope(raw)

  if (!env) {
    console.info('[TABGROUP_SELECTOR][SYNC][inbound] aborted — parseSyncEnvelope null (invalid payload)')

    return
  }

  const premium = await checkPremiumStatus()
  if (!premium) {
    console.info('[TABGROUP_SELECTOR][SYNC][inbound] aborted — premium off')

    return
  }

  console.info('[TABGROUP_SELECTOR][SYNC][inbound] envelope', {
    v: env.v,
    t: env.t,
    rowCount: env.g.length,
    groupsSample: env.g.slice(0, 12).map(r => ({
      pk: r.k.slice(0, 8),
      gt: r.gt,
      color: r.c,
      u: r.u,
      urlPairs: r.a.length,
    })),
  })

  applyingRemoteSync = true

  try {
    await allTabGroupsRegistryStorage.mergeRemoteSyncEnvelope(env)
    console.info('[TABGROUP_SELECTOR][SYNC][inbound] mergeRemoteSyncEnvelope done')
    // WHY: Merge only writes closed payloads; Chrome may already host a live synced TabGroup.
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

const coldStartPullFromSync = async (): Promise<void> => {
  try {
    const premium = await checkPremiumStatus()
    if (!premium) {
      console.info('[TABGROUP_SELECTOR][SYNC][coldStart] skipped (premium off)')

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
  })
  void coldStartPullFromSync()
}

export { initCrossDeviceSync, pushWorkspacesToCloud }

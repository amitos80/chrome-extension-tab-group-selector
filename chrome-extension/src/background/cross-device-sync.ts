import { checkPremiumStatus } from './entitlements'
import {
  ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY,
  allTabGroupsRegistryStorage,
  buildEnvelopeFromRegistryGroups,
  jsonUtf8ByteLength,
  parseSyncEnvelope,
  SYNC_STORAGE_TOTAL_SAFE_BYTES,
  SYNCED_WORKSPACES_KEY,
} from '@extension/storage'

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
    if (!(await checkPremiumStatus())) return

    const groups = (await allTabGroupsRegistryStorage.get()).groups
    const env = buildEnvelopeFromRegistryGroups(groups)

    if (!env) {
      await chrome.storage.sync.remove(SYNCED_WORKSPACES_KEY)

      return
    }

    const json = JSON.stringify(env)

    if (jsonUtf8ByteLength(json) > SYNC_STORAGE_TOTAL_SAFE_BYTES) {
      console.warn('[SYNC] Payload exceeds synchronization quota limits.')

      return
    }

    await chrome.storage.sync.set({ [SYNCED_WORKSPACES_KEY]: env })
  } catch (error) {
    console.error('[SYNC] Outbound sync operation failed:', error)
  }
}

const scheduleDebouncedPush = (): void => {
  clearPushDebouncer()
  pushDebouncer = setTimeout(() => {
    pushDebouncer = null
    void pushWorkspacesToCloud()
  }, 550)
}

const mergeInboundPayload = async (raw: unknown): Promise<void> => {
  const env = parseSyncEnvelope(raw)

  if (!env || !(await checkPremiumStatus())) return

  applyingRemoteSync = true

  try {
    await allTabGroupsRegistryStorage.mergeRemoteSyncEnvelope(env)
  } catch (error) {
    console.error('[SYNC] Inbound merge failed:', error)
  } finally {
    applyingRemoteSync = false
  }
}

const onStorageChanged = (
  changes: Record<string, chrome.storage.StorageChange | undefined>,
  areaName: chrome.storage.AreaName,
): void => {
  try {
    if (areaName === 'sync') {
      const ch = changes[SYNCED_WORKSPACES_KEY]

      if (ch) void mergeInboundPayload(ch.newValue)

      return
    }

    if (areaName === 'local' && changes[ALL_TAB_GROUPS_REGISTRY_STORAGE_KEY] !== undefined && !applyingRemoteSync) {
      scheduleDebouncedPush()
    }
  } catch {
    /* WHY: Firefox / restricted profiles may omit sync areas; degrade silently. */
  }
}

const coldStartPullFromSync = async (): Promise<void> => {
  try {
    if (!(await checkPremiumStatus())) return

    const blob = await chrome.storage.sync.get(SYNCED_WORKSPACES_KEY)

    await mergeInboundPayload(blob[SYNCED_WORKSPACES_KEY])
  } catch (error) {
    console.error('[SYNC] Cold-start pull failed:', error)
  }
}

const initCrossDeviceSync = (): void => {
  if (crossDeviceListenersAttached) return

  crossDeviceListenersAttached = true
  chrome.storage.onChanged.addListener(onStorageChanged)
  void coldStartPullFromSync()
}

export { initCrossDeviceSync, pushWorkspacesToCloud }

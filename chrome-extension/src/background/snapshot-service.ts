import { checkPremiumStatus } from './entitlements'
import { sessionSnapshotsStorage } from '@extension/storage'
import type { SessionSnapshot, TabBackup, WindowBackup } from '@extension/storage'

const handleSnapshotAlarm = async (): Promise<void> => {
  const isPremium = await checkPremiumStatus()
  if (!isPremium) return
  try {
    await processSnapshotCapture()
  } catch (error) {
    console.error('[SNAPSHOT] Automated capture pipeline aborted:', error)
  }
}

const processSnapshotCapture = async (): Promise<void> => {
  const [windows, groups] = await Promise.all([chrome.windows.getAll({ populate: true }), chrome.tabGroups.query({})])
  const groupMap = buildGroupMap(groups)
  const windowBackups = windows.map(w => serializeWindow(w, groupMap)).filter(w => w.tabs.length > 0)
  const snapshot: SessionSnapshot = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    windows: windowBackups,
  }
  await sessionSnapshotsStorage.prependSnapshot(snapshot)
}

const buildGroupMap = (groups: chrome.tabGroups.TabGroup[]): Map<number, chrome.tabGroups.TabGroup> =>
  new Map(groups.map(g => [g.id, g]))

const serializeWindow = (
  win: chrome.windows.Window,
  groupMap: Map<number, chrome.tabGroups.TabGroup>,
): WindowBackup => ({
  id: win.id ?? -1,
  tabs: (win.tabs ?? []).map(tab => serializeTab(tab, groupMap)),
})

const serializeTab = (tab: chrome.tabs.Tab, groupMap: Map<number, chrome.tabGroups.TabGroup>): TabBackup => {
  const none = chrome.tabGroups.TAB_GROUP_ID_NONE
  const group = tab.groupId !== undefined && tab.groupId !== none ? groupMap.get(tab.groupId) : undefined

  return {
    title: tab.title ?? '',
    url: tab.url ?? '',
    groupTitle: group?.title,
    groupColor: group?.color,
  }
}

export { handleSnapshotAlarm }

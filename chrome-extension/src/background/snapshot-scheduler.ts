import { handleSnapshotAlarm } from './snapshot-service'

const SNAPSHOT_ALARM_NAME = 'automated-session-snapshot'
const DEFAULT_INTERVAL_MINUTES = 30

let alarmListenerAttached = false

const onSnapshotAlarm = (alarm: chrome.alarms.Alarm): void => {
  if (alarm.name !== SNAPSHOT_ALARM_NAME) return
  void handleSnapshotAlarm()
}

const ensureAlarmRegistered = async (periodInMinutes: number): Promise<void> => {
  const existing = await chrome.alarms.get(SNAPSHOT_ALARM_NAME)
  if (!existing) {
    chrome.alarms.create(SNAPSHOT_ALARM_NAME, { periodInMinutes })
  }
}

const initSnapshotScheduler = (): void => {
  if (!alarmListenerAttached) {
    alarmListenerAttached = true
    chrome.alarms.onAlarm.addListener(onSnapshotAlarm)
  }
  void ensureAlarmRegistered(DEFAULT_INTERVAL_MINUTES)
}

export { initSnapshotScheduler }

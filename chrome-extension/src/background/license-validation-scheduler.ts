import { LICENSE_VALIDATION_ALARM_NAME, LICENSE_VALIDATION_PERIOD_MINUTES } from '@extension/storage'
import { validateStoredLicense } from './lemon-squeezy-license.js'

let alarmListenerAttached = false

const onLicenseAlarm = (alarm: chrome.alarms.Alarm): void => {
  if (alarm.name !== LICENSE_VALIDATION_ALARM_NAME) {
    return
  }
  void validateStoredLicense()
}

const ensureLicenseAlarm = async function ensureLicenseAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(LICENSE_VALIDATION_ALARM_NAME)
  if (!existing) {
    chrome.alarms.create(LICENSE_VALIDATION_ALARM_NAME, {
      periodInMinutes: LICENSE_VALIDATION_PERIOD_MINUTES,
    })
  }
}

export const initLicenseValidationScheduler = function initLicenseValidationScheduler(): void {
  if (!alarmListenerAttached) {
    alarmListenerAttached = true
    chrome.alarms.onAlarm.addListener(onLicenseAlarm)
  }
  void ensureLicenseAlarm()
}

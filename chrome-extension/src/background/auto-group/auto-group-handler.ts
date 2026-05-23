import { isUrlMatch } from './url-matcher'
import { checkPremiumStatus } from '../entitlements'
import { autoGroupRulesStorage, autoGroupingPreferenceStorage } from '@extension/storage'
import type { AutoGroupRule } from '@extension/storage'

/** Spec: bypass system and extension pages plus blank placeholder loads. */
const shouldSkipUrlForAutoGroup = (url: string | undefined): boolean => {
  if (!url?.trim()) return true
  const u = url.trim().toLowerCase()

  return (
    u.startsWith('chrome://') ||
    u.startsWith('chrome-extension://') ||
    u === 'about:blank' ||
    u.startsWith('devtools://') ||
    u.startsWith('edge://')
  )
}

const findFirstMatchingRule = (url: string, rules: AutoGroupRule[]): AutoGroupRule | undefined =>
  rules.find(r => isUrlMatch(url, r.pattern))

const findOpenGroupMatchingRule = async (
  windowId: number,
  title: string,
  color: chrome.tabGroups.Color,
): Promise<number | null> => {
  const groups = await chrome.tabGroups.query({ windowId })

  const hit = groups.find(g => g.title?.toLowerCase() === title.toLowerCase() && g.color === color)

  return hit?.id ?? null
}

const applyGrouping = async (tabId: number, windowId: number | undefined, rule: AutoGroupRule): Promise<void> => {
  if (windowId === undefined) return

  const chromeColor = rule.groupColor as chrome.tabGroups.Color
  const existing = await findOpenGroupMatchingRule(windowId, rule.groupTitle, chromeColor)

  try {
    if (existing !== null) {
      await chrome.tabs.group({ tabIds: [tabId], groupId: existing })
    } else {
      const gid = await chrome.tabs.group({ tabIds: [tabId] })

      await chrome.tabGroups.update(gid, {
        title: rule.groupTitle,
        color: chromeColor,
      })
    }
  } catch (error) {
    console.error('[AUTO-GROUP] Routing allocation aborted:', error)
  }
}

export const handleTabUrlUpdate = async (
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab,
): Promise<void> => {
  if (!changeInfo.url) return

  const nextUrl = changeInfo.url

  if (shouldSkipUrlForAutoGroup(nextUrl)) return

  const isPremium = await checkPremiumStatus()

  if (!isPremium) return

  const prefs = await autoGroupingPreferenceStorage.get()

  if (!prefs.autoGroupingEnabled) return

  const { rules } = await autoGroupRulesStorage.get()
  const matched = findFirstMatchingRule(nextUrl, rules)

  if (!matched) return

  await applyGrouping(tabId, tab.windowId, matched)
}

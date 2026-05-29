import type { PersistedTabGroup } from '@extension/storage'

const MAX_URLS_PER_GROUP_RESTORE = 50

const extensionOriginPrefix = function extensionOriginPrefix(): string {
  try {
    return chrome.runtime.getURL('')
  } catch {
    return ''
  }
}

/**
 * Normalizes URLs for chrome.windows.create — avoids schemes Chrome blocks or cross-extension pages.
 */
const normalizeUrlsForRestore = function normalizeUrlsForRestore(raw: string[]): string[] {
  const prefix = extensionOriginPrefix()
  const capped = raw.slice(0, MAX_URLS_PER_GROUP_RESTORE)
  const out: string[] = []
  for (const rawUrl of capped) {
    const trimmed = rawUrl.trim()
    if (!trimmed) {
      continue
    }
    try {
      const parsed = new URL(trimmed)
      const p = parsed.protocol
      if (p === 'http:' || p === 'https:' || p === 'about:') {
        out.push(trimmed)
        continue
      }
      if (p === 'chrome-extension:' && prefix.length > 0 && trimmed.startsWith(prefix)) {
        out.push(trimmed)
        continue
      }
      out.push('about:blank')
    } catch {
      out.push('about:blank')
    }
  }
  return out
}

/**
 * WHY: Opens tab URLs then groups tabs — reused for registry closed rows and bookmark-folder saved Chrome groups.
 */
const openUrlsAsNewGroupedWindow = async function openUrlsAsNewGroupedWindow(
  title: string,
  color: string,
  rawUrls: string[],
): Promise<{ success: boolean; groupId?: number; windowId?: number }> {
  let urls = normalizeUrlsForRestore(rawUrls)
  if (urls.length === 0) {
    urls = ['about:blank']
  }

  const newWindow = await chrome.windows.create({
    url: urls,
    focused: true,
  })

  const windowId = newWindow.id
  if (windowId === undefined) {
    return { success: false }
  }

  const tabsInWindow = await chrome.tabs.query({ windowId })
  const sorted = [...tabsInWindow].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  const tabIds = sorted.map(t => t.id).filter((id): id is number => typeof id === 'number')

  if (tabIds.length === 0) {
    return { success: false, windowId }
  }

  // WHY: Chrome rejects top-level `windowId` on tabs.group; window is implied by tabIds (see GroupOptions.createProperties if needed).
  const groupId = await chrome.tabs.group({ tabIds })
  await chrome.tabGroups.update(groupId, {
    title,
    color: color as chrome.tabGroups.Color,
  })

  return { success: true, groupId, windowId }
}

const restoreClosedGroupInNewWindow = async function restoreClosedGroupInNewWindow(
  meta: PersistedTabGroup,
): Promise<{ success: boolean; groupId?: number; windowId?: number }> {
  return openUrlsAsNewGroupedWindow(meta.title || 'Untitled', meta.color || 'grey', meta.urls ?? [])
}

export {
  MAX_URLS_PER_GROUP_RESTORE,
  normalizeUrlsForRestore,
  openUrlsAsNewGroupedWindow,
  restoreClosedGroupInNewWindow,
}

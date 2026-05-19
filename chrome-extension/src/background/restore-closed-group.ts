import type { PersistedTabGroup } from '@extension/storage'

export const MAX_URLS_PER_GROUP_RESTORE = 50

function extensionOriginPrefix(): string {
  try {
    return chrome.runtime.getURL('')
  } catch {
    return ''
  }
}

/**
 * Normalizes URLs for chrome.windows.create — avoids schemes Chrome blocks or cross-extension pages.
 */
export function normalizeUrlsForRestore(raw: string[]): string[] {
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

export async function restoreClosedGroupInNewWindow(
  meta: PersistedTabGroup,
): Promise<{ success: boolean; groupId?: number; windowId?: number }> {
  let urls = normalizeUrlsForRestore(meta.urls ?? [])
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
    title: meta.title,
    color: meta.color as chrome.tabGroups.Color,
  })

  return { success: true, groupId, windowId }
}

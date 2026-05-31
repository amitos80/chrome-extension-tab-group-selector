/** Cap URLs stored per open/closed group row (aligned with restore + live snapshot). */
export const REGISTRY_MAX_TAB_URLS = 50

type TabUrlLike = {
  url?: string
  pendingUrl?: string
  index?: number
}

/** Stable tab-order URL list for registry rows and cross-device sync payloads. */
export const sortedTabUrls = function sortedTabUrls(raw: TabUrlLike[]): string[] {
  return [...raw]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(t => String(t.url || t.pendingUrl || '').trim())
    .filter(Boolean)
    .slice(0, REGISTRY_MAX_TAB_URLS)
}

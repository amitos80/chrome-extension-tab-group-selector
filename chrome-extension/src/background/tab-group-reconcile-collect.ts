/**
 * UNION of chrome.tabGroups.query and any group IDs referenced by open tabs.
 * WHY: Synced/native groups can briefly be visible to users but omitted from tabGroups.query
 * until the group is interacted with; tabs still expose a valid groupId and tabGroups.get works.
 */
export const collectChromeTabGroupsForReconcile = async (): Promise<chrome.tabGroups.TabGroup[]> => {
  const fromQuery = await chrome.tabGroups.query({})
  const byId = new Map(fromQuery.map(g => [g.id, g]))
  const tabs = await chrome.tabs.query({})

  for (const t of tabs) {
    if (t.groupId === undefined || t.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
      continue
    }
    const id = t.groupId
    if (byId.has(id)) {
      continue
    }
    try {
      const g = await chrome.tabGroups.get(id)
      byId.set(id, g)
    } catch {
      /* Race: tab list and group teardown; ignore. */
    }
  }

  return [...byId.values()]
}

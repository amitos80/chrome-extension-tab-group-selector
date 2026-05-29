/** Prefix for RESTORE_CLOSED_GROUP targets backed by bookmark folders (pinned/saved tab groups). */
const BOOKMARK_SAVED_TAB_GROUP_PREFIX = 'bookmark-folder:'

/** Max URLs mirrored from bookmarks (aligned with group restore clamp). */
const MAX_BOOKMARK_URLS_FOR_LIST = 50

/** WHY: Prefer string compare — FolderType omits BOOKMARKS_BAR on some tooling targets. */
const BOOKMARKS_BAR_FOLDER_TYPE = 'bookmarks-bar'

/** Stable signature for skipping bookmark folders that match an instantiated tab group's tab URLs. */
const urlsFingerprintForSavedGroup = function urlsFingerprintForSavedGroup(rawUrls: string[]): string {
  return [...rawUrls]
    .map(u => u.trim())
    .filter(Boolean)
    .slice(0, MAX_BOOKMARK_URLS_FOR_LIST)
    .sort()
    .join('\n')
}

const bookmarkFolderPersistKey = function bookmarkFolderPersistKey(bookmarkFolderId: string): string {
  return `${BOOKMARK_SAVED_TAB_GROUP_PREFIX}${bookmarkFolderId}`
}

const isBookmarksBarNode = (n: chrome.bookmarks.BookmarkTreeNode): boolean => {
  if ((n.folderType as string | undefined) === BOOKMARKS_BAR_FOLDER_TYPE) {
    return true
  }
  /** Firefox profile — bookmarks toolbar root id */
  if (n.id === 'toolbar_____') {
    return true
  }

  return false
}

/**
 * Collect bookmarks-bar roots (normally one shallow node under the profile `"0"` folder).
 */
const collectBookmarksBarRootsFromTopNodes = (
  profileRootChildren: chrome.bookmarks.BookmarkTreeNode[],
): chrome.bookmarks.BookmarkTreeNode[] => {
  const direct = profileRootChildren.filter(isBookmarksBarNode)
  if (direct.length > 0) {
    return direct
  }
  /** Rare trees: DFS until we locate a labelled bar folder. */
  const out: chrome.bookmarks.BookmarkTreeNode[] = []
  const visit = (node: chrome.bookmarks.BookmarkTreeNode): void => {
    if (isBookmarksBarNode(node)) {
      out.push(node)
      return
    }
    node.children?.forEach(visit)
  }
  profileRootChildren.forEach(visit)
  return out
}

type BookmarkSavedSlot = {
  bookmarkFolderId: string
  title: string
  urls: string[]
  fingerprint: string
  closedAt: number | null
}

/** Flat bookmark folder whose children are all URL leaves — mirrors Chrome Saved Tab Group bookmark payloads. */
const visitBarSubtreeForCandidates = (
  node: chrome.bookmarks.BookmarkTreeNode,
  acc: BookmarkSavedSlot[],
  seenFingerprints: Set<string>,
  instantiatedFingerprints: ReadonlySet<string>,
): void => {
  const children = node.children
  if (!children?.length) {
    return
  }

  /* Folder of links only — no nested bookmark folders inside. */
  const isLeafUrlBookmark = (c: chrome.bookmarks.BookmarkTreeNode): boolean =>
    typeof c.url === 'string' && c.url.length > 0 && c.children === undefined

  const allLeaves = children.every(isLeafUrlBookmark)
  const isFolderWithoutUrl = node.url === undefined

  if (isFolderWithoutUrl && allLeaves) {
    const urls = children
      .map(c => String(c.url).trim())
      .filter(Boolean)
      .slice(0, MAX_BOOKMARK_URLS_FOR_LIST)
    if (urls.length === 0) {
      /** Empty saved group placeholders are rare; recurse into subtree only. */
    } else {
      const fingerprint = urlsFingerprintForSavedGroup(urls)
      if (!instantiatedFingerprints.has(fingerprint) && !seenFingerprints.has(fingerprint) && node.id !== undefined) {
        seenFingerprints.add(fingerprint)
        const closedAt = node.dateGroupModified ?? node.dateAdded ?? null
        acc.push({
          bookmarkFolderId: node.id,
          title: node.title?.trim() || `${urls.length} tabs`,
          urls,
          fingerprint,
          closedAt: closedAt != null ? closedAt : null,
        })
      }
    }
  }

  /* Always descend past non-candidate wrappers (Bookmarks Bar mixes links + folders). */
  for (const c of children) {
    visitBarSubtreeForCandidates(c, acc, seenFingerprints, instantiatedFingerprints)
  }
}

/**
 * Lists Saved Tab Groups exposed as bookmark-bar folders filled with URL bookmarks.
 * WHY: chrome.tabGroups.query excludes pinned/saved groups until opened; synced groups still sync into bookmark payloads.
 */
const listBookmarkBarSavedTabGroupSlots = async function listBookmarkBarSavedTabGroupSlots(
  instantiatedUrlFingerprints: ReadonlySet<string>,
): Promise<BookmarkSavedSlot[]> {
  if (typeof chrome === 'undefined' || !chrome.bookmarks?.getTree) {
    return []
  }

  try {
    const tree = await chrome.bookmarks.getTree()
    const profileRootChildren = tree[0]?.children ?? []
    const bars = collectBookmarksBarRootsFromTopNodes(profileRootChildren)
    if (bars.length === 0) {
      return []
    }

    const acc: BookmarkSavedSlot[] = []
    const seenFingerprints = new Set<string>()
    for (const bar of bars) {
      bar.children?.forEach(c => visitBarSubtreeForCandidates(c, acc, seenFingerprints, instantiatedUrlFingerprints))
    }
    return acc
  } catch (e) {
    console.warn('[TABGROUP_SELECTOR][REGISTRY][bookmark-saved-tab-groups] getTree/list failed', e)
    return []
  }
}

export {
  BOOKMARK_SAVED_TAB_GROUP_PREFIX,
  bookmarkFolderPersistKey,
  listBookmarkBarSavedTabGroupSlots,
  urlsFingerprintForSavedGroup,
}

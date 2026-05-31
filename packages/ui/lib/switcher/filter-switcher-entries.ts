import {
  CHROME_TAB_GROUP_COLORS,
  normalizeTabGroupColor,
  type ChromeTabGroupColor,
  type SwitcherTabGroupEntry,
} from '@extension/storage'

const TOTAL_TAB_GROUP_COLORS = CHROME_TAB_GROUP_COLORS.length

/** True when 1–8 colors are selected (0 or all 9 = no color filter). */
export const isColorFilterActive = (selected: ReadonlySet<ChromeTabGroupColor>): boolean =>
  selected.size > 0 && selected.size < TOTAL_TAB_GROUP_COLORS

export const filterSwitcherEntries = (
  entries: SwitcherTabGroupEntry[],
  searchQuery: string,
  selectedColors: ReadonlySet<ChromeTabGroupColor>,
): SwitcherTabGroupEntry[] => {
  const q = searchQuery.toLowerCase().trim()
  let result = entries

  if (q) {
    result = result.filter(e => (e.title || 'Untitled').toLowerCase().includes(q))
  }

  if (isColorFilterActive(selectedColors)) {
    result = result.filter(e => selectedColors.has(normalizeTabGroupColor(e.color)))
  }

  return result
}

export const toggleSelectedColor = (
  selected: ReadonlySet<ChromeTabGroupColor>,
  color: ChromeTabGroupColor,
): Set<ChromeTabGroupColor> => {
  const next = new Set(selected)

  if (next.has(color)) {
    next.delete(color)
  } else {
    next.add(color)
  }

  return next
}

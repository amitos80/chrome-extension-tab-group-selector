/** Official Chrome tab group colors (matches `chrome.tabGroups.Color`). */
export const CHROME_TAB_GROUP_COLORS = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
] as const

export type ChromeTabGroupColor = (typeof CHROME_TAB_GROUP_COLORS)[number]

/** CSS hex values for Chrome named tab group colors (switcher swatches). */
export const TAB_GROUP_COLOR_CSS: Record<ChromeTabGroupColor, string> = {
  grey: '#5f6368',
  blue: '#1a73e8',
  red: '#d93025',
  yellow: '#f9ab00',
  green: '#188038',
  pink: '#ff63b8',
  purple: '#9334e6',
  cyan: '#12b5cb',
  orange: '#fa903e',
}

const isChromeTabGroupColor = (raw: string): raw is ChromeTabGroupColor =>
  (CHROME_TAB_GROUP_COLORS as readonly string[]).includes(raw)

/** Map persisted/API color strings to a known Chrome tab group color. */
export const normalizeTabGroupColor = (raw: string): ChromeTabGroupColor =>
  isChromeTabGroupColor(raw) ? raw : 'grey'

export const tabGroupColorCss = (raw: string): string =>
  TAB_GROUP_COLOR_CSS[normalizeTabGroupColor(raw)]

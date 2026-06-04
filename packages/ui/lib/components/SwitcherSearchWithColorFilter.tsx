import { t } from '@extension/i18n'
import { CHROME_TAB_GROUP_COLORS, TAB_GROUP_COLOR_CSS, type ChromeTabGroupColor } from '@extension/storage'
import { cn } from '../utils.js'
import type { RefObject } from 'react'

const COLOR_FILTER_ARIA = {
  grey: 'switcherColorFilterGrey',
  blue: 'switcherColorFilterBlue',
  red: 'switcherColorFilterRed',
  yellow: 'switcherColorFilterYellow',
  green: 'switcherColorFilterGreen',
  pink: 'switcherColorFilterPink',
  purple: 'switcherColorFilterPurple',
  cyan: 'switcherColorFilterCyan',
  orange: 'switcherColorFilterOrange',
} as const satisfies Record<ChromeTabGroupColor, string>

type SwitcherSearchWithColorFilterProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedColors: ReadonlySet<ChromeTabGroupColor>
  onToggleColor: (color: ChromeTabGroupColor) => void
  isLight: boolean
  inputRef: RefObject<HTMLInputElement | null>
  placeholder: string
}

export const SwitcherSearchWithColorFilter = function SwitcherSearchWithColorFilter({
  searchQuery,
  onSearchChange,
  selectedColors,
  onToggleColor,
  isLight,
  inputRef,
  placeholder,
}: SwitcherSearchWithColorFilterProps) {
  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- deliberate primary control when switcher mounts.
        autoFocus
        type="text"
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-lg border py-2 pl-2 pr-[8.75rem] text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
          isLight
            ? 'border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400'
            : 'border-white/10 bg-white/5 text-white placeholder:text-white/40',
        )}
      />
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1">
        {CHROME_TAB_GROUP_COLORS.map(color => {
          const selected = selectedColors.has(color)

          return (
            <button
              key={color}
              type="button"
              aria-pressed={selected}
              aria-label={t(COLOR_FILTER_ARIA[color])}
              title={t(COLOR_FILTER_ARIA[color])}
              onClick={e => {
                e.stopPropagation()
                onToggleColor(color)
              }}
              className={cn(
                'pointer-events-auto h-5 w-5 shrink-0 rounded-full opacity-30 ring-1 ring-black/10 transition-opacity hover:opacity-100',
                `${selected && 'opacity-100'}`,
              )}
              style={{ backgroundColor: TAB_GROUP_COLOR_CSS[color] }}
            />
          )
        })}
      </div>
    </div>
  )
}

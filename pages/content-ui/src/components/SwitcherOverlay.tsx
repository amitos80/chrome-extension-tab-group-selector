import { t } from '@extension/i18n'
import { FREE_TIER_VISIBLE_TAB_GROUPS } from '@extension/storage'
import { cn } from '@extension/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SwitcherTabGroupEntry } from '@extension/storage'

interface Props {
  entries: SwitcherTabGroupEntry[]
  activeGroupId: number | null
  onActivateOpen: (chromeGroupId: number) => void
  onRestoreClosed: (persistKey: string) => void
  onClose: () => void
  isLight: boolean
  isPremium: boolean
}

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

/** WHY: Chrome exposes named colours; map to CSS values for the dot swatch. */
const TAB_GROUP_COLOR_CSS: Record<string, string> = {
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

/** WHY: Extension NTP and injected overlays may ignore synchronous focus(); defer past layout/tab activation. */
const focusSearchInput = (el: HTMLInputElement | null) => {
  if (!el) return

  requestAnimationFrame(() => {
    el?.focus({ preventScroll: true })
  })
}

const SwitcherOverlay = ({
  entries,
  activeGroupId,
  onActivateOpen,
  onRestoreClosed,
  onClose,
  isLight,
  isPremium,
}: Props) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedRowRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      focusSearchInput(searchInputRef.current)
    }, 2895)
  }, [])

  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) {
      return entries
    }
    return entries.filter(e => (e.title || 'Untitled').toLowerCase().includes(q))
  }, [entries, searchQuery])

  const visibleEntries = useMemo(() => {
    if (isPremium) {
      return filteredEntries
    }
    return filteredEntries.slice(0, FREE_TIER_VISIBLE_TAB_GROUPS)
  }, [filteredEntries, isPremium])

  const showUpgradeCta = !isPremium && filteredEntries.length > FREE_TIER_VISIBLE_TAB_GROUPS

  const groupsHeading = useMemo(() => {
    if (!isPremium && filteredEntries.length > FREE_TIER_VISIBLE_TAB_GROUPS) {
      return t('switcherTabGroupsLimitedHeading', [
        String(Math.min(filteredEntries.length, FREE_TIER_VISIBLE_TAB_GROUPS)),
        String(filteredEntries.length),
      ])
    }
    return t('switcherTabGroupsHeading', [String(filteredEntries.length)])
  }, [filteredEntries, isPremium])

  useEffect(() => {
    const preferred = visibleEntries.findIndex(e => e.isOpen && e.chromeGroupId === activeGroupId)
    setSelectedIndex(preferred >= 0 ? preferred : 0)
  }, [visibleEntries, activeGroupId])

  useEffect(() => {
    setSelectedIndex(prev => Math.min(prev, Math.max(0, visibleEntries.length - 1)))
  }, [visibleEntries.length])

  // WHY: Keyboard ↑↓ updates selection without focusing rows; scroll-padding + scrollIntoView keeps the highlight visible (Tailwind does not auto-scroll programmatic selection).
  useEffect(() => {
    if (visibleEntries.length === 0) {
      return
    }
    const id = requestAnimationFrame(() => {
      selectedRowRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    return () => cancelAnimationFrame(id)
  }, [selectedIndex, visibleEntries])

  const activateRow = useCallback(
    (row: SwitcherTabGroupEntry) => {
      if (row.isOpen && row.chromeGroupId != null) {
        onActivateOpen(row.chromeGroupId)
      } else {
        onRestoreClosed(row.persistKey)
      }
    },
    [onActivateOpen, onRestoreClosed],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (visibleEntries.length === 0) {
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(visibleEntries.length - 1, prev + 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const row = visibleEntries[selectedIndex]
        if (row) {
          activateRow(row)
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visibleEntries, selectedIndex, onClose, activateRow])

  const dotColor = (color: string) => TAB_GROUP_COLOR_CSS[color] ?? TAB_GROUP_COLOR_CSS.grey

  const openPremiumOptions = () => {
    void chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' })
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- isolate panel from host backdrop click-close
    <div
      className={cn(
        'flex h-1/2 min-h-0 min-w-[420px] max-w-[500px] flex-col gap-2 overflow-hidden rounded-2xl p-6 text-left shadow-2xl',
        isLight ? 'border border-gray-200 bg-white/95' : 'border border-white/20 bg-[#1e1e1e]/95',
      )}
      onClick={e => e.stopPropagation()}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className={cn('text-lg font-semibold', isLight ? 'text-gray-900' : 'text-white')}>{t('switcherTitle')}</h2>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'px-2 text-xl leading-none transition-colors',
            isLight ? 'text-gray-500 hover:text-gray-900' : 'text-white/60 hover:text-white',
          )}
          aria-label="Close">
          ×
        </button>
      </div>

      <input
        ref={searchInputRef}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- deliberate primary control when switcher mounts (custom NTP / shortcut).
        autoFocus
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder={t('switcherSearchPlaceholder')}
        className={cn(
          'w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
          isLight
            ? 'border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400'
            : 'border-white/10 bg-white/5 text-white placeholder:text-white/40',
        )}
      />

      {filteredEntries.length === 0 && (
        <p className={cn('py-4 text-center text-sm', isLight ? 'text-gray-500' : 'text-white/60')}>
          {searchQuery ? t('switcherEmptySearch') : t('switcherEmptyNoGroups')}
        </p>
      )}

      {filteredEntries.length > 0 && (
        <div className="flex min-h-0 flex-1 scroll-py-2 flex-col gap-2 overflow-y-auto">
          <h3
            className={cn(
              'mt-2 text-xs font-semibold uppercase tracking-wide',
              isLight ? 'text-gray-500' : 'text-white/50',
            )}>
            {groupsHeading}
          </h3>
          {visibleEntries.map((row, i) => {
            const isSelected = i === selectedIndex
            const isActive = row.isOpen && row.chromeGroupId === activeGroupId

            return (
              // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- keyboard: document-level Enter / arrows
              <div
                key={row.persistKey}
                ref={isSelected ? selectedRowRef : undefined}
                onClick={() => activateRow(row)}
                style={{ opacity: row.isOpen ? 1 : 0.6 }}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-left transition-all',
                  isSelected
                    ? isLight
                      ? 'border-2 border-blue-600 bg-blue-50'
                      : 'border-2 border-blue-500 bg-blue-500/20'
                    : isLight
                      ? 'border-2 border-transparent hover:bg-gray-100'
                      : 'border-2 border-transparent hover:bg-white/5',
                )}>
                <div className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: dotColor(row.color) }} />
                <div className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm font-medium', isLight ? 'text-gray-900' : 'text-white')}>
                    {row.title || 'Untitled'}
                  </span>
                  {row.isOpen ? (
                    <span className={cn('block text-xs', isLight ? 'text-gray-500' : 'text-white/40')}>
                      {row.tabCount} {row.tabCount === 1 ? 'tab' : 'tabs'} • Open
                    </span>
                  ) : (
                    <span className={cn('block text-xs', isLight ? 'text-gray-500' : 'text-white/40')}>
                      {row.tabCount} {row.tabCount === 1 ? 'tab' : 'tabs'} • Closed{' '}
                      {row.closedAt ? formatTimeAgo(row.closedAt) : ''}
                      {row.hasRestorableUrls ? ' • Saved URLs' : ''}
                    </span>
                  )}
                </div>
                {isActive && (
                  <span className={cn('shrink-0 text-xs font-medium', isLight ? 'text-blue-700' : 'text-blue-400')}>
                    Active
                  </span>
                )}
                {!row.isOpen && (
                  <span className={cn('shrink-0 text-xs font-medium', isLight ? 'text-gray-500' : 'text-white/40')}>
                    Restore
                  </span>
                )}
              </div>
            )
          })}
          {showUpgradeCta ? (
            <div
              className={cn(
                'mt-1 shrink-0 rounded-lg border px-3 py-3',
                isLight ? 'border-amber-200 bg-amber-50' : 'border-amber-500/40 bg-amber-950/40',
              )}>
              <p className={cn('text-sm leading-snug', isLight ? 'text-amber-950' : 'text-amber-100')}>
                {t('switcherPremiumUpgradeCta')}
              </p>
              <button
                type="button"
                onClick={openPremiumOptions}
                className={cn(
                  'mt-2 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                  isLight ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-amber-500 text-black hover:bg-amber-400',
                )}>
                {t('switcherPremiumUpgradeButton')}
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className={cn('mt-2 border-t pt-2', isLight ? 'border-gray-200' : 'border-white/10')}>
        <p className={cn('text-center text-xs', isLight ? 'text-gray-400' : 'text-white/40')}>
          {t('switcherKeyboardHints')}
        </p>
      </div>
    </div>
  )
}

export { SwitcherOverlay }

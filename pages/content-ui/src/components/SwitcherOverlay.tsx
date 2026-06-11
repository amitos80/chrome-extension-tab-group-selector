import { t } from '@extension/i18n'
import { FREE_TIER_VISIBLE_TAB_GROUPS, type ChromeTabGroupColor } from '@extension/storage'
import {
  cn,
  filterSwitcherEntries,
  isColorFilterActive,
  PremiumUpgradePanel,
  SwitcherSearchWithColorFilter,
  SwitcherTabGroupRow,
  toggleSelectedColor,
} from '@extension/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SwitcherTabGroupEntry } from '@extension/storage'

interface Props {
  entries: SwitcherTabGroupEntry[]
  activeGroupId: number | null
  onActivateOpen: (chromeGroupId: number) => void
  onRestoreClosed: (persistKey: string) => void
  onUpdateTitle: (row: SwitcherTabGroupEntry, title: string) => void | Promise<void>
  onUpdateColor: (row: SwitcherTabGroupEntry, color: ChromeTabGroupColor) => void | Promise<void>
  onDeleteOpen: (chromeGroupId: number) => void | Promise<void>
  onDeleteClosed: (persistKey: string) => void | Promise<void>
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
  onUpdateTitle,
  onUpdateColor,
  onDeleteOpen,
  onDeleteClosed,
  onClose,
  isLight,
  isPremium,
}: Props) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedColors, setSelectedColors] = useState<Set<ChromeTabGroupColor>>(() => new Set())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedRowRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      focusSearchInput(searchInputRef.current)
    }, 2895)
  }, [])

  const filteredEntries = useMemo(
    () => filterSwitcherEntries(entries, searchQuery, selectedColors),
    [entries, searchQuery, selectedColors],
  )

  const isListExpanded = searchQuery.trim().length > 0 || isColorFilterActive(selectedColors)

  const visibleEntries = useMemo(() => {
    if (isPremium) {
      return filteredEntries
    }
    if (isListExpanded) {
      return filteredEntries
    }
    return filteredEntries.slice(0, FREE_TIER_VISIBLE_TAB_GROUPS)
  }, [filteredEntries, isPremium, isListExpanded])

  const showUpgradeCta = !isPremium && entries.length > FREE_TIER_VISIBLE_TAB_GROUPS

  const groupsHeading = useMemo(() => {
    if (!isPremium && !isListExpanded && entries.length > FREE_TIER_VISIBLE_TAB_GROUPS) {
      return t('switcherTabGroupsLimitedHeading', [
        String(Math.min(entries.length, FREE_TIER_VISIBLE_TAB_GROUPS)),
        String(entries.length),
      ])
    }
    return t('switcherTabGroupsHeading', [String(filteredEntries.length)])
  }, [entries.length, filteredEntries.length, isPremium, isListExpanded])

  const emptyMessage = useMemo(() => {
    if (isColorFilterActive(selectedColors)) {
      return t('switcherEmptyColorFilter')
    }
    if (searchQuery.trim()) {
      return t('switcherEmptySearch')
    }
    return t('switcherEmptyNoGroups')
  }, [searchQuery, selectedColors])

  useEffect(() => {
    const preferred = visibleEntries.findIndex(e => e.isOpen && e.chromeGroupId === activeGroupId)
    setSelectedIndex(preferred >= 0 ? preferred : 0)
  }, [visibleEntries, activeGroupId])

  useEffect(() => {
    setSelectedIndex(prev => Math.min(prev, Math.max(0, visibleEntries.length - 1)))
  }, [visibleEntries.length])

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

  const handleToggleColor = useCallback((color: ChromeTabGroupColor) => {
    setSelectedColors(prev => toggleSelectedColor(prev, color))
  }, [])

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

      <SwitcherSearchWithColorFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedColors={selectedColors}
        onToggleColor={handleToggleColor}
        isLight={isLight}
        inputRef={searchInputRef}
        placeholder={t('switcherSearchPlaceholder')}
      />

      {filteredEntries.length === 0 && (
        <p className={cn('py-4 text-center text-sm', isLight ? 'text-gray-500' : 'text-white/60')}>{emptyMessage}</p>
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
              <SwitcherTabGroupRow
                key={row.persistKey}
                row={row}
                isSelected={isSelected}
                isActive={isActive}
                isLight={isLight}
                rowRef={isSelected ? selectedRowRef : undefined}
                formatTimeAgo={formatTimeAgo}
                onActivate={activateRow}
                onUpdateTitle={onUpdateTitle}
                onUpdateColor={onUpdateColor}
                onDeleteOpen={onDeleteOpen}
                onDeleteClosed={onDeleteClosed}
              />
            )
          })}
          {showUpgradeCta ? <PremiumUpgradePanel isLight={isLight} /> : null}
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

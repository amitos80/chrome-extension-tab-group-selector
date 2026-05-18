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
  /** WHY: One-shot bulk import opens switcher with staggered row motion; prefers-reduced-motion disables via Tailwind. */
  staggerImportReveal?: boolean
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

const SwitcherOverlay = ({
  entries,
  activeGroupId,
  onActivateOpen,
  onRestoreClosed,
  onClose,
  isLight,
  staggerImportReveal = false,
}: Props) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedRowRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) {
      return entries
    }
    return entries.filter(e => (e.title || 'Untitled').toLowerCase().includes(q))
  }, [entries, searchQuery])

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim()
    const filtered = q ? entries.filter(e => (e.title || 'Untitled').toLowerCase().includes(q)) : entries
    const preferred = filtered.findIndex(e => e.isOpen && e.chromeGroupId === activeGroupId)
    setSelectedIndex(preferred >= 0 ? preferred : 0)
  }, [entries, activeGroupId, searchQuery])

  useEffect(() => {
    setSelectedIndex(prev => Math.min(prev, Math.max(0, filteredEntries.length - 1)))
  }, [filteredEntries.length])

  // WHY: Keyboard ↑↓ updates selection without focusing rows; scroll-padding + scrollIntoView keeps the highlight visible (Tailwind does not auto-scroll programmatic selection).
  useEffect(() => {
    if (filteredEntries.length === 0) {
      return
    }
    const id = requestAnimationFrame(() => {
      selectedRowRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    return () => cancelAnimationFrame(id)
  }, [selectedIndex, filteredEntries])

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
      if (filteredEntries.length === 0) {
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(filteredEntries.length - 1, prev + 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const row = filteredEntries[selectedIndex]
        if (row) {
          activateRow(row)
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [filteredEntries, selectedIndex, onClose, activateRow])

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const dotColor = (color: string) => TAB_GROUP_COLOR_CSS[color] ?? TAB_GROUP_COLOR_CSS.grey

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- isolate panel from host backdrop click-close
    <div
      className={cn(
        'flex h-fit max-h-[50vh] min-h-[27vh] max-w-[500px] flex-col gap-2 overflow-hidden rounded-2xl p-6 shadow-2xl',
        isLight ? 'border border-gray-200 bg-white/95' : 'border border-white/20 bg-[#1e1e1e]/95',
      )}
      onClick={e => e.stopPropagation()}>
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search tab groups..."
        className={cn(
          'w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
          isLight
            ? 'border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400'
            : 'border-white/10 bg-white/5 text-white placeholder:text-white/40',
        )}
      />

      {filteredEntries.length === 0 && (
        <p className={cn('py-4 text-center text-sm', isLight ? 'text-gray-500' : 'text-white/60')}>
          {searchQuery ? 'No groups found' : 'No tab groups'}
        </p>
      )}

      {filteredEntries.length > 0 && (
        <div className="flex min-h-0 flex-1 scroll-py-2 flex-col gap-2 overflow-y-auto">
          <h3
            className={cn(
              'mt-2 text-xs font-semibold uppercase tracking-wide',
              isLight ? 'text-gray-500' : 'text-white/50',
            )}>
            All groups ({filteredEntries.length})
          </h3>
          {filteredEntries.map((row, i) => {
            const isSelected = i === selectedIndex
            const isActive = row.isOpen && row.chromeGroupId === activeGroupId

            return (
              // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- keyboard: document-level Enter / arrows
              <div
                key={row.persistKey}
                ref={isSelected ? selectedRowRef : undefined}
                onClick={() => activateRow(row)}
                style={{
                  opacity: row.isOpen ? 1 : 0.6,
                  ...(staggerImportReveal ? { animationDelay: `${Math.min(i, 15) * 75}ms` } : {}),
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-left transition-all',
                  staggerImportReveal && 'animate-switcher-row-import motion-reduce:animate-none',
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
        </div>
      )}

      <div className={cn('mt-2 border-t pt-2', isLight ? 'border-gray-200' : 'border-white/10')}>
        <p className={cn('text-center text-xs', isLight ? 'text-gray-400' : 'text-white/40')}>
          Use ↑↓ or click to select • Enter to activate • Esc to close
        </p>
      </div>
    </div>
  )
}

export { SwitcherOverlay }

import { t } from '@extension/i18n'
import {
  BOOKMARK_FOLDER_PERSIST_KEY_PREFIX,
  tabGroupColorCss,
  type ChromeTabGroupColor,
  type SwitcherTabGroupEntry,
} from '@extension/storage'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { SwitcherConfirmDialog } from './SwitcherConfirmDialog.js'
import { SwitcherRowActionsMenu } from './SwitcherRowActionsMenu.js'
import { cn } from '../utils.js'

type SwitcherTabGroupRowProps = {
  row: SwitcherTabGroupEntry
  isSelected: boolean
  isActive: boolean
  isLight: boolean
  rowRef?: RefObject<HTMLDivElement | null>
  formatTimeAgo: (timestamp: number) => string
  onActivate: (row: SwitcherTabGroupEntry) => void
  onUpdateTitle: (row: SwitcherTabGroupEntry, title: string) => void | Promise<void>
  onUpdateColor: (row: SwitcherTabGroupEntry, color: ChromeTabGroupColor) => void | Promise<void>
  onDeleteOpen: (chromeGroupId: number) => void | Promise<void>
  onDeleteClosed: (persistKey: string) => void | Promise<void>
}

const isRowActionsEnabled = function isRowActionsEnabled(persistKey: string): boolean {
  return !persistKey.startsWith(BOOKMARK_FOLDER_PERSIST_KEY_PREFIX)
}

const SwitcherTabGroupRow = function SwitcherTabGroupRow({
  row,
  isSelected,
  isActive,
  isLight,
  rowRef,
  formatTimeAgo,
  onActivate,
  onUpdateTitle,
  onUpdateColor,
  onDeleteOpen,
  onDeleteClosed,
}: SwitcherTabGroupRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(row.title || 'Untitled')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isRenaming) {
      setRenameValue(row.title || 'Untitled')
    }
  }, [row.title, isRenaming])

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [isRenaming])

  const saveRename = useCallback(async () => {
    setIsRenaming(false)
    await onUpdateTitle(row, renameValue)
  }, [onUpdateTitle, renameValue, row])

  const cancelRename = useCallback(() => {
    setRenameValue(row.title || 'Untitled')
    setIsRenaming(false)
  }, [row.title])

  const handleRowClick = () => {
    if (isRenaming || menuOpen || confirmOpen) {
      return
    }
    onActivate(row)
  }

  const handleConfirmDelete = async () => {
    setConfirmOpen(false)
    if (row.isOpen && row.chromeGroupId != null) {
      await onDeleteOpen(row.chromeGroupId)
      return
    }
    await onDeleteClosed(row.persistKey)
  }

  const deleteBody = row.isOpen ? t('switcherRowDeleteConfirmOpen') : t('switcherRowDeleteConfirmClosed')

  return (
    <div
      ref={isSelected ? rowRef : undefined}
      style={{ opacity: row.isOpen ? 1 : 0.6 }}
      className={cn(
        'group/row relative flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-left transition-all',
        isSelected
          ? isLight
            ? 'border-2 border-blue-600 bg-blue-50'
            : 'border-2 border-blue-500 bg-blue-500/20'
          : isLight
            ? 'border-2 border-transparent hover:bg-gray-100'
            : 'border-2 border-transparent hover:bg-white/5',
      )}
      onClick={handleRowClick}>
      <div
        className="h-4 w-4 shrink-0 rounded-full"
        style={{ backgroundColor: tabGroupColorCss(row.color) }}
      />
      <div className="min-w-0 flex-1">
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void saveRename()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelRename()
              }
            }}
            onBlur={() => void saveRename()}
            placeholder={t('switcherRowRenamePlaceholder')}
            className={cn(
              'w-full rounded border px-2 py-1 text-sm font-medium',
              isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-white/20 bg-black/30 text-white',
            )}
          />
        ) : (
          <span className={cn('block truncate text-sm font-medium', isLight ? 'text-gray-900' : 'text-white')}>
            {row.title || 'Untitled'}
          </span>
        )}
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
      {isActive ? (
        <span className={cn('shrink-0 text-xs font-medium', isLight ? 'text-blue-700' : 'text-blue-400')}>Active</span>
      ) : null}
      {!row.isOpen ? (
        <span className={cn('shrink-0 text-xs font-medium', isLight ? 'text-gray-500' : 'text-white/40')}>Restore</span>
      ) : null}
      <SwitcherRowActionsMenu
        isLight={isLight}
        currentColor={row.color}
        actionsEnabled={isRowActionsEnabled(row.persistKey)}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        onRenameRequest={() => setIsRenaming(true)}
        onColorChange={color => void onUpdateColor(row, color)}
        onDeleteRequest={() => setConfirmOpen(true)}
      />
      <SwitcherConfirmDialog
        open={confirmOpen}
        title={t('switcherRowDeleteConfirmTitle')}
        body={deleteBody}
        isLight={isLight}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export { SwitcherTabGroupRow }

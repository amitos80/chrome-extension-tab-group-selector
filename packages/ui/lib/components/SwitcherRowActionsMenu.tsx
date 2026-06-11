import { t } from '@extension/i18n'
import {
  CHROME_TAB_GROUP_COLORS,
  tabGroupColorCss,
  type ChromeTabGroupColor,
} from '@extension/storage'
import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { cn } from '../utils.js'

type SwitcherRowActionsMenuProps = {
  isLight: boolean
  currentColor: string
  actionsEnabled: boolean
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onRenameRequest: () => void
  onColorChange: (color: ChromeTabGroupColor) => void
  onDeleteRequest: () => void
}

const SwitcherRowActionsMenu = function SwitcherRowActionsMenu({
  isLight,
  currentColor,
  actionsEnabled,
  menuOpen,
  onMenuOpenChange,
  onRenameRequest,
  onColorChange,
  onDeleteRequest,
}: SwitcherRowActionsMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onMenuOpenChange(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen, onMenuOpenChange])

  if (!actionsEnabled) {
    return null
  }

  const toggleMenu = (event: ReactMouseEvent) => {
    event.stopPropagation()
    onMenuOpenChange(!menuOpen)
  }

  const handleRename = (event: ReactMouseEvent) => {
    event.stopPropagation()
    onMenuOpenChange(false)
    onRenameRequest()
  }

  const handleDelete = (event: ReactMouseEvent) => {
    event.stopPropagation()
    onMenuOpenChange(false)
    onDeleteRequest()
  }

  const handleColor = (event: ReactMouseEvent, color: ChromeTabGroupColor) => {
    event.stopPropagation()
    onMenuOpenChange(false)
    onColorChange(color)
  }

  const normalizedCurrent = tabGroupColorCss(currentColor)

  return (
    <div ref={rootRef} className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        aria-label={t('switcherRowActionsMenu')}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={toggleMenu}
        className={cn(
          'rounded-md px-1.5 py-1 text-base leading-none opacity-0 transition-opacity group-hover/row:opacity-100 focus:opacity-100',
          menuOpen && 'opacity-100',
          isLight ? 'text-gray-500 hover:bg-gray-200 hover:text-gray-900' : 'text-white/50 hover:bg-white/10 hover:text-white',
        )}>
        ⋮
      </button>
      {menuOpen ? (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-full z-10 mt-1 min-w-[10rem] rounded-lg border py-1 shadow-lg',
            isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-[#2a2a2a]',
          )}>
          <button
            type="button"
            role="menuitem"
            onClick={handleRename}
            className={cn(
              'block w-full px-3 py-2 text-left text-xs font-medium',
              isLight ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10',
            )}>
            {t('switcherRowActionRename')}
          </button>
          <div className={cn('border-t px-3 py-2', isLight ? 'border-gray-100' : 'border-white/10')}>
            <div className={cn('mb-2 text-[10px] font-semibold uppercase tracking-wide', isLight ? 'text-gray-500' : 'text-white/50')}>
              {t('switcherRowActionChangeColor')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHROME_TAB_GROUP_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={event => handleColor(event, color)}
                  className={cn(
                    'h-5 w-5 rounded-full ring-1 ring-black/10',
                    tabGroupColorCss(color) === normalizedCurrent && 'ring-2 ring-blue-500 ring-offset-1',
                  )}
                  style={{ backgroundColor: tabGroupColorCss(color) }}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className={cn(
              'block w-full border-t px-3 py-2 text-left text-xs font-medium text-red-600',
              isLight ? 'border-gray-100 hover:bg-red-50' : 'border-white/10 hover:bg-red-500/10',
            )}>
            {t('switcherRowActionDelete')}
          </button>
        </div>
      ) : null}
    </div>
  )
}

export { SwitcherRowActionsMenu }

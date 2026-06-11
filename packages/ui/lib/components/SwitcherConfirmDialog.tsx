import { t } from '@extension/i18n'
import { cn } from '../utils.js'

type SwitcherConfirmDialogProps = {
  open: boolean
  title: string
  body: string
  isLight: boolean
  onConfirm: () => void
  onCancel: () => void
}

const SwitcherConfirmDialog = function SwitcherConfirmDialog({
  open,
  title,
  body,
  isLight,
  onConfirm,
  onCancel,
}: SwitcherConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/40 p-4"
      role="presentation"
      onClick={e => {
        e.stopPropagation()
        onCancel()
      }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="switcher-confirm-title"
        className={cn(
          'w-full max-w-xs rounded-lg border p-4 shadow-xl',
          isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-[#2a2a2a]',
        )}
        onClick={e => e.stopPropagation()}>
        <h4
          id="switcher-confirm-title"
          className={cn('text-sm font-semibold', isLight ? 'text-gray-900' : 'text-white')}>
          {title}
        </h4>
        <p className={cn('mt-2 text-xs leading-snug', isLight ? 'text-gray-600' : 'text-white/70')}>{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium',
              isLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white/80 hover:bg-white/10',
            )}>
            {t('switcherRowCancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
            {t('switcherRowConfirmDelete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export { SwitcherConfirmDialog }

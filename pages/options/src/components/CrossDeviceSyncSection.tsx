import { t } from '@extension/i18n'
import { usePremiumAccess, useStorage } from '@extension/shared'
import { crossDeviceSyncPreferenceStorage } from '@extension/storage'
import { cn } from '@extension/ui'

type CrossDeviceSyncSectionProps = {
  isLight: boolean
}

export const CrossDeviceSyncSection = function CrossDeviceSyncSection({ isLight }: CrossDeviceSyncSectionProps) {
  const { crossDeviceTabGroupsSyncEnabled } = useStorage(crossDeviceSyncPreferenceStorage)
  const { isPremium } = usePremiumAccess()

  const switchTrack = cn(
    'relative h-7 w-[2.875rem] shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    isLight ? 'focus:ring-offset-slate-50' : 'focus:ring-offset-gray-800',
    !isPremium && 'pointer-events-none opacity-60',
    isPremium && crossDeviceTabGroupsSyncEnabled ? 'bg-blue-600' : isLight ? 'bg-gray-300' : 'bg-gray-600',
  )

  return (
    <>
      <h3
        className={cn(
          'mb-2 mt-8 text-xs font-semibold uppercase tracking-wide',
          isLight ? 'text-gray-500' : 'text-gray-500',
        )}>
        {t('optionCrossDeviceSyncSectionTitle')}
      </h3>

      <div
        className={cn(
          'mb-3 rounded-lg border px-3 py-2.5 text-xs leading-snug',
          isLight ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-amber-700/60 bg-amber-950/40 text-amber-100',
        )}
        role="note">
        {t('optionCrossDeviceSyncBetaNotice')}
      </div>

      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border px-3 py-3',
          isLight ? 'border-gray-200 bg-slate-50' : 'border-gray-600 bg-gray-900/50',
        )}>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium">{t('optionCrossDeviceSyncEnableTitle')}</p>
          <p className={cn('mt-1 text-xs leading-snug', isLight ? 'text-gray-600' : 'text-gray-400')}>
            {t('optionCrossDeviceSyncEnableDescription')}
          </p>
          {!isPremium ? (
            <p className={cn('mt-2 text-xs leading-snug', isLight ? 'text-gray-500' : 'text-gray-500')}>
              {t('optionCrossDeviceSyncPremiumLockedCaption')}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!isPremium ? false : crossDeviceTabGroupsSyncEnabled}
          aria-disabled={!isPremium}
          onClick={
            !isPremium
              ? undefined
              : () =>
                  void crossDeviceSyncPreferenceStorage.setCrossDeviceTabGroupsSyncEnabled(!crossDeviceTabGroupsSyncEnabled)
          }
          className={switchTrack}>
          <span
            className={cn(
              'absolute left-0.5 top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform',
              isPremium && crossDeviceTabGroupsSyncEnabled ? 'translate-x-[1.125rem]' : 'translate-x-0',
            )}
          />
        </button>
      </div>
    </>
  )
}

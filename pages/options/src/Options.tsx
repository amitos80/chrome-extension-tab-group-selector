import '@src/Options.css'

import { AutoGroupingRulesSection } from './components/AutoGroupingRulesSection'
import { t } from '@extension/i18n'
import { PROJECT_URL_OBJECT, useEffectiveTheme, useStorage, withErrorBoundary, withSuspense } from '@extension/shared'
import { newTabSwitcherPreferenceStorage } from '@extension/storage'
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui'

const Options = () => {
  const { isLight, followSystemTheme, setFollowSystemTheme } = useEffectiveTheme()
  const { showTabGroupSelectorOnNewTab } = useStorage(newTabSwitcherPreferenceStorage)
  const logo = isLight ? 'options/logo.svg' : 'options/logo.svg'

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT)

  const switchTrackNewTab = cn(
    'relative h-7 w-[2.875rem] shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    isLight ? 'focus:ring-offset-slate-50' : 'focus:ring-offset-gray-800',
    showTabGroupSelectorOnNewTab ? 'bg-blue-600' : isLight ? 'bg-blue-600' : 'bg-gray-600',
  )

  const switchTrackPlain = cn(
    'relative h-7 w-[2.875rem] shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    isLight ? 'focus:ring-offset-slate-50' : 'focus:ring-offset-gray-800',
    isLight ? 'blue-600' : 'bg-gray-600',
  )

  return (
    <div className={cn('App min-h-screen', isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-800 text-gray-100')}>
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
        <button type="button" onClick={goGithubSite} className="mx-auto">
          <img src={chrome.runtime.getURL(logo)} className="h-12 w-auto" alt="" />
        </button>

        <section
          className={cn(
            'rounded-xl border p-5 shadow-sm',
            isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800/80',
          )}>
          <h2 className="mb-1 text-lg font-semibold">{t('popupShortcutsTitle')}</h2>
          <p className={cn('mb-4 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
            {t('popupOpenSwitcherDescription')}
          </p>

          <h3
            className={cn(
              'mb-2 text-xs font-semibold uppercase tracking-wide',
              isLight ? 'text-gray-500' : 'text-gray-500',
            )}>
            {t('popupNewTabSectionLabel')}
          </h3>
          <div
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border px-3 py-3',
              isLight ? 'border-gray-200 bg-slate-50' : 'border-gray-600 bg-gray-900/50',
            )}>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium">{t('optionShowSwitcherOnNewTab')}</p>
              <p className={cn('mt-1 text-xs leading-snug', isLight ? 'text-gray-600' : 'text-gray-400')}>
                {t('optionShowSwitcherOnNewTabDescription')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showTabGroupSelectorOnNewTab}
              onClick={() =>
                void newTabSwitcherPreferenceStorage.setShowTabGroupSelectorOnNewTab(!showTabGroupSelectorOnNewTab)
              }
              className={switchTrackNewTab}>
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform',
                  showTabGroupSelectorOnNewTab ? 'translate-x-[1.125rem]' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        </section>

        <AutoGroupingRulesSection isLight={isLight} switchTrackPlain={switchTrackPlain} />

        <section
          className={cn(
            'rounded-xl border p-5 shadow-sm',
            isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800/80',
          )}>
          <h3
            className={cn(
              'mb-3 text-xs font-semibold uppercase tracking-wide',
              isLight ? 'text-gray-500' : 'text-gray-500',
            )}>
            {t('popupThemeSectionLabel')}
          </h3>
          <div
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border px-3 py-3',
              isLight ? 'border-gray-200 bg-slate-50' : 'border-gray-600 bg-gray-900/50',
            )}>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium">{t('optionUseSystemTheme')}</p>
              <p className={cn('mt-1 text-xs leading-snug', isLight ? 'text-gray-600' : 'text-gray-400')}>
                {t('optionUseSystemThemeDescription')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={followSystemTheme}
              onClick={() => void setFollowSystemTheme(!followSystemTheme)}
              className={switchTrackPlain}>
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform',
                  followSystemTheme ? 'translate-x-[1.125rem]' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        </section>

        <div className="flex justify-center">
          <ToggleButton>{t('toggleTheme')}</ToggleButton>
        </div>
      </div>
    </div>
  )
}

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay)

import '@src/Popup.css'
import { t } from '@extension/i18n'
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared'
import { exampleThemeStorage, newTabSwitcherPreferenceStorage } from '@extension/storage'
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui'
import { useEffect, useState } from 'react'

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const

const OPEN_SWITCHER_COMMAND = 'open-switcher'
const SHORTCUTS_PAGE = 'chrome://extensions/shortcuts'

const loadOpenSwitcherShortcut = async (): Promise<string> => {
  const cmds = await chrome.commands.getAll()
  const cmd = cmds.find(c => c.name === OPEN_SWITCHER_COMMAND)
  return cmd?.shortcut?.trim() ?? ''
}

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage)
  const { showTabGroupSelectorOnNewTab } = useStorage(newTabSwitcherPreferenceStorage)
  const [shortcut, setShortcut] = useState<string | null>(null)
  const [shortcutsOpenError, setShortcutsOpenError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const s = await loadOpenSwitcherShortcut()
        if (!cancelled) {
          setShortcut(s)
        }
      } catch {
        if (!cancelled) {
          setShortcut('')
        }
      }
    }
    void run()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void run()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT)

  const openShortcutsPage = async () => {
    setShortcutsOpenError(null)
    try {
      await chrome.tabs.create({ url: SHORTCUTS_PAGE })
    } catch {
      setShortcutsOpenError(t('popupShortcutsOpenError'))
    }
  }

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true })

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions)
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        files: ['/content-runtime/example.iife.js', '/content-runtime/all.iife.js'],
      })
      .catch(err => {
        if (err.message.includes('Cannot access a chrome:// URL')) {
          console.warn('inject-error ', notificationOptions)
          chrome.notifications.create('inject-error', notificationOptions)
        }
      })
  }

  const secondaryBtn = cn(
    'w-full rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500',
    isLight
      ? 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 focus:border-blue-500'
      : 'border-white/10 bg-white/5 text-white hover:bg-white/10 focus:border-blue-500',
  )

  const shortcutDisplay = shortcut === null ? '…' : shortcut.length > 0 ? shortcut : t('popupShortcutNotSet')

  const switchTrack = cn(
    'relative h-7 w-[2.875rem] shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    isLight ? 'focus:ring-offset-white' : 'focus:ring-offset-[#1e1e1e]',
    showTabGroupSelectorOnNewTab ? 'bg-blue-600' : isLight ? 'bg-gray-300' : 'bg-white/25',
  )

  return (
    <div
      className={cn(
        'box-border flex min-h-[440px] flex-col rounded-2xl p-3',
        isLight ? 'bg-slate-200' : 'bg-[#141414]',
      )}>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border p-4 shadow-2xl',
          isLight ? 'border-gray-200 bg-white' : 'border-white/20 bg-[#1e1e1e]/95',
        )}>
        <div className="flex shrink-0 items-start justify-between gap-2">
          <h2 className={cn('text-lg font-semibold leading-tight', isLight ? 'text-gray-900' : 'text-white')}>
            {t('popupShortcutsTitle')}
          </h2>
          <button
            type="button"
            onClick={goGithubSite}
            className={cn(
              'shrink-0 rounded-lg px-2 py-1 text-xs transition-colors',
              isLight
                ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                : 'text-white/50 hover:bg-white/10 hover:text-white',
            )}
            aria-label="GitHub">
            GitHub
          </button>
        </div>

        <section
          className={cn('flex shrink-0 flex-col gap-2 border-b pb-4', isLight ? 'border-gray-200' : 'border-white/10')}>
          <h3
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              isLight ? 'text-gray-500' : 'text-white/50',
            )}>
            {t('popupShortcutSectionLabel')}
          </h3>
          <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-white/70')}>
            {t('popupOpenSwitcherDescription')}
          </p>
          <div
            className={cn(
              'rounded-lg border px-3 py-2.5 font-mono text-sm',
              isLight ? 'border-gray-200 bg-slate-50 text-gray-900' : 'border-white/10 bg-white/5 text-white',
            )}
            aria-live="polite">
            {shortcutDisplay}
          </div>
          <button
            type="button"
            onClick={() => void openShortcutsPage()}
            className="w-full rounded-lg border-2 border-blue-500/80 bg-blue-500/20 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {t('popupEditShortcutInChrome')}
          </button>
          <p className={cn('text-xs leading-snug', isLight ? 'text-gray-500' : 'text-white/40')}>
            {t('popupShortcutsHelper')}
          </p>
          {shortcutsOpenError ? (
            <p className={cn('text-xs', isLight ? 'text-red-600' : 'text-red-400/90')} role="alert">
              {shortcutsOpenError}
            </p>
          ) : null}
        </section>

        <section
          className={cn('flex shrink-0 flex-col gap-2 border-b pb-4', isLight ? 'border-gray-200' : 'border-white/10')}>
          <h3
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              isLight ? 'text-gray-500' : 'text-white/50',
            )}>
            {t('popupNewTabSectionLabel')}
          </h3>
          <div
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5',
              isLight ? 'border-gray-200 bg-slate-50' : 'border-white/10 bg-white/5',
            )}>
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', isLight ? 'text-gray-900' : 'text-white')}>
                {t('optionShowSwitcherOnNewTab')}
              </p>
              <p className={cn('mt-0.5 text-xs leading-snug', isLight ? 'text-gray-600' : 'text-white/40')}>
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
              className={switchTrack}>
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform',
                  showTabGroupSelectorOnNewTab ? 'translate-x-[1.125rem]' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        </section>

        <div className="flex flex-1 flex-col gap-2 pt-1">
          <button type="button" className={secondaryBtn} onClick={() => void injectContentScript()}>
            {t('injectButton')}
          </button>
          <ToggleButton
            className={cn(
              'mt-0 w-full rounded-lg border py-2.5 text-sm font-medium shadow-sm hover:scale-100 focus:outline-none focus:ring-1 focus:ring-blue-500',
              isLight
                ? 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus:border-blue-500'
                : 'border-white/10 bg-white/5 !text-white hover:bg-white/10 focus:border-blue-500',
            )}>
            {t('toggleTheme')}
          </ToggleButton>
        </div>
      </div>
    </div>
  )
}

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay)

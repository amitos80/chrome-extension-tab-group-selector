import '@src/NewTab.css'
import '@src/NewTab.scss'
//import Ripples from 'react-touch-ripple'
import AnimatedGeometricBackground from './AnimatedGeometricBackground'
import { redirectCurrentTabToChromeNativeNewTab } from './chrome-native-new-tab-redirect'
import { SwitcherOverlay } from './components/SwitcherOverlay'
import {
  useEffectiveTheme,
  useEnforceNonPremiumDefaults,
  usePremiumAccess,
  useStorage,
  withErrorBoundary,
  withSuspense,
} from '@extension/shared'
import { newTabSwitcherPreferenceStorage } from '@extension/storage'
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui'
import { useCallback, useEffect, useState } from 'react'
import type { ChromeTabGroupColor, SwitcherTabGroupEntry, TabGroupsSnapshotResponse } from '@extension/storage'

/** Full new-tab switcher UI when preference is enabled. */
const NewTabSwitcherExperience = ({ isPremium }: { isPremium: boolean }) => {
  const { isLight } = useEffectiveTheme()

  const [isVisible, setIsVisible] = useState(true)
  const [entries, setEntries] = useState<TabGroupsSnapshotResponse['entries']>([])
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)

  const fetchGroups = useCallback(async () => {
    const response = (await chrome.runtime.sendMessage({
      type: 'GET_TAB_GROUPS',
    })) as TabGroupsSnapshotResponse | undefined
    const snapshot = response ?? { entries: [], activeGroupId: null }
    setEntries(snapshot.entries)
    setActiveGroupId(snapshot.activeGroupId)
  }, [])

  const handleMessage = useCallback(
    (msg: { type?: string }) => {
      if (msg.type === 'TOGGLE_SWITCHER') {
        setIsVisible(true)
        void fetchGroups()
      }
    },
    [fetchGroups],
  )

  const handleClose = useCallback(() => {
    setIsVisible(false)
  }, [])

  const handleActivateOpen = useCallback(async (groupId: number) => {
    await chrome.runtime.sendMessage({ type: 'ACTIVATE_GROUP', groupId })
  }, [])

  const handleRestoreClosed = useCallback(async (persistKey: string) => {
    await chrome.runtime.sendMessage({
      type: 'RESTORE_CLOSED_GROUP',
      persistKey,
    })
    await chrome.runtime.sendMessage({
      type: 'REMOVE_CLOSED_GROUP',
      persistKey,
    })
  }, [])

  const handleUpdateTitle = useCallback(
    async (row: SwitcherTabGroupEntry, title: string) => {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_TAB_GROUP_TITLE',
        persistKey: row.persistKey,
        title,
        chromeGroupId: row.chromeGroupId,
      })
      await fetchGroups()
    },
    [fetchGroups],
  )

  const handleUpdateColor = useCallback(
    async (row: SwitcherTabGroupEntry, color: ChromeTabGroupColor) => {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_TAB_GROUP_COLOR',
        persistKey: row.persistKey,
        color,
        chromeGroupId: row.chromeGroupId,
      })
      await fetchGroups()
    },
    [fetchGroups],
  )

  const handleDeleteOpen = useCallback(
    async (chromeGroupId: number) => {
      await chrome.runtime.sendMessage({
        type: 'DELETE_OPEN_TAB_GROUP',
        chromeGroupId,
      })
      await fetchGroups()
    },
    [fetchGroups],
  )

  const handleDeleteClosed = useCallback(
    async (persistKey: string) => {
      await chrome.runtime.sendMessage({
        type: 'REMOVE_CLOSED_GROUP',
        persistKey,
      })
      await fetchGroups()
    },
    [fetchGroups],
  )

  useEffect(() => {
    void fetchGroups()
  }, [fetchGroups])

  useEffect(() => {
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [handleMessage])
  return (
    <div
      className={cn(
        'App',
        'inset-0',
        'min-h-screen',
        'overflow-hidden',
        'relative',
        'w-[100vw]',
        'inset-0 z-[2147483647] backdrop-blur-sm',
        isLight ? 'bg-sky-100/95' : 'bg-[#1a1a2e]',
      )}>
      <AnimatedGeometricBackground isLight={isLight} />
      {isVisible && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- isolate switcher from root click handling
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform"
          onClick={e => e.stopPropagation()}>
          <SwitcherOverlay
            entries={entries}
            activeGroupId={activeGroupId}
            onActivateOpen={handleActivateOpen}
            onRestoreClosed={handleRestoreClosed}
            onUpdateTitle={handleUpdateTitle}
            onUpdateColor={handleUpdateColor}
            onDeleteOpen={handleDeleteOpen}
            onDeleteClosed={handleDeleteClosed}
            onClose={handleClose}
            isLight={isLight}
            isPremium={isPremium}
          />
        </div>
      )}
    </div>
  )
}

/**
 * WHY: Manifest new-tab override always loads this document; when user disables our UI we redirect to Chrome native NTP.
 */
const NewTab = () => {
  const { isPremium } = usePremiumAccess()
  useEnforceNonPremiumDefaults(isPremium)

  const { showTabGroupSelectorOnNewTab } = useStorage(newTabSwitcherPreferenceStorage)
  const [phase, setPhase] = useState<'decide' | 'native' | 'app'>(() =>
    showTabGroupSelectorOnNewTab ? 'app' : 'decide',
  )

  useEffect(() => {
    if (showTabGroupSelectorOnNewTab) {
      setPhase('app')
      return
    }

    let cancelled = false
    void redirectCurrentTabToChromeNativeNewTab().then(ok => {
      if (!cancelled) {
        setPhase(ok ? 'native' : 'app')
      }
    })
    return () => {
      cancelled = true
    }
  }, [showTabGroupSelectorOnNewTab])

  if (phase === 'decide') {
    return <LoadingSpinner />
  }
  if (phase === 'native') {
    return null
  }

  return <NewTabSwitcherExperience isPremium={isPremium} />
}

export default withErrorBoundary(withSuspense(NewTab, <LoadingSpinner />), ErrorDisplay)

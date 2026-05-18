import { useStorage } from '@extension/shared'
import { exampleThemeStorage } from '@extension/storage'
import { cn } from '@extension/ui'
import { SwitcherOverlay } from '@src/components/SwitcherOverlay'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TabGroupsSnapshotResponse } from '@extension/storage'

const App = () => {
  const { isLight } = useStorage(exampleThemeStorage)
  const [isVisible, setIsVisible] = useState(false)
  const [staggerImportReveal, setStaggerImportReveal] = useState(false)
  const [entries, setEntries] = useState<TabGroupsSnapshotResponse['entries']>([])
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)
  const isVisibleRef = useRef(false)

  useEffect(() => {
    isVisibleRef.current = isVisible
  }, [isVisible])

  const fetchGroups = useCallback(async () => {
    const response = (await chrome.runtime.sendMessage({
      type: 'GET_TAB_GROUPS',
    })) as TabGroupsSnapshotResponse | undefined
    const snapshot = response ?? { entries: [], activeGroupId: null }
    setEntries(snapshot.entries)
    setActiveGroupId(snapshot.activeGroupId)
  }, [])

  const handleMessage = useCallback(
    (msg: { type?: string; staggerImportReveal?: boolean }) => {
      if (msg.type === 'TOGGLE_SWITCHER') {
        if (isVisibleRef.current) {
          setStaggerImportReveal(false)
          setIsVisible(false)
        } else {
          setStaggerImportReveal(msg.staggerImportReveal === true)
          void fetchGroups()
          setIsVisible(true)
        }
      }
    },
    [fetchGroups],
  )

  const handleClose = useCallback(() => {
    setStaggerImportReveal(false)
    setIsVisible(false)
  }, [])

  const handleActivateOpen = useCallback(
    async (groupId: number) => {
      await chrome.runtime.sendMessage({ type: 'ACTIVATE_GROUP', groupId })
      handleClose()
    },
    [handleClose],
  )

  const handleRestoreClosed = useCallback(
    async (persistKey: string) => {
      await chrome.runtime.sendMessage({
        type: 'RESTORE_CLOSED_GROUP',
        persistKey,
      })
      await chrome.runtime.sendMessage({
        type: 'REMOVE_CLOSED_GROUP',
        persistKey,
      })
      handleClose()
    },
    [handleClose],
  )

  useEffect(() => {
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [handleMessage])

  if (!isVisible) return null

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- backdrop dismiss; Escape also closes
    <div
      className={cn(
        'fixed inset-0 z-[2147483647] flex items-center justify-center backdrop-blur-sm',
        isLight ? 'bg-slate-900/20' : 'bg-black/40',
      )}
      onClick={handleClose}>
      <SwitcherOverlay
        entries={entries}
        activeGroupId={activeGroupId}
        onActivateOpen={handleActivateOpen}
        onRestoreClosed={handleRestoreClosed}
        onClose={handleClose}
        isLight={isLight}
        staggerImportReveal={staggerImportReveal}
      />
    </div>
  )
}

export default App

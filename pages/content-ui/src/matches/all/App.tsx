import { SwitcherOverlay } from '@src/components/SwitcherOverlay';
import { useEffect, useState, useCallback } from 'react';

export interface ClosedTabGroup {
  id: string;
  title: string;
  color: string;
  closedAt: number;
  tabCount: number;
}

export default function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [groups, setGroups] = useState<chrome.tabGroups.TabGroup[]>([]);
  const [closedGroups, setClosedGroups] = useState<ClosedTabGroup[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

  const handleMessage = useCallback((msg: any) => {
    console.log('[CONTENT-UI] Message received:', msg);
    if (msg.type === 'TOGGLE_SWITCHER') {
      console.log('[CONTENT-UI] TOGGLE_SWITCHER message received, showing overlay');
      setIsVisible(true);
      fetchGroups();
    }
  }, []);

  const fetchGroups = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_GROUPS' });
    const allGroups = response || [];
    setGroups(allGroups);

    const closedResponse = await chrome.runtime.sendMessage({ type: 'GET_CLOSED_GROUPS' });
    setClosedGroups(closedResponse || []);

    const currentTab = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB' });
    const currentGroupId = currentTab?.groupId;
    setActiveGroupId(currentGroupId ?? null);

    const activeIndex = allGroups.findIndex((g: chrome.tabGroups.TabGroup) => g.id === currentGroupId);
    setSelectedIndex(activeIndex >= 0 ? activeIndex : 0);
  };

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleActivate = useCallback(
    async (groupId: number) => {
      await chrome.runtime.sendMessage({ type: 'ACTIVATE_GROUP', groupId });
      handleClose();
    },
    [handleClose],
  );

  const handleActivateClosed = useCallback(
    async (closedGroup: ClosedTabGroup) => {
      console.log('[CONTENT-UI] Restoring closed group:', closedGroup);
      await chrome.runtime.sendMessage({ 
        type: 'RESTORE_CLOSED_GROUP', 
        closedGroup 
      });
      await chrome.runtime.sendMessage({ 
        type: 'REMOVE_CLOSED_GROUP', 
        groupId: closedGroup.id 
      });
      handleClose();
    },
    [handleClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible) return;

      const totalCount = groups.length + closedGroups.length;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(totalCount - 1, prev + 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < groups.length && groups[selectedIndex]) {
          handleActivate(groups[selectedIndex].id);
        } else if (selectedIndex >= groups.length) {
          const closedIndex = selectedIndex - groups.length;
          if (closedGroups[closedIndex]) {
            handleActivateClosed(closedGroups[closedIndex]);
          }
        }
      }
    },
    [isVisible, groups, closedGroups, selectedIndex, handleClose, handleActivate, handleActivateClosed],
  );

  useEffect(() => {
    console.log('[CONTENT-UI] Setting up message listener');
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      console.log('[CONTENT-UI] Removing message listener');
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [handleMessage]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleClose}>
      <SwitcherOverlay
        groups={groups}
        closedGroups={closedGroups}
        selectedIndex={selectedIndex}
        activeGroupId={activeGroupId}
        onActivate={handleActivate}
        onActivateClosed={handleActivateClosed}
        onClose={handleClose}
      />
    </div>
  );
}

import { SwitcherOverlay } from '@src/components/SwitcherOverlay';
import { useEffect, useState, useCallback } from 'react';

export default function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [groups, setGroups] = useState<chrome.tabGroups.TabGroup[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

  const handleMessage = useCallback((msg: any) => {
    if (msg.type === 'TOGGLE_SWITCHER') {
      setIsVisible(true);
      fetchGroups();
    }
  }, []);

  const fetchGroups = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_GROUPS' });
    const allGroups = response || [];
    setGroups(allGroups);

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(groups.length - 1, prev + 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (groups[selectedIndex]) {
          handleActivate(groups[selectedIndex].id);
        }
      }
    },
    [isVisible, groups, selectedIndex, handleClose, handleActivate],
  );

  useEffect(() => {
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
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
        selectedIndex={selectedIndex}
        activeGroupId={activeGroupId}
        onActivate={handleActivate}
        onClose={handleClose}
      />
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';

export default function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [groups, setGroups] = useState<chrome.tabGroups.TabGroup[]>([]);
  const [index, setIndex] = useState(0);

  const handleMessage = useCallback((msg: any) => {
    if (msg.type === 'TOGGLE_SWITCHER') {
      setIsVisible(true);
      fetchGroups();
    }
  }, []);

  const fetchGroups = async () => {
    // Content scripts can't call tabGroups directly,
    // we ask background to get them for us
    const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_GROUPS' });
    setGroups(response || []);
    setIndex(0);
  };

  useEffect(() => {
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [handleMessage]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <SwitcherOverlay groups={groups} selectedIndex={index} />
    </div>
  );
}

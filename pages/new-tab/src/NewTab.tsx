import '@src/NewTab.css';
import '@src/NewTab.scss';
import { SwitcherOverlay } from './components/SwitcherOverlay';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';
import { useEffect, useState, useCallback } from 'react';

const NewTab = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const logo = isLight ? 'new-tab/logo_horizontal.svg' : 'new-tab/logo_horizontal_dark.svg';

  const [isVisible, setIsVisible] = useState(true);
  const [groups, setGroups] = useState<chrome.tabGroups.TabGroup[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  const fetchGroups = useCallback(async () => {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_GROUPS' });
    const allGroups = response || [];
    setGroups(allGroups);

    const currentTab = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB' });
    const currentGroupId = currentTab?.groupId;
    setActiveGroupId(currentGroupId ?? null);

    const activeIndex = allGroups.findIndex((g: chrome.tabGroups.TabGroup) => g.id === currentGroupId);
    setSelectedIndex(activeIndex >= 0 ? activeIndex : 0);
  }, []);

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
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  console.log(t('hello', 'World'));
  return (
    <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
      <header className={cn('App-header', isLight ? 'text-gray-900' : 'text-gray-100')}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <p>
          Edit <code>pages/new-tab/src/NewTab.tsx</code>
        </p>
        <h6>The color of this paragraph is defined using SASS.</h6>
        <ToggleButton onClick={exampleThemeStorage.toggle}>{t('toggleTheme')}</ToggleButton>
        <button
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          onClick={() => setIsVisible(true)}>
          Show Tab Groups
        </button>
      </header>

      {isVisible && (
        <div
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleClose}>
          <div onClick={e => e.stopPropagation()}>
            <SwitcherOverlay
              groups={groups}
              selectedIndex={selectedIndex}
              activeGroupId={activeGroupId}
              onActivate={handleActivate}
              onClose={handleClose}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default withErrorBoundary(withSuspense(NewTab, <LoadingSpinner />), ErrorDisplay);

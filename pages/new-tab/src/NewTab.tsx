import '@src/NewTab.css';
import '@src/NewTab.scss';
import { SwitcherOverlay } from './components/SwitcherOverlay';
import { redirectCurrentTabToChromeNativeNewTab } from './chrome-native-new-tab-redirect';
import { t } from '@extension/i18n';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import {
	exampleThemeStorage,
	newTabSwitcherPreferenceStorage,
	type TabGroupsSnapshotResponse,
} from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useCallback, useEffect, useState } from 'react';

/** Full new-tab switcher UI when preference is enabled. */
function NewTabSwitcherExperience() {
  const { isLight } = useStorage(exampleThemeStorage);

  const [isVisible, setIsVisible] = useState(true);
  const [entries, setEntries] = useState<TabGroupsSnapshotResponse['entries']>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

  const fetchGroups = useCallback(async () => {
    const response = (await chrome.runtime.sendMessage({
      type: 'GET_TAB_GROUPS',
    })) as TabGroupsSnapshotResponse | undefined;
    const snapshot = response ?? { entries: [], activeGroupId: null };
    setEntries(snapshot.entries);
    setActiveGroupId(snapshot.activeGroupId);
  }, []);

  const handleMessage = useCallback(
    (msg: { type?: string }) => {
      if (msg.type === 'TOGGLE_SWITCHER') {
        setIsVisible(true);
        void fetchGroups();
      }
    },
    [fetchGroups],
  );

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleActivateOpen = useCallback(
    async (groupId: number) => {
      await chrome.runtime.sendMessage({ type: 'ACTIVATE_GROUP', groupId });
      handleClose();
    },
    [handleClose],
  );

  const handleRestoreClosed = useCallback(
    async (persistKey: string) => {
      await chrome.runtime.sendMessage({
        type: 'RESTORE_CLOSED_GROUP',
        persistKey,
      });
      await chrome.runtime.sendMessage({
        type: 'REMOVE_CLOSED_GROUP',
        persistKey,
      });
      handleClose();
    },
    [handleClose],
  );

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [handleMessage]);
  return (
    <div>
      {isVisible && (
        <div
          className={cn(
            'App',
            'w-[100vw]',
            'fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 backdrop-blur-sm',
            isLight
              ? ['bg-gradient-to-b', 'from-green-400/70', 'to-blue-500/70']
              : ['bg-gradient-to-b', 'from-purple-950', 'via-pink-800', 'to-red-500'],
          )}>
          <div className="justify-center align-middle py-24" onClick={e => e.stopPropagation()}>
            <SwitcherOverlay
              entries={entries}
              activeGroupId={activeGroupId}
              onActivateOpen={handleActivateOpen}
              onRestoreClosed={handleRestoreClosed}
              onClose={handleClose}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * WHY: Manifest new-tab override always loads this document; when user disables our UI we redirect to Chrome native NTP.
 */
function NewTab() {
	const { showTabGroupSelectorOnNewTab } = useStorage(newTabSwitcherPreferenceStorage);
	const [phase, setPhase] = useState<'decide' | 'native' | 'app'>(() =>
		showTabGroupSelectorOnNewTab ? 'app' : 'decide',
	);

	useEffect(() => {
		if (showTabGroupSelectorOnNewTab) {
			setPhase('app');
			return;
		}

		let cancelled = false;
		void redirectCurrentTabToChromeNativeNewTab().then(ok => {
			if (!cancelled) {
				setPhase(ok ? 'native' : 'app');
			}
		});
		return () => {
			cancelled = true;
		};
	}, [showTabGroupSelectorOnNewTab]);

	if (phase === 'decide') {
		return <LoadingSpinner />;
	}
	if (phase === 'native') {
		return null;
	}

	return <NewTabSwitcherExperience />;
}

export default withErrorBoundary(withSuspense(NewTab, <LoadingSpinner />), ErrorDisplay);

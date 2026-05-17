import '@src/NewTab.css';
import '@src/NewTab.scss';
import { SwitcherOverlay } from './components/SwitcherOverlay';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, type TabGroupsSnapshotResponse } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';
import { useEffect, useState, useCallback } from 'react';

const NewTab = () => {
	console.log('[NEW-TAB] Component initialized');

	const { isLight } = useStorage(exampleThemeStorage);
	const logo = isLight ? 'new-tab/logo_horizontal.svg' : 'new-tab/logo_horizontal_dark.svg';

	const [isVisible, setIsVisible] = useState(true);
	const [entries, setEntries] = useState<TabGroupsSnapshotResponse['entries']>([]);
	const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

	const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

	const fetchGroups = useCallback(async () => {
		console.log('[NEW-TAB] Fetching tab groups');
		const response = (await chrome.runtime.sendMessage({
			type: 'GET_TAB_GROUPS',
		})) as TabGroupsSnapshotResponse | undefined;
		const snapshot = response ?? { entries: [], activeGroupId: null };
		console.log('[NEW-TAB] Got tab groups:', snapshot.entries.length);
		setEntries(snapshot.entries);
		setActiveGroupId(snapshot.activeGroupId);
	}, []);

	const handleMessage = useCallback(
		(msg: { type?: string }) => {
			console.log('[NEW-TAB] Message received:', msg);
			if (msg.type === 'TOGGLE_SWITCHER') {
				console.log('[NEW-TAB] TOGGLE_SWITCHER message received, showing overlay');
				setIsVisible(true);
				void fetchGroups();
			}
		},
		[fetchGroups],
	);

	const handleClose = useCallback(() => {
		console.log('[NEW-TAB] Closing overlay');
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
			console.log('[NEW-TAB] Restoring closed group:', persistKey);
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
		console.log('[NEW-TAB] Component mounted, fetching groups on load');
		void fetchGroups();
	}, [fetchGroups]);

	useEffect(() => {
		console.log('[NEW-TAB] Setting up message listener for keyboard shortcuts');
		chrome.runtime.onMessage.addListener(handleMessage);
		return () => {
			console.log('[NEW-TAB] Removing message listener');
			chrome.runtime.onMessage.removeListener(handleMessage);
		};
	}, [handleMessage]);

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
};

export default withErrorBoundary(withSuspense(NewTab, <LoadingSpinner />), ErrorDisplay);

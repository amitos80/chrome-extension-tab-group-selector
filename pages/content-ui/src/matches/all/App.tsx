import { SwitcherOverlay } from '@src/components/SwitcherOverlay';
import { type TabGroupsSnapshotResponse } from '@extension/storage';
import { useEffect, useState, useCallback } from 'react';

export default function App() {
	const [isVisible, setIsVisible] = useState(false);
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
			console.log('[CONTENT-UI] Message received:', msg);
			if (msg.type === 'TOGGLE_SWITCHER') {
				console.log('[CONTENT-UI] TOGGLE_SWITCHER message received, showing overlay');
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
			console.log('[CONTENT-UI] Restoring closed group:', persistKey);
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
		console.log('[CONTENT-UI] Setting up message listener');
		chrome.runtime.onMessage.addListener(handleMessage);
		return () => {
			console.log('[CONTENT-UI] Removing message listener');
			chrome.runtime.onMessage.removeListener(handleMessage);
		};
	}, [handleMessage]);

	if (!isVisible) return null;

	return (
		<div
			className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 backdrop-blur-sm"
			onClick={handleClose}>
			<SwitcherOverlay
				entries={entries}
				activeGroupId={activeGroupId}
				onActivateOpen={handleActivateOpen}
				onRestoreClosed={handleRestoreClosed}
				onClose={handleClose}
			/>
		</div>
	);
}

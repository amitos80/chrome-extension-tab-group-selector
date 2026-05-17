import { type SwitcherTabGroupEntry } from '@extension/storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
	entries: SwitcherTabGroupEntry[];
	activeGroupId: number | null;
	onActivateOpen: (chromeGroupId: number) => void;
	onRestoreClosed: (persistKey: string) => void;
	onClose: () => void;
}

/** WHY: Chrome exposes named colours; map to CSS values for the dot swatch. */
const TAB_GROUP_COLOR_CSS: Record<string, string> = {
	grey: '#5f6368',
	blue: '#1a73e8',
	red: '#d93025',
	yellow: '#f9ab00',
	green: '#188038',
	pink: '#ff63b8',
	purple: '#9334e6',
	cyan: '#12b5cb',
	orange: '#fa903e',
};

export const SwitcherOverlay = ({
	entries,
	activeGroupId,
	onActivateOpen,
	onRestoreClosed,
	onClose,
}: Props) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);

	const filteredEntries = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) {
			return entries;
		}
		return entries.filter(e => (e.title || 'Untitled').toLowerCase().includes(q));
	}, [entries, searchQuery]);

	useEffect(() => {
		const q = searchQuery.toLowerCase().trim();
		const filtered = q
			? entries.filter(e => (e.title || 'Untitled').toLowerCase().includes(q))
			: entries;
		const preferred = filtered.findIndex(
			e => e.isOpen && e.chromeGroupId === activeGroupId,
		);
		setSelectedIndex(preferred >= 0 ? preferred : 0);
	}, [entries, activeGroupId, searchQuery]);

	useEffect(() => {
		setSelectedIndex(prev => Math.min(prev, Math.max(0, filteredEntries.length - 1)));
	}, [filteredEntries.length]);

	const activateRow = useCallback(
		(row: SwitcherTabGroupEntry) => {
			if (row.isOpen && row.chromeGroupId != null) {
				onActivateOpen(row.chromeGroupId);
			} else {
				onRestoreClosed(row.persistKey);
			}
		},
		[onActivateOpen, onRestoreClosed],
	);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (filteredEntries.length === 0) {
				return;
			}

			if (e.key === 'Escape') {
				e.preventDefault();
				onClose();
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setSelectedIndex(prev => Math.max(0, prev - 1));
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				setSelectedIndex(prev => Math.min(filteredEntries.length - 1, prev + 1));
			} else if (e.key === 'Enter') {
				e.preventDefault();
				const row = filteredEntries[selectedIndex];
				if (row) {
					activateRow(row);
				}
			}
		};

		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [filteredEntries, selectedIndex, onClose, activateRow]);

	const dotColor = (color: string) => TAB_GROUP_COLOR_CSS[color] ?? TAB_GROUP_COLOR_CSS.grey;

	return (
		<div className="flex min-w-[420px] max-w-[500px] flex-col gap-2 rounded-2xl border border-white/10 bg-[#1e1e1e]/95 p-6 shadow-2xl">
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-lg font-semibold text-white">Tab Groups</h2>
				<button
					onClick={onClose}
					className="px-2 text-xl leading-none text-white/60 transition-colors hover:text-white"
					aria-label="Close">
					×
				</button>
			</div>

			<input
				type="text"
				value={searchQuery}
				onChange={e => setSearchQuery(e.target.value)}
				placeholder="Search tab groups..."
				className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
				autoFocus
			/>

			{filteredEntries.length === 0 && (
				<p className="py-4 text-center text-sm text-white/60">
					{searchQuery ? 'No groups found' : 'No tab groups'}
				</p>
			)}

			{filteredEntries.length > 0 && (
				<div className="flex flex-col gap-2">
					<h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/50">
						All groups ({filteredEntries.length})
					</h3>
					{filteredEntries.map((row, i) => {
						const isSelected = i === selectedIndex;
						const isActive = row.isOpen && row.chromeGroupId === activeGroupId;

						return (
							<div
								key={row.persistKey}
								onClick={() => activateRow(row)}
								style={{ opacity: row.isOpen ? 1 : 0.6 }}
								className={`flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-all ${isSelected ? 'border-2 border-blue-500 bg-blue-500/20' : 'border-2 border-transparent hover:bg-white/5'} `}>
								<div
									className="h-4 w-4 flex-shrink-0 rounded-full"
									style={{ backgroundColor: dotColor(row.color) }}
								/>
								<div className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium text-white">
										{row.title || 'Untitled'}
									</span>
									{row.isOpen ? (
										<span className="block text-xs text-white/40">
											{row.tabCount} {row.tabCount === 1 ? 'tab' : 'tabs'} • Open
										</span>
									) : (
										<span className="block text-xs text-white/40">
											{row.tabCount} {row.tabCount === 1 ? 'tab' : 'tabs'} • Closed{' '}
											{row.closedAt ? formatTimeAgo(row.closedAt) : ''}
										</span>
									)}
								</div>
								{isActive && (
									<span className="flex-shrink-0 text-xs font-medium text-blue-400">Active</span>
								)}
								{!row.isOpen && (
									<span className="flex-shrink-0 text-xs font-medium text-white/40">Restore</span>
								)}
							</div>
						);
					})}
				</div>
			)}

			<div className="mt-2 border-t border-white/10 pt-2">
				<p className="text-center text-xs text-white/40">
					Use ↑↓ or click to select • Enter to activate • Esc to close
				</p>
			</div>
		</div>
	);
};

function formatTimeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);

	if (seconds < 60) return 'just now';
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

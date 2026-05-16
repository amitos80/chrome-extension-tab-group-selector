import { useState } from 'react';

export interface ClosedTabGroup {
  id: string;
  title: string;
  color: string;
  closedAt: number;
  tabCount: number;
}

interface Props {
  groups: chrome.tabGroups.TabGroup[];
  closedGroups: ClosedTabGroup[];
  selectedIndex: number;
  activeGroupId: number | null;
  onActivate: (groupId: number) => void;
  onActivateClosed: (closedGroup: ClosedTabGroup) => void;
  onClose: () => void;
}

export const SwitcherOverlay = ({ groups, closedGroups, selectedIndex, activeGroupId, onActivate, onActivateClosed, onClose }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOpenGroups = groups.filter(g => 
    (g.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClosedGroups = closedGroups.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalFilteredCount = filteredOpenGroups.length + filteredClosedGroups.length;

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

      {totalFilteredCount === 0 && (
        <p className="py-4 text-center text-sm text-white/60">
          {searchQuery ? 'No groups found' : 'No tab groups'}
        </p>
      )}

      {filteredOpenGroups.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/50">
            Open Groups ({filteredOpenGroups.length})
          </h3>
          {filteredOpenGroups.map((group, i) => {
            const isSelected = i === selectedIndex && filteredClosedGroups.length === 0;
            const isActive = group.id === activeGroupId;

            return (
              <div
                key={group.id}
                onClick={() => onActivate(group.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-all ${isSelected ? 'border-2 border-blue-500 bg-blue-500/20' : 'border-2 border-transparent hover:bg-white/5'} `}>
                <div className="h-4 w-4 flex-shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{group.title || 'Untitled'}</span>
                </div>
                {isActive && <span className="flex-shrink-0 text-xs font-medium text-blue-400">Active</span>}
              </div>
            );
          })}
        </div>
      )}

      {filteredClosedGroups.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/50">
            Recently Closed ({filteredClosedGroups.length})
          </h3>
          {filteredClosedGroups.map((group, i) => {
            const adjustedIndex = filteredOpenGroups.length + i;
            const isSelected = adjustedIndex === selectedIndex;

            return (
              <div
                key={group.id}
                onClick={() => onActivateClosed(group)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-all ${isSelected ? 'border-2 border-blue-500 bg-blue-500/20' : 'border-2 border-transparent hover:bg-white/5'} `}>
                <div className="h-4 w-4 flex-shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white/80">{group.title}</span>
                  <span className="block text-xs text-white/40">
                    {group.tabCount} {group.tabCount === 1 ? 'tab' : 'tabs'} • Closed {formatTimeAgo(group.closedAt)}
                  </span>
                </div>
                <span className="flex-shrink-0 text-xs font-medium text-white/40">Restore</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 border-t border-white/10 pt-2">
        <p className="text-center text-xs text-white/40">Use ↑↓ or click to select • Enter to activate • Esc to close</p>
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

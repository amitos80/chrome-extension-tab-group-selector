interface Props {
  groups: chrome.tabGroups.TabGroup[];
  selectedIndex: number;
  activeGroupId: number | null;
  onActivate: (groupId: number) => void;
  onClose: () => void;
}
//onClick={e => e.stopPropagation()}
export const SwitcherOverlay = ({ groups, selectedIndex, activeGroupId, onActivate, onClose }: Props) => (
  <div className="flex min-w-[320px] flex-col gap-2 rounded-2xl border border-white/10 bg-[#1e1e1e]/95 p-6 shadow-2xl">
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-white">Tab Groups</h2>
      <button
        onClick={onClose}
        className="px-2 text-xl leading-none text-white/60 transition-colors hover:text-white"
        aria-label="Close">
        ×
      </button>
    </div>

    {groups.length === 0 && <p className="py-4 text-center text-sm text-white/60">No active groups</p>}

    <div className="flex flex-col gap-2">
      {groups.map((group, i) => {
        const isSelected = i === selectedIndex;
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

    <div className="mt-2 border-t border-white/10 pt-2">
      <p className="text-center text-xs text-white/40">Use ↑↓ or click to select • Enter to activate • Esc to close</p>
    </div>
  </div>
);

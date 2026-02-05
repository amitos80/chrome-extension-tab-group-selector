

interface Props {
  groups: chrome.tabGroups.TabGroup[];
  selectedIndex: number;
}

export const SwitcherOverlay = ({ groups, selectedIndex }: Props) => {
  const activateGroup = (groupId: number) => {
    chrome.runtime.sendMessage({ type: 'ACTIVATE_GROUP', groupId });
  };

  return (
    <div className="bg-[#1e1e1e]/90 p-6 rounded-2xl shadow-2xl border border-white/10 flex gap-4">
      {groups.length === 0 && <p className="text-white">No active groups</p>}
      {groups.map((group, i) => (
        <div
          key={group.id}
          className={`w-24 h-24 rounded-xl flex flex-col items-center justify-center border-2 transition-all 
            ${i === selectedIndex ? 'border-blue-500 bg-white/10' : 'border-transparent'}`}
        >
          <div
            className="w-4 h-4 rounded-full mb-2"
            style={{ backgroundColor: group.color }}
          />
          <span className="text-white text-xs font-medium truncate w-full text-center px-1">
            {group.title || 'Untitled'}
          </span>
        </div>
      ))}
    </div>
  );
};
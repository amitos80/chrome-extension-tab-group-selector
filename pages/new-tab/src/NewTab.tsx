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

const shapeTypes = [
  'squircle',
  'blob',
  'dashed-circle',
  'sector',
  'arc',
  'breadcrumb',
  'folded-rectangle',
  'curved-rectangle',
  'pointy-box',
  'circle-cut',
  'triangle-cut',
  'polygon',
  'cube',
  'matrix-cubes',
  'thunder',
  'film-strip',
  'pixel-corner',
  'sparkle',
  'spiral',
  'lollipop',
  'yin-yang',
  'infinity',
];

/* Vanila JS Example
function createShapes() {
  const background = document.getElementById('.geometric-background');

  for (let i = 0; i < 40; i++) {
    const shape = document.createElement('div');
    const shapeClass = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    shape.className = `shape ${shapeClass}`;

    // Random positions
    const posX = Math.random() * 100;
    const posY = Math.random() * 100;

    // Random animation properties
    const delay = Math.random() * 10;
    const duration = Math.random() * 10 + 10;

    // Apply styles
    shape.style.left = `${posX}%`;
    shape.style.top = `${posY}%`;
    shape.style.animationDelay = `${delay}s`;
    shape.style.animationDuration = `${duration}s`;

    background?.appendChild(shape);
  }
}

// Create particles
function createParticles() {
  const particlesContainer = document.getElementById('particles');

  for (let i = 0; i < 100; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    // Random positions
    const posX = Math.random() * 100;
    const posY = Math.random() * 100;

    // Random animation properties
    const delay = Math.random() * 8;
    const duration = Math.random() * 4 + 4;

    // Apply styles
    particle.style.left = `${posX}%`;
    particle.style.top = `${posY}%`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;

    particlesContainer.appendChild(particle);
  }
}

// Mouse movement interaction
function addMouseInteraction() {
  document.addEventListener('mousemove', e => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    const shapes = document.querySelectorAll('.shape');
    shapes.forEach(shape => {
      const speed = 0.05;
      const shapeX = parseFloat(shape.style.left);
      const shapeY = parseFloat(shape.style.top);

      shape.style.left = `${shapeX + (x - 0.5) * speed}%`;
      shape.style.top = `${shapeY + (y - 0.5) * speed}%`;
    });
  });
}
 */

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
    <div className="geometric-background">
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
          <div style={{ height: '50vh', margin: 'auto' }} onClick={e => e.stopPropagation()}>
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

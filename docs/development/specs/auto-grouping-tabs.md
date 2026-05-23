# Auto-Grouping

## Objective
Provide Premium users with an automated workspace sorting engine that scans newly loaded URLs and maps them instantly to dedicated, color-coded tab groups based on user-defined pattern matching rules.

### Functional Requirements

#### Rule Composition & Management
  - Users must be able to create, read, update, and delete (CRUD) routing rules in the Extension Options page.
  - Each rule must consist of:
    - id: Unique string identifier (UUID v4). 
    - pattern: A wildcard string (e.g., *[.github.com/](https://.github.com/)*, *stackoverflow.com*) or an exact domain string. 
    - groupTitle: The string label of the target tab group. 
    - groupColor: One of the 9 official Chrome tab group colors (grey, blue, red, yellow, green, pink, purple, cyan, orange).

### The Runtime Execution Engine
  - Trigger Event: The engine monitors the chrome.tabs.onUpdated lifecycle hook, looking specifically for changes to the tab's url.
  - Entitlement Interception: Before parsing any rule, the service must execute a rapid entitlement check (checkPremiumStatus()). If the user is on the Free tier, the parsing engine terminates immediately.
  - Evaluation Pass: The current tab URL is evaluated sequentially against the stored rule array. The first matching rule takes execution priority.
  - Grouping Execution:
    - Case A (Group exists): The engine queries all open tab groups in the active window. If an open group matches both the rule's groupTitle and groupColor, the tab is added to that group via chrome.tabs.group().
    - Case B (Group does not exist): If no matching open group is found, Chrome creates a new group containing that tab, applying the configured title and color schema.

### Edge Case Matrix & Constraints
  - System Pages: The engine must completely skip processing for system/privileged URLs (chrome://*, chrome-extension://*, about:blank).
  - User Overrides: If a user manually drags a tab out of an auto-grouped structure, the engine must not forcefully re-group it unless the user performs a hard navigation update (a new URL load) within that tab.
  - Tab Clutter Protection: Rules matching generic terms (e.g., *google.com*) should be discouraged in the UI text to prevent breaking temporary user search tabs into fixed groupings.


## Implementation Protocol

### Code Architecture Blueprint
  - src/utils/url-matcher.ts — Evaluates pattern definitions against text URLs.
  - src/services/rules-storage.ts — Manages retrieval and caching of user configurations.
  - src/background/auto-group-handler.ts — Orchestrates the background lifecycle hook state.

## Modular Code Templates for the Assistant

### Module 1: The Matching Engine (src/utils/url-matcher.ts)Constraint Checklist: Pure utilities only. Functions must remain brief ($\le 15$ lines).
```typescript
/**
 * Converts a basic wildcard pattern (*.github.com) into a strict RegExp execution object.
 */
export function wildcardToRegex(pattern: string): RegExp {
  const sanitized = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexString = '^' + sanitized.replace(/\*/g, '.*') + '$';
  return new RegExp(regexString, 'i');
}

/**
 * Validates whether a target URL string satisfies a registered matching condition.
 */
export function isUrlMatch(url: string, pattern: string): boolean {
  if (!url) return false;
  try {
    const matcher = wildcardToRegex(pattern);
    return matcher.test(url);
  } catch {
    return false;
  }
}
```

### Module 2: State Lifecycle Router (src/background/auto-group-handler.ts)
Constraint Checklist: Total file size must remain well under 200 lines. Break orchestration into distinct steps to preserve the 25-line single-responsibility limit per function block.
```typescript
import { isUrlMatch } from '../utils/url-matcher';
import { checkPremiumStatus } from '../services/entitlements';

export interface AutoGroupRule {
  id: string;
  pattern: string;
  groupTitle: string;
  groupColor: chrome.tabGroups.Color;
}

/**
 * Main event coordinator for background URL interception updates.
 */
export async function handleTabUrlUpdate(
  tabId: number, 
  changeInfo: chrome.tabs.TabChangeInfo, 
  tab: chrome.tabs.Tab
): Promise<void> {
  if (!changeInfo.url || tab.url?.startsWith('chrome://')) return;
  
  const isPremium = await checkPremiumStatus();
  if (!isPremium) return;

  const rules = await fetchRegisteredRules();
  const matchedRule = rules.find(rule => isUrlMatch(changeInfo.url!, rule.pattern));
  
  if (matchedRule) {
    await executeTabRouting(tabId, tab.windowId, matchedRule);
  }
}

/**
 * Safely resolves allocation targets and updates tab grouping configurations.
 */
async function executeTabRouting(tabId: number, windowId: number, rule: AutoGroupRule): Promise<void> {
  try {
    const existingGroupId = await findExistingGroup(windowId, rule.groupTitle, rule.groupColor);
    
    if (existingGroupId !== null) {
      await chrome.tabs.group({ tabIds: tabId, groupId: existingGroupId });
    } else {
      await createNewDecoratedGroup(tabId, rule.groupTitle, rule.groupColor);
    }
  } catch (error) {
    console.error('[AUTO-GROUP] Routing allocation routine aborted:', error);
  }
}

/**
 * Scans the active window space for pre-existing group tags matching our rule parameters.
 */
async function findExistingGroup(
  windowId: number, 
  title: string, 
  color: chrome.tabGroups.Color
): Promise<number | null> {
  const openGroups = await chrome.tabGroups.query({ windowId });
  const exactMatch = openGroups.find(
    g => g.title?.toLowerCase() === title.toLowerCase() && g.color === color
  );
  return exactMatch ? exactMatch.id : null;
}

/**
 * Instantiates a fresh tab group skin using explicit styling details.
 */
async function createNewDecoratedGroup(
  tabId: number, 
  title: string, 
  color: chrome.tabGroups.Color
): Promise<void> {
  const newGroupId = await chrome.tabs.group({ tabIds: tabId });
  await chrome.tabGroups.update(newGroupId, { title, color });
}

async function fetchRegisteredRules(): Promise<AutoGroupRule[]> {
  const data = await chrome.storage.local.get({ autoGroupRules: [] });
  return data.autoGroupRules;
}
```


### Implementation Steps for the Agent Prompt
When ready to build, prompt your agent assistant using these sequential goals:
 - Goal 1: Create src/utils/url-matcher.ts and verify it can match standard parameters without crashing when processing Malformed URLs.
 - Goal 2: Create the event orchestration layer inside src/background/auto-group-handler.ts.
 - Goal 3: Wire the handler into your main service worker loop:
```typescript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void handleTabUrlUpdate(tabId, changeInfo, tab);
});
```

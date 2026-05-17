# Tasks: Tab group switcher — dedupe open vs closed registry rows

## Task TG-DEDUPE-1 — Fingerprint & merge helper

- **Priority:** P0  
- **Estimate:** 45–60 min  
- **Dependencies:** None  

### Steps

1. Add a small pure helper module (e.g. under [`packages/storage/lib/impl/`](../../../packages/storage/lib/impl/) or [`chrome-extension/src/background/`](../../../chrome-extension/src/background/)) exporting:

```typescript
export interface ClosedRowFingerprintMatchInput {
	windowId: number;
	title: string;
	color: string;
	tabCount: number;
}

export function normalizeGroupTitle(title: string): string;

/** Returns index of unique matching closed row, or -1 if ambiguous/none. */
export function findReactivatableClosedRowIndex(
	groups: PersistedTabGroup[],
	chromeGroup: chrome.tabGroups.TabGroup,
	tabCount: number,
	maxClosedAgeMs?: number,
): number;
```

2. Matching rules (initial):

   - Candidate rows: `!row.isOpen` && `row.windowId === chromeGroup.windowId` (or allow `-1` legacy rows only with explicit fallback flag — decide and document).
   - Equality: `normalizeGroupTitle(row.title) === normalizeGroupTitle(chromeGroup.title)` and `row.color === chromeGroup.color` and `row.tabCount === tabCount`.
   - Ambiguity: if **multiple** candidates, prefer **`closedAt` latest** within **`maxClosedAgeMs`** (e.g. 24h); if still ambiguous, return `-1` and fall back to push-new behaviour.

3. Unit-test friendly: pass clock/`now` injectable for `closedAt` comparisons.

### Completion checklist

- [ ] Helpers documented with WHY comments for heuristic limits.
- [ ] Behaviour documented when `windowId` mismatches (e.g. cross-window drag).

---

## Task TG-DEDUPE-2 — `upsertOpenFromChrome` reactivation path

- **Priority:** P0  
- **Estimate:** 60–90 min  
- **Dependencies:** TG-DEDUPE-1  

### Steps

1. In [`all-tab-groups-registry-storage.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts), replace unconditional **`groups.push`** in **`upsertOpenFromChrome`** `else` branch with:

```typescript
const closedIdx = findReactivatableClosedRowIndex(groups, group, tabCount, MAX_CLOSED_AGE_MS);
if (closedIdx >= 0) {
  groups[closedIdx] = {
    ...groups[closedIdx],
    isOpen: true,
    chromeGroupId: group.id,
    windowId: group.windowId,
    title: group.title || 'Untitled',
    color: group.color,
    tabCount,
    closedAt: null,
    lastSeenAt: now,
    // urls: optional preserve vs clear — decide policy
  };
} else {
  groups.push({ /* existing new-row literal */ });
}
```

2. **Policy decision:** On reactivation, either:

   - **Keep `urls`** from closed snapshot until next close (simple rollback semantics); or  
   - **Clear `urls`** because group is live again (URLs rebuilt via snapshot pipeline).

3. Ensure **`removeByPersistKey`** / restore flows unaffected.

### Completion checklist

- [ ] Close group → reopen (Chrome assigns new group id) → storage retains single **`persistKey`** when fingerprint matches.
- [ ] No reactivation when two closed duplicates exist unless ambiguity rule resolves cleanly.

---

## Task TG-DEDUPE-3 — Optional defensive UI dedupe

- **Priority:** P1  
- **Estimate:** 30–45 min  
- **Dependencies:** TG-DEDUPE-2 (can ship independently as interim patch)

### Steps

1. In [`buildSwitcherSnapshot`](../../../chrome-extension/src/background/tab-group-registry.ts), after building `rows`, filter: drop closed rows when there exists an open row with same `(windowId, normalizedTitle, color, tabCount)` OR simpler heuristic documented.

2. Log `[BACKGROUND]` when defensive dedupe removes a row (debuggable).

### Completion checklist

- [ ] Legacy double-rows disappear from overlay even before manual DB cleanup.
- [ ] Open row always wins over matching closed row.

---

## Task TG-DEDUPE-4 — One-shot storage cleanup (optional)

- **Priority:** P2  
- **Estimate:** 45–60 min  
- **Dependencies:** TG-DEDUPE-1  

### Steps

1. Add **`dedupeRegistryClosedAgainstOpen()`** run once on extension upgrade (`chrome.runtime.onInstalled` reason `'update'`) or manual callable:

   - For each **closed** row, if fingerprint matches any **open** row in same window, drop closed row OR merge URLs into open policy field.

2. Gate behind **`registryDedupeSchemaVersion`** in persisted state to run once.

### Completion checklist

- [ ] Existing polluted installs shrink duplicate counts without losing unrelated closed history.

---

## Manual QA checklist

| # | Scenario | Expected |
|---|-----------|----------|
| 1 | Close “technews” group native UI → Create new group same name with ~same tabs | Switcher shows **one** open row (after TG-DEDUPE-2); no parallel closed clone |
| 2 | Same title different colors | Two distinct rows |
| 3 | Same title same color different tab counts | Two distinct rows |
| 4 | Two windows each “Work” group | Rows distinguished by window membership |
| 5 | Restore closed row from switcher | Still works; removed from closed after existing remove logic |

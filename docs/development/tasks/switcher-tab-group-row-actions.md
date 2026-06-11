# Tasks: Switcher tab group row actions

**Plan:** [`docs/development/plans/switcher-tab-group-row-actions.md`](../plans/switcher-tab-group-row-actions.md)

| ID | Priority | Estimate | Depends on |
|----|----------|----------|------------|
| TGRA1 | P0 | 45m | — |
| TGRA2 | P0 | 60m | TGRA1 |
| TGRA3 | P0 | 75m | — |
| TGRA4 | P0 | 90m | TGRA3 |
| TGRA5 | P0 | 45m | TGRA2, TGRA4 |
| TGRA6 | P0 | 30m | TGRA5 |
| TGRA7 | P1 | 30m | TGRA6 |

---

## TGRA1 — Registry `patchByPersistKey`

### Steps

1. In [`all-tab-groups-registry-types.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-types.ts), add optional patch type:
   ```typescript
   export type TabGroupRegistryPatch = {
     title?: string
     color?: string
   }
   ```
2. In [`all-tab-groups-registry-storage.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts), add `patchByPersistKey(persistKey, patch)`:
   - Find row by `persistKey`; return `{ success: false }` if missing.
   - Reject `bookmark-saved-tab-group:` keys (v1 out of scope).
   - Normalize title: trim; empty → `'Untitled'`.
   - Normalize color via `normalizeTabGroupColor()` from [`tab-group-colors.ts`](../../../packages/storage/lib/impl/tab-group-colors.ts).
   - Set `lastSeenAt: Date.now()` on patch.
   - Persist through existing `finalizeRegistryGroupsForPersistence` path.
3. Export patch helper from [`packages/storage/lib/impl/index.ts`](../../../packages/storage/lib/impl/index.ts).

### Completion criteria

- [ ] Closed row title/color can be updated without touching Chrome APIs
- [ ] Bookmark-saved persist keys are rejected
- [ ] `pnpm -F @extension/storage ready` passes

---

## TGRA2 — Background mutations + message handlers

### Steps

1. Add [`tab-group-mutations.ts`](../../../chrome-extension/src/background/tab-group-mutations.ts):
   ```typescript
   updateTabGroupTitle({ persistKey, title, chromeGroupId? })
   updateTabGroupColor({ persistKey, color, chromeGroupId? })
   deleteOpenTabGroup({ chromeGroupId })
   ```
   - **Open + `chromeGroupId`:** call `chrome.tabGroups.update(groupId, { title | color })`.
   - **Closed (no live id):** call `allTabGroupsRegistryStorage.patchByPersistKey`.
   - **Open fallback:** after Chrome update, registry syncs via existing `onUpdated` listeners.
   - **Delete open:** `chrome.tabs.query({ groupId })` → `chrome.tabs.remove(ids)`; require at least one tab id.
2. Wire handlers in [`index.ts`](../../../chrome-extension/src/background/index.ts):
   - `UPDATE_TAB_GROUP_TITLE`
   - `UPDATE_TAB_GROUP_COLOR`
   - `DELETE_OPEN_TAB_GROUP`
   - Reuse existing `REMOVE_CLOSED_GROUP` for closed delete from UI.
3. Return `{ success: boolean, error?: string }` from each handler.

### Completion criteria

- [ ] Open group rename/color reflected in Chrome tab bar
- [ ] Closed group rename/color reflected in next `GET_TAB_GROUPS` snapshot
- [ ] Open delete closes all tabs in group
- [ ] `pnpm -F chrome-extension build` passes

---

## TGRA3 — Confirm dialog + row actions menu

### Steps

1. Add [`SwitcherConfirmDialog.tsx`](../../../packages/ui/lib/components/SwitcherConfirmDialog.tsx):
   - Props: `open`, `title`, `body`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, `isLight`, `destructive`.
   - Render inside row/overlay stacking context (no portal required v1).
   - Escape and cancel button call `onCancel`.
2. Add [`SwitcherRowActionsMenu.tsx`](../../../packages/ui/lib/components/SwitcherRowActionsMenu.tsx):
   - ⋮ button: `opacity-0 group-hover/row:opacity-100` plus visible when `menuOpen`.
   - Popover panel aligned to right of row; `stopPropagation` on all clicks.
   - **Rename** menu item → calls `onRenameRequest()`.
   - **Color row:** map `CHROME_TAB_GROUP_COLORS`; ring on current color; click → `onColorChange(color)` then close menu.
   - **Delete** menu item → calls `onDeleteRequest()`.
   - Escape closes menu; click outside closes menu (pointer down on document or overlay backdrop within row).
3. Export both from [`packages/ui/lib/index.ts`](../../../packages/ui/lib/index.ts).

### Completion criteria

- [ ] Menu opens without bubbling to row activate handler
- [ ] Nine color swatches render with correct hex from `tabGroupColorCss`
- [ ] Confirm dialog usable for delete flow
- [ ] Each file ≤ 200 lines
- [ ] `pnpm -F @extension/ui ready` passes

---

## TGRA4 — `SwitcherTabGroupRow` component

### Steps

1. Add [`SwitcherTabGroupRow.tsx`](../../../packages/ui/lib/components/SwitcherTabGroupRow.tsx):
   - Props: `row: SwitcherTabGroupEntry`, `isSelected`, `isActive`, `isLight`, `rowRef?`, `onActivate`, `onUpdateTitle`, `onUpdateColor`, `onDeleteOpen`, `onDeleteClosed`, `formatTimeAgo?`.
   - Layout (left → right): **color circle** → **group name** (+ metadata below) → Active/Restore badge → **⋮ menu** on the right edge. Circle must be directly left of the title, not on the right.
   - Wrap row in `group/row` for hover menu visibility.
   - **Rename mode:** local state `isRenaming`; show `<input>` with current title; Enter/blur save, Escape cancel; call parent async handlers.
   - **Delete flow:** local `confirmOpen` state; render `SwitcherConfirmDialog` with open vs closed copy (via i18n props from parent or keys passed in).
   - Row `onClick` → `onActivate(row)` unless renaming or menu/confirm open.
2. Keep keyboard selection ref support (`ref={isSelected ? rowRef : undefined}`).

### Completion criteria

- [ ] Hover shows ⋮ on right edge; color circle stays left of group name
- [ ] Inline rename works without triggering activate
- [ ] Delete confirm gates both open and closed paths
- [ ] File ≤ 200 lines
- [ ] Exported from `@extension/ui`

---

## TGRA5 — Integrate content-ui overlay + App

### Steps

1. In [`App.tsx`](../../../pages/content-ui/src/matches/all/App.tsx), add handlers:
   ```typescript
   handleUpdateTitle(row, title) → UPDATE_TAB_GROUP_TITLE → fetchGroups()
   handleUpdateColor(row, color) → UPDATE_TAB_GROUP_COLOR → fetchGroups()
   handleDeleteOpen(chromeGroupId) → DELETE_OPEN_TAB_GROUP → fetchGroups()
   handleDeleteClosed(persistKey) → REMOVE_CLOSED_GROUP → fetchGroups()
   ```
2. Pass handlers into [`SwitcherOverlay.tsx`](../../../pages/content-ui/src/components/SwitcherOverlay.tsx).
3. Replace inline row `.map()` with `<SwitcherTabGroupRow />`; remove duplicated row markup.
4. Trim [`SwitcherOverlay.tsx`](../../../pages/content-ui/src/components/SwitcherOverlay.tsx) toward ≤ 200 lines if possible (logic stays; row UI moves out).

### Completion criteria

- [ ] Shortcut overlay supports rename/color/delete for open and closed rows
- [ ] List refreshes after each mutation
- [ ] `pnpm -F @extension/content-ui build` passes

---

## TGRA6 — Integrate new-tab overlay + App

### Steps

1. Mirror TGRA5 handlers in [`NewTab.tsx`](../../../pages/new-tab/src/NewTab.tsx).
2. Update [`pages/new-tab/src/components/SwitcherOverlay.tsx`](../../../pages/new-tab/src/components/SwitcherOverlay.tsx) identically to content-ui overlay.
3. Smoke-test both surfaces side by side.

### Completion criteria

- [ ] New-tab switcher parity with content-ui overlay
- [ ] `pnpm -F @extension/new-tab build` passes

---

## TGRA7 — i18n, AGENTS.md, QA matrix

### Steps

1. Add EN keys to [`packages/i18n/locales/en/messages.json`](../../../packages/i18n/locales/en/messages.json):
   - `switcherRowActionsMenu`, `switcherRowActionRename`, `switcherRowActionDelete`
   - `switcherRowDeleteConfirmTitle`, `switcherRowDeleteConfirmBody`, `switcherRowDeleteConfirmOpen`, `switcherRowDeleteConfirmClosed`
   - `switcherRowRenamePlaceholder`, `switcherRowConfirmDelete`, `switcherRowCancel`
2. Update messaging table in [`docs/AGENTS.md`](../../AGENTS.md) with new message types.
3. Write [`docs/development/summaries/switcher-tab-group-row-actions.md`](../summaries/switcher-tab-group-row-actions.md) after QA.

### Manual QA matrix

| Scenario | Expected |
|----------|----------|
| Row layout | Color circle is immediately left of group name; ⋮ menu on far right |
| Hover open row | ⋮ visible on right; row still clickable to activate when menu closed |
| Open menu → Rename | Inline input; Enter saves title in Chrome + list |
| Open menu → color swatch | Group color updates immediately; menu closes |
| Open menu → Delete → Confirm | All tabs in group close; row becomes closed or disappears |
| Hover closed row | ⋮ visible; row click still restores when menu closed |
| Closed row → Rename / Color | Registry updated; restore uses new title/color |
| Closed row → Delete → Confirm | Row removed from switcher list |
| Escape | Closes menu, rename, or confirm without side effects |
| Bookmark-saved row | No ⋮ menu (or menu disabled) — out of scope v1 |
| Free tier | Row actions work; 3-group cap unchanged when list not expanded |

### Completion criteria

- [ ] All QA rows pass on Chrome macOS (or primary dev platform)
- [ ] `pnpm build` passes
- [ ] Summary doc published

---

## Optional follow-up (P5)

| ID | Task | Notes |
|----|------|-------|
| TGRA8 | Consolidate duplicate `SwitcherOverlay` into `@extension/ui` | Reduces drift between content-ui and new-tab |

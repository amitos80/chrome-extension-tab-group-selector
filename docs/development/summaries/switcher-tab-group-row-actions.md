# Implementation summary: Switcher tab group row actions

**Plan:** [`docs/development/plans/switcher-tab-group-row-actions.md`](../plans/switcher-tab-group-row-actions.md) · **Tasks:** [`docs/development/tasks/switcher-tab-group-row-actions.md`](../tasks/switcher-tab-group-row-actions.md)

## What was implemented

| Task | Detail |
|------|--------|
| TGRA1 | `patchByPersistKey()` on registry storage — title/color patch for closed groups; rejects `bookmark-folder:` keys |
| TGRA2 | `tab-group-mutations.ts` + background handlers: `UPDATE_TAB_GROUP_TITLE`, `UPDATE_TAB_GROUP_COLOR`, `DELETE_OPEN_TAB_GROUP` |
| TGRA3 | `SwitcherConfirmDialog`, `SwitcherRowActionsMenu` — hover ⋮ menu with rename, color picker, delete |
| TGRA4 | `SwitcherTabGroupRow` — color circle left, name, badges, ⋮ on right; inline rename; delete confirm |
| TGRA5 | content-ui `App.tsx` + `SwitcherOverlay.tsx` wired with mutation callbacks + `GET_TAB_GROUPS` refetch |
| TGRA6 | new-tab `NewTab.tsx` + `SwitcherOverlay.tsx` — same wiring |
| TGRA7 | i18n keys, `docs/AGENTS.md` messaging table, this summary |

## Behavior

- Row click still activates open groups or restores closed groups.
- Hover reveals ⋮ menu on the right edge (hidden for bookmark-folder rows).
- **Rename:** inline input; Enter/blur saves, Escape cancels.
- **Change color:** palette in menu; open groups update Chrome tab bar; closed groups patch registry.
- **Delete open:** confirm dialog → closes all tabs in the group.
- **Delete closed:** confirm dialog → removes from registry (`REMOVE_CLOSED_GROUP`).
- Menu and confirm interactions use `stopPropagation()` so they do not trigger row activation.

## Files touched (primary)

- [`packages/storage/lib/impl/all-tab-groups-registry-types.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-types.ts)
- [`packages/storage/lib/impl/all-tab-groups-registry-storage.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts)
- [`chrome-extension/src/background/tab-group-mutations.ts`](../../../chrome-extension/src/background/tab-group-mutations.ts)
- [`chrome-extension/src/background/index.ts`](../../../chrome-extension/src/background/index.ts)
- [`packages/ui/lib/components/SwitcherConfirmDialog.tsx`](../../../packages/ui/lib/components/SwitcherConfirmDialog.tsx)
- [`packages/ui/lib/components/SwitcherRowActionsMenu.tsx`](../../../packages/ui/lib/components/SwitcherRowActionsMenu.tsx)
- [`packages/ui/lib/components/SwitcherTabGroupRow.tsx`](../../../packages/ui/lib/components/SwitcherTabGroupRow.tsx)
- [`pages/content-ui/src/matches/all/App.tsx`](../../../pages/content-ui/src/matches/all/App.tsx)
- [`pages/content-ui/src/components/SwitcherOverlay.tsx`](../../../pages/content-ui/src/components/SwitcherOverlay.tsx)
- [`pages/new-tab/src/NewTab.tsx`](../../../pages/new-tab/src/NewTab.tsx)
- [`pages/new-tab/src/components/SwitcherOverlay.tsx`](../../../pages/new-tab/src/components/SwitcherOverlay.tsx)
- [`packages/i18n/locales/en/messages.json`](../../../packages/i18n/locales/en/messages.json)
- [`docs/AGENTS.md`](../../../docs/AGENTS.md)

## Known limitations

- Bookmark-folder rows (`bookmark-folder:` persist keys) have no row actions menu.
- Row subtitle strings (`Open`, `Active`, `Restore`, tab counts) remain hardcoded English (same as before).
- Delete open group removes tabs but does not explicitly ungroup first (Chrome handles cleanup).

## Manual QA checklist

- [ ] Hover row → ⋮ appears; click row still switches/restores
- [ ] Rename open group → Chrome tab group title updates
- [ ] Rename closed group → title updates after refetch
- [ ] Change color on open/closed groups
- [ ] Delete open group → tabs close, row disappears
- [ ] Delete closed group → row removed from list
- [ ] Bookmark-folder row has no ⋮ menu

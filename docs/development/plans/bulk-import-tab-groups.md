# Development plan: One-time bulk import + staggered switcher open

## Objective

Offer a **single-use** “Import all tab groups” action in the extension popup that seeds [`allTabGroupsRegistryStorage`](../../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts) from `chrome.tabGroups` / `chrome.tabs`, hides the CTA forever, closes the popup, opens the switcher on the active tab, and plays a **staggered row reveal** on the list.

## Technical approach

- **Flag:** New [`bulk-import-ui-storage`](../../../packages/storage/lib/impl/bulk-import-ui-storage.ts) (`initialBulkImportCompleted`).
- **Completion:** Flag is set only after import succeeds **and** `TOGGLE_SWITCHER` succeeds on the active tab. Registry auto-sync can populate groups before the user opens the popup, so we do **not** infer completion from a non-empty registry.
- **Background:** `IMPORT_ALL_TAB_GROUPS_AND_OPEN_SWITCHER` loops `tabGroups.query({})` → `tabs.query({ groupId })` → `upsertOpenFromChrome`, sends `TOGGLE_SWITCHER` with `staggerImportReveal: true`, then sets flag when messaging succeeds—via shared helper with [`handleCommand`](../../../chrome-extension/src/background/index.ts).
- **UI:** Popup uses `useStorage`; Switcher rows use Tailwind `keyframes` + capped `animation-delay`; `motion-reduce` disables motion.

## Risks

Restricted URLs block `tabs.sendMessage`; import still succeeds — user can open switcher via shortcut.

## Success metrics

Fresh install: button stays until import + switcher open succeed → popup closes → staggered list. If the active tab cannot receive messages, the popup stays open so the user can retry on a normal page.

# Implementation summary: Optional Tab Group Selector on new tab

## Done

| Item | Notes |
|------|--------|
| Storage | [`new-tab-switcher-preference-storage.ts`](../../packages/storage/lib/impl/new-tab-switcher-preference-storage.ts) — default `showTabGroupSelectorOnNewTab: false`, `liveUpdate` |
| Redirect | [`chrome-native-new-tab-redirect.ts`](../../pages/new-tab/src/chrome-native-new-tab-redirect.ts) — `chrome://new-tab-page/` then fallback |
| New tab gate | [`NewTab.tsx`](../../pages/new-tab/src/NewTab.tsx) — redirects when off; fallback to app UI if redirect fails |
| Popup / Options | Toggles + i18n (`optionShowSwitcherOnNewTab`, `popupNewTabSectionLabel`, …) |
| E2E | Pref enabled via `chrome.storage.local` then loads `new-tab/index.html` |

## Behaviour change

Upgrades default to **Chrome native new tab** until users enable the toggle.

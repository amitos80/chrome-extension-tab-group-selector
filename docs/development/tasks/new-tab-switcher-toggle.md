# Tasks: Optional Tab Group Selector on new tab

Plan: [`plans/new-tab-switcher-toggle.md`](../plans/new-tab-switcher-toggle.md)

## Steps

1. Add `@extension/storage` module `newTabSwitcherPreferenceStorage` (default `showTabGroupSelectorOnNewTab: false`, `liveUpdate: true`).
2. Add `redirectCurrentTabToChromeNativeNewTab()` in new-tab package with ordered URL attempts.
3. Refactor `NewTab.tsx`: gate rendering — if pref off, redirect + minimal/null UI; if on, existing overlay logic (extract inner component).
4. Popup + Options: toggle bound to same storage; i18n EN/KO.
5. E2E: enable preference via `chrome.storage.local.set` from extension page context, then open `chrome-extension://…/new-tab/index.html`; keep theme toggle test.

## QA matrix

| Case | Expected |
|------|----------|
| Default / pref off | New tab navigates to Chrome native NTP (may flash extension origin briefly). |
| Pref on | Overlay + fetch groups + shortcut messages work as before. |
| Toggle off→on | Next new tab shows extension UI without reload. |
| Popup vs Options | Both reflect same stored value (`liveUpdate`). |

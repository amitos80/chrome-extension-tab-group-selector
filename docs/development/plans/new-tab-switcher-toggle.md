# Development plan: Optional Tab Group Selector on new tab

## Objective

- Boolean preference **default `off`**: when **on**, [pages/new-tab/src/NewTab.tsx](pages/new-tab/src/NewTab.tsx) behaves as today (switcher overlay). When **off**, user is sent to **Chrome’s native new tab** via `chrome.tabs.update`.

## Constraint

`chrome_url_overrides.newtab` stays in the manifest; disabling it dynamically is impossible. **Redirect** from the extension’s new-tab document when the preference is off.

## Implementation summary

- Storage: `new-tab-switcher-preference-v1` in `chrome.storage.local`, `{ showTabGroupSelectorOnNewTab: boolean }`, default `false`.
- Redirect helper: try `chrome://new-tab-page/` then fallback URL if needed.
- UI: toggle in [pages/popup/src/Popup.tsx](pages/popup/src/Popup.tsx) and [pages/options/src/Options.tsx](pages/options/src/Options.tsx).

## Risks

Native NTP URL may vary by Chrome version; brief flash before redirect when off.

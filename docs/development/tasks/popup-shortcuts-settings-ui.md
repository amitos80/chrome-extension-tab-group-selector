# Tasks: Popup shortcuts display + switcher styling

Plan: [`plans/popup-shortcuts-settings-ui.md`](../plans/popup-shortcuts-settings-ui.md)

## Implementation steps

1. Add i18n keys (EN/KO): shortcut section title, command description, “Not set”, “Edit shortcut in Chrome”, helper blurb, shortcuts page open error.
2. Resize [pages/popup/src/index.css](../../../pages/popup/src/index.css) body dimensions (~340px × ~400px).
3. Refactor [pages/popup/src/Popup.tsx](../../../pages/popup/src/Popup.tsx):
   - Outer scroll-safe flex layout; inner panel matching SwitcherOverlay chrome.
   - `useState` + `useEffect` + optional `visibilitychange` reload: `chrome.commands.getAll()` → `open-switcher` shortcut.
   - Primary button → `chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })` with error state text.
   - Keep `injectContentScript` logic verbatim (same files, guards, notifications).
   - Keep `ToggleButton` + `exampleThemeStorage`; restyle buttons (`border-white/10`, focus rings).
   - Small GitHub logo link optional header row.
4. Trim [pages/popup/src/Popup.css](../../../pages/popup/src/Popup.css) if redundant.

## QA checklist

- [ ] Unassigned shortcut shows localized “Not set”.
- [ ] After assigning in `chrome://extensions/shortcuts`, reopening popup shows Chrome’s shortcut string (incl. macOS modifiers).
- [ ] “Edit shortcut” opens shortcuts tab (or shows error message if blocked).
- [ ] Inject works on `https://` page; `chrome://` / `about:` still triggers notification, no throw.
- [ ] Theme toggle still updates storage / UI component behaviour.

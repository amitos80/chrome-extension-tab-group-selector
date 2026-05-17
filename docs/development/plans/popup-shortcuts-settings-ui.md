# Development plan: Popup shortcuts display + switcher styling

## Objective

Replace boilerplate popup content with a compact **settings** panel that shows the **`open-switcher`** keyboard shortcut (from `chrome.commands.getAll()`), links users to **Chrome’s shortcuts UI** to change it, preserves **inject content script** and **theme toggle**, and visually matches the **Tab Group Switcher** overlay.

## Current situation

- [pages/popup/src/Popup.tsx](../../../pages/popup/src/Popup.tsx) shows logo, template copy, inject button, theme toggle.
- Command **`open-switcher`** is declared in [chrome-extension/manifest.ts](../../../chrome-extension/manifest.ts).
- Chrome exposes **`chrome.commands.getAll()`** only for reading shortcuts; **no** supported programmatic shortcut assignment (users edit at `chrome://extensions/shortcuts`).

## Technical approach

| Piece | Choice |
|-------|--------|
| Shortcut read | `chrome.commands.getAll()` → filter `name === 'open-switcher'` |
| Shortcut edit | `chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })` + try/catch + fallback message |
| Layout | Tailwind panel aligned with [SwitcherOverlay.tsx](../../../pages/new-tab/src/components/SwitcherOverlay.tsx) (`rounded-2xl`, `border-white/20`, `bg-[#1e1e1e]/95`) |
| Popup size | Increase from 300×260 per content fit (~340×400 area) |
| Copy | i18n keys EN/KO |

## Success criteria

- Popup shows current shortcut or “Not set”; button opens Chrome shortcuts page.
- Inject script behaviour unchanged for allowed/blocked URLs.
- Theme toggle still wired to `exampleThemeStorage`.
- Documentation tasks file lists QA steps.

## Optional follow-ups

- Duplicate block on `options_page`; Firefox `commands.update` behind runtime check.

# agents.md: TabGroup Selector Assistant

## 1. Project Mission & Scope
**Objective:** Develop a Chrome Extension that replicates the macOS `Cmd + Tab` experience for **Chrome Tab Groups**.
**Base Template:** `chrome-extension-boilerplate-react-vite`
**Usage:** The user triggers a shortcut (default `Alt+G`), a visual overlay appears, and they cycle through groups. Releasing the modifier key (`Alt`) switches to the selected group and closes the UI.

---

## 2. Mandatory Coding Standards
To ensure logical clarity and prevent context window saturation, the following rules are **non-negotiable**:

### 2.1 File & Function Limits
* **Max File Length:** 250 lines. Decompose logic into smaller modules/hooks if this is exceeded.
* **Max Function Length:** 25 lines. Use helper functions or custom hooks for complex logic.
* **Chunking Requirement:** Every prompt response must be delivered in logical chunks (e.g., Types -> Logic/Hooks -> UI Components).

### 2.2 Quality & Tooling
* **Strict TypeScript:** Define interfaces for every message payload and API response.
* **CSS Isolation:** Use **Shadow DOM** for all Content Script UIs to prevent host-page style bleeding.
* **Tailwind CSS:** Utilize Tailwind within the Shadow DOM context.

---

## 3. Current Architecture & Status
The project infrastructure is currently established as follows:

| Module | Status | Responsibilities |
| :--- | :--- | :--- |
| **Manifest V3** | **Active** | Defines `tabGroups`, `tabs`, and `storage` permissions; sets `open-switcher` command. |
| **Background Worker** | **Active** | Listens for commands; acts as an API bridge for `tabGroups` data. |
| **Content Script** | **Active** | Injected via Shadow DOM; listens for `TOGGLE_SWITCHER` and handles UI rendering. |
| **UI Overlay** | **Draft** | React-based visual list of group colors and titles. |

---

## 4. Technical Specifications 

### 4.1 "Sticky" macOS Logic
* **Trigger:** `onCommand` from the background initiates the `isVisible` state.
* **Cycling:** While the overlay is open, subsequent `open-switcher` triggers or specific keypresses must increment the `selectedIndex` (modulo total groups).
* **Activation on Release:** Implement a `keyup` listener for the **Modifier Key** (e.g., `Alt`). When released, the UI must send an `ACTIVATE_GROUP` message and close.

### 4.2 Messaging Protocol
| Message Type | Direction | Payload |
| :--- | :--- | :--- |
| `TOGGLE_SWITCHER` | Background -> Content | None |
| `GET_TAB_GROUPS` | Content -> Background | Returns `chrome.tabGroups.TabGroup[]` |
| `ACTIVATE_GROUP` | Content -> Background | `{ groupId: number }` |

---

## 5. Documentation & Resources
* **Chrome TabGroup API:** [https://developer.chrome.com/docs/extensions/reference/api/tabGroups](https://developer.chrome.com/docs/extensions/reference/api/tabGroups)
* **Chrome Tabs API:** [https://developer.chrome.com/docs/extensions/reference/api/tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)
* **Vite Boilerplate Docs:** [Jonghakseo/chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite)

---

## 6. Instructions for the LLM Assistant
> When executing tasks:
> 1.  **Acknowledge** the 250-line file limit and 25-line function limit.
> 2.  **Verify** if the proposed logic requires background script bridging (Content Scripts cannot access `tabGroups` directly).
> 3.  **Provide code in chunks**: Types, followed by Logic/Hooks, followed by Components.
> 4.  **Prioritize scannability**: Use headers for every distinct code block.
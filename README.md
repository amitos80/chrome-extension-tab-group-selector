# 🗂️ TabGroup Selector

**Navigate your browser like a pro.** TabGroup Selector brings the iconic macOS `Cmd + Tab` window-switching experience directly to your Chrome Tab Groups.
---
![cover_image.png](.github/cover_image.png)
---

## 🚀 Overview

If you use Chrome Tab Groups, you know the struggle of clicking through tabs to find the right group. **TabGroup Selector** eliminates the friction. With a simple keyboard shortcut, you get a sleek, glassmorphic overlay that lets you cycle through your active groups and jump to them instantly.

## ✨ Key Features

* **Keyboard-Driven UI**: Switch groups without ever lifting your hands from the keyboard.
* **macOS Aesthetic**: A beautiful, centered overlay with background blur (glassmorphism).
* **Visual Recognition**: Displays your Tab Group titles and their assigned Chrome colors.
* **Smart Activation**: Hold the modifier key to cycle, and release to "teleport" to the selected group.
* **Privacy Focused**: Runs entirely locally in your browser.

## 🛠️ How to Use

1.  **Open the Switcher**: Press and hold `Alt + G` (Windows/Linux) or `Option + G` (macOS).
2.  **Cycle Through**: While holding `Alt` (or `Option`), tap `G` to move the selection highlight.
3.  **Confirm**: Release the `Alt` (or `Option`) key. The extension will automatically take you to the first tab in that group.

---

## 📦 Installation

### For Users (Manual Installation)
Since this is an open-source productivity tool, you can install it manually in seconds:

1.  **Download** the latest release ZIP from the [Releases](https://github.com/your-username/tabgroup-selector/releases) page.
2.  **Extract** the folder to a safe location on your computer.
3.  Open Chrome and go to `chrome://extensions/`.
4.  Enable **Developer Mode** (toggle in the top right).
5.  Click **Load unpacked** and select the `dist` (or build) folder you extracted.

---

## 👨‍💻 Development

This project is built using the `chrome-extension-boilerplate-react-vite`.

### Tech Stack
* **Framework**: React 18
* **Build Tool**: Vite
* **Styling**: Tailwind CSS
* **Language**: TypeScript

### Local Setup
1.  Clone the repository:
    ```bash
    git clone [https://github.com/amitos80/chrome-extension-tab-group-selector](https://github.com/amitos80/chrome-extension-tab-group-selector)
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Build the project:
    ```bash
    pnpm build
    ```
4.  Load the `dist` folder as an "Unpacked Extension" in Chrome.

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.

---
**Made for productivity enthusiasts.** If you like this project, give it a ⭐ on GitHub!
<img src="assets/headers/header.svg" alt="BinBox Wave Header" width="100%" />

<div align="center">
  <br />
  
  # 📦 BinBox 🚀

  **A dedicated Linux-style tiling workspace on Windows, built for modern developers and AI agents.**

  [![Platform](https://img.shields.io/badge/Platform-Windows%2011%20%7C%2010-38bdf8?style=for-the-badge&logo=windows11&logoColor=white&labelColor=0d1527)](#)
  [![License](https://img.shields.io/badge/License-MIT-c084fc?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=0d1527)](LICENSE)
  [![Author](https://img.shields.io/badge/Author-Shadow-818cf8?style=for-the-badge&logoColor=white&labelColor=0d1527)](#)

  <br />
  
</div>

## 💡 Why BinBox

**Coding with AI agents changes how we interact with our workspace.**

> When tools like `claude`, `codex`, or `aider` write code, modify specs, and run background jobs all at once, a standard terminal is no longer enough. On Windows, tracking these actions usually means endless Alt-Tabbing across editors, diff tools, and file explorers just to see what the agent changed.

<div align="center">
  <img src="assets/dividers/divider-mini.svg" width="340" />
</div>

**BinBox brings the power and fluid tiling of a Linux desktop directly to Windows, combined with native AI Agent & Code Editing superpowers.**

> Terminal sessions, live code editor, markdown previews, image inspectors, web overlays, and git diffs live together on one responsive canvas. The instant an agent updates a file, it renders side by side in real time, keeping you completely in your flow without overlapping window clutter.

<img src="assets/dividers/divider.svg" width="100%" />

## ⚡ Highlights

<table>
  <tr>
    <td width="50%">
      <h3>Flexible Tiling Canvas</h3>
      <p>Split panels horizontally or vertically, drag to rearrange, and resize freely. Keep your agent output, editor, and tools in a single unified view.</p>
    </td>
    <td width="50%">
      <h3>Built-in Code Editor & Live Preview</h3>
      <p>Edit files directly with line numbers, syntax indentation, and <code>Ctrl+S</code> saving, or inspect markdown, images, and git diffs in real time.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>Interactive AI Agent Assistant</h3>
      <p>Built-in AI Assistant panel supporting local Ollama or cloud LLMs. Generate code, save to files, and run commands in your terminal with 1 click.</p>
    </td>
    <td width="50%">
      <h3>Multiple Workspaces</h3>
      <p>Keep independent project layouts running in parallel. Switch between dedicated workspaces smoothly using keyboard shortcuts (<code>Alt+1..9</code>).</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>Fast Hardware-Accelerated Terminal</h3>
      <p>WebGL hardware-accelerated terminal with crisp text, OSC 133 semantic command blocks, exit codes, and OSC 7 automatic working directory tracking.</p>
    </td>
    <td width="50%">
      <h3>Embedded Explorer & Native Web</h3>
      <p>Browse project directories, inspect local ports, and view web previews directly alongside your terminal sessions.</p>
    </td>
  </tr>
</table>

<img src="assets/dividers/divider.svg" width="100%" />

## ⌨️ Essential Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>F1</kbd> | Open Command Palette |
| <kbd>Ctrl</kbd> + <kbd>T</kbd> / <kbd>Ctrl</kbd> + <kbd>W</kbd> | Open terminal / Close active panel |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> / <kbd>O</kbd> | Split panel to the right / below |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> | Duplicate active panel |
| <kbd>Ctrl</kbd> + <kbd>Tab</kbd> | Focus next tiled panel |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save changes in Code Editor |
| <kbd>Win</kbd> + <kbd>Arrow Keys</kbd> | Snap active panel |
| <kbd>Ctrl</kbd> + <kbd>1</kbd> / <kbd>Ctrl</kbd> + <kbd>3</kbd> | Switch to previous / next workspace |
| <kbd>Alt</kbd> + <kbd>1...9</kbd> | Jump to workspace 1 to 9 |
| <kbd>Ctrl</kbd> + <kbd>,</kbd> | Open Settings |
| <kbd>F11</kbd> | Toggle Fullscreen |

<details>
<summary><b>🛠️ Build from Source</b></summary>

<br />

Prerequisites: Node.js 20+, Rust, Visual Studio C++ Build Tools.

```bash
cd app
npm install
npm run tauri dev
```

To build a release package:

```bash
npm run tauri build
```

</details>

<br />

<div align="center">
  <img src="assets/dividers/divider.svg" width="100%" />
  <br /><br />
  MIT License · Developed and customized with passion by <b>Shadow</b>
</div>

<div align="center">
  <img src="assets/brand/binbox-studio-banner.png" alt="BinBox Studio" width="460" />
  <br />

  # BinBox Studio

  **A dedicated Linux-style tiling workspace on Windows, engineered for modern developers and autonomous coding agents.**

  [![Release](https://img.shields.io/github/v/release/Harilowji/BinBox?style=flat-square&label=Release&labelColor=18181b&color=27272a)](https://github.com/Harilowji/BinBox/releases/latest)
  [![Platform](https://img.shields.io/badge/Platform-Windows%2011%20%7C%2010-18181b?style=flat-square&labelColor=18181b&color=27272a&logo=windows11&logoColor=white)](https://github.com/Harilowji/BinBox/releases/latest)
  [![License](https://img.shields.io/badge/License-MIT-18181b?style=flat-square&labelColor=18181b&color=27272a)](LICENSE)
  [![Architecture](https://img.shields.io/badge/Tech-Tauri%20v2%20%7C%20Rust%20%7C%20React%2019-18181b?style=flat-square&labelColor=18181b&color=27272a)](https://github.com/Harilowji/BinBox)

  <br />

  <a href="#download--installation">
    <img src="https://img.shields.io/badge/Download_BinBox_Studio-18181b?style=for-the-badge&logo=windows11&logoColor=white&labelColor=09090b" height="36" alt="Download BinBox Studio" />
  </a>
  <a href="https://github.com/Harilowji/BinBox/releases">
    <img src="https://img.shields.io/badge/All_Releases-27272a?style=for-the-badge&logo=github&logoColor=white&labelColor=18181b" height="36" alt="All Releases" />
  </a>

  <br /><br />
</div>

<div align="center">
  <a href="assets/demo/tethys-demo.mp4">
    <img src="assets/demo/tethys-demo.webp" alt="BinBox Studio Workspace Demo" width="100%" />
  </a>
</div>

<br />

---

## Overview

Working with autonomous coding agents (`aider`, `claude-code`, `codex`, `cursor`) fundamentally changes how developers interact with their operating system. When background agents rapidly modify source trees, run test suites, and execute multi-stage builds, traditional window management on Windows breaks down. Developers end up constantly Alt-Tabbing across detached editors, terminal windows, diff tools, and file explorers.

**BinBox Studio brings the ergonomic precision and fluid tiling of a modern Linux desktop to Windows.**

Terminal sessions, code editors, markdown documents, media inspectors, git diffs, and web runtimes coexist on a single, hardware-accelerated canvas. As background processes output data or agents modify files, every change updates synchronously in place — eliminating visual clutter and keeping you locked in flow.

---

## Key Capabilities

<table>
  <tr>
    <td width="50%" valign="top">
      <h4>Dynamic Tiling Engine</h4>
      <p>Automatic spiral and dwindle layouts inspired by Hyprland. Panels split horizontally or vertically with fluid proportional resizing and sub-millisecond focus dispatch.</p>
    </td>
    <td width="50%" valign="top">
      <h4>Hardware-Accelerated Terminal</h4>
      <p>High-performance WebGL terminal powered by xterm.js and ConPTY. Supports OSC 133 semantic command execution blocks, exit codes, and OSC 7 directory tracking.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h4>Zero-Freeze Async Architecture</h4>
      <p>Completely non-blocking backend. Dedicated OS background threads handle ConPTY I/O, bounded backpressure flow control, and animation-frame batched IPC to eliminate application unresponsiveness.</p>
    </td>
    <td width="50%" valign="top">
      <h4>Dark Minimalist Aesthetic</h4>
      <p>Purpose-built monochrome design with deep black foundations (<code>#0a0a0a</code> &ndash; <code>#121212</code>), metallic precision borders, and high-contrast typography exceeding WCAG AAA standards (10.9:1).</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h4>Virtual Workspaces</h4>
      <p>Organize independent projects across dedicated virtual desktops. Switch instantly with single-key shortcuts (<code>Alt+1..9</code>) while persistent states stay alive in memory.</p>
    </td>
    <td width="50%" valign="top">
      <h4>Integrated Code & Web Inspection</h4>
      <p>Direct file editing with line numbering, live syntax indent guides, markdown previews, native WebView2 web previews, and embedded AI Agent panels.</p>
    </td>
  </tr>
</table>

---

## Download & Installation

BinBox Studio is distributed as a lightweight, native 64-bit desktop application for Windows 10 and Windows 11.

| Distribution | Type | Architecture | Asset |
| :--- | :---: | :---: | :--- |
| **BinBox Studio Setup (Recommended)** | NSIS Executable | x64 | [**`BinBox.Studio_0.2.0_x64-setup.exe`**](https://github.com/Harilowji/BinBox/releases/latest/download/BinBox.Studio_0.2.0_x64-setup.exe) |
| **Windows MSI Installer** | Windows Installer | x64 | [**`BinBox.Studio_0.2.0_x64_en-US.msi`**](https://github.com/Harilowji/BinBox/releases/latest/download/BinBox.Studio_0.2.0_x64_en-US.msi) |
| **Release Changelogs & Signatures** | GitHub Releases | x64 | [**Browse Releases**](https://github.com/Harilowji/BinBox/releases) |

### Quick Install via PowerShell

To download and launch the latest release directly from your terminal:

```powershell
Invoke-WebRequest -Uri "https://github.com/Harilowji/BinBox/releases/latest/download/BinBox.Studio_0.2.0_x64-setup.exe" -OutFile "$env:TEMP\BinBoxStudio-Setup.exe"; Start-Process "$env:TEMP\BinBoxStudio-Setup.exe"
```

### System Requirements

- **Operating System:** Windows 10 (Version 1809+) or Windows 11 (64-bit).
- **Runtime:** Microsoft Edge WebView2 Runtime (standard on modern Windows installations).
- **Hardware:** x86-64 processor, 4 GB RAM minimum.

---

## Keyboard Navigation

BinBox Studio is engineered for keyboard-first efficiency.

### Panel & Tiling Management

| Shortcut | Function |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>F1</kbd> | Open Command Palette |
| <kbd>Ctrl</kbd> + <kbd>T</kbd> | Open new terminal panel |
| <kbd>Ctrl</kbd> + <kbd>W</kbd> | Close active panel |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> | Split current panel horizontally (to the right) |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd> | Split current panel vertically (below) |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> | Duplicate active panel |
| <kbd>Ctrl</kbd> + <kbd>Tab</kbd> | Cycle focus across tiled panels |
| <kbd>Win</kbd> + <kbd>Arrow Keys</kbd> | Snap active panel |

### Workspaces & System

| Shortcut | Function |
| :--- | :--- |
| <kbd>Alt</kbd> + <kbd>1</kbd> .. <kbd>9</kbd> | Jump directly to Workspace 1 through 9 |
| <kbd>Ctrl</kbd> + <kbd>1</kbd> / <kbd>Ctrl</kbd> + <kbd>3</kbd> | Navigate to previous / next workspace |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save changes in Code Editor |
| <kbd>Ctrl</kbd> + <kbd>,</kbd> | Open Settings Modal |
| <kbd>F11</kbd> | Toggle Fullscreen |

---

## Building from Source

<details>
<summary><b>Compilation & Development Instructions</b></summary>

<br />

### Prerequisites

- **Node.js**: v20 or newer
- **Rust**: Latest stable toolchain (`rustup`)
- **C++ Build Tools**: Microsoft Visual Studio 2022 C++ Build Tools (`MSVC`)

### Setup & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/Harilowji/BinBox.git
   cd BinBox/app
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Run in local development mode:
   ```bash
   npm run tauri dev
   ```

4. Compile release binaries:
   ```bash
   npm run tauri build
   ```

Bundled installers and executables are placed in `app/src-tauri/target/release/bundle/`.

</details>

---

## License

BinBox Studio is open source software licensed under the [MIT License](LICENSE).

Developed and maintained by **Shadow ([Harilowji](https://github.com/Harilowji))**.

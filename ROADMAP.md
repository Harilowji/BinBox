# BinBox Studio — Strategic Roadmap & Future Architecture (2026–2027)

> **A High-Performance Tiling Workspace & Autonomous Agent Canvas for Modern Developers on Windows**

---

## 🧭 Executive Summary & Product Vision

**BinBox Studio** was created to bridge the critical gap between Unix-style ergonomic tiling window management (Hyprland, i3wm, Sway) and the modern Windows 11/10 ecosystem. Instead of imposing an Electron-heavy, resource-draining paradigm, BinBox Studio pairs **Native Rust 2021 Core**, **Tauri v2**, **React 19**, and hardware-accelerated **xterm.js WebGL** to deliver ultra-low latency, 0.0% idle CPU overhead, and deep Windows desktop integration.

As development workflows increasingly transition toward **Autonomous AI Coding Agents** (`aider`, `claude-code`, `antigravity-cli`, `codex`), the role of a terminal workspace shifts from a passive command runner to an **Interactive Agent Canvas**. This roadmap outlines the architectural evolution, current technical assessments, concrete improvement vectors, and release milestones from **v0.2.3** to **v1.0.0**.

---

## 📊 Current Architecture Review (v0.2.3 Status Quo)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BINBOX STUDIO FRONTEND (Tauri v2 / React 19)             │
│                                                                             │
│   ┌────────────────────────┐  ┌──────────────────────┐  ┌───────────────┐   │
│   │   Hero Glass Dashboard │  │  Tiling Canvas (BSP) │  │ 5-Tab Settings│   │
│   │   (Clock / Date / Cards│  │  (Zero DOM Re-mount) │  │  (Sameko HCT) │   │
│   └───────────┬────────────┘  └──────────┬───────────┘  └───────┬───────┘   │
│               │                          │                      │           │
│   ┌───────────▼──────────────────────────▼──────────────────────▼───────┐   │
│   │      Smart Dock Anti-Occlusion & Background Provider (WE Sync)      │   │
│   │      (Ghost Mode, 6 Curated Presets, Translucent Glass Layer)       │   │
│   └──────────────────────────────────────┬──────────────────────────────┘   │
├──────────────────────────────────────────┼──────────────────────────────────┤
│                                          ▼                                  │
│                     TAURI ASYNC IPC CHANNELS (Non-blocking)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                    RUST BACKEND CORE (Windows x64 Native)                   │
│                                                                             │
│   ┌────────────────────────┐  ┌──────────────────────┐  ┌───────────────┐   │
│   │ Tokio ConPTY Spawner   │  │ Sliding Window (B64) │  │ Dedicated     │   │
│   │ (Non-blocking worker)  │  │ Backpressure Buffer  │  │ Stdin Writer  │   │
│   └───────────┬────────────┘  └──────────┬───────────┘  └───────┬───────┘   │
│               │                          │                      │           │
│   ┌───────────▼──────────────────────────▼──────────────────────▼───────┐   │
│   │ Zero-Polling Wallpaper Engine Parser (.pkg / .tex 4K texture decode)│   │
│   │ Material 3 HCT Color Harmonization (Celebi Quantization Engine)     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Measured Benchmark Highlights:
- **Installer Size:** `~3.6 MB` (NSIS) / `~5.1 MB` (MSI) — vs 150MB+ on Electron.
- **Idle Memory Footprint:** `40 MB – 65 MB` active; automatically yields to `~25 MB` on blur via `COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW`.
- **Idle CPU:** `0.0% – 0.1%` (zero busy-loops or file polling; relies purely on OS `ReadDirectoryChangesW` notifications).
- **PTY Throughput:** Guaranteed 60–120 FPS render throughput without frame dropping under dense build logs (`cargo build`, `npm install`).

---

## 🔍 In-Depth Technical Assessment & Opportunities for Improvement

### 1. AI Agent Integration (Current Bottleneck ⚠️)
* **Status:** `AiPanel.tsx` currently acts as a standalone local LLM chat panel (HTTP endpoint to Ollama / OpenAI API) with manual copy-to-clipboard or paste-to-terminal buttons.
* **Limitation:** It lacks bi-directional awareness of running terminal sessions. It cannot inspect terminal command history, observe compilation errors automatically, or interact via structured agent protocols.
* **Improvement Opportunity:** Transform BinBox Studio into an **Agentic Workspace Canvas** by implementing the **Model Context Protocol (MCP)**, allowing agents to query workspace status, run supervised commands, and inspect diffs directly.

### 2. Workspace & Tiling Ergonomics
* **Status:** Binary Space Partitioning (BSP) supports Spiral, Dwindle, and Manual splitting. Flat DOM hosting ensures terminal PTYs survive split and resize without tearing down.
* **Limitation:** Splitting beyond 4 panels on smaller screens restricts usable terminal area. There is currently no way to group multiple sessions into a **Tabbed Tile** or stack panels vertically without splitting canvas area.
* **Improvement Opportunity:** Introduce **Tabbed Containers** inside individual tiles (similar to i3/sway tabbed mode) and a **Floating Scratchpad** (quick-access overlay).

### 3. File Explorer & Quick Navigation
* **Status:** `ExplorerPanel` displays directory trees and `PreviewPanel` provides syntax-highlighted code and markdown previews.
* **Limitation:** Read-focused; file operations (create, rename, delete) are limited. No fuzzy quick-switcher (`Ctrl+P`).
* **Improvement Opportunity:** Implement an in-memory cached fuzzy file finder (`Ctrl+P`) and add lightweight multi-file editing actions with LSP integration.

### 4. Binary Packaging & Windows Code Signing
* **Status:** Resolved Defender heuristic ML flags via folder exclusion. Binary package currently generated as `name = "app"`.
* **Limitation:** Unsigned binaries can prompt Windows SmartScreen for first-time downloads on other machines.
* **Improvement Opportunity:** Standardize crate name to `binbox-studio`, automate self-signed certificate generation and Trusted Publisher signing in GitHub Actions CI release workflow.

---

## 🚀 Release Roadmap: Milestone Breakdown

```
2026 Q3 (Released)           2026 Q4 (Target)             2027 Q1 (Target)             2027 Q2 (Target)
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  v0.2.0 – v0.2.3     │───▶│  v0.3.0              │───▶│  v0.4.0              │───▶│  v1.0.0              │
│  Industrial UI,      │    │  Agentic Workspace,  │    │  Tabbed Tiling,      │    │  Enterprise Release, │
│  Hero Glass Dash,    │    │  MCP Protocol,       │    │  Multi-Monitor,      │    │  CI Auto-Signing,    │
│  WE Sync, Sameko     │    │  Fuzzy File Picker   │    │  Floating Scratchpad │    │  Plugin Extensions   │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘    └──────────────────────┘
```

---

### 📦 Milestone 1: BinBox Studio v0.3.0 — "The Agentic Workspace"
*Target Timeline: Q4 2026*

* **MCP (Model Context Protocol) Client & Server:**
  - Expose BinBox Studio workspace state as an MCP Server over local stdio / WebSocket.
  - Autonomous agents (`claude-code`, `antigravity`, `aider`) can directly inspect open files, query directory structures, and inspect active terminal output with user consent.
* **Interactive Agent Terminal Bridge:**
  - Terminal Command Streaming: Agent can send command proposals that render with visual approval buttons ("Run", "Edit", "Deny") inside the terminal pane.
  - Auto Error Detection: When a shell command exits with code `!= 0`, an unobtrusive Origami chip offers: *"Ask Agent to Debug Error"*.
* **Fuzzy Quick Open (`Ctrl+P`):**
  - Ultra-fast file indexing with ignore-list filtering (`.git`, `node_modules`, `target`, `dist`).
  - Jump directly to file preview or open terminal at file's directory.
* **Crate & Binary Rebrand:**
  - Rename native crate from `app` to `binbox-studio` (`binbox-studio.exe`).

---

### 🪟 Milestone 2: BinBox Studio v0.4.0 — "Hyper-Tiling & Multi-Display"
*Target Timeline: Q1 2027*

* **Tabbed & Stacked Tile Containers:**
  - Allow any tile in the BSP tree to hold multiple tabs (Terminal 1, Terminal 2, Web Preview) sharing the same bounding box.
  - Switch tabs with `Alt+[1..9]` or mouse wheel over the tile header.
* **Floating Scratchpad (`Alt+Space` / `Win+Backquote`):**
  - Instant dropdown terminal or quick prompt overlay that slides from top or center.
  - Retains state across dismissals for quick git commits, notes, or AI questions.
* **Multi-Monitor Canvas Orchestration:**
  - Detach tiles into independent native windows for secondary monitors.
  - Multi-monitor Wallpaper Engine synchronization: match color palettes to the active wallpaper on the specific monitor the window resides on.
* **Session Snapshot Persistence v2:**
  - Full terminal scrollback restoration and active command resume hints.

---

### 🛡️ Milestone 3: BinBox Studio v1.0.0 — "The Enterprise Windows Native Milestone"
*Target Timeline: Q2 2027*

* **Automated CI Code Signing Pipeline:**
  - Automated Authenticode signing with self-signed root cert installer or GitHub hardware-backed EV cert actions.
  - Zero Windows Defender / SmartScreen warnings on any Windows installation.
* **Native Extension System (Lua / WASM Plugins):**
  - Expose tiling lifecycle hooks, custom status bar widgets, and custom theme presets through a lightweight WASM/Lua runtime.
* **Winget & Chocolatey Distribution:**
  - Official submission to Microsoft Windows Package Manager: `winget install BinBox.Studio`.
* **High-DPI & Multi-Refresh Rate Optimization:**
  - Mixed-DPI handling across 4K 144Hz and 1080p 60Hz displays without text blur.

---

## 🛠️ Contribution & Development Philosophy

BinBox Studio is governed by three inviolable architectural principles:

1. **Zero Busy Loops, Zero Memory Bloat:**
   Background tasks must remain event-driven (`notify`, Windows OS hooks). No continuous polling timers.
2. **Flat DOM Invariant:**
   Panel elements (`TerminalPanel`, `WebPanel`) must never change DOM parent hierarchy during layout modifications to prevent PTY teardown.
3. **High-Contrast Industrial Ergonomics:**
   Chamfered 45° cuts (`.chamfer-tr`, `.chamfer-all`), 0px tiling boundaries, and WCAG AAA compliant text contrast under all Material 3 HCT color calibrations.

---

*Authored by Shadow ([@Harilowji](https://github.com/Harilowji)) &bull; Open Source under the MIT License.*

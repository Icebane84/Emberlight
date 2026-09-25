---
name: phoenix-workbench
description: Governs the Phoenix Sovereign Web IDE & Governance Workbench, 3-Plane Virtual Lexical Topology (VLT-003), 36 #region Jump Table ([CSS-01]..[SEC-15]), local Ollama AI copilot bridge, Monolith Exporter, and 4-tier Crucible Sandbox.
globs: "phoenix/**/*.js, phoenix/**/*.html, tools/**/*.js"
alwaysApply: false
version: 1.1.0
---

# AGENT OPERATIONAL SPECIFICATION: Phoenix Sovereign Web IDE & Governance Workbench

**Document Identifier:** SKILL-PHOENIX-WORKBENCH-001
**Protocol Version:** VLT-003 / PGE-DSL-1 / PGE-RECEIPT-1 / SDCP-001 / MPFS-001
**Authority:** Plane 2 Deterministic Governor & Workstation Substrate

---

## 1. 3-Plane Virtual Lexical Topology (VLT-003)

The Phoenix Workbench architecture enforces strict separation across 3 operational planes to prevent memory leaks, closure pollution, and UI freezing:

| Plane       | Scope                          | Responsibilities                                                                  | Constraints                                                                       |
| :---------- | :----------------------------- | :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **Plane 0** | **Presentation & Viewport**    | CSS Design Tokens, DOM Layout, 2D/3D Canvas stages, Audio DAC drivers             | Never accesses private simulation variables directly. Reads detached state DTOs.  |
| **Plane 1** | **Worker Kernel & Engine**     | `PhoenixSovereignEngine`, VFS, AST Symbol Indexer, Diff Preview, Game Studio 3D   | Operates headless or in Web Workers. Zero DOM dependencies.                       |
| **Plane 2** | **Governor & Sentinel Matrix** | Capability attenuation, Invariant Registry, 21-Pass Sentinel runner, OPFS Journal | Deterministic authority. All mutations require cryptographically signed receipts. |

---

## 2. The 36 `#region` Jump Table (Fast Navigation)

The Phoenix Workbench substrate is partitioned across [`phoenix/workbench.css`](file:///c:/Users/Chris/Emberlight/phoenix/workbench.css) and [`phoenix/core_governor.html`](file:///c:/Users/Chris/Emberlight/phoenix/core_governor.html) into 36 explicit `#region` blocks with regex jump anchors for instant navigation (`Ctrl+F`):

### CSS Styling Regions (`[CSS-01]` through `[CSS-12]`) in `workbench.css`

- `[CSS-01]` — Design Tokens & CSS Variable Docstrings
- `[CSS-02]` — Two-Column Master Layout Grid & Container Rules
- `[CSS-03]` — Header Bar & Workspace Mode Switcher
- `[CSS-04]` — Left Sidebar, Tree Accordions & Symbol Outline
- `[CSS-05]` — Center Editor, Tabs & Syntax Backdrop
- `[CSS-06]` — Problems & Diagnostics Drawer
- `[CSS-07]` — Consolidated Action Toolbar & Tools Dropdown
- `[CSS-08]` — Inline AI Palette & Command Spotlight Modals
- `[CSS-09]` — Find & Replace Studio HUD
- `[CSS-10]` — Visual Staging Drawer & Audio SFX Studio
- `[CSS-11]` — Right Telemetry Sidebar, Sentinel Matrix & OPFS Journal
- `[CSS-12]` — Game Dev Workstation Viewport & Modal Dialogs

### DOM Structural Regions (`[DOM-01]` through `[DOM-09]`) in `core_governor.html`

- `[DOM-01]` — Master Header & Workspace Controls
- `[DOM-02]` — Left Explorer & Symbol Outline Aside
- `[DOM-03]` — Editor Main Container & Tabs Strip
- `[DOM-04]` — Code Syntax Backdrop, Textarea & Runtime Viewport
- `[DOM-05]` — Problems & Diagnostics Drawer
- `[DOM-06]` — Consolidated Action Toolbar & AI Copilot
- `[DOM-07]` — PGE-DSL-1 Staging Drawer & SFX Audio Studio
- `[DOM-08]` — Game Dev Workstation Workspace
- `[DOM-09]` — Right Telemetry Sidebar, OPFS Journal & Modals

### JavaScript Subsystem Sections (`[SEC-00]` through `[SEC-15]`) in `core_governor.html`

- `[SEC-00]` — Ambient Contract Registry & DTOs
- `[SEC-01]` — VFS State & Canonical Module Catalog
- `[SEC-02]` — Governor & Sentinel Specification Registry
- `[SEC-03]` — Ollama & WebLLM Local AI Copilot Bridge
- `[SEC-04]` — Accordion File Tree & AST Symbol Outline
- `[SEC-05]` — Syntax Highlighter & Tokenizer Engine
- `[SEC-06]` — Tri-Language Linter & Diagnostics Engine
- `[SEC-07]` — Zero-Dependency Code Formatter & Quick Fixes
- `[SEC-08]` — AI Crucible & Sandbox Repair Engine
- `[SEC-09]` — Workstation IntelliSense & Fuzzy Search
- `[SEC-10]` — Find, Replace & Regex Studio HUD
- `[SEC-11]` — Spotlight Command Palette Modal
- `[SEC-12]` — Visual Diff Preview & Staging Studio
- `[SEC-13]` — Procedural Audio Synthesizer & SFX Studio Delegate
- `[SEC-14]` — Live Game Runtime Studio & Game Dev Workstation Delegate
- `[SEC-15]` — Master Global Shortcuts, Context Menu & Bootstrap

---

## 3. Local AI Copilot Bridge & Inference Protocols

The workbench integrates with local AI models (`qwen2.5-coder:7b` via Ollama at `http://localhost:11434` or LM Studio at `http://localhost:1234/v1`):

1. **Self-Healing Proposal Loop:**
   - Inference is wrapped in `generateProposalWithSelfHealing(prompt, options, maxTrials = 3)`.
   - Any parsing error, forbidden placeholder token (`// ...`), or crucible failure feeds the compiler diagnostic back into the model for automatic revision.
2. **Strict Invariant Array Rules:**
   - The model must output `expectedInvariants: []` and `testsRequested: []` as empty arrays unless targeting an authoritative registered test identifier in the Governor spec.
3. **Verbatim Search Anchors:**
   - The `search` string must match exact real code in the file—no invented comments.

---

## 4. 4-Tier Crucible Sandbox Verification

Before any AI proposal is applied to the active VFS file, it must pass the 4-tier sandbox verification:

1. **Tier 1 (Syntax AST Gate):** Ensures the patched code parses with zero syntax errors via `new Function(...)`.
2. **Tier 2 (Cognitive Complexity Gate):** Measures the refactored function's cognitive complexity to ensure it is $\le 15$.
3. **Tier 3 (Anti-Pattern Scanner):** Scans for forbidden placeholders (`// ...`, `/* ... */`, `eval`, unseeded `Math.random`).
4. **Tier 4 (Behavioral Invariance Gate):** Executes pre-flight test suites and rolls back atomically if assertions fail.

---

## 5. Monolith Exporter (`phoenix_monolith_exporter.js`)

The workbench can export itself or any project into a single, self-contained, zero-dependency HTML file:

- Ingests all active VFS files into an embedded JSON manifest.
- Embeds the WASM bytecode / WebGL shaders as Base64 strings.
- Guarantees execution under `file:///` protocol with zero external CDN dependencies.

---

## 6. Native File System Access (FSA API) Direct Disk Sync & Save Pipeline

The workbench synchronizes directly with the local physical workspace via the File System Access API:

1. **Handle Caching (`_fileHandleMap`):**
   - Directory scans populate `_fileHandleMap = new Map()` for direct $O(1)$ handle access during file saves.
2. **Recursive Path Creation:**
   - `_writeDiskFile(filePath, content)` traverses and creates missing subdirectories via `dirHandle.getDirectoryHandle(part, { create: true })`.
3. **Sentinel-Gated Disk Flush:**
   - Both proposal commits (`_submitActiveProposal`) and direct `Ctrl+S` saves (`_saveActiveDocument`) evaluate through the 4-gate Sentinel pipeline before writing to physical disk, preventing corrupted or incomplete code from touching the workspace.
4. **On-Demand Disk Refresh:**
   - The **🔄 SYNC DISK** toolbar button rescans the physical directory handle and updates the in-memory VFS and symbol outline without requiring a full remount.

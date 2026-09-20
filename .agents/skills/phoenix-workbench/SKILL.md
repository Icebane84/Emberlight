---
name: phoenix-workbench
description: Governs the Phoenix Sovereign Web IDE & Governance Workbench, 3-Plane Virtual Lexical Topology (VLT-003), 36 #region Jump Table ([CSS-01]..[SEC-15]), local Ollama AI copilot bridge, Monolith Exporter, and 4-tier Crucible Sandbox.
globs: "phoenix/**/*.js, phoenix/**/*.html, tools/**/*.js"
alwaysApply: false
version: 1.0.0
---

# AGENT OPERATIONAL SPECIFICATION: Phoenix Sovereign Web IDE & Governance Workbench

**Document Identifier:** SKILL-PHOENIX-WORKBENCH-001
**Protocol Version:** VLT-003 / PGE-DSL-1 / PGE-RECEIPT-1 / SDCP-001 / MPFS-001
**Authority:** Plane 2 Deterministic Governor & Workstation Substrate

---

## 1. 3-Plane Virtual Lexical Topology (VLT-003)

The Phoenix Workbench architecture enforces strict separation across 3 operational planes to prevent memory leaks, closure pollution, and UI freezing:

| Plane | Scope | Responsibilities | Constraints |
| :--- | :--- | :--- | :--- |
| **Plane 0** | **Presentation & Viewport** | CSS Design Tokens, DOM Layout, 2D/3D Canvas stages, Audio DAC drivers | Never accesses private simulation variables directly. Reads detached state DTOs. |
| **Plane 1** | **Worker Kernel & Engine** | `PhoenixSovereignEngine`, VFS, AST Symbol Indexer, Diff Preview, Game Studio 3D | Operates headless or in Web Workers. Zero DOM dependencies. |
| **Plane 2** | **Governor & Sentinel Matrix** | Capability attenuation, Invariant Registry, 21-Pass Sentinel runner, OPFS Journal | Deterministic authority. All mutations require cryptographically signed receipts. |

---

## 2. The 36 `#region` Jump Table (Fast Navigation)

The core workbench monolith [`phoenix/core_governor.html`](file:///c:/Users/Chris/Emberlight/phoenix/core_governor.html) is partitioned into 36 explicit `#region` blocks with regex jump anchors for instant navigation (`Ctrl+F`):

### CSS Styling Regions (`[CSS-01]` through `[CSS-12]`)

- `[CSS-01]` — Root Variables, Obsidian Slate Palette & Typography
- `[CSS-02]` — Two-Column Master Layout Grid & Container Rules
- `[CSS-03]` — Workspace Mode Header & Telemetry Status Badges
- `[CSS-04]` — Project Modules Accordion Sidebar & AST Symbol Tree
- `[CSS-05]` — Dual-Scrollbar Monaco/Custom Code Editor Viewport
- `[CSS-06]` — Bottom Diagnostics Drawer, Filter Pills & Quick Fixes
- `[CSS-07]` — AI Proposal Crucible, Side-by-Side Diff & Stage View
- `[CSS-08]` — Spotlight Command Palette & Fuzzy Search Overlay
- `[CSS-09]` — Find & Replace Floating HUD & Selection Highlight
- `[CSS-10]` — Retro Procedural Audio Synthesizer Controls
- `[CSS-11]` — Slide-Over Sentinel Matrix Drawer & OPFS Ledger Journal
- `[CSS-12]` — Dedicated Game Dev Studio Viewport & Tilemap Editor

### DOM Structural Regions (`[DOM-01]` through `[DOM-09]`)

- `[DOM-01]` — Master Header, Mode Toggle & Telemetry Pill
- `[DOM-02]` — Project Sidebar & AST Symbol Tree Pane
- `[DOM-03]` — Main Editor Tabs & Code Container
- `[DOM-04]` — Welcome Hub & Zero-File Initial State
- `[DOM-05]` — Bottom Diagnostics Drawer
- `[DOM-06]` — AI Proposal & Diff Preview Modal
- `[DOM-07]` — Command Palette Modal
- `[DOM-08]` — Find & Replace Floating HUD
- `[DOM-09]` — Slide-Over Sentinel Matrix & OPFS Journal Drawer

### JavaScript Subsystem Sections (`[SEC-00]` through `[SEC-15]`)

- `[SEC-00]` — Ambient Types & DTO Definitions
- `[SEC-01]` — Virtual File System (VFS) & Storage Persistence
- `[SEC-02]` — Deterministic Governor Lifecycle & Capability Matrix
- `[SEC-03]` — Ollama (`qwen2.5-coder`) & WebLLM Local AI Copilot Bridge
- `[SEC-04]` — Accordion File Tree & AST Symbol Outline Indexer
- `[SEC-05]` — Syntax Tokenizer & Syntax Highlighter
- `[SEC-06]` — Tri-Language Linter (JS / CSS / JSON) & Complexity Scorer
- `[SEC-07]` — Code Formatter, Quick Fixes & Context Menu Actions
- `[SEC-08]` — AI Crucible Sandbox (4-Tier Verification Gate)
- `[SEC-09]` — IntelliSense Auto-Complete & Fuzzy Search Engine
- `[SEC-10]` — Find & Replace HUD Engine
- `[SEC-11]` — Spotlight Command Palette Engine
- `[SEC-12]` — Chunk Diff Engine & Proposal Staging Studio
- `[SEC-13]` — Procedural Audio Synthesizer (DAC Generator)
- `[SEC-14]` — Game Dev Workstation Engine (2D/3D Canvas Substrate)
- `[SEC-15]` — Hotkeys, Global Events & Master Bootloader

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

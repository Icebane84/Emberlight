# ARCHITECTURAL SPECIFICATION: Phoenix Sovereign Web IDE & Governance Substrate Engine

**Document Identifier:** ARCH-SPEC-PHOENIX-SOVEREIGN-ENGINE-001
**Version:** 7.0.0-ULTIMATE-FUSION
**Timestamp:** 2026-09-18T14:10:00-04:00
**Governing Standards:** VSRP-001 / MPFS-001 / SDCP-001 / PMIP-001 / PERSIST-001 / PGE-DSL-1 / PGE-RECEIPT-1
**Test Battery Verification:** `testing/test_phoenix.js` (55/55 Checks PASS) | `testing/run_all_tests.js` (3/3 Suites PASS)

---

## 1. Executive Summary & Zero-Dollar Sovereign Philosophy

`ARCH-SPEC-PHOENIX-SOVEREIGN-ENGINE-001` formalizes the architecture of the **Phoenix Sovereign Engine & Governance Substrate**, enabling an air-gapped, zero-cost, in-browser AI-assisted development workstation.

The architecture enforces absolute **Zero Ambient Authority** and **Zero External Cloud Dependencies** (VSRP-001 / Faraday Isolation):

1. **Zero NPM / Zero Bundlers:** 100% vanilla ES2022+ web standards operating directly over `file://`, standalone HTML monoliths, or standard HTTP origins.
2. **Deterministic Governance Gates:** Every code modification proposed by human engineers or local AI models (via WebLLM or local Ollama) must pass a 4-tier verification pipeline before committing to the virtual or project file system.
3. **Cryptographic Receipt Ledger:** Every attempted transaction emits an immutable, FNV-1a hashed `PGE-RECEIPT-1` record logged to memory and append-only OPFS (`receipt-journal.ndjson`).
4. **Token-Efficient Repair Loop:** Behavioral and structural rejections trigger an automatic repair cycle with AST-isolated fault slicing rather than full-file context dumps.
5. **Watchdog Execution Shield:** Protects the browser UI thread against non-terminating loops and blocking operations during evaluation.
6. **Headless Framebuffer Checksums:** In-memory pixel validation for graphical rendering verification without external image assets.

---

## 2. 4-Gate Transaction Pipeline Topology

```plain text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                PHOENIX GOVERNOR PIPELINE                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [Human / Local AI] ───> PGE-DSL-1 Proposal                                           │
│                                 │                                                      │
│                                 ▼                                                      │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ GATE 1: STRUCTURAL_GATE (Layer 1 AST & Syntax Linter)                          │   │
│   │ - Schema validation (schemaVersion == "PGE-DSL-1")                             │   │
│   │ - Path safety check (No ".." or leading "/" traversal)                         │   │
│   │ - Placeholder token scan (Rejects "// ...", "/* ... */", "TODO(impl)")         │   │
│   └──────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                          │ [PASS]                                      │
│                                          ▼                                             │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ GATE 2: CAPABILITY_GATE (Layer 0 SDCP-001 Attenuation)                         │   │
│   │ - Subject attenuation & scope verification                                     │   │
│   │ - Operation permissions checked against Target Specification Registry          │   │
│   │ - Monotonic tick expiry enforcement (Default 16 ticks)                         │   │
│   └──────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                          │ [PASS]                                      │
│                                          ▼                                             │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ GATE 3: BEHAVIOR_GATE (Layer 2 Invariants & Test Battery)                      │   │
│   │ - Spec Invariants verification (Zero side-effects)                             │   │
│   │ - Unit assertion battery evaluation under Watchdog Timeout Shield               │   │
│   │ - Atomic Rollback if any invariant or test fails                               │   │
│   └──────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                          │ [PASS]                                      │
│                                          ▼                                             │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ GATE 4: EXECUTION & COMMIT (Layer 0 / Layer 3 Storage & Ledger)                │   │
│   │ - Atomic in-memory VFS update                                                  │   │
│   │ - FSA direct project folder write (if directory mounted)                       │   │
│   │ - Deterministic FNV-1a PGE-RECEIPT-1 appended to ledger & OPFS journal         │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Protocols & Canonical Specifications

| Protocol Standard | Classification | Purpose |
| :--- | :--- | :--- |
| **VSRP-001** | Architecture | Universal 9-method tenant lifecycle (`configure`, `init`, `reset`, `update`, `render`, `getState`, `getDiagnostics`, `getModuleInfo`, `destroy`) |
| **MPFS-001** | File Topology | Modular Public/Private file structure; zero cross-subsystem leakage |
| **SDCP-001** | Security | Sealed Domain Capability Protocol; zero ambient authority |
| **PMIP-001** | Messaging | Phoenix Message Interop Protocol; immutable event envelopes |
| **PGE-DSL-1** | AST Schema | Domain-Specific Language for atomic search-and-replace code patches |
| **PGE-RECEIPT-1** | Auditability | Cryptographic execution receipt standard |

---

## 4. Advanced Substrate Mechanics

### 4.1. AST Fault Localization & Token Slicing (`extractFaultSlice`)

When a proposal is rejected at `BEHAVIOR_GATE`, feeding thousands of lines of call stacks back into a local 7B LLM causes attention degradation. `extractFaultSlice(source, change, failure)` isolates only the enclosing function/region scope and the exact assertion mismatch, reducing repair prompts by 90% ($<300$ tokens).

### 4.2. Watchdog Timeout Execution Shield (`executeWithTimeout`)

Dynamic tests and user evaluation scripts are wrapped in an asynchronous watchdog promise race (`timeoutMs = 2000`). If generated code contains non-terminating loops (`while(true)`), the governor intercepts the execution, raises a timeout fault, and preserves UI thread responsiveness.

### 4.3. In-Memory Headless Framebuffer Checksum Engine (`computeFramebufferHash` / `validateFramebufferSignature`)

For canvas visual validation (paper-doll synthesis, battler sprites, tactical radar, and battle room geometries), the engine renders to an `OffscreenCanvas` and computes a 32-bit FNV-1a hash over `ImageData.data`. Regressions in pixel geometry or alpha blending are detected instantaneously without network requests or external asset stores.

### 4.4. Procedural Web Audio Synthesizer & SFX Studio (`PhoenixAudioSynthesizer`)

Eliminates binary `.mp3`/`.wav` asset bloat (0KB external sound assets). Synthesizes 8 canonical retro sound effects (`LASER`, `EXPLOSION`, `JUMP`, `HIT`, `COIN`, `POWERUP`, `FOOTSTEP`, `DEFLECT`) via Web Audio API frequency sweeps, ADSR gain envelopes, and procedural noise buffers. Emits dual-format JavaScript code (standalone micro-functions or `EmberlightEventBus` subscription handlers) directly into project files.

### 4.5. In-Memory IntelliSense & Cross-Module Symbol Graph (`PhoenixSymbolIndexer`)

Maintains a live, multi-file symbol index across all registered VFS files and canonical modules without heavyweight Language Server Protocol (LSP) processes. Scans functions, classes, arrow functions, constants, `[SEC-XX]` regions, and preceding JSDoc type contracts. Powers instant `F12` cross-module definition jumping, `Ctrl+Space` autocomplete popups, and hover signature documentation cards with zero memory bloat.

### 4.6. Sovereign Spotlight Command Palette & Subsequence Search (`PhoenixFuzzySearch`)

Provides a universal spotlight overlay (`Ctrl+P` / `Ctrl+Shift+P`) with deterministic, zero-dependency weighted fuzzy ranking. Supports prefix-driven multi-mode routing:

- `>`: IDE Commands & Governor Triggers (Audit, Format, SFX Studio, AI, Export, Runtime).
- `@`: Document Symbol Outline navigation in active file.
- `#`: Workspace-wide Symbol Search across all indexed VFS files.
- `:`: Direct Line Jump (`:145`).
- Bare text: Fuzzy File Open across the Virtual File System.

### 4.7. Integrated Find, Replace & Regex Studio (`PhoenixSearchEngine`)

Provides an in-editor floating search/replace HUD (`Ctrl+F` / `Ctrl+H`) with real-time match indexing, line/column coordinate resolution, match count badge, next/prev navigation (`Enter`/`Shift+Enter`), Case-Sensitive (`Aa`), Whole-Word (`\b`), and Regex (`.*`) toggles. Enables atomic document-wide `Replace All` operations synchronized with VFS history.

### 4.8. Antigravity-Style Visual Inline Diff Review (`PhoenixChunkDiffEngine`)

Computes unified diff hunks with configurable context boundaries, deletions, and additions. Renders isolated chunk cards equipped with 1-click `[✔ ACCEPT HUNK]` and `[✖ REJECT HUNK]` action controls, permitting granular partial acceptance or rollback of individual diff chunks before submitting proposals to the Governor.

### 4.9. Embedded Live Game Runtime Studio (`PhoenixRuntimeSandbox`)

Constructs an isolated, sandboxed runtime environment (`Ctrl+B` / `[🎮 RUNTIME]` tab) packaging active VFS files into an executable HTML blob with inlined scripts and telemetry hooks. Features an asynchronous tick controller supporting `Play`, `Pause`, deterministic `Step 1 Tick` frame stepping, live FPS telemetry, and viewport resolution scaling (Retro 640x480, SVGA 800x600, HD 1280x720).

### 4.10. Hardware-Accelerated WebGL 2D Quad Batcher (`PhoenixWebGLBatcher`)

Eliminates overhead by compiling inlined GLSL ES 3.0 vertex and fragment shaders directly against the browser's native `WebGL2RenderingContext`. Features:

- Interleaved dynamic `Float32Array` VBO layout packing position $(X, Y)$, UV coordinates $(U, V)$, and RGBA tints into a single draw buffer.
- Ability to submit 10,000+ sprites, particle quads, or UI elements in a single `gl.drawArrays(gl.TRIANGLES)` call per frame.
- High-performance GPU particle emitter supporting velocity damping, lifespan dissipation, and color gradient interpolation.
- Fullscreen post-processing shader pipeline (CRT scanlines, chromatic aberration, vignette, and bloom glow).

### 4.11. High-Speed 2D Viewport Matrix & Tilemap Layer Engine (`PhoenixCanvas2DLayerEngine`)

Provides a zero-context-loss 2D canvas pipeline featuring:

- Spatial Viewport Camera with smooth target lerp follow, zoom scaling ($0.25\times - 4\times$), rotation, and trauma-based screen shake matrix transforms.
- Frustum-Culled Multi-Layer Tilemap Renderer: maps screen coordinates back to 2D grid cells via inverse affine projection (`screenToWorld`), rendering only tiles strictly inside the visible viewport bounding box.
- Layered Parallax Background Engine scrolling at proportional speed ratios relative to camera coordinates.

### 4.12. Retro Pseudo-3D DDA Raycaster & Mode-7 Engine (`PhoenixPseudo3DRaycaster`)

Renders high-speed pseudo-3D game worlds out of 2D ASCII and numeric matrices with zero 3D polygon asset overhead:

- **DDA Grid Raycasting (Wolfenstein 3D style):** Traces 320 rays across a 2D map grid to calculate perpendicular wall distances (eliminating fisheye distortion), directional wall shading, and distance fog.
- **Mode-7 Perspective Plane Transform:** Renders pseudo-3D affine ground planes from flat 2D tilemaps.
- **3D Billboard Entity Projection:** Projects 2D sprites into 3D camera space, sorts back-to-front by depth ($1/Z$), and renders scaled billboard entities.

### 4.13. Dedicated Full-Screen Game Dev Workstation Studio

Provides an instant 1-click and keyboard-driven (`Ctrl+G` / `Alt+W`) workspace mode toggle that transforms the interface between:

- **`[💻 PHOENIX IDE & AI STUDIO]`:** The code editing, diff review, monolith export, and AI proposal governance suite.
- **`[🎮 GAME DEV WORKSTATION]`:** A dedicated game creation workstation featuring Scene Entity Hierarchy, Live Viewport Canvas with interactive Map Brush painter, Engine Selector (`WebGL 2D`, `Canvas 2D`, `Pseudo-3D Raycaster`), and Audio/SFX Trigger Dock.

---

## 5. Master Verification Battery

The substrate is validated through `testing/test_phoenix.js` across 12 core sections:

- `[SEC-01]` API Surface & Frozen Protocol Constants
- `[SEC-02]` Layer 1 Structural Linter & Placeholder Rejection
- `[SEC-03]` Layer 2 Governor Lifecycle & Capability-Gated Pipeline
- `[SEC-04]` Layer 3 Cryptographic Receipt Ledger & Deterministic Hashes
- `[SEC-05]` PhoenixWebLLMWorkerBridge & Markdown Proposal Parser
- `[SEC-06]` PhoenixMonolithExporter API Surface & Format Compliance
- `[SEC-07]` Monolith Standalone HTML Artifact Validation
- `[SEC-08]` Deterministic Key-Order Serialization & FNV-1a Hashing
- `[SEC-09]` Watchdog Timeout Guard, Framebuffer Hashes & AST Fault Slicing
- `[SEC-10]` Procedural Audio Synthesizer Presets, Noise Math & Code Generation
- `[SEC-11]` Workstation Substrate: IntelliSense, Fuzzy Search, Search Engine, Chunk Diff & Runtime Sandbox
- `[SEC-12]` Tri-Engine Graphics Substrate: WebGL 2D Batcher, Canvas 2D Layer Engine & Pseudo-3D Raycaster

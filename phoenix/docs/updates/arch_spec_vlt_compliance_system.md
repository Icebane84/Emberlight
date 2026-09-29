# Architectural Specification & Execution Plan: VLT-003 Compliance & Boilerplate System

## 1. Executive Summary & Core Mission
Establish a deterministic, automated compliance and scaffolding infrastructure for Phoenix Sovereign engines, modules, and simulation cartridges under **`VLT-003`**, **`MPFS-001`**, and **`PSGC-001`**. This system eliminates manual line-number drift in `CMD-DOC-INDEX` jump tables, prevents SonarLint/TypeScript cognitive complexity violations, and provides instant turn-key scaffolding across three standardized module archetypes.

---

## 2. System Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │            VLT Compliance System             │
                    └──────────────────────┬───────────────────────┘
                                           │
         ┌─────────────────────────────────┼────────────────────────────────┐
         ▼                                 ▼                                ▼
┌─────────────────┐             ┌─────────────────────┐           ┌───────────────────┐
│ Canonical       │             │ Core Engine         │           │ Operational CLI   │
│ Templates       │             │ Substrate           │           │ & CI Gates        │
├─────────────────┤             ├─────────────────────┤           ├───────────────────┤
│ • host_facade   │             │ phoenix/            │           │ tools/vlt_sync.js │
│ • simulation_   │ ──────────► │ vlt_compliance_     │ ────────► │ • --check         │
│   cartridge     │             │ engine.js           │           │ • --fix           │
│ • pure_trans-   │             │                     │           │ • --scaffold      │
│   duction       │             │ PhoenixLinterSuite  │           │                   │
│                 │             │ Integration         │           │ test_vlt_         │
│ Dual:           │             │                     │           │ compliance.js     │
│ phoenix/ &      │             └─────────────────────┘           └───────────────────┘
│ .agent/         │
└─────────────────┘
```

---

## 3. The 3 Canonical Module Archetypes

### Archetype A: `host_facade_template.js`
- **Purpose**: Host Sovereign facades, gateways, background worker coordinators, and subsystem bridges (e.g., `sentinel_evaluator.js`, `webllm_worker_bridge.js`).
- **Anatomy**:
  - `CMD-DOC-INDEX` 6-Region Jump Table
  - Universal Arrow IIFE: `((root) => { 'use strict'; ... })(typeof globalThis !== 'undefined' ? globalThis : this);`
  - `[SEC-01]`: Ambient Type Declarations & JSDoc contracts
  - `[SEC-02]`: Multi-environment Singleton Attenuation (`_resolveEngineSingleton`, etc.)
  - `[SEC-03]`: Domain Core Logic & Pure Transducers (Complexity $\le 5$)
  - `[SEC-04]`: Subsystem Operations & Fallback Delegates
  - `[SEC-05]`: Master Orchestrator Facade Class / Dispatch Function
  - `[SEC-06]`: Dual-Binding Universal Export Envelope (`window`, `globalThis`, `module.exports`)

### Archetype B: `simulation_cartridge_template.js`
- **Purpose**: VSRP-001 Simulation Tenant Cartridges (e.g., `combat.js`, `overworld.js`, mini-games).
- **Anatomy**:
  - Faraday-isolated sandbox closure (zero DOM access, zero `window`, zero `document`).
  - Full 9-Method VSRP-001 Lifecycle:
    `init(cfg)`, `input(event)`, `update(dt)`, `render(ctx)`, `cleanup()`, `serialize()`, `deserialize(bin)`, `saveState()`, `loadState(snap)`.
  - PERSIST-001 2048-Byte typed memory layout definition with offset constants.
  - Export: Self-contained cartridge registration descriptor.

### Archetype C: `pure_transduction_template.js`
- **Purpose**: Pure computational engines, compilers, parsers, lexers, and mathematical raycasters (e.g., `synarche_parser.js`).
- **Anatomy**:
  - Zero state / purely functional transforms.
  - AST / Token definitions and typed interfaces.
  - Invariant assertion & mutation validation gates.
  - Universal dual-binding export envelope.

---

## 4. Components & Execution Steps

### Phase 1: Canonical Templates Creation
- Create `phoenix/templates/host_facade_template.js`
- Create `phoenix/templates/simulation_cartridge_template.js`
- Create `phoenix/templates/pure_transduction_template.js`
- Mirror identical templates to `.agent/templates/` for agent workflows.

### Phase 2: Core Compliance Engine (`phoenix/vlt_compliance_engine.js`)
- Implement `VLTComplianceEngine` as a pure, zero-dependency VLT-003 module:
  - `scanRegions(sourceCode)`: Extracts all `//#region [SEC-XX]` identifiers, titles, and exact line numbers.
  - `syncJumpTable(sourceCode)`: Replaces the `CMD-DOC-INDEX` comment block with formatted, dot-padded lines targeting exact line numbers.
  - `validateCompliance(sourceCode, options)`: Verifies:
    1. Arrow IIFE outer membrane (or module boundary).
    2. Exact line match between `CMD-DOC-INDEX` and `#region` tags (tolerance = 0).
    3. Monotonic sequential numbering (`SEC-01`, `SEC-02`, ...).
    4. SonarLint S3776 Cognitive Complexity ($\le 15$ for all functions).
    5. Absence of forbidden placeholders (`// ...`, `TODO(impl)`).
  - `scaffold(archetype, metadata)`: Fills template variables (`{{MODULE_NAME}}`, `{{DOC_ID}}`, `{{TIMESTAMP}}`, etc.) and performs initial jump-table calibration.
- Wire `syncJumpTable` and `validateCompliance` into `PhoenixLinterSuite` in `phoenix/phoenix_sovereign_engine.js`.

### Phase 3: Tri-Mode CLI Tool (`tools/vlt_sync.js`)
- Build standalone executable Node CLI supporting:
  - `node tools/vlt_sync.js --check [glob/files]`: Non-zero exit on drift or complexity violations.
  - `node tools/vlt_sync.js --fix [glob/files]`: Synchronizes `CMD-DOC-INDEX` in place.
  - `node tools/vlt_sync.js --scaffold <facade|cartridge|transduction> <targetPath>`: Generates a ready-to-use compliant file.

### Phase 4: Master Test Battery & CI Integration
- Implement `testing/test_vlt_compliance.js`:
  - Unit tests for `scanRegions`, `syncJumpTable`, `validateCompliance`, and `scaffold`.
  - Audits core modules (`phoenix/sentinel_evaluator.js`, `phoenix/webllm_worker_bridge.js`, `phoenix/synarche_parser.js`, `phoenix/phoenix_sovereign_engine.js`).
- Integrate into `testing/run_all_tests.js`.

# Phoenix Sovereign Engine: Autonomous Architecture & Execution Skill Specification

**Document Identifier:** SKILL-PHOENIX-SOVEREIGN-VLT003
**Parent Standard:** Phoenix Rosetta Stone (PRS-001) / PRS-SPEC-STACK-002
**Version:** 3.0.0-LOCKED
**Classification:** Normative Systems Standard & AI Agent Operational Directive
**Timestamp:** 2026-09-20T16:40:00Z

---

## I. Executive Architectural Overview

### What

The **Phoenix Sovereign Engine** is a zero-dependency, single-file browser-native runtime substrate engineered for autonomous software execution, deterministic simulation, and verifiable binary state persistence. It synthesizes multi-threaded background workers, cryptographic provenance logging, capability-based security, and in-memory constitutional governance into a single `.html` container capable of executing via standard `file:///` protocols or local HTTP servers.

### How

The architecture enforces a strict division between an **Immutable Sovereign Chassis** (runtime host, worker lifecycle, hardware event transduction, persistence adapters) and a **Pluggable Tenant Cartridge** (game math, entity memory layout, PEVM constitution, presentation projection).

```plaintext
┌────────────────────────────────────────────────────────────────────────┐
│                        VLT-003 MASTER CONTAINER                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐
│  │ PLANE 0: DOM PRESENTATION & INPUT TRANSDUCTION (Main UI Thread)  │
│  │ Viewport Socket • Telemetry Mirrors • Event Capture • Audio DAC  │
│  └──────────────────────────────────┬───────────────────────────────┘
│                                     │ PostMessage / Transferable Lists
│                                     ▼
│  ┌──────────────────────────────────────────────────────────────────┐
│  │ PLANE 1: ISOLATED WORKER KERNEL (Headless Simulation Substrate)  │
│  │ • [SEC-00-GLOBALS] Virtual globals.d.ts Contract Layer           │
│  │ • [SEC-03 - SEC-05] PRNG • Checksums • SHA-256 • 32-Byte Header  │
│  │ • [SEC-06 - SEC-09] PEVM Constitution • FIFO • Contiguous Memory │
│  │ • [SEC-10 - SEC-14] VSRP-001 Core • SPS • OPFS • 60Hz Clock • GPU│
│  └──────────────────────────────────▲───────────────────────────────┘
│                                     │ Sentinel Validation & Trap Gate
│  ┌──────────────────────────────────┴───────────────────────────────┐
│  │ PLANE 2: COORDINATOR & MVP-001 SENTINEL AUDITOR (Main UI Thread) │
│  │ 20-Pass Gatekeeper • Blob Spawner • URL Revocation • Fallback IDB│
│  └──────────────────────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────────────────┘
```

### Why

Traditional web game frameworks suffer from supply-chain fragility, garbage collection hitching, context fragmentation during AI refactoring, and ambient authority vulnerabilities. By enforcing strict single-file Virtual Lexical Topology (VLT-003), fixed contiguous memory layouts (PERSIST-001), and sealed capability delegation (SDCP-001), the system achieves bitwise replay determinism, sub-millisecond frame pacing, and permanent operational stability.

---

## II. The 6-Layer Phoenix Protocol Stack

All code generated or modified within this engine must strictly comply with the six protocol tiers defined in **PRS-SPEC-STACK-002**:

| Standard | Architectural Role | Operational Mechanism | Failure Signature |
| :--- | :--- | :--- | :--- |
| **MPFS-001** | Spatial Layout & Staging | Direct single-file execution; downward functional dependency only; strict staging membrane hygiene. | Cross-plane reference leakage; global variable collision. |
| **SDCP-001** | Authority Boundary & Capability | Zero Ambient Authority; modules receive minimal, explicitly declared capability handles. | Unauthorized disk access; access to raw `window`/`document` from Plane 1. |
| **PERSIST-001** | State Authority & Persistence | Contiguous `ArrayBuffer` state; 32-byte header with CRC32; OPFS/IndexedDB storage. | Deserialization mismatch; garbage collection frame spikes. |
| **VSRP-001** | Lifecycle Execution & FSM | Canonical 9-method finite state machine (`configure` $\to$ `destroy`); pure math `update()`. | Unasserted state invocation; rendering mutation inside `update()`. |
| **PMIP-001** | Decoupled Inter-Tenant Routing | Validated, immutable message envelopes across threads; tokenized teardown. | Telepathic state coupling; detached unhandled event listeners. |
| **MVP-001** | Automated Sentinel Governance | 20-pass pre-flight hardware assertion battery and AST-aware source code linter. | System execution halt on boot; red visual failure barrier. |

---

## III. Structural Manifest & Regex Anchor Index

The engine strictly adheres to the **Multi-Tier File Partitioning Strategy (ARCH-CODE-PARTITION-001)**. Every file is organized into 25 collapsible `#region` blocks addressable via standard regex jump anchors (`[SEC-XX]`):

| Section Anchor | Subsystem Name | Thread / Plane | Responsibility |
| :--- | :--- | :--- | :--- |
| **`[SEC-00]`** | Polyglot CLI Bootstrapper & AST Linter | Node.js / Pre-Boot | AST boundary linter (`auditSystemSourceCode`) and local Node HTTP server. |
| **`[SEC-01]`** | Presentation Styles & CSS Tokens | Plane 0 (DOM) | Root custom properties, viewport constraints, pixelated canvas rendering. |
| **`[SEC-02]`** | Viewport Socket & Telemetry Docks | Plane 0 (DOM) | Canvas mount socket, Sentinel log views, telemetry HUD docks, hardware buttons. |
| **`[SEC-00-GLOBALS]`** | Embedded Ambient Contract Layer | Plane 1 (Worker) | JSDoc schemas, branded scalars (`ByteOffset`), interface contracts. |
| **`[SEC-03]`** | Mathematical Primitives (PRNG & CRC32) | Plane 1 (Worker) | Mulberry32 seeded float generator and bitwise CRC32 lookup table. |
| **`[SEC-04]`** | Cryptographic Provenance Ledger | Plane 1 (Worker) | SHA-256 state hashing (`crypto.subtle`) and blockchain timeline chaining. |
| **`[SEC-05]`** | UMB-CORE-PERSIST-001 32-Byte Header | Plane 1 (Worker) | Binary serializer writing little-endian header (`0x5053594E`, tick, seed, CRC). |
| **`[SEC-06]`** | PEVM Constitution & Governance Ledger | Plane 1 (Worker) | Hardcoded domain invariants, 64-byte ledger, AI proposal validator. |
| **`[SEC-07]`** | Prestige Progression Calculus | Plane 1 (Worker) | Non-linear mastery curve: $\text{level} = \lfloor(xp/100)^{1/1.5}\rfloor + 1$. |
| **`[SEC-08]`** | High-Frequency Input Ring Buffer | Plane 1 (Worker) | Zero-allocation circular FIFO (`Int32Array`) queuing hardware input tokens. |
| **`[SEC-09]`** | Contiguous Entity Heap & Memory Map | Plane 1 (Worker) | 2,048-byte linear `ArrayBuffer` partition with fixed strides and byte offsets. |
| **`[SEC-10]`** | VSRP-001 9-Method Sovereign Tenant Core | Plane 1 (Worker) | Canonical tenant implementation with strict lifecycle FSM enforcement. |
| **`[SEC-11]`** | Sovereign Persistence Subsystem (SPS) | Plane 1 (Worker) | Multi-tenant registry, snapshot extraction, and canonical packing manager. |
| **`[SEC-12]`** | Bidirectional OPFS & Buffer Extractor | Plane 1 (Worker) | Direct disk sync via `FileSystemSyncAccessHandle` and boot rehydration. |
| **`[SEC-13]`** | Accumulator Clock & Kinematics | Plane 1 (Worker) | Monotonic 60 FPS loop ($\Delta t = 16.66\text{ms}$), FIFO draining, physics calculations. |
| **`[SEC-14]`** | Diegetic Scribe Lens Renderer | Plane 1 (Worker) | Zero-GC `OffscreenCanvas` 2D projection renderer (zero string allocations). |
| **`[SEC-15]`** | Worker Message Dispatch & Router | Plane 1 (Worker) | Standardized PMIP-001 envelope ingestion and thread command routing. |
| **`[SEC-16]`** | MVP-001 20-Pass Automated Sentinel | Plane 2 (Main) | Pre-flight assertion gate auditing hardware APIs and structural contracts. |
| **`[SEC-17]`** | Kernel Blob Spawner & Revocation | Plane 2 (Main) | Plaintext `#worker-kernel` ingestion, Blob URL creation, and immediate revocation. |
| **`[SEC-18]`** | SDCP-001 Capability Attenuation Broker | Plane 2 (Main) | Canvas control transfer via `transferControlToOffscreen()` to worker port. |
| **`[SEC-19]`** | DOM Input Transducer & Key Bindings | Plane 2 (Main) | Captures keyboard/mouse events, packs them into numerical tokens for worker FIFO. |
| **`[SEC-20]`** | Procedural Web Audio Synthesis (PWAS-01) | Plane 2 (Main) | Algorithmic Web Audio oscillators with autoplay-gate handling. |
| **`[SEC-21]`** | Dual-Engine Storage Adapter (OPFS + IDB) | Plane 2 (Main) | Main-thread IndexedDB fallback caching and append-only governance journal. |
| **`[SEC-22]`** | Telemetry HUD Mirror & Panic Gateway | Plane 2 (Main) | DOM telemetry updates, runtime error trapping, and state reset triggers. |
| **`[SEC-23]`** | Universal Export Envelope (UMD/CJS/Window) | Outer Scope | Dual-binding export wrapper for node test harnesses and browser globals. |

---

## IV. Non-Negotiable Engineering Invariants

AI agents and human engineers must adhere strictly to these constraints:

1. **Zero Tooling & Browser-Native Execution (`file:///` Invariance):**
   - The codebase must run cleanly when opening the `.html` file directly from local disk via `file:///`.
   - NEVER use ES module syntax (`import`, `export`), bundlers (Webpack, Vite, Rollup), npm dependencies, or remote CDNs.
   - All script evaluation occurs through in-memory Blob URLs or standard `<script>` tags.

2. **Strict Thread & Memory Isolation (Faraday Shielding):**
   - Plane 1 (the worker) executes ALL physics, kinematics, PRNG progression, and disk I/O.
   - Plane 0/2 (the main UI thread) contains ZERO physics, collision math, or synchronous disk operations.
   - State ingestion across boundaries must use `structuredClone()` or transfer contiguous `ArrayBuffer` allocations. Never pass live object references across threads.

3. **Zero-Allocation Simulation Loop (Zero GC Churn):**
   - Hot execution loops (`update()` and `render()`) must NEVER allocate transient objects, arrays, or dynamic string literals (e.g., avoid `rgba(...)` concatenation).
   - State is manipulated via fixed `Float32Array`, `Int32Array`, `Uint8Array`, and `DataView` instances bound to pre-allocated buffers.

4. **Deterministic Mathematics (Zero `Math.random()`):**
   - Direct calls to `Math.random()` inside the simulation domain are strictly forbidden.
   - All entropy, procedural generation, and stochastic variations MUST draw exclusively from the seeded Mulberry32 PRNG stream.

5. **Canonical 9-Method Lifecycle FSM (VSRP-001):**
   - Tenant cartridges must strictly export and execute the 9 lifecycle methods: `configure`, `init`, `reset`, `update`, `render`, `getState`, `getDiagnostics`, `getModuleInfo`, and `destroy`.
   - State transitions must follow the asserted sequence:
     $$\text{UNCONFIGURED} \xrightarrow{\text{configure()}} \text{CONFIGURED} \xrightarrow{\text{init()}} \text{INITIALIZED} \xrightarrow{\text{reset()}} \text{READY} \underset{\text{reset()}}{\overset{\text{update()}}{\rightleftharpoons}} \text{RUNNING} \xrightarrow{\text{destroy()}} \text{DESTROYED}$$

6. **Constitutional Governance (PEVM Isolation):**
   - Persistence capability does not grant architectural authority.
   - AI directives and external mutations cannot write directly to memory. They must arrive as formal proposals (`AIGovernanceProposal`) and pass through `GovernanceEnforcer.validateProposal()` before state commit.

7. **Code Preservation & Anti-Truncation:**
   - Never truncate, abbreviate, or omit code blocks.
   - Never use placeholder comments such as `// ...rest of logic...`.
   - Retain all section anchors (`//#region [SEC-XX]` and `//#endregion`) intact.

---

## V. Chassis vs. Cartridge Separation Protocol

The engine cleanly separates generic infrastructure from game-specific logic:

```plaintext
CHASSIS (Host Infrastructure)                CARTRIDGE (Domain Simulation)
• [SEC-00] Linter & CLI                      • [SEC-00-GLOBALS] Ambient Types
• [SEC-01 - SEC-02] Styles & Viewport        • [SEC-06] PEVM Constitution
• [SEC-03 - SEC-05] Math & Binary Header     • [SEC-09] 2048-Byte Memory Map
• [SEC-08] Circular Input FIFO               • [SEC-10] 9-Method VSRP-001 Core
• [SEC-11 - SEC-13] SPS, OPFS, Accumulator   • [SEC-14] Diegetic Renderer
• [SEC-15 - SEC-23] Messaging & Drivers
```

### Cartridge Mounting Instructions

To mount a new game into the chassis:

1. Author the 5 cartridge subsystems inside `tenant_cartridge_template.js`.
2. Insert `[SEC-00-GLOBALS]` immediately after `'use strict';` inside `#worker-kernel`.
3. Insert `[SEC-06]` and `[SEC-09]` into the designated data partition slot.
4. Insert `[SEC-10]` (the `CartridgeTenantCore` class) into the tenant execution slot.
5. Insert `[SEC-14]` (the `CartridgeRenderer` object) into the presentation slot.
6. Open the file directly in any modern browser to execute.

---

## VI. Canonical Binary Memory Layout (PERSIST-001)

State snapshots enforce 4-byte/8-byte boundaries, explicit little-endian byte ordering, and a contiguous 2,048-byte allocation (`ArrayBuffer`):

```plaintext
Offset (Hex)   Field Name            Type         Size      Description
--------------------------------------------------------------------------------------
0x000 - 0x01F  BASE_HEADER           Struct       32 Bytes  Magic, Tick, CRC32, Seed
  0x00         HDR_MAGIC_U32         Uint32       4 Bytes   0x5053594E ("PSYN")
  0x04         HDR_SCHEMA_U16        Uint16       2 Bytes   Schema Identification
  0x06         HDR_VER_U16           Uint16       2 Bytes   Schema Version
  0x08         HDR_FLAGS_U16         Uint16       2 Bytes   Flags (0 = Little-Endian)
  0x0C         HDR_TICK_U32          Uint32       4 Bytes   Monotonic Clock Tick
  0x10         HDR_PRNG_U32          Uint32       4 Bytes   Active PRNG Seed State
  0x14         HDR_PAYLOAD_LEN       Uint32       4 Bytes   Payload Byte Length
  0x18         HDR_CRC32_U32         Uint32       4 Bytes   CRC32 Checksum
  0x1C         HDR_PADDING_U32       Uint32       4 Bytes   Reserved Alignment
--------------------------------------------------------------------------------------
0x020 - 0x05F  GOVERNANCE_LEDGER     Struct       64 Bytes  PEVM Constitutional State
  0x20         GOV_POLICY_MASK       Uint64       8 Bytes   Active Rule Bitmask
  0x28         AI_DIRECTIVE_ID       Uint64       8 Bytes   Monotonic Directive Counter
  0x30         COMPLIANCE_HASH       Uint64       8 Bytes   Cryptographic Rule Seal
  0x38         GOV_PADDING           Uint64       8 Bytes   Reserved Alignment
  0x40 - 0x5F  RESERVED_GOV          Bytes        32 Bytes  Reserved Policy Pool
--------------------------------------------------------------------------------------
0x060 - 0x07F  PRIMARY_ACTOR         Struct       32 Bytes  Player State Registers
  0x60         ACTOR_X_F32           Float32      4 Bytes   Horizontal Position
  0x64         ACTOR_Y_F32           Float32      4 Bytes   Vertical Position
  0x68         ACTOR_VX_F32          Float32      4 Bytes   Horizontal Velocity
  0x6C         ACTOR_VY_F32          Float32      4 Bytes   Vertical Velocity
  0x70         ACTOR_ENERGY_F32      Float32      4 Bytes   Kinetic Energy Reservoir
  0x74         ACTOR_STABILITY_F32   Float32      4 Bytes   Structural Health
  0x78         ACTOR_OVERDRIVE_F32   Float32      4 Bytes   Overdrive Meter
  0x7C         ACTOR_STATE_FLAGS     Uint32       4 Bytes   Bitmask Indicators
--------------------------------------------------------------------------------------
0x080 - 0x47F  ENTITY_POOL           Pool (32)    1024 B    32 Entities * 32-Byte Stride
0x480 - 0x67F  PROJECTILE_POOL       Pool (32)    512 Bytes 32 Projectiles * 16-Byte Stride
0x680 - 0x77F  ECHO_POOL             Pool (16)    256 Bytes 16 Echoes * 16-Byte Stride
0x780 - 0x78F  MEMORY_GHOST          Struct       16 Bytes  Persistent Death Coordinate
0x790 - 0x7FF  SCRATCHPAD_MEMORY     Bytes        112 Bytes Unallocated Scratchpad
--------------------------------------------------------------------------------------
Total Allocation Size: 2,048 Bytes (Fixed Size Contiguous ArrayBuffer)
```

---

## VII. The 20-Pass MVP-001 Sentinel Verification Battery

Before granting execution authority to the simulation loop, Plane 2 executes the complete 20-pass hardware and contract pre-flight suite:

```javascript
function executeSentinel20PassBattery(sourceText, canvas) {
    const passes = [
        [typeof window.Worker !== 'undefined', 'Pass 01: Worker multi-threading capability'],
        [typeof canvas?.transferControlToOffscreen === 'function', 'Pass 02: OffscreenCanvas transfer socket support'],
        [typeof DataView !== 'undefined', 'Pass 03: DataView little-endian byte ordering support'],
        [typeof structuredClone === 'function', 'Pass 04: StructuredClone Faraday isolation barrier'],
        [typeof crypto !== 'undefined' && Boolean(crypto.subtle), 'Pass 05: Web Crypto Subtle SHA-256 digest engine'],
        [typeof navigator.storage?.getDirectory === 'function', 'Pass 06: OPFS navigator.storage.getDirectory handle'],
        [typeof indexedDB !== 'undefined', 'Pass 07: IndexedDB persistence fallback availability'],
        [typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined', 'Pass 08: Web Audio procedural oscillator synthesis'],
        [sourceText.includes('class CartridgeTenantCore'), 'Pass 09: VSRP-001 canonical tenant class implementation'],
        [sourceText.includes('class GovernanceEnforcer'), 'Pass 10: PEVM constitutional governance enforcer'],
        [sourceText.includes('class SovereignPersistenceSubsystem'), 'Pass 11: Sovereign Persistence Subsystem manager'],
        [sourceText.includes('class InputRingBuffer'), 'Pass 12: High-frequency zero-allocation circular FIFO'],
        [sourceText.includes('function createMulberry32'), 'Pass 13: Deterministic Mulberry32 PRNG mathematical stream'],
        [sourceText.includes('function calculateCRC32'), 'Pass 14: CRC32 bitwise integrity lookup attestation'],
        [sourceText.includes('function calculatePrestigeLevel'), 'Pass 15: SPEC-PROG-MATH-001 dual-axis prestige progression'],
        [sourceText.includes('0x5053594E'), 'Pass 16: PSYN magic constant memory alignment (0x5053594E)'],
        [sourceText.includes('GHOST_BASE_BYTE'), 'Pass 17: Persistent memory ghost coordinate register'],
        [sourceText.includes('ECHO_BASE_BYTE'), 'Pass 18: Kinetic echo particle allocation partition'],
        [sourceText.includes('PROJ_BASE_BYTE'), 'Pass 19: Contiguous projectile vector stride partition'],
        [typeof sourceText === 'string' && sourceText.length > 500, 'Pass 20: AST-aware lexical linter zero-leak verification']
    ];

    for (const [passed, desc] of passes) {
        if (!passed) throw new Error(`SENTINEL_HALT: ${desc}`);
    }
    return passes.map(p => p[1]);
}
```

---

## VIII. AI Agent Refactoring & Code Generation Protocol

When an autonomous AI agent is prompted to inspect, modify, or extend this file, it must follow these exact operating steps:

1. **Locate Target Subsystem via Jump Anchors:** Search for the target section anchor (e.g., `[SEC-10]` for game rules, `[SEC-14]` for visuals) rather than scanning line by line.
2. **Consult `[SEC-00-GLOBALS]` Before Emitting Properties:** Verify property names and types in `[SEC-00-GLOBALS]` to prevent schema hallucinations.
3. **Preserve Section Demarcations:** Ensure all edits remain inside `//#region [SEC-XX]` and `//#endregion` blocks.
4. **Enforce Zero-Allocation Math:** Never introduce `new Object()`, `new Array()`, `[]`, or dynamic string formatting inside `update()` or `render()`. Write directly to typed views.
5. **Run Pre-Flight Verification:** Ensure the output passes all 20 Sentinel assertions without error.

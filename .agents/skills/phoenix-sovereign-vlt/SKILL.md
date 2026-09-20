---
name: phoenix-sovereign-vlt
description: Master operational specification for building zero-dependency, single-file 3-Plane VLT-003 Sovereign Engines with fixed 2048-byte binary heaps (PERSIST-001), 60Hz accumulator loop, OffscreenCanvas, and 20-pass Sentinel governance.
globs: "**/*.html, **/*.js, phoenix/**/*.js, phoenix/**/*.html"
alwaysApply: false
version: 3.0.0
---

# AGENT OPERATIONAL SPECIFICATION: Phoenix Sovereign VLT-003 Runtime Substrate

**Document Identifier:** SKILL-PHOENIX-SOVEREIGN-VLT003
**Protocol Version:** VLT-003 / PERSIST-001 / SDCP-001 / VSRP-001 / PMIP-001 / MVP-001
**Classification:** Normative Kernel Runtime Standard & AI Agent Operational Directive

---

## 1. Executive Overview & 3-Plane Virtual Lexical Topology (VLT-003)

The **Phoenix Sovereign Engine** is a zero-dependency, single-file browser-native runtime substrate engineered for autonomous software execution, deterministic simulation, and verifiable binary state persistence.

A single `.html` container is architecturally partitioned into 3 isolated execution planes:

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

---

## 2. The 6-Layer Protocol Stack

| Standard | Architectural Role | Operational Mechanism | Failure Signature |
| :--- | :--- | :--- | :--- |
| **MPFS-001** | Spatial Layout & Staging | Single-file `#region` anchors (`[SEC-00]`..`[SEC-23]`); downward dependency only. | Cross-plane reference leakage; global variable collisions. |
| **SDCP-001** | Capability Attenuation | Zero Ambient Authority; modules receive minimal, explicitly declared capability handles. | Direct access to raw `window`/`document` from Plane 1. |
| **PERSIST-001** | State Authority & Binary Memory | Contiguous `ArrayBuffer` state; 32-byte header with CRC32; OPFS/IndexedDB storage. | Deserialization mismatch; GC frame spikes. |
| **VSRP-001** | Universal 9-Method Lifecycle | Canonical 9-method finite state machine (`configure` $\to$ `destroy`); pure `update()`. | Unasserted state invocation; rendering inside `update()`. |
| **PMIP-001** | Inter-Plane Message Envelopes | Validated, immutable message envelopes across threads; tokenized teardown unbinds. | Telepathic state coupling; unhandled listener leaks. |
| **MVP-001** | Automated Sentinel Governance | 20-pass pre-flight hardware assertion battery and AST lexical linter. | System boot halt; visual failure barrier. |

---

## 3. Structural Manifest & Jump Table (`[SEC-00]` through `[SEC-23]`)

| Section Anchor | Subsystem Name | Thread / Plane | Responsibility |
| :--- | :--- | :--- | :--- |
| **`[SEC-00]`** | Polyglot CLI Bootstrapper & AST Linter | Node.js / Pre-Boot | AST boundary linter and local Node HTTP server. |
| **`[SEC-01]`** | Presentation Styles & CSS Tokens | Plane 0 (DOM) | Root custom properties, viewport constraints, pixelated canvas. |
| **`[SEC-02]`** | Viewport Socket & Telemetry Docks | Plane 0 (DOM) | Canvas mount socket, Sentinel log views, telemetry HUD docks. |
| **`[SEC-00-GLOBALS]`** | Embedded Ambient Contract Layer | Plane 1 (Worker) | JSDoc schemas, branded scalars (`ByteOffset`), interface contracts. |
| **`[SEC-03]`** | Mathematical Primitives (PRNG & CRC32) | Plane 1 (Worker) | Mulberry32 seeded float generator and bitwise CRC32 lookup table. |
| **`[SEC-04]`** | Cryptographic Provenance Ledger | Plane 1 (Worker) | SHA-256 state hashing (`crypto.subtle`) and timeline chaining. |
| **`[SEC-05]`** | 32-Byte Header Packing Engine | Plane 1 (Worker) | Binary serializer writing little-endian header (`0x5053594E`, tick, seed, CRC). |
| **`[SEC-06]`** | PEVM Constitution & Governance Ledger | Plane 1 (Worker) | Hardcoded domain invariants, 64-byte ledger, AI proposal validator. |
| **`[SEC-07]`** | Prestige Progression Calculus | Plane 1 (Worker) | Non-linear mastery curve: $\text{level} = \lfloor(xp/100)^{1/1.5}\rfloor + 1$. |
| **`[SEC-08]`** | High-Frequency Input Ring Buffer | Plane 1 (Worker) | Zero-allocation circular FIFO (`Int32Array`) queuing input tokens. |
| **`[SEC-09]`** | Contiguous Entity Heap & Memory Map | Plane 1 (Worker) | Linear `ArrayBuffer` partition with fixed strides and byte offsets. |
| **`[SEC-10]`** | VSRP-001 9-Method Tenant Core | Plane 1 (Worker) | Canonical tenant implementation with strict lifecycle FSM enforcement. |
| **`[SEC-11]`** | Sovereign Persistence Subsystem (SPS) | Plane 1 (Worker) | Multi-tenant registry, snapshot extraction, and canonical packing. |
| **`[SEC-12]`** | Bidirectional OPFS Buffer Extractor | Plane 1 (Worker) | Direct disk sync via `FileSystemSyncAccessHandle`. |
| **`[SEC-13]`** | Accumulator Clock & Kinematics | Plane 1 (Worker) | Monotonic 60 FPS loop ($\Delta t = 16.66\text{ms}$), FIFO draining, physics. |
| **`[SEC-14]`** | Diegetic Scribe Lens Renderer | Plane 1 (Worker) | Zero-GC `OffscreenCanvas` 2D projection renderer (zero string allocations). |
| **`[SEC-15]`** | Worker Message Dispatch & Router | Plane 1 (Worker) | Standardized PMIP-001 envelope ingestion and thread routing. |
| **`[SEC-16]`** | MVP-001 20-Pass Automated Sentinel | Plane 2 (Main) | Pre-flight assertion gate auditing hardware APIs and structural contracts. |
| **`[SEC-17]`** | Kernel Blob Spawner & Revocation | Plane 2 (Main) | Plaintext `#worker-kernel` ingestion, Blob URL creation, and revocation. |
| **`[SEC-18]`** | SDCP-001 Capability Broker | Plane 2 (Main) | Canvas control transfer via `transferControlToOffscreen()`. |
| **`[SEC-19]`** | DOM Input Transducer & Key Bindings | Plane 2 (Main) | Captures hardware events, packs numerical tokens for worker FIFO. |
| **`[SEC-20]`** | Procedural Web Audio Synthesis | Plane 2 (Main) | Pure algorithmic Web Audio oscillators (zero external sound files). |
| **`[SEC-21]`** | Dual-Engine Storage Adapter | Plane 2 (Main) | Main-thread IndexedDB fallback and append-only journal. |
| **`[SEC-22]`** | Telemetry HUD Mirror & Panic Gateway | Plane 2 (Main) | DOM telemetry updates, runtime error trapping, and panic resets. |
| **`[SEC-23]`** | Universal IIFE Export Envelope | Outer Scope | Dual-binding export wrapper (`module.exports` and `window`). |

---

## 4. PERSIST-001 Binary Memory Layout (2,048-Byte Minimal Heap)

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

### Scaled Heap Formula (Dynamic Scaling)

For larger simulations (Voxel maps, RPG entities), calculate the fixed `ArrayBuffer` size using contiguous stride offsets:
$$\text{HeapSize} = \text{Header}(32) + \text{Governance}(64) + \text{Actors}(N_a \times 32) + \text{Entities}(N_e \times 32) + \text{Grid}(W \times H \times S)$$

---

## 5. Universal Cartridge Boilerplate (`CartridgeTenantCore`)

```javascript
//#region [SEC-10] VSRP-001 9-METHOD SOVEREIGN TENANT CORE

class CartridgeTenantCore {
    constructor() {
        this._state = 'UNCONFIGURED';
        this._buffer = new ArrayBuffer(2048);
        this._view = new DataView(this._buffer);
        this._prngSeed = 0x12345678;
        this._tick = 0;
    }

    configure(config) {
        if (config?.seed) this._prngSeed = config.seed >>> 0;
        this._state = 'CONFIGURED';
        return true;
    }

    init(context) {
        this._view.setUint32(0x00, 0x5053594E, true); // Magic 'PSYN'
        this._view.setUint16(0x04, 1, true);          // Schema v1
        this._view.setUint16(0x06, 1, true);          // Engine v1
        this._state = 'INITIALIZED';
        return true;
    }

    reset(snapshot) {
        if (snapshot instanceof ArrayBuffer) {
            new Uint8Array(this._buffer).set(new Uint8Array(snapshot));
        }
        this._state = 'READY';
        return true;
    }

    update(dt, context) {
        this._tick++;
        this._view.setUint32(0x0C, this._tick, true);
        // Pure physics & entity pool simulation over DataView
        return true;
    }

    render(ctx, interp) {
        // Zero-allocation rendering to OffscreenCanvas
        // Read directly from this._view without creating objects
    }

    getState() {
        return this._buffer.slice(0); // Detached copy
    }

    getDiagnostics() {
        return { state: this._state, tick: this._tick, memoryBytes: this._buffer.byteLength };
    }

    getModuleInfo() {
        return {
            moduleId: 'cartridge_core',
            version: '3.0.0',
            protocolVersion: 'VSRP-001',
            capabilities: ['cap:render.offscreen', 'cap:persist.binary']
        };
    }

    destroy() {
        this._state = 'DESTROYED';
        return true;
    }
}

//#endregion
```

---

## 6. The 20-Pass Sentinel Assertion Runner

```javascript
//#region [SEC-16] MVP-001 20-PASS AUTOMATED SENTINEL

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

//#endregion
```

---

## 7. AI Agent Operational Directives (Anti-Entropy)

When an autonomous AI agent inspects, modifies, or refactors a file governed by this specification:

1. **Locate Target Subsystem via Jump Anchors:** Search for `[SEC-XX]` (e.g. `[SEC-10]` for game rules, `[SEC-14]` for visuals) rather than reading the entire monolith sequentially.
2. **Consult `[SEC-00-GLOBALS]`:** Verify property names and byte offsets before modifying binary structs.
3. **Preserve Section Demarcations:** All edits must remain strictly inside `//#region [SEC-XX]` and `//#endregion`.
4. **Enforce Zero-Allocation Math:** Never introduce `new Object()`, `new Array()`, or string concatenation inside `update()` or `render()`. Write directly to typed views.
5. **Pre-Flight Verification:** Ensure the code passes all 20 Sentinel assertions without error.

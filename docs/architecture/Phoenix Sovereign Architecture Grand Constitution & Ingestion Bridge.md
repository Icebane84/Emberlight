# Phoenix Sovereign Architecture: Grand Constitution & Ingestion Bridge

## Executive Summary & Anti-Theater Invariant

The **Phoenix Sovereign Grand Constitution** (`PHOENIX_SOVEREIGN_CONSTITUTION.md`) is the supreme, normative standard governing all zero-dependency, single-file browser-native runtime substrates, VSRP-001 tenants, workbench tools, compilation bridges, and persistence engines.

> [!IMPORTANT]
> **Anti-Theater & Strict Agnostic Isolation Invariant (`[INV-01]`):**
> The Constitution **MUST NEVER** contain narrative lore, RPG meta-systems (levels, XP, tarot archetypes, elemental stances), or domain-specific game mechanics.
>
> The Constitution exists purely to govern **systemic invariants, execution topologies, memory allocations, compilation pipelines, lifecycle state machines, cryptographic provenance, type contracts, dependency graphs, fault tolerance, and capability boundaries**.
>
> Domain-specific mechanics belong exclusively to **Pluggable Tenant Cartridges (Tier 2 Simulation Tenants)**.

---

## 🏛️ The Complete Tripartite Architecture: Ingestion $\to$ Chassis $\to$ Cartridge

```plaintext
┌────────────────────────────────────────────────────────────────────────┐
│             INGESTION & WORKBENCH COMPILER (STCP / PARSER)             │
│   Domain Authoring: Specifications • DSL Syntax • State Definitions    │
├────────────────────────────────────────────────────────────────────────┤
│  • Lexical Ingestion (Character Stream → Typed Tokens)                 │
│  • Mixin-Stack Parser (State Atomicity & Dual-Rigor Sloppy/Strict)     │
│  • GUCA Emitter (Compiles DSL → Agnostic 9-Method VSRP-001 Cartridge)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Emits Validated Cartridge IIFE
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               AGNOSTIC SOVEREIGN CHASSIS (THE CONSTITUTION)             │
│    Governs: Invariants • Memory Layouts • FSM • Types • Persistence    │
├────────────────────────────────────────────────────────────────────────┤
│  • 3-Plane Virtual Lexical Topology (VLT-003 / VLT-004)                │
│  • Contiguous Binary Memory & 96-Byte Tripartite Header (PERSIST-001)  │
│  • 64-Byte PEVM Codex Provenance Ledger & 8-Gate Rehydration Matrix    │
│  • Non-Destructive Refinement (NDR): Corrupt Quarantine & Survivor Buf │
│  • Capability-Based Authority Delegation (SDCP-001)                    │
│  • Universal 9-Method FSM (VSRP-001) & Immutable TemporalTick Struct   │
│  • Zero-Allocation Sub-Tick Input FIFO & Hardware Debug Intercept Chord│
│  • OSLM Topological Acyclic DAG with Contract `requires`/`provides`   │
│  • Pre-Boot AST Linter & Bipartite Bus Link Integrity (Zero-Orphan)   │
│  • Viewport Engine: Deadzone → Hysteresis → 2nd-Order Look-Ahead       │
│  • Exponential Frame-Rate Independent Decay (1 - base^dt)              │
│  • Compute Budget Load-Shedder (14.5ms Frame Balancer)                 │
│  • PMIP-001 Causal `traceId` & `parentId` Event Correlation            │
│  • [INV-08] Zero-Transient Policy & Dual-Stream Telemetry/Crash Sinks  │
│  • Diagnostic Catalog, SonarLint S3776 Guardrails & ERL-001            │
│  • Logic Lock Semantic State Consistency Barrier (C2A-001)             │
│  • Sentinel Crucible with Parametrically Independent Test Oracles      │
│  • Ambient Type Facades & JSDoc Governance (globals.d.ts Ambient Rule) │
│  • Dynamic Link Repair & Transclusion-Based Anchor Maintenance         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Plugs into Agnostic 9-Method Interface
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      PLUGGABLE TENANT CARTRIDGES                       │
│                     (Domain / Genre / Game Theme)                      │
├────────────────────────────────────────────────────────────────────────┤
│  • Vector Nexus: Kinetic Twin-Stick Cartridge                          │
│  • Resonance: Verlet Pendulum & Grapple Cartridge                      │
│  • The Descent: Dual-Perspective Top-Down / Side-Scroll Cartridge      │
│  • Emberlight: Turn-Based RPG Districts (Armory, Market, War Table)   │
│  • Governance Workbench: Monolith Exporter & AI Crucible Tenant        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📜 The 12 Agnostic Constitutional Sections + Ingestion Bridge

| Section        | Constitutional Domain                                      | Hardened Mechanical Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| :------------- | :--------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`[SEC-00]`** | **Preamble, Ethos & Append-Only Manifest**                 | • Ethos: "Zero Entropy. Coherence through Confrontation."<br/>• `[P-01]` through `[P-07]` Collaboration & Immutable Ledger Protocols<br/>• `[INV-01]` through `[INV-07]` Rules of Engagement (Anti-Theater)<br/>• **`[INV-08]` Zero-Transient Policy**: Strict prohibition of raw `console.log` statements in hot loops; all logging routes through pre-allocated ring buffers<br/>• Immutable append-only version changelog matrix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **`[SEC-01]`** | **Topography & Structural Jump Anchors**                   | • Transclusion-Based Token Matching (`//#region [SEC-XX]`)<br/>• Automated `CMD-DOC-INDEX` header generation via tooling hook<br/>• VLT-003 (3-Plane Worker) vs VLT-004 (Zero-Alloc In-Thread)<br/>• CSOC 3-Phase Boot Pattern (`<head>` Choke Point $\to$ `<body>` Sockets)<br/>• **OSLM Topological Acyclic DAG & Hopcroft-Tarjan Cut-Vertex Search**: Contract-based sorting (`requires`, `provides`), cycle detection, and pre-boot articulation search to identify single points of failure (SPOFs)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **`[SEC-02]`** | **4-Tier Sovereign Authority & Faraday Shielding**         | • T1 Host, T2 Simulation Tenant, T3 Peripheral Driver, T4 Kernel/SSOT<br/>• Zero Ambient Authority (`SDCP-001`)<br/>• Ephemeral Assembly Membrane Lifecycle (`[SEC-03]` $\to$ `[SEC-07]` purge)<br/>• MPFS-001 Root Facade Sealing (`delete window._*Internal`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **`[SEC-03]`** | **Universal Module Contract (VSRP-001)**                   | • Canonical 9-Method Lifecycle FSM (`configure` $\to$ `destroy`)<br/>• **Immutable `TemporalTick` Struct**: `update(temporalTick, input)` receiving `{ deltaTime, elapsedTime, frameCount, worldTimeScale, entityTimeScale }`<br/>• Action-Inversion Delta Pattern (`deltaEnvelope` to Host, never direct mutation)<br/>• **Un-Awaited Microtask Telemetry Dispatch**: All telemetry/HUD updates dispatched via `queueMicrotask` / `requestIdleCallback`<br/>• Universal IIFE Dual-Binding Pattern (Node CJS + Browser window)                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **`[SEC-04]`** | **Strict Type Contracts & Ambient Facades**                | • `"checkJs": true` rules without TypeScript compiler<br/>• **The Ambient Rule:** `globals.d.ts` without top-level `import`/`export`<br/>• Branded Scalars (`ByteOffset`, `EntityIndex`, `Radians`, `FixedPoint16`)<br/>• Generic EventBus mapping (`@template {string & keyof EventMap} T`)<br/>• AC-07 Parity: 100% parameter name & arity match                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **`[SEC-05]`** | **Binary Memory & Cryptographic Provenance (PERSIST-001)** | • Fixed 2,048-byte linear `ArrayBuffer` partition with 16-byte fixed strides<br/>• **96-Byte Tripartite Header & 64-Byte PEVM Codex Provenance Ledger**:<br/>&nbsp;&nbsp;• `0x00 - 0x1F`: 32-byte Core Header (Magic `0x5053594E`, tick, seed, length, CRC32)<br/>&nbsp;&nbsp;• `0x20 - 0x2F`: Cartridge Provenance Signature (UUID + Monotonic Epoch)<br/>&nbsp;&nbsp;• `0x30 - 0x3F`: Capability Bitmask & Authority Tier<br/>&nbsp;&nbsp;• `0x40 - 0x4F`: SGI (Sovereign Governance Invariant) Feature Hash<br/>&nbsp;&nbsp;• `0x50 - 0x5F`: Audit Salt & Mutation Nonce<br/>• **Reverse-Topological Merkle-DAG Compaction & Invalidation**: Content-addressed BLAKE3/SHA-256 caching evaluated in reverse topological order<br/>• **8-Gate Rehydration Matrix & NDR Survivor Buffer**:<br/>&nbsp;&nbsp;• On Gate 1–8 failure: write corrupt buffer to `/quarantine/corrupt_[ts].bin`<br/>&nbsp;&nbsp;• Initialize clean Survivor Buffer from Genesis state without engine freeze |
| **`[SEC-06]`** | **Decoupled Input & High-Frequency Ring Buffer**           | • 3-Layer Input Transduction: Raw DOM $\to$ `Int32Array` Circular FIFO $\to$ Tick Snapshot<br/>• Zero-allocation FIFO push/drain operations<br/>• Sub-tick replay determinism<br/>• **Hardware Debug Intercept Chord**: Dedicated input chord bitmask (`Ctrl+Shift+~`) freezes tick accumulator and outputs emergency diagnostic snapshot + OPFS memory dump                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **`[SEC-07]`** | **Message Bus & Causal Lineage (PMIP-001)**                | • **Causal Message Envelope Schema**:<br/>&nbsp;&nbsp;`{ protocol: "PMIP-001", topic, source, timestamp, traceId, parentId, payload }`<br/>• Decoupled publish/subscribe EventBus topology<br/>• **Default-Deny Typed Edge Matrix**: Enforces explicit structural edge pairs (`depends_on`, `implements`, `verifies`, `constrains`, `satisfies`, `contradicts`)<br/>• **Zero Orphan Invariant**: Pre-boot static check matching `emits` vs `listens` manifests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **`[SEC-08]`** | **Procedural Audio, Viewport Engine & Rendering**          | • **Exponential Frame-Rate Independent Decay**: $\text{lerpFactor} = 1 - \text{base}^{\Delta t}$ across all smoothing operations<br/>• **Deterministic 3-Stage Viewport Pipeline**: Spatial Deadzone $\to$ Vertical Hysteresis / Asymmetric Damping $\to$ 2nd-Order Kinetic Look-Ahead ($P + v\Delta t + 0.5a\Delta t^2$)<br/>• Web Audio API algorithmic oscillator synthesis (zero external audio files)<br/>• OffscreenCanvas 2D projection driver & WebGL Post-Process Compositor<br/>• **Hardware Compute Load Balancer (DCLB)**: Frame time $>14.5\text{ms}$ drops shaders $\to$ reduces voices ($8 \to 4$) $\to$ raw ticks                                                                                                                                                                                                                                                                                                                                                    |
| **`[SEC-09]`** | **Pre-Boot AST Linter & Deterministic Error Registry**     | • `auditSystemSourceCode` pre-boot boundary enforcement<br/>• Four Concrete Header Safeguards (Marker check, Anchor check, Anti-Quine, Manifest continuity)<br/>• `[SEC-ERROR-CODES]` Hex-coded deterministic error registry (`ERR_0x01`..`ERR_0x0A`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **`[SEC-10]`** | **Self-Healing, Invariant DSL & Dual-Stream Sinks**        | • Diagnostic fingerprint database (S3776, S2245, S3358, etc.)<br/>• Cognitive Complexity Decomposition Rule ($\le 15$ points)<br/>• Hot-Loop Zero-Allocation Guardrail (`auditHotLoopAllocations`)<br/>• **Formal EBNF Invariant DSL & Deferred Call-Window Verifier**: `no_call(Identifier, MethodName, StateWindow)` and `assert(...)` with deferred evaluation lifecycle (SEM_PARSE $\to$ EXEC_VALIDATE)<br/>• **Logic Lock Semantic State Barrier (C2A-001)**: Mathematical verification of state vectors prior to commit<br/>• **Dual-Stream Sink Isolation**: Stream A (in-memory 256-entry telemetry ring) vs Stream B (binary crash tombstone to `/quarantine/error_audit.bin`)                                                                                                                                                                                                                                                                                              |
| **`[SEC-11]`** | **Sentinel Anti-Theater Mutation Crucible**                | • Multi-pass test battery (VSRP-001 AC-01 through AC-10)<br/>• Deterministic Fault Injection & 100% Mutation Kill Gate<br/>• **Parametrically Independent Test Oracles**: Test runners maintain independent reference implementations to eliminate confirmation bias                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **`[SEC-12]`** | **AI Targeted Refactoring & Dynamic Link Repair**          | • Single-file patch routing & Chunk Diff Engine (`applyHunk`/`rejectHunk`)<br/>• Pre-refactoring 3-step verification pass<br/>• **AOP-VALIDATOR-002 Dynamic Link Repair**: Automated `#region` line recalculation & `CMD-DOC-INDEX` anchor self-healing engine<br/>• **"Law of Primacy" & In-Place Configuration**: Single Source of Truth (SSOT) referenced strictly in place; zero duplicate divergent configs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

## 🛠️ Phased Master Batches for Execution

- **Batch 1:** Sections `[SEC-00]`, `[SEC-01]`, `[SEC-02]`
  - Preamble, Ethos, Anti-Theater Manifest, `[INV-08]` Zero-Transient Policy
  - OSLM Topological Acyclic DAG with Contract `requires`/`provides` + Hopcroft-Tarjan Cut-Vertex Search
  - Transclusion-based `CMD-DOC-INDEX` TOC mapping 25 regions
  - 4-Tier Authority, CSOC Boot Pattern, MPFS-001 Staging Membrane Hygiene
- **Batch 2:** Sections `[SEC-03]`, `[SEC-04]`, `[SEC-05]`
  - VSRP-001 9-Method FSM Lifecycle, Immutable `TemporalTick` Struct, Action-Inversion Deltas & Un-Awaited Microtask Telemetry
  - Ambient Type Facades (`globals.d.ts` Ambient Rule, Branded Scalars)
  - PERSIST-001 Contiguous Memory, 64-Byte PEVM Provenance Ledger
  - Reverse-Topological Merkle-DAG Invalidation, 8-Gate Rehydration Matrix, NDR Corrupt Quarantine & Survivor Buffer
- **Batch 3:** Sections `[SEC-06]`, `[SEC-07]`, `[SEC-08]`
  - Decoupled 3-Layer Input Architecture, `Int32Array` Circular FIFO & Hardware Debug Intercept Chord
  - PMIP-001 Message Envelopes with Causal `traceId`/`parentId`, Default-Deny Typed Edge Matrix & Zero Orphan Bipartite Link Integrity
  - Viewport Engine (Deadzone $\to$ Hysteresis $\to$ 2nd-Order Look-Ahead), Exponential Decay ($1 - \text{base}^{\Delta t}$), Procedural Web Audio Synthesis & Compute Load Balancer (14.5ms Frame Budget Shedding)
- **Batch 4:** Sections `[SEC-09]`, `[SEC-10]`, `[SEC-11]`, `[SEC-12]`
  - Headless Pre-Boot AST Linter & `[SEC-ERROR-CODES]` Hex Registry
  - ERL-001 Self-Healing, S3776 Complexity $\le 15$, Formal EBNF Invariant DSL & Deferred Call-Window Verifier, C2A-001 Logic Lock State Barrier & Dual-Stream Telemetry/Crash Sinks
  - Sentinel Anti-Theater Mutation Crucible with Parametrically Independent Test Oracles
  - AI Targeted Refactoring Map, "Law of Primacy" In-Place Configuration & AOP-VALIDATOR-002 Dynamic Link Repair Engine
- **Batch 5:** Skill Synchronization & Master Verification Gate
  - Update `.agent/skills/phoenix-sovereign-vlt/SKILL.md` (v5.0.0-PRO)
  - Synchronize `docs/architecture/SKILL-PHOENIX-SOVEREIGN-VLT.md`
  - Execute `node testing/run_all_tests.js` (maintain 4/4 green suites)
- **Batch 6:** Transduction Toolchain & Ingestion Bridge (STCP)
  - Semantic Tri-Planar Compilation Protocol (STCP)
  - `synarche_parser.js` Mixin-Stack Parser & GUCA Emitter Specification
  - Define `.phx` / `.syn` DSL-to-Cartridge transpilation standards & Default-Deny Graph Packing

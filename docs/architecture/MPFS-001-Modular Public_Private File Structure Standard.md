# **MPFS-001: Modular Public/Private File Structure Standard**

**Document Identifier:** MPFS-001

**Parent Protocols:** VSRP-001 (Universal Module Contract) / SDCP-001 (Sealed Domain Capability Protocol) / PMIP-001 (Phoenix Modularization & Integration Protocol)

**Classification:** Normative Physical Topology & Architectural Membrane Standard

**Index Anchor:** PRS-001

**Version:** 1.0.0-LOCKED

**Timestamp:** 2026-09-09T22:45:00Z

## **1\. Architectural Intent: The Four Separation Planes**

MPFS-001 provides physical filesystem topology for zero-dependency browser-native software. Systemic boundaries are separated into four decoupled planes to prevent conflating directory layout with security:

&nbsp;

&nbsp;

&nbsp;

┌────────────────────────────────────────────────────────────────────────┐
│ 1\. PHYSICAL PLANE (MPFS-001)                                           │
│    Root Facades vs. Private Subsystems (Human & AI Navigability)       │
├────────────────────────────────────────────────────────────────────────┤
│ 2\. LOGICAL PLANE (VSRP-001)                                            │
│    Canonical 9-Method Interface & Lifecycle FSM Verification           │
├────────────────────────────────────────────────────────────────────────┤
│ 3\. AUTHORITY PLANE (SDCP-001)                                          │
│    Attenuated Capability Scoping (Zero Ambient Authority)              │
├────────────────────────────────────────────────────────────────────────┤
│ 4\. STATE PLANE (Faraday & Transaction Model)                           │
│    Detached Snapshots In • Ephemeral Working Sim • Delta Envelopes Out │
└────────────────────────────────────────────────────────────────────────┘

* **Physical Plane (MPFS-001):** Defines files, directory locations, sequential script evaluation, and cognitive surface area.
* **Logical Plane (VSRP-001):** Mandates lifecycle state transitions, boundary invariance, and terminal garbage-collection guarantees.
* **Authority Plane (SDCP-001):** Governs explicit capability attenuation; physical files provide zero ambient authority.
* **State Plane:** Defines semantic isolation: detached snapshots for simulation, read-only projections for presentation, and validated delta envelopes for mutation.

## **2\. Normative Governing Principles**

### **I. Public Facade Principle**

Every sovereign tenant or peripheral driver MUST expose a single, stable root-level facade file that implements its governing VSRP-001 contract and attaches to window.

### **II. Facade Boundary & Integration Membrane**

The root facade file is the **sole authorized integration point** for an architectural tenant. External tenants MUST NOT reference, import, or invoke private subsystem files. Private submodules constitute internal implementation detail and MAY be refactored, split, or renamed with zero public ripple effects.

### **III. Directional Dependency Invariance**

* Public facades MAY depend downward upon their private internal subsystems.
* Private subsystems MUST NOT depend horizontally upon sibling facades or sibling subsystems.
* Private subsystems MUST NOT reference host runtime internals or ambient globals.
* Dependencies cross boundaries strictly upward via host-brokered event channels or capability handles injected through the facade.

### **IV. Flat Surface Principle**

The project root MUST present an immediately intelligible architectural map of the entire engine. Subdirectories exist solely to encapsulate the private implementation space of their corresponding facade.

### **V. Responsibility Cohesion (Cognitive Sizing)**

Private subsystems SHOULD target approximately 200–500 LOC as an ergonomic baseline. However, **responsibility cohesion takes strict precedence over arbitrary line ceilings**; a cohesive 700-line math/geometry kernel MUST NOT be arbitrarily fractured into artificial files.

### **VI. Authority Restriction & Capability Attenuation (SDCP-001)**

Physical encapsulation grants zero security. Authority MUST be granted exclusively via capability-attenuated contexts. Providing raw, un-attenuated service objects (such as an unrestricted EventBus permitting wildcard subscriptions or global topic publishing) is FORBIDDEN. Tenants MUST receive scoped functional handles restricted to their declared operational namespace (e.g., { publishCombatEvent, subscribeCombatEvents }).

### **VII. Detached State Invariance (Semantic Faraday Boundary)**

A simulation tenant MUST NOT retain or mutate authoritative object references supplied by the host or foreign tenants. State boundary enforcement is semantic:

* Simulation tenants MUST ingest detached snapshots (via structuredClone, serialization, or schema-projected DTOs).
* Simulation tenants MUST maintain an isolated working memory closure.
* Mutations MUST leave the tenant exclusively as validated, schema-conformant delta envelopes committed authoritatively by the host SessionStore.

### **VIII. Presentation Projection Isolation**

Presentation drivers (render()) MUST receive **scoped, read-only projections** containing exclusively the derived visual/auditory state required for rendering. Facades MUST NOT pass live domain working memory or authoritative state graphs into renderer interfaces.

### **IX. Staging Hygiene (Assembly Membrane)**

In browser-native environments without bundlers, private subsystems MUST assemble their interfaces onto a temporary, module-scoped namespace: window.\_\<ModuleName\>Internal. The root facade MUST execute delete window.\_\<ModuleName\>Internal; immediately following instantiation. Staging represents an assembly mechanism for namespace hygiene, not an authority boundary.

### **X. Local-Origin (file://) Executability**

The codebase MUST remain 100% functional when launched directly from the local filesystem via double-clicking index.html. Native ES Module imports (type="module"), build-step transpilations, and package-manager loaders are strictly forbidden.

## **3\. Directory Layout & Physical Topology**

&nbsp;

&nbsp;

&nbsp;

| PlaintextEmberlight/├── index.html                           \# Semantic DOM Shell & Script Order Pipeline├── index.css                            \# Master Aesthetic Stylesheet├── manifest.js                          \# SSOT Data Catalog & World Matrix├── runtime.js                           \# Thin Host Lifecycle Coordinator├── sentinel\_trap.js                     \# Zero-Index Pre-Boot Hardware Interceptor│├── auditor.js                           \# Sentinel Architectural Gatekeeper (Facade)├── governance/                          \# Sentinel Private Subsystems│   └── passes/                          \# Normative Verification Batteries (Passes 00 to 18\)│├── combat.js                            \# Sovereign Combat Sim Tenant (Facade)├── combat/                              \# Combat Private Subsystems│   ├── combat\_calc.js                   \# Pure domain formulas (damage, hit, crit, affinity)│   ├── combat\_queue.js                  \# CTB turn-queue calculation and action delays│   ├── combat\_displacement.js           \# Row shifting, knockback vectors, line-of-defense│   ├── combat\_ai.js                     \# Hostile decision trees and phase enrage logic│   └── combat\_state.js                  \# Snapshot ingestion and delta envelope generation│├── battler\_baker.js                     \# Battler Synthesis Driver (Facade)├── battler\_baker/                       \# Battler Synthesis Private Subsystems│   ├── battler\_primitives.js            \# Palettes, canvas helpers, 4x supersampling math│   ├── battler\_heroes.js                \# Hero anatomy and class silhouettes│   ├── battler\_overlays.js              \# Procedural weapon and armor composite overlays│   ├── battler\_enemies.js               \# Canonical monster procedural silhouettes│   └── battler\_pipeline.js              \# Asset resolution, cache management, PNG encoding│└── \[presentation\_drivers...\]           \# Tier 3 Drivers (combat\_renderer.js, map\_renderer.js) |
| :---- |

## **4\. Attenuated Facade Implementation Blueprint**

&nbsp;

&nbsp;

&nbsp;

| JavaScript*/\* \=========================================================================   FILE: combat.js (Canonical Public Facade with Attenuated Capabilities)   \========================================================================= \*/*const EmberlightCombat \= (() \=\> {  'use strict';  *// 1\. Ingest Private Submodules from Assembly Membrane*  const { Calc } \= window.\_CombatInternal;  *// 2\. Lifecycle State Machine*  const State \= {    UNCONFIGURED: 'UNCONFIGURED',    CONFIGURED: 'CONFIGURED',    INITIALIZED: 'INITIALIZED',    READY: 'READY',    RUNNING: 'RUNNING',    DESTROYED: 'DESTROYED',  };  let lifecycleState \= State.UNCONFIGURED;  let hostConfig \= null;  let capabilities \= null; *// Attenuated capability handles*  let sim \= null;          *// Ephemeral working state*  function assertLifecycle(...allowed) {    if (\!allowed.includes(lifecycleState)) {      throw new Error(\`\[VSRP-001:combat\] Lifecycle Error: Invoked in "${lifecycleState}". Required: ${allowed.join(' | ')}\`);    }  }  return {    configure(config) {      assertLifecycle(State.UNCONFIGURED);      if (\!config?.manifest) throw new Error('\[VSRP-001:combat\] Missing manifest configuration.');      hostConfig \= Object.freeze({ ...config });      lifecycleState \= State.CONFIGURED;    },    init(scopedContext) {      assertLifecycle(State.CONFIGURED);      *// SDCP-001: Enforce Attenuated Capability Surface (Zero Ambient Authority)*      if (\!scopedContext?.emitCombatEvent || typeof scopedContext.emitCombatEvent \!== 'function') {        throw new Error('\[SDCP-001:combat\] Context must provide attenuated "emitCombatEvent" handle.');      }      capabilities \= Object.freeze({        emitEvent: scopedContext.emitCombatEvent,        rng: scopedContext.rng || null,        diagnostics: scopedContext.diagnostics || null      });      lifecycleState \= State.INITIALIZED;    },    reset(snapshot) {      assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);      *// Semantic Faraday Boundary: Ingest detached snapshot*      sim \= structuredClone(snapshot || {});      lifecycleState \= State.READY;    },    update(dt, context) {      assertLifecycle(State.READY, State.RUNNING);      lifecycleState \= State.RUNNING;      *// Step simulation using Calc without mutating host input arrays*    },    render(renderer, context) {      assertLifecycle(State.READY, State.RUNNING);      if (renderer && typeof renderer.renderCombat \=== 'function') {        *// Presentation Projection Isolation: Build scoped, read-only DTO*        const projection \= Object.freeze({          phase: sim.phase,          turnQueue: \[...sim.turnQueue\],          party: sim.party.map(c \=\> ({ id: c.id, hp: c.hp, maxHp: c.maxHp, row: c.row })),          enemies: sim.enemies.map(e \=\> ({ id: e.id, hp: e.hp, maxHp: e.maxHp, row: e.row }))        });        renderer.renderCombat(projection, context);      }    },    getState() {      assertLifecycle(State.READY, State.RUNNING);      return structuredClone(sim); *// Detached POJO snapshot*    },    getDiagnostics() {      return { moduleId: 'combat\_core', lifecycleState, activeUnits: sim?.party?.length || 0 };    },    getModuleInfo() {      return Object.freeze({        moduleId: 'combat\_core',        version: '4.0.0',        protocolVersion: 'VSRP-001',        capabilities: \['combat', 'ctb\_turns', 'displacement'\]      });    },    destroy() {      if (lifecycleState \=== State.DESTROYED) return;      sim \= null;      hostConfig \= null;      capabilities \= null;      lifecycleState \= State.DESTROYED;    }  };})();*// 3\. Purge Staging Membrane & Anchor Public Interface*delete window.\_CombatInternal;if (typeof window \!== 'undefined') {  window.EmberlightCombat \= EmberlightCombat;} |
| :---- |

## **5\. Normative Sentinel Verification Matrix (MPFS Core)**

A codebase conforming to MPFS-001 MUST satisfy the following domain-agnostic architectural passes. Product-specific functional validations (e.g., campaign save size budgets, battle formula balancings, or ECG oscilloscope canvas draws) MUST reside in application-level test suites rather than the core MPFS standard.

&nbsp;

| Pass Index | Verification Target | Normative Assertion & Failure Condition | Protocol Anchor |
| :---- | :---- | :---- | :---- |
| **Pass 00** | **Pre-Boot Hardware Trap** | Assert zero Math.random(), unmanaged timers (setInterval/setTimeout/requestAnimationFrame), or global leaks occurred during parsing. | MPFS-TRAP-001&nbsp; |
| **Pass 01** | **Interface Completeness** | Assert root facade exports all 9 canonical VSRP-001 methods as valid functions. | VSRP-001 §4&nbsp; |
| **Pass 02** | **Faraday Snapshot Isolation** | Ingest a deepFreeze() snapshot in reset(); mutate the outer object (hp \= \-999); assert tenant working state remains unpolluted. | VSRP-001 §2&nbsp; |
| **Pass 03** | **State Round-Trip Idempotency** | Assert reset(getState()) produces an authoritatively equivalent state without memory drift. | VSRP-001 §4.3&nbsp; |
| **Pass 04** | **Deterministic Sim Replay** | Execute two independent runs with identical seeds and identical action envelopes; assert bit-for-bit final state hash parity. | VSRP-001 §4.4&nbsp; |
| **Pass 05** | **PRNG Authority Invariance** | Overwrite global Math.random() with a throwing stub during update(); assert zero invocations (simulation uses seeded stream exclusively). | VSRP-001 §7&nbsp; |
| **Pass 06** | **Context Input Queue Purity** | Provide an input array to update(dt, context); assert tenant does not mutate, splice, or reorder the host array. | VSRP-001 §5&nbsp; |
| **Pass 07** | **Render Idempotency** | Serialize state before and after render(); assert zero state mutation and zero lifecycle state transitions. | VSRP-001 §4.5&nbsp; |
| **Pass 08** | **Metadata Schema Conformance** | Assert getModuleInfo() returns valid { moduleId, version, protocolVersion, capabilities }. | VSRP-001 §4.8&nbsp; |
| **Pass 09** | **Destruction & Teardown Purity** | Assert destroy() is idempotent; assert any subsequent call to update() or reset() throws explicit lifecycle errors. | VSRP-001 §4.9&nbsp; |
| **Pass 10** | **SDCP Capability Registry Seal** | Attempt dynamic runtime injection of an un-attested capability to EventBus; assert invocation is rejected and registry is sealed. | SDCP-001 §3&nbsp; |
| **Pass 11** | **Capability Attenuation Trap** | Assert init(context) rejects raw un-scoped root engine instances; assert handles are strictly attenuated. | SDCP-ATTEN-001&nbsp; |
| **Pass 12** | **Directional Dependency Trap** | Assert private subsystems contain zero references to foreign facade instances, foreign DOM nodes, or outer host harnesses. | MPFS-DIR-001&nbsp; |
| **Pass 13** | **Staging Membrane Purge** | Scan window post-initialization; assert zero lingering window.\_\*Internal staging objects exist in memory. | MPFS-STG-001&nbsp; |
| **Pass 14** | **EventBus Token Teardown** | Ingest peripheral drivers, initialize with mock bus, execute destroy(); assert all subscription unbind tokens were executed (zero dangling listeners). | PMIP-001 §4&nbsp; |
| **Pass 15** | **Projection Isolation** | Pass a mock renderer into render(); assert the renderer receives read-only projected DTOs, not direct simulation references. | MPFS-PRJ-001&nbsp; |
| **Pass 16** | **Peripheral Driver Signatures** | Assert all mounted presentation peripherals implement { init, render/play, getDiagnostics, destroy }. | VSRP-PERIPHERAL&nbsp; |
| **Pass 17** | **Headless Sim Execution** | Execute simulation loop with a null/headless renderer target; assert completion with zero DOM exceptions and zero NaN values. | VSRP-001 §4.5&nbsp; |
| **Pass 18** | **Validated Delta Resolution** | Assert simulation outputs emit schema-conformant delta envelopes to the host rather than direct store mutations. | MPFS-DELTA-001&nbsp; |

## **6\. AI Collaboration & Minimum-Sufficient-Context Rule**

To prevent context contamination and hallucinated interfaces, human/AI workflows MUST adhere to the **Minimum-Sufficient-Context Rule**:

> 1. **Context Scope:** The AI collaborator SHOULD receive the minimum sufficient context required for the requested change.
>
* *Default Baseline:* The Public Facade (e.g., combat.js) \+ the single target subsystem file (e.g., combat/combat\_displacement.js).
* *Permitted Expansion:* Sibling contracts or fixtures MAY be provided exclusively when resolving verified cross-boundary bugs.
>
> 1. **Structural Invariance Verification:** Prior to merging AI modifications, the developer MUST run node tools/verify\_ast.js \<monolith\> \<facade\> \<subsystems...\> to assert bit-for-bit parity across numeric constants, coordinates, and function signatures.
> 2. **Emergency Rollback (GUCA:EMERGENCY\_ROLLBACK):** If an AI introduces package managers, ES Module syntax (import/export), or leaks unmanaged globals, the session must be halted immediately.

&nbsp;

# **Architectural Specification**

# **Phoenix Synarche Vanilla Javascript: The Complete Protocol Stack**

**Document Identifier:** PRS-SPEC-STACK-001

**Parent Standard:** Phoenix Rosetta Stone (PRS-001)

**Version:** 1.0.0-LOCKED

**Classification:** Normative Architectural Standard

**Timestamp:** 2026-09-09T22:16:06-04:00

## **I. Executive Architectural Overview**

The Phoenix Protocol Stack establishes the complete governing framework for zero-dependency, browser-native applications executed under the Phoenix Synarche (Human Intuition \+ AI Logic). The stack decouples software architecture into five strictly bounded protocols, enforcing spatial organization, lifecycle execution, authority constraints, message routing, and continuous mechanical governance.

&nbsp;

&nbsp;

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;THE PHOENIX STACK
&nbsp;┌───────────┬────────────────────────────────────────────────────────┐
&nbsp;│ Standard  │ Architectural Role                                     │
&nbsp;├───────────┼────────────────────────────────────────────────────────┤
&nbsp;│ MPFS-001  │ WHERE code lives on disk & how it safely stages in DOM │
&nbsp;│ VSRP-001  │ HOW a tenant behaves across its 9-method lifecycle     │
&nbsp;│ SDCP-001  │ WHAT authority a tenant is granted via capabilities    │
&nbsp;│ PMIP-001  │ HOW decoupled tenants communicate via event envelopes  │
&nbsp;│ MVP-001   │ Sentinel test battery that audits the entire machine   │
&nbsp;└───────────┴────────────────────────────────────────────────────────┘

## **II. Layer-by-Layer Protocol Specifications**

### **Layer 1: MPFS-001 — Modular Public/Private File Structure**

* **Primary Role:** Physical topology, directory boundaries, and DOM staging hygiene.

#### **What**

MPFS-001 governs the physical organization of the codebase on disk and establishes the staging membrane pattern for multi-file systems running directly via standard \<script\> tags over file://.

#### **How**

* **Root Map Invariance:** The project root contains exclusively public facades, central manifests, and bootstrap files (index.html, manifest.js, runtime.js, combat.js).
* **Private Subsystem Encapsulation:** Private domain complexity is nested within dedicated subdirectories (combat/, battler\_baker/).
* **Assembly Membrane:** Subsystems write to an ephemeral staging object (window.\_\<ModuleName\>Internal) inside an IIFE.
* **Membrane Purge:** The root facade ingests the staging namespace and immediately executes delete window.\_\<ModuleName\>Internal; before exporting its public interface.
* **Directional Gravity:** Public facades may depend downward on private subsystems; private subsystems MUST NOT depend horizontally on sibling subsystems or foreign facades.

#### **Why**

Eliminates 4,000+ line monolithic files and context-window degradation during human/AI collaboration while preserving the ability to launch the entire application with a double-click on index.html without bundlers or CORS violations.

### **Layer 2: VSRP-001 — Universal Module Contract Specification**

* **Primary Role:** Logical boundaries, lifecycle finite state machines (FSM), and memory isolation.

#### **What**

VSRP-001 defines the normative execution contract for all software modules intended for runtime execution, declaring modules as bounded, ephemeral tenants rather than persistent state owners.

#### **How**

* **Lifecycle State Machine:** Strictly enforces sequential, asserted transitions:
  $$\\text{UNCONFIGURED} \\xrightarrow{\\text{configure()}} \\text{CONFIGURED} \\xrightarrow{\\text{init()}} \\text{INITIALIZED} \\xrightarrow{\\text{reset()}} \\text{READY} \\underset{\\text{reset()}}{\\overset{\\text{update()}}{\\rightleftharpoons}} \\text{RUNNING} \\xrightarrow{\\text{destroy()}} \\text{DESTROYED}$$
* **Canonical 9-Method Interface:** Every compliant tenant MUST export exactly:
  1. configure(config): Ingests immutable operational tuning parameters.
  2. init(context): Binds attenuated capability handles.
  3. reset(snapshot): Seeds working memory from a detached snapshot.
  4. update(dt, context): Advances simulation deterministically (simulation only; zero presentation/DOM mutations).
  5. render(renderer, context): Projects read-only state projections onto host renderer interfaces.
  6. getState(): Returns a detached, JSON-serializable POJO snapshot of working memory.
  7. getDiagnostics(): Emits side-effect-free operational telemetry.
  8. getModuleInfo(): Returns machine-readable metadata (moduleId, version, protocolVersion, capabilities).
  9. destroy(): Purges all resources, container listeners, and internal buffers.

#### **Why**

Prevents lifecycle bleeding, hidden closure state, presentation/simulation entanglement, and memory leaks across scene/district transitions.

### **Layer 3: SDCP-001 — Sealed Domain Capability Protocol**

* **Primary Role:** Authority restriction, capability attenuation, and ambient authority elimination.

#### **What**

SDCP-001 is a capability-based security model ensuring that physical file boundaries are backed by strict runtime permission gating. Modules operate under Zero Ambient Authority.

#### **How**

* **Capability Attenuation:** Tenants MUST NOT receive unattenuated host objects (such as raw window, document, localStorage, or an un-scoped EventBus).
* **Scoped Injection:** Tenants receive minimal functional delegates explicitly declared in their contract metadata (e.g., { emitCombatEvent, nextRandomFloat }).
* **Anti-Entropy Registry Sealing:** The capability broker seals its internal provider tables post-boot; dynamic registration of un-attested runtime capabilities throws fatal lifecycle exceptions.

#### **Why**

Guarantees that a compromised or buggy tenant cannot reach beyond its domain—a combat calculation tenant cannot silently write to storage, alter global styles, or manipulate network state.

### **Layer 4: PMIP-001 — Phoenix Modularization & Integration Protocol**

* **Primary Role:** Inter-tenant communication, event topologies, and message envelope schemas.

#### **What**

PMIP-001 defines the standardized protocols and envelope schemas for all asynchronous and synchronous inter-module messaging across the central event broker.

#### **How**

* **Standardized Envelope Schema:** All cross-boundary communications conform to structured, validated envelopes:

```JavaScript
  {
  &nbsp;&nbsp;topic: "combat:resolved",
  &nbsp;&nbsp;source: "combat\_core",
  &nbsp;&nbsp;tick: 4812,
  &nbsp;&nbsp;timestamp: "2026-09-09T22:16:06-04:00",
  &nbsp;&nbsp;payload: { outcome: "VICTORY", goldDelta: 50, expDelta: 120 }
  }
```

* **Tokenized Subscriptions:** EventBus.subscribe() returns an explicit, idempotent unbind function to guarantee zero listener leaks during tenant destruction.
* **Transaction Flow:** Cross-boundary state mutations leave tenants as delta envelopes committed authoritatively by the host SessionStore.

#### **Why**

Eliminates cross-tenant telepathy and spaghetti dependencies, enabling complete event replayability, audit logging, and headless integration testing.

### **Layer 5: MVP-001 — Model Verification Protocol (Sentinel Auditor)**

* **Primary Role:** Automated pre-boot hardware trapping, contract verification, and anti-entropy governance.

#### **What**

MVP-001 is the active governance gatekeeper implemented as a zero-index hardware trap (sentinel\_trap.js) and a multi-pass boot verification battery (auditor.js).

#### **How**

* **Hardware Trap (Index Zero):** Injected as script 0 in index.html, snapshotting pristine window state and shimming browser primitives (Math.random, setInterval, setTimeout, requestAnimationFrame) to log parse-time violations.
* **The 19-Pass Core Sentinel Battery:** Evaluates all mounted tenants against normative criteria before releasing the execution loop to runtime.js:
  * *Pass 00:* Pre-boot trap evaluation (zero parse-time entropy or timer leaks).
  * *Passes 01–09:* Canonical VSRP-001 interface completeness, Faraday snapshot isolation, deterministic replay, PRNG authority, update purity, and destruction idempotency.
  * *Passes 10–13:* SDCP capability sealing, capability attenuation, directional dependency enforcement, and staging membrane deletion.
  * *Passes 14–18:* EventBus token teardown, projection isolation, peripheral driver interfaces, headless simulation, and delta envelope resolution.

#### **Why**

Transforms architectural standards from passive documentation into an automated gatekeeper; if an engineer or AI collaborator breaks a contract, the application halts visibly on boot.

## **III. The Unified Architectural Pipeline**

&nbsp;

&nbsp;

&nbsp;

\[ HARDWARE KEYBOARD / MOUSE EVENT \]
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼
\[ INPUT CONTROLLER (input.js) \] ── Normalizes to Action Tokens ('CONFIRM', 'NAV\_W')
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (input:action Envelope)
\[ RUNTIME COORDINATOR (runtime.js) \]
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (Dispatches Intent to Active District)
┌────────────────────────────────────────────────────────────────────────┐
│ SOVEREIGN TENANT (combat.js / MPFS Facade)                             │
│                                                                        │
│ Ingests Detached Snapshot via reset(snapshot)                          │
│                                                                        │
│ Private Subsystems (combat/\*) execute deterministic domain math:       │
│ • combat\_calc.js • combat\_queue.js • combat\_displacement.js           │
│                                                                        │
│ Projects read-only visual DTO via render(renderer, projection)         │
│                                                                        │
│ Emits resolution envelope (\<district\>:resolved) via attenuated bus    │
└───────────────────────────────────┬────────────────────────────────────┘
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (Delta Envelope)
\[ HOST SESSION STORE (session\_store.js) \] ── Authoritatively Commits State
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (Read-Only Projection)
\[ PRESENTATION DRIVERS (combat\_renderer.js, combat\_vfx.js) \] ── Projects to DOM/Canvas

# **AI Architecture Hand-Off & Onboarding Directive**

\[PHOENIX SYNARCHE OPERATIONAL DIRECTIVE: ARCHITECTURE INGESTION & COMPLIANCE\]

Role: Phoenix-Class Intelligence / Senior Systems Architect

Tone: Architectural, Definitive, Precise

Mission: Ingest, enforce, and operate strictly within the Phoenix Protocol Stack (PRS-SPEC-STACK-001).

&nbsp;

I am handing over the normative architectural standards governing this codebase:

1\. MPFS-001: Modular Public/Private File Structure (Physical Plane & Staging Assembly)

2\. VSRP-001: Universal Module Contract Specification (Logical Plane & 9-Method FSM)

3\. SDCP-001: Sealed Domain Capability Protocol (Authority Plane & Capability Attenuation)

4\. PMIP-001: Phoenix Modularization & Integration Protocol (Message Envelopes & Event Bus)

5\. MVP-001: Model Verification Protocol (Sentinel Hardware Trap & 19-Pass Audit Gate)

&nbsp;

\---

&nbsp;

\#\#\# NON-NEGOTIABLE OPERATIONAL CONSTRAINTS

&nbsp;

When proposing changes, writing code, or generating refactoring plans, you MUST adhere strictly to the following invariants:

&nbsp;

1\. Zero Tooling & Browser-Native Execution (\`file://\` Invariance):

&nbsp;&nbsp;&nbsp;\- The application MUST execute directly by double-clicking \`index.html\` from the local file system.

&nbsp;&nbsp;&nbsp;\- DO NOT use ES Module syntax (\`import\`, \`export\`, \`export default\`), CommonJS (\`require\`), or bundler tooling.

&nbsp;&nbsp;&nbsp;\- All script loading occurs sequentially via standard \`\<script src="..."\>\` tags.

&nbsp;

2\. MPFS-001 Physical Topology & Directional Gravity:

&nbsp;&nbsp;&nbsp;\- The filesystem root contains ONLY entry points, global manifests, and public tenant facades.

&nbsp;&nbsp;&nbsp;\- Private algorithms, math, and drawing logic live in tenant-specific subdirectories (e.g., \`combat/\`, \`battler\_baker/\`).

&nbsp;&nbsp;&nbsp;\- Downward dependency ONLY: Facades may call private subsystems. Private subsystems MUST NOT depend horizontally on sibling subsystems or foreign facades.

&nbsp;&nbsp;&nbsp;\- Assembly Membrane: Subsystems write to \`window.\_\<ModuleName\>Internal\`. The root facade ingests this namespace and executes \`delete window.\_\<ModuleName\>Internal;\` immediately to maintain pristine global hygiene.

&nbsp;

3\. VSRP-001 Canonical 9-Method Contract:

&nbsp;&nbsp;&nbsp;\- Every public facade MUST implement: \`configure\`, \`init\`, \`reset\`, \`update\`, \`render\`, \`getState\`, \`getDiagnostics\`, \`getModuleInfo\`, and \`destroy\`.

&nbsp;&nbsp;&nbsp;\- \`update(dt, context)\` is for DETERMINISTIC SIMULATION ONLY (Zero DOM, style, or canvas mutations).

&nbsp;&nbsp;&nbsp;\- Presentation isolation: \`render(renderer, context)\` receives a read-only, scoped projection DTO—it never receives live simulation memory.

&nbsp;

4\. SDCP-001 Attenuated Authority:

&nbsp;&nbsp;&nbsp;\- Physical layout grants zero authority. \`init(context)\` receives ONLY attenuated capability delegates (e.g., \`{ emitCombatEvent, rng }\`).

&nbsp;&nbsp;&nbsp;\- Passing raw \`window\`, \`document\`, \`localStorage\`, or an un-scoped \`EventBus\` into a tenant is a constitutional violation.

&nbsp;

5\. Semantic Faraday Isolation & Validated Deltas:

&nbsp;&nbsp;&nbsp;\- A tenant MUST NOT retain or mutate authoritative host references. Ingest detached snapshots via \`reset()\`.

&nbsp;&nbsp;&nbsp;\- State mutations leave tenants exclusively as schema-conformant delta envelopes committed authoritatively by the host \`SessionStore\`.

&nbsp;

6\. Code Preservation & Anti-Truncation:

&nbsp;&nbsp;&nbsp;\- When refactoring, DO NOT summarize, hallucinate, or truncate coordinate arrays, math formulas, or balance tables.

&nbsp;&nbsp;&nbsp;\- Never output placeholder comments like \`// ...rest of drawing code...\`.

&nbsp;

\---

&nbsp;

\#\#\# ACKNOWLEDGMENT REQUIREMENT

&nbsp;

Before writing code or accepting tasks, acknowledge receipt of this standard by providing:

1\. A concise confirmation of the 5 layers of the Phoenix Protocol Stack.

2\. An explicit commitment to the Zero-Tooling / \`file://\` constraint.

3\. Confirmation of readiness to receive GUCA operational commands (e.g., \`GUCA:AUDIT\_MONOLITH\`, \`GUCA:EXTRACT\_SUBSYSTEM\`, \`GUCA:SEAL\_FACADE\`).

&nbsp;

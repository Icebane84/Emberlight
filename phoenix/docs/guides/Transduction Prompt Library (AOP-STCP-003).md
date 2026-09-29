# **Tab 1**

### **Architectural Review & Verification: Transduction Prompt Library**

Plaintext

Document Identifier: AOP-STCP-AUDIT-001
Classification:      Constitutional Verification & Compliance Review
Governing Standards: PSGC-001 / PERSIST-001 / SDCP-001 / VSRP-001 / MPFS-001
Audited Artifact:    Transduction Prompt Library (Modules 01 \- 05 & Operational Rules)
Timestamp:           2026-09-25T01:14:00-04:00
Status:              VERIFIED WITH MANDATORY RECTIFICATIONS

### ---

**Executive Summary**

#### **What**

A constitutional audit of the documented **Transduction Prompt Library (Modules 01–05)** and **Operational Governance Rules** to confirm strict compliance with the **Phoenix Sovereign Grand Constitution (PSGC-001)**, the **Zero-Transient Policy (\[INV-08\])**, **Contiguous Binary Memory Authority (\[INV-05\])**, and **Sealed Capability Attenuation (SDCP-001)**.

#### **How**

Each prompt module was evaluated against the 10-point Sentinel Acceptance Battery (AC-01 through AC-10), the 8-Gate Rehydration Matrix, the canonical 96-byte tripartite header layout (\[SEC-05.1\]), and the hot-loop allocation rules of auditHotLoopAllocations (\[SEC-10.1\]).

#### **Why**

Exploratory prototypes in Vite/React routinely rely on hidden garbage-collected primitives (dynamic string construction, inline path objects, TextMetrics heap allocations). If an extraction prompt does not explicitly forbid these hidden allocations or leaves room for memory schema drift, the generated output will fail pre-flight Sentinel audits (ERR\_0x01, ERR\_0x06, ERR\_0x07).

### ---

**I. Comprehensive Compliance Matrix**

| Module / Directive                         | \[INV-05\] 2,048B Contiguous Heap | \[INV-08\] Zero Hot-Loop Allocations | \[SEC-05.1\] Canonical 96B Header | \[INV-06\] Action-Inversion Delta | Status                     |
| :----------------------------------------- | :-------------------------------- | :----------------------------------- | :-------------------------------- | :-------------------------------- | :------------------------- |
| **Module 01: Subsystem Parity Manifest**   | N/A (Audit)                       | N/A (Audit)                          | N/A (Audit)                       | N/A (Audit)                       | **PASS**                   |
| **Module 02: State-to-Heap Transduction**  | PASS                              | PASS                                 | **WARN** (Field Order)            | PASS                              | **CONDITIONAL**            |
| **Module 03: Pure Canvas 2D Transduction** | PASS                              | **WARN** (Hidden GC APIs)            | N/A                               | PASS                              | **CONDITIONAL**            |
| **Module 04: Particle Ring Buffer**        | **WARN** (Heap Contention)        | PASS                                 | N/A                               | PASS                              | **CONDITIONAL**            |
| **Module 05: Monolith Synthesis**          | PASS                              | PASS                                 | PASS                              | PASS                              | **WARN** (Missing Anchors) |
| **Operational Governance Rules**           | PASS                              | PASS                                 | PASS                              | PASS                              | **PASS**                   |

### ---

**II. Critical Audit Findings & Necessary Rectifications**

#### **1\. Module 02: Canonical 96-Byte Header Field Sequencing (\[SEC-05.1\])**

* **The Issue:** Module 02 instructs:
  0x000..0x01F: MAGIC (0x5053594E), Version (0x00000001), State enum, Seed, Tick u64, Payload Length (1952), CRC32.
* **Constitutional Defect:** Under PSGC-001 \[SEC-05.1\], the 32-byte Core Header layout is strictly ordered by byte offset:
  * 0x000 (4B): MAGIC (0x5053594E)
  * 0x004 (8B): TICK\_COUNT (BigInt64LE)
  * 0x00C (4B): PRNG\_SEED (Uint32LE)
  * 0x010 (4B): PAYLOAD\_LENGTH (Uint32LE)
  * 0x014 (4B): CRC32 (Uint32LE)
  * 0x018 (4B): FORMAT\_VERSION (Uint32LE \= 0x00000001)
  * 0x01C (4B): RESERVED (Zero-filled)
* **The Fix:** The prompt must explicitly enumerate the byte offsets and scalar types verbatim. Listing Version before Tick u64 causes LLMs to emit Version at offset 0x004, violating Gate 1 and Gate 3 of the 8-Gate Rehydration Matrix and throwing ERR\_0x01: MAGIC\_MISMATCH.

#### **2\. Module 03: Hidden Heap Allocations in Canvas 2D (\[INV-08\])**

* **The Issue:** The prompt correctly bans template strings (e.g., \`rgba(...)\`). However, renderer.ts contains two hidden JavaScript heap allocations that standard linters miss:
  1. ctx.measureText(labelText): Instantiates a transient TextMetrics object on the heap on every frame.
  2. ctx.createRadialGradient(...) inside render(): While native, calling gradient factory methods per frame creates underlying wrapper objects.
* **Constitutional Defect:** \[INV-08\] bans any transient object creation in hot loops.
* **The Fix:** Add an explicit constraint to Module 03:
  * ctx.measureText is **banned** in the 60Hz loop. UI text elements must use pre-calculated fixed bounds.
  * ctx.createRadialGradient / createLinearGradient must only be instantiated if necessary, or replaced with constant alpha fills (ctx.globalAlpha) and pre-calculated radial color ramps.
  * new Path2D() is **permanently banned**.

#### **3\. Module 04: Persistent Heap vs. Ephemeral Presentation Memory (\[INV-05\])**

* **The Issue:** Module 04 introduces pre-allocated typed arrays for 64 particles (Float32Array, Uint8Array).
* **Constitutional Defect:** 64 particles with 7 Float32 fields and 1 Uint8 field consume \$64 \\times (7 \\times 4 \+ 1\) \= 1,856\$ bytes. If an LLM attempts to allocate this inside the PERSIST-001 heap, it will consume 95% of the 1,952-byte payload capacity, leaving insufficient space for entities and game state, triggering ERR\_0x13: PERSIST\_CAPACITY\_EXCEEDED.
* **The Fix:** Module 04 must explicitly instruct that particle typed arrays reside in **Plane 1 Module Closure (Ephemeral Presentation Space)** and must **never** be mapped into the PERSIST-001 binary heap. The binary heap is reserved strictly for state that survives rehydration across runs.

#### **4\. Module 05: Structural Anchors for Pre-Boot AST Linter (\[SEC-01.2\] & \[SEC-09.1\])**

* **The Issue:** Module 05 instructs the model to create a monolith, but does not mandate the canonical MPFS-001 \#region structural anchors.
* **Constitutional Defect:** When auditSystemSourceCode executes in \<head\> (CSOC Phase 1), Safeguard 1 asserts the presence of eight required section anchors: \['\[SEC-00\]', '\[SEC-03\]', '\[SEC-04\]', '\[SEC-05\]', '\[SEC-06\]', '\[SEC-09\]', '\[SEC-11\]', '\[SEC-23\]'\]. If the synthesized monolith lacks these anchors, the engine immediately halts at the boot barrier with ERR\_0x01: MAGIC\_MISMATCH.
* **The Fix:** Module 05 must mandate that the generated single-file container embeds all required \#region \[SEC-XX\] markers in ascending numerical order.

### ---

**III. Hardened Transduction Prompts (Normative v1.1)**

Below are the rectified prompt templates ready for deployment.

#### ---

**Hardened Module 02: State-to-Heap Transduction (PERSIST-001)**

Plaintext

TRANSDUCTION MANDATE: PERSIST-001 BINARY HEAP EXTRACTION

Extract the simulation state from \[STATE\_SOURCE\_FILE\] into a canonical PERSIST-001 binary layout compliant with PSGC-001 \[SEC-05\] and SDCP-001 \[SEC-02\].

Invariants Enforced:
1\. Canonical 96-Byte Header \[SEC-05.1\] (Exact byte offsets and types):
   \- Part A: Core Header (0x000..0x01F) \[32 Bytes\]
     \* 0x000 (4B): MAGIC \= 0x5053594E ('PSYN') (Uint32LE)
     \* 0x004 (8B): TICK\_COUNT (BigInt64LE)
     \* 0x00C (4B): PRNG\_SEED (Uint32LE)
     \* 0x010 (4B): PAYLOAD\_LENGTH \= 1952 (Uint32LE)
     \* 0x014 (4B): CRC32 (Uint32LE)
     \* 0x018 (4B): FORMAT\_VERSION \= 0x00000001 (Uint32LE)
     \* 0x01C (4B): RESERVED (Uint32LE \= 0\)
   \- Part B: PEVM Provenance Ledger (0x020..0x03F) \[32 Bytes\]
     \* 0x020 (12B): CARTRIDGE\_UUID (Uint8\[12\])
     \* 0x02C (4B): MONOTONIC\_EPOCH (Uint32LE)
     \* 0x030..0x03F (16B): RESERVED (Zero-filled)
   \- Part C: Capability & Audit Record (0x040..0x05F) \[32 Bytes\]
     \* 0x040 (4B): CAPABILITY\_MASK \= 0x07 (Uint32LE)
     \* 0x044 (1B): AUTHORITY\_TIER \= 2 (Uint8)
     \* 0x045 (3B): RESERVED (Zero-filled)
     \* 0x048 (16B): SGI\_FEATURE\_HASH (Uint8\[16\])
     \* 0x058 (4B): AUDIT\_SALT (Uint32LE)
     \* 0x05C (4B): RESERVED (Zero-filled)
2\. Simulation Payload Region (0x060..0x7FF) \[1,952 Bytes\] \[INV-05\]:
   \- All player kinematics, metronome registers, fiend entity pools (stride-aligned), and projectile vectors must fit within offsets 0x060 to 0x7FF.
   \- Total ArrayBuffer allocation: exactly 2,048 bytes.
3\. Capability Attenuation \[INV-07 & SDCP-001\]:
   \- In configure(ctx), bind rawMemory dynamically:
     if (ctx && typeof ctx.requestLinearMemory \=== 'function') rawMemory \= ctx.requestLinearMemory(2048);
     else rawMemory \= new ArrayBuffer(2048);
     mem \= new DataView(rawMemory);
4\. Zero Hot-Loop Allocation \[INV-08\]:
   \- All state reading and writing must use DataView with explicit little-endian booleans. No object allocations in update().

Output the complete, un-truncated JavaScript memory offset definitions, DataView getters/setters, and the configure(ctx) initialization block.

#### ---

**Hardened Module 03: Pure Canvas 2D Transduction (\[SEC-08\])**

Plaintext

TRANSDUCTION MANDATE: CANVAS 2D RENDERER TRANSDUCTION

Port the procedural drawing routines from \[RENDERER\_SOURCE\_FILE\] directly into a standalone render(ctx) method compliant with PSGC-001 \[SEC-08\] and VSRP-001 \[SEC-03\].

Strict Transduction Constraints:
1\. Zero Creative Synthesis:
   \- Do NOT simplify, approximate, or replace existing drawing math.
   \- Preserve every bezier curve, quadratic arc, drop shadow, roundRect call, and stroke width verbatim from the source.
2\. Zero Hot-Loop Allocation \[INV-08\]:
   \- BAN dynamic string allocations and template literals in render paths (no \`rgba(...)\`).
   \- Use static hex color literals or set opacity via ctx.globalAlpha.
   \- BAN ctx.measureText() in the hot loop. Use fixed, pre-calculated text metrics.
   \- BAN new Path2D() and dynamic gradient generation inside render(). Use pre-allocated gradients or static fills.
3\. Layer Preservation:
   \- Layer 1: Background & Striated Tile Grid (48px alignment).
   \- Layer 2: Asymmetric Conduits with traveling action potential sparks (pulseT calculation) and rotating node bio-pins.
   \- Layer 3: Floor Decals, Stains & Bone Barricades.
   \- Layer 4: Enemy Threat Telegraph Cones & Animated Tracking Lasers.
   \- Layer 5: Textured Entity Silhouettes (Behemoth horned gauntlets & pulsing furnace core, Scavenger 4-plate chitin carapaces with leg wiggle).
   \- Layer 6: Articulated Player Spine & Facing Blade.
   \- Layer 7: World-Space Dynamic Lighting Vignette (Radial gradient anchored to player position \[player\_x, player\_y\], fading to dark void).
   \- Layer 8: Pulsing Arterial Border Veins (Traveling white boluses & diastolic purple vapor clouds).

Output the complete, syntactically finished render(ctx) implementation. Do NOT use placeholder comments.

#### ---

**Hardened Module 04: Fixed-Capacity Particle Ring Buffer**

Plaintext

TRANSDUCTION MANDATE: PARTICLE SYSTEM CIRCULAR BUFFER PORT

Transpile the dynamic particle manager from \[SOURCE\_FILE\] into a fixed-capacity, zero-allocation ring buffer compliant with INV-08 and Faraday isolation.

Engineering Specifications:
1\. Ephemeral Presentation Memory (Non-Persisted):
   \- Particle arrays reside exclusively in Plane 1 Module Closure.
   \- Do NOT map particle telemetry into the 2,048-byte PERSIST-001 binary heap.
2\. Pre-Allocated Typed Arrays:
   \- Store all particle telemetry in module-scoped flat arrays:
     \* partX \= new Float32Array(MAX\_PARTICLES)
     \* partY \= new Float32Array(MAX\_PARTICLES)
     \* partVX \= new Float32Array(MAX\_PARTICLES)
     \* partVY \= new Float32Array(MAX\_PARTICLES)
     \* partLife \= new Float32Array(MAX\_PARTICLES)
     \* partMaxLife \= new Float32Array(MAX\_PARTICLES)
     \* partSize \= new Float32Array(MAX\_PARTICLES)
     \* partType \= new Uint8Array(MAX\_PARTICLES)
3\. Capacity & Ring Recycling:
   \- Capacity: exactly 64 particles.
   \- Spawning advances a circular head index: head \= (head \+ 1\) & 63\.
   \- Overwrite oldest slots; NEVER call Array.push(), Array.splice(), or new Object().
4\. Visual Parity:
   \- Support particle types: 1=Dust Plume (calcified ash drift), 2=Airborne Blood/Marrow (velocity-stretched teardrop), 3=Bone Shards (angular rotating triangle).
5\. Dual Render Passes:
   \- renderFloorStains(ctx): Renders expired blood droplets as persistent floor decals.
   \- renderAirborneParticles(ctx): Renders active flying particles with linear alpha fade (partLife / partMaxLife).

Output the self-contained particle buffer state, the spawnParticle helper, the updateParticles(dt) loop, and the renderParticles(ctx) pass.

#### ---

**Hardened Module 05: Monolith Synthesis & Structural Anchor Assembly**

Plaintext

TRANSDUCTION MANDATE: ZERO-DEPENDENCY MONOLITH ASSEMBLY

Synthesize the audited subsystems (Modules 01 \- 04\) into a single, self-contained HTML monolith executable directly via file:/// without build tools or dependencies, fully compliant with PSGC-001.

Structural & Constitutional Requirements:
1\. MPFS-001 Structural Anchors \[SEC-01.2\]:
   The file MUST contain the following normative comment anchors in ascending numerical order to satisfy auditSystemSourceCode \[SEC-09.1\]:
   \- //\#region \[SEC-00\] \--- PREAMBLE & AST LINTER
   \- //\#region \[SEC-01\] \--- PRESENTATION STYLES & VIEWPORT
   \- //\#region \[SEC-02\] \--- VIEWPORT SOCKET & HUD DOCKS
   \- //\#region \[SEC-03\] \--- VSRP-001 SOVEREIGN TENANT CORE
   \- //\#region \[SEC-04\] \--- AMBIENT CONTRACTS & SCHEMAS
   \- //\#region \[SEC-05\] \--- PERSIST-001 BINARY HEAP & MEMORY MAP
   \- //\#region \[SEC-06\] \--- DECOUPLED INPUT RING BUFFER
   \- //\#region \[SEC-09\] \--- PRE-BOOT BOUNDARY VERIFICATION
   \- //\#region \[SEC-11\] \--- SENTINEL PRE-FLIGHT GATE
   \- //\#region \[SEC-23\] \--- HOST COORDINATOR & EVENT LOOP
2\. Fixed Viewport Geometry:
   \- Canvas buffer strictly locked to width="1248" height="960".
   \- CSS aspect-ratio fitting (1248 / 960\) centered in viewport.
3\. Inlined VSRP-001 Cartridge \[SEC-03\]:
   \- Canonical 9 methods: configure, boot, activate, update, render, suspend, serialize, deserialize, destroy.
   \- FSM state enforcement: update() returns null unless ACTIVE (3); serialize() returns null unless SUSPENDED (4).
   \- Pure math update(tick, input) with exponential velocity decay: 1 \- Math.pow(base, dt) \[P-05\].
   \- Returns pre-allocated, recycled stateDelta envelope \[INV-06\].
4\. Host Coordinator (Plane 0 & 2):
   \- Decoupled input capture writing to frozen input snapshots.
   \- Monotonic 60Hz accumulator loop driving requestAnimationFrame \[INV-04\].
   \- ZERO console.log in hot-loop execution paths \[INV-08\].

Output the complete, un-truncated single-file HTML document ready for double-click execution.

### ---

**IV. Updated Operational Governance Rules**

To guarantee zero regression during execution:

1. **Strict Context Grounding (Anti-Simulation Invariant CSVG-01):** The model must never invent drawing procedures or state offsets from memory. The literal contents of state.ts, renderer.ts, and constants.ts must be provided directly in the prompt context.
2. **Sequential Phase Gating:** A phase must be validated before moving to the next:
   \$\$\\text{Audit (Mod 01)} \\longrightarrow \\text{Heap (Mod 02)} \\longrightarrow \\text{Renderer (Mod 03)} \\longrightarrow \\text{Particles (Mod 04)} \\longrightarrow \\text{Monolith (Mod 05)}\$\$
3. **Rejection Trigger on Placeholders:** Any output containing // ..., /\* TODO \*/, or missing methods triggers an immediate abort and regeneration.
4. **Resolution Lock:** The internal rendering buffer must remain locked to the source grid coordinates (\$1248 \\times 960\$ at 48px tile strides). Scaling is handled purely through CSS layout.
5. **Sentinel Static Audit:** Before testing in the browser, the output must be checked for:
   * 0x5053594E magic signature at byte 0x000.
   * Zero occurrences of console.log inside update or render.
   * Zero occurrences of new Path2D, new Array, or template strings inside render.

### ---

**Honest Thoughts**

The Transduction Prompt Library is the exact missing link between rapid React prototyping and constitutional single-file production.
Earlier, when we asked the AI to create a monolith in one shot, it had to juggle game loop kinematics, memory layouts, particle dynamics, and canvas math all within a single generation window. The AI protected its token limit by pruning the visual math—deleting the arterial blood pulses, flattening the Behemoth's chest, and discarding the footstep dust.
By breaking the extraction into these five sequential prompts with explicit byte offsets, strict allocation bans, and mandatory section anchors, you remove the LLM's ability to summarize or improvise. It converts the AI from an unpredictable creative synthesizer into a deterministic code transpiler.

# **Tab 2**

### **Architectural Specification: Transduction Prompt Library (AOP-STCP-003)**

**Document Identifier:** AOP-STCP-PROMPT-001

**Classification:** Operational Playbook & AI Transduction Toolchain

**Parent Standard:** Phoenix Sovereign Grand Constitution (PSGC-001) / Semantic Tri-Planar Compilation Protocol (STCP-001)

**Timestamp:** 2026-09-25T01:12:00-04:00

---

### **Executive Architectural Directive**

#### **What**

A standardized, multi-stage **Transduction Prompt Library** designed to deterministically extract game state, simulation math, procedural rendering paths, and particle dynamics from exploratory web prototypes (React, Vite, TypeScript, Canvas) into zero-dependency, constitutionally compliant VSRP-001 cartridges and single-file monoliths.

#### **How**

By decomposing extraction into **discrete, non-creative transduction phases** (Audit \$\\to\$ Memory Packing \$\\to\$ Canvas Transduction \$\\to\$ Particle Conversion \$\\to\$ Monolith Assembly). Each prompt forbids code synthesis, enforces strict input-to-output parity, mandates pre-allocated memory structures, and penalizes shorthand approximations.

#### **Why**

Large language models naturally fall into the **Semantic Compression Trap** when prompted with high-level conversion tasks. Attempting an "all-in-one" extraction forces the model to compress hundreds of lines of trigonometric canvas math and state logic into generic placeholders (ctx.arc, ctx.strokeRect), stripping out visual grit and mechanical depth. Segmented, invariant-bound prompts enforce line-for-line fidelity.

---

### **The Transduction Prompt Library (Modules 01 \- 05\)**

---

#### **Module 01: Subsystem Parity Manifest (Audit & Feature Inventory)**

**Objective:** Force the AI to inventory all active mathematical, visual, and behavioral systems in the source code *before* attempting any code generation.

Plaintext

AUDIT MANDATE: SUBSYSTEM PARITY MANIFEST GENERATION

Analyze the provided exploratory source files (\[FILE\_NAMES, e.g., engine.ts, renderer.ts, state.ts\]).
Do NOT write or rewrite any game code yet.

Generate an exhaustive, line-item Subsystem Parity Manifest table with the following columns:
1\. Subsystem Category (Tilemap, Conduits, Lighting, Entities, Hazards, Telemetry, Particles)
2\. Source Implementation (Exact function name, coordinates, formulas, or constants)
3\. Visual / Mathematical Mechanism (Describe the exact geometric paths, bezier curves, trigonometric oscillations, color hexes, and blend modes used)
4\. Constitutional Destination (PERSIST-001 Heap offset, Module Closure Array, or Render Loop)
5\. Anti-Regression Invariant (Explicit check to ensure this feature is not dropped or simplified during transduction)

Ensure every particle effect (dust, blood, steam, sparks), threat telegraph cone, floor fracture highlight, arterial vein wave, and camera transform is accounted for.

---

#### **Module 02: State-to-Heap Transduction (PERSIST-001 Memory Packing)**

**Objective:** Map all mutable domain state from JavaScript objects or TypeScript interfaces into the contiguous 2,048-byte linear ArrayBuffer without touching presentation code.

Plaintext

TRANSDUCTION MANDATE: PERSIST-001 BINARY HEAP EXTRACTION

Extract the simulation state from \[STATE\_SOURCE\_FILE, e.g., state.ts\] into a canonical PERSIST-001 binary layout compliant with PSGC-001 \[SEC-05\] and SDCP-001 \[SEC-02\].

Invariants Enforced:
1\. Canonical 96-Byte Header \[SEC-05.1\]:
   \- 0x000..0x01F: MAGIC (0x5053594E), Version (0x00000001), State enum, Seed, Tick u64, Payload Length (1952), CRC32.
   \- 0x020..0x03F: PEVM Provenance Ledger (12-byte Cartridge UUID, Monotonic Epoch).
   \- 0x040..0x05F: Capabilities Bitmask (0x07), Tier (2), SGI Feature Hash, Audit Salt.
2\. Contiguous Memory Authority \[INV-05\]:
   \- Pack all player registers, cardiac metronome timers, bio-electric bitmasks, fiend pools (stride-aligned), and projectile vectors into offsets 0x060 through 0x7FF.
   \- Max payload: 1,952 bytes. Total ArrayBuffer size: exactly 2,048 bytes.
3\. Zero Runtime Allocation \[INV-08\]:
   \- Author accessors strictly via DataView with explicit little-endian byte ordering.
   \- Do NOT allocate objects or closures in state update routines.

Output the complete, un-truncated JavaScript memory offset definitions, the DataView binding schema, and the state initialization block.

---

#### **Module 03: Pure Canvas 2D Transduction (1:1 Renderer Extraction)**

**Objective:** Transpile the procedural canvas drawing routines line-for-line, stripping framework dependencies while preserving all visual shaders, paths, and lighting effects.

Plaintext

TRANSDUCTION MANDATE: CANVAS 2D RENDERER TRANSDUCTION

Port the procedural drawing routines from \[RENDERER\_SOURCE\_FILE, e.g., renderer.ts\] directly into a standalone render(ctx, state) method compliant with PSGC-001 \[SEC-08\].

Strict Transduction Constraints:
1\. Zero Creative Synthesis:
   \- Do NOT simplify, approximate, or replace existing drawing math.
   \- Preserve every bezier curve, quadratic arc, arc segment, drop shadow, roundRect call, and stroke width verbatim from the source.
2\. Zero Hot-Loop Allocation \[INV-08\]:
   \- BAN dynamic string allocations and template literals in render paths (e.g., no \`rgba($r,${g},$b,${a})\`).
   \- Use static hex color literals or set opacity via ctx.globalAlpha.
   \- Pre-allocate any math vectors or arrays in module closure.
3\. Layer Preservation:
   \- Layer 1: Background & Striated Tile Grid (48px alignment).
   \- Layer 2: Asymmetric Conduits with traveling action potential sparks (pulseT calculation) and rotating node bio-pins.
   \- Layer 3: Floor Decals, Stains & Bone Barricades.
   \- Layer 4: Enemy Threat Telegraph Cones & Animated Tracking Lasers.
   \- Layer 5: Textured Entity Silhouettes (Behemoth horned gauntlets & pulsing furnace core, Scavenger 4-plate chitin carapaces).
   \- Layer 6: Articulated Player Spine & Facing Blade.
   \- Layer 7: World-Space Dynamic Lighting Vignette (Radial gradient anchored to player position \[player.x, player.y\], fading to 0.92 dark void).
   \- Layer 8: Pulsing Arterial Border Veins (Traveling white boluses & diastolic purple vapor clouds).

Output the complete, syntactically finished render(ctx, state) implementation. Do NOT use placeholder comments.

---

#### **Module 04: Fixed-Capacity Particle Ring Buffer Transduction**

**Objective:** Convert dynamic object-allocating particle systems into fixed-stride, typed-array circular FIFO buffers that prevent garbage-collection frame drops.

Plaintext

TRANSDUCTION MANDATE: PARTICLE SYSTEM CIRCULAR BUFFER PORT

Transpile the dynamic particle manager from \[SOURCE\_FILE, e.g., ParticleSystem in renderer.ts\] into a fixed-capacity, zero-allocation ring buffer compliant with INV-08.

Engineering Specifications:
1\. Pre-Allocated Typed Arrays:
   \- Store all particle telemetry in module-scoped flat arrays:
     \* partX \= new Float32Array(MAX\_PARTICLES)
     \* partY \= new Float32Array(MAX\_PARTICLES)
     \* partVX \= new Float32Array(MAX\_PARTICLES)
     \* partVY \= new Float32Array(MAX\_PARTICLES)
     \* partLife \= new Float32Array(MAX\_PARTICLES)
     \* partMaxLife \= new Float32Array(MAX\_PARTICLES)
     \* partSize \= new Float32Array(MAX\_PARTICLES)
     \* partType \= new Uint8Array(MAX\_PARTICLES)
2\. Capacity & Ring Recycling:
   \- Capacity: exactly 64 particles.
   \- Spawning advances a circular head index: head \= (head \+ 1\) % MAX\_PARTICLES.
   \- Overwrite oldest slots; NEVER call Array.push(), Array.splice(), or new Object().
3\. Visual Parity:
   \- Support particle types: 1=Dust Plume (calcified ash drift), 2=Airborne Blood/Marrow (velocity-stretched teardrop), 3=Bone Shards (angular rotating triangle).
4\. Dual Render Passes:
   \- renderFloorStains(ctx): Renders expired blood droplets as persistent floor decals.
   \- renderAirborneParticles(ctx): Renders active flying particles with linear alpha fade (partLife / partMaxLife).

Output the self-contained particle buffer state, the spawnParticle helper, the updateParticles(dt) loop, and the renderParticles(ctx) pass.

---

#### **Module 05: Monolith Synthesis & Sentinel Pre-Flight Assembly**

**Objective:** Assemble the extracted memory layout, simulation math, canvas renderer, and particle buffers into a single, executable .html file governed by a 60Hz accumulator loop.

Plaintext

TRANSDUCTION MANDATE: ZERO-DEPENDENCY MONOLITH ASSEMBLY

Synthesize the audited subsystems (Modules 01 \- 04\) into a single, self-contained HTML monolith executable directly via file:/// without build tools or dependencies.

Container Architecture (PSGC-001):
1\. Shell:
   \- Root Obsidian Slate CSS tokens.
   \- Viewport container locked to 1248x960 internal resolution via fixed canvas width/height and CSS aspect-ratio fitting.
   \- Minimal diegetic telemetry HUD anchor in bottom-left.
2\. Inlined VSRP-001 Cartridge \[SEC-03\]:
   \- Encapsulate the simulation inside an IIFE exporting configure, boot, activate, update, render, suspend, serialize, deserialize, and destroy.
   \- Enforce FSM state gates: update() returns null unless ACTIVE; serialize() returns null unless SUSPENDED.
   \- Update() receives frozen tick and input snapshots, executes pure math kinematics with exponential decay (1 \- pow(base, dt)), and returns a recycled stateDelta envelope.
3\. Host Coordinator \[Plane 0 & 2\]:
   \- Decoupled DOM event listeners capture keyboard/mouse actions into numerical bitmasks.
   \- Fixed 60Hz monotonic accumulator loop driving requestAnimationFrame.
   \- Zero transient console logging \[INV-08\].

Output the 100% complete, un-truncated .html document ready for immediate execution.

---

### **Operational Governance Rules for Execution**

1. **Sequential Execution Only:** Never combine Module 01 (Audit) and Module 03 (Renderer) into a single generation prompt. Auditing must complete and be verified before code emission begins.
2. **Strict Context Injection:** When executing Module 03, always pass the literal text of renderer.ts into the context window. Never ask the model to infer or recall drawing math from memory.
3. **Rejection Trigger on Placeholders:** If an emitted code block contains // ... rest of drawing logic ... or substitutes a multi-stop gradient with a flat color fill, reject the response immediately and enforce complete syntax output.
4. **Resolution Invariance:** The internal canvas drawing resolution must remain fixed at $1248\times 960$ (or the exact design dimensions of the source slice). Dynamic canvas resizing (canvas.width \= window.innerWidth) without camera scaling is classified as an architectural regression.

---

### **Honest Thoughts**

The root failure in software extraction isn't a lack of model capability—it is asking the model to perform architecture, translation, optimization, and compression in a single prompt. When an LLM is faced with 1,500 lines of complex canvas paths and asked to "make a monolith," it protects its output token budget by summarizing the code into basic shapes.

By turning transduction into an explicit, sequential pipeline where auditing happens first, state memory is locked second, and canvas procedures are transpiled line-for-line without creative liberty, you remove the model's ability to improvise. This prompt library turns fuzzy LLM code generation into a predictable compiler pipeline.

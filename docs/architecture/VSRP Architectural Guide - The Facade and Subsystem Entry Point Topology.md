# **VSRP Architectural Guide: The Facade & Subsystem Entry Point Topology**

**Document Identifier:** ARCH-SPEC-FACADE-TOPOLOGY-001  
**Parent Protocol:** VSRP-001 (Universal Module Contract Specification)  
**Classification:** Architectural Guidance & Structural Decomposition Standard  
**Index Anchor:** PRS-001  
**Timestamp:** 2026-09-08T17:24:46Z

## **1\. Executive Intent: The Architectural Dilemma**

As vanilla JavaScript systems expand, monolithic source files regularly balloon past 4,000+ lines of code. This produces cognitive fatigue, tangled concerns, and high risk during maintenance.  
However, introducing heavy tooling (such as Webpack, Vite, or native ES Modules with import/export) breaks the zero-dependency **"double-click index.html via file://"** development capability due to strict browser CORS security policies on local module origins.  
The **Facade / Subsystem Entry Point Topology** solves this trade-off:

* It decomposes massive monolithic scripts into discrete, single-responsibility domain files.  
* It maintains full, 100% compliance with the 9-method VSRP-001 contract and Sentinel audits (auditor.js).  
* It keeps the repository root uncluttered by placing only lean entry points (\~150–300 lines) at the top level.  
* It runs natively in any standard browser via standard \<script\> tags with zero build steps, zero node dependencies, and zero CORS locks.

## **2\. Core Architecture: What, How, and Why**

### **The Staging Membrane Pattern**

┌──────────────────────────────────────────────────────────────────────────────┐  
│ ROOT DIRECTORY: LEAN ENTRY POINTS ONLY                                      │  
│ index.html  •  manifest.js  •  runtime.js                                    │  
│ combat.js (VSRP-001 Facade)  •  battler\_baker.js (VSRP-001 Facade)            │  
└───────▲──────────────────────────────────────────────────────────────▲───────┘  
        │ Orchestrates & Seals                                         │ Orchestrates & Seals  
┌───────┴───────────────────────────────┐      ┌───────────────────────┴───────┐  
│ combat/ (Subsystems)                  │      │ battler\_baker/ (Subsystems)   │  
│ • combat\_calc.js                      │      │ • battler\_primitives.js       │  
│ • combat\_queue.js                     │      │ • battler\_heroes.js           │  
│ • combat\_ai.js                        │      │ • battler\_enemies.js          │  
│ • combat\_displacement.js              │      │ • battler\_pipeline.js         │  
│                                       │      │                               │  
│ Writes to: window.\_CombatInternal     │      │ Writes to: window.\_Battler... │  
└───────────────────────────────────────┘      └───────────────────────────────┘

* **What:** A architectural separation where internal domain logic executes in isolated private scopes within subdirectories, writes pure functions and data tables to a temporary staging namespace (e.g., window.\_ModuleNameInternal), and is ingested by a root facade file.  
* **How:**  
  1. Internal files load in sequential dependency order via standard \<script\> tags in index.html.  
  2. The root facade file loads immediately after the internal scripts. It ingests the staged modules, encloses them within a private closure, implements the formal VSRP-001 state machine, and attaches the canonical module object to window.  
  3. The root facade explicitly deletes the temporary staging namespace (delete window.\_ModuleNameInternal), leaving the global browser scope clean of intermediate internals.  
* **Why:** This satisfies both the browser's script evaluation model and VSRP-001 Section 2 (Zero Host Pollution). The host runtime and auditor interact only with the sealed facade, completely unaware of whether the tenant is 1 file or 10 files.

## **3\. Directory & File Organization Standards**

To maintain clean repository topology, adhere strictly to the following directory rules:

Plaintext  
Emberlight/  
├── index.html                           // Host DOM Shell & Script Dependency Ingestion  
├── manifest.js                          // SSOT Canonical Data & Game Manifest  
├── runtime.js                           // Host Lifecycle Coordinator  
│  
├── combat.js                            // Tenant Facade: Combat Engine (VSRP-001)  
├── combat/                              // Tenant Subsystems  
│   ├── combat\_calc.js                   // Pure damage, hit, and affinity formulas  
│   ├── combat\_queue.js                  // CTB turn calculation & action delays  
│   ├── combat\_ai.js                     // Boss phase logic & hostile decision trees  
│   └── combat\_displacement.js           // Row shifting & formation collision math  
│  
├── battler\_baker.js                     // Peripheral Facade: Battler Synthesizer (VSRP-001)  
├── battler\_baker/                       // Peripheral Subsystems  
│   ├── battler\_primitives.js            // Palettes, 4x supersampling math & draw helpers  
│   ├── battler\_heroes.js                // Hero anatomy & class base silhouettes  
│   ├── battler\_overlays.js              // Procedural weapon & armor composite layers  
│   ├── battler\_enemies.js               // 7 Canonical enemy procedural silhouettes  
│   └── battler\_pipeline.js              // Asset resolvers, aliases & PNG encoding  
│  
└── governance/                          // Sentinel Verification Subsystem  
    ├── auditor.js                       // Sentinel Gatekeeper Facade  
    └── passes/                          // Decomposed Test Batteries (Passes 01 to 19\)

## **4\. Implementation Protocol: The 3 Construction Steps**

### **Step 1: Internal Subsystem Implementation**

Internal subsystem scripts must be wrapped in IIFEs and attach strictly to the temporary staging namespace. They must never touch document, window globals, or persistent state directly.

JavaScript  
/\* \=========================================================================  
   FILE: combat/combat\_calc.js  
   ROLE: Pure Domain Calculus Subsystem  
   \========================================================================= \*/  
window.\_CombatInternal \= window.\_CombatInternal || {};

(() \=\> {  
  'use strict';

  function calculateDamage(attacker, defender, skillNode) {  
    const atk \= attacker.atk || 1;  
    const def \= defender.def || 0;  
    const mult \= skillNode?.mult || 1.0;  
    const base \= Math.max(1, atk \* mult \- (def \* 0.5));  
    return Math.round(base);  
  }

  function evaluateAffinity(attackElement, defenderAffinities) {  
    if (\!attackElement || \!defenderAffinities) return 1.0;  
    if (defenderAffinities.weakness?.includes(attackElement)) return 1.5;  
    if (defenderAffinities.resistance?.includes(attackElement)) return 0.5;  
    return 1.0;  
  }

  window.\_CombatInternal.Calc \= Object.freeze({  
    calculateDamage,  
    evaluateAffinity,  
  });  
})();

### **Step 2: The Root Facade Implementation**

The root file (combat.js) imports the staging namespace, encapsulates runtime state, implements the canonical VSRP-001 9-method contract, and purges the staging namespace:

JavaScript  
/\* \=========================================================================  
   FILE: combat.js  
   ROLE: Canonical VSRP-001 Facade Entry Point  
   \========================================================================= \*/  
const EmberlightCombat \= (() \=\> {  
  'use strict';

  // 1\. Ingest from Temporary Staging Namespace  
  const { Calc } \= window.\_CombatInternal;

  // 2\. Lifecycle State Machine  
  const State \= {  
    UNCONFIGURED: 'UNCONFIGURED',  
    CONFIGURED: 'CONFIGURED',  
    INITIALIZED: 'INITIALIZED',  
    READY: 'READY',  
    RUNNING: 'RUNNING',  
    DESTROYED: 'DESTROYED',  
  };

  let lifecycleState \= State.UNCONFIGURED;  
  let hostConfig \= null;  
  let hostContext \= null;  
  let sim \= null;

  function assertLifecycle(...allowed) {  
    if (\!allowed.includes(lifecycleState)) {  
      throw new Error(\`\[VSRP-001:combat\] Lifecycle Error: Invoked during ${lifecycleState}. Required: ${allowed.join(' | ')}\`);  
    }  
  }

  // 3\. Export Canonical VSRP-001 9-Method Interface  
  return {  
    configure(config) {  
      assertLifecycle(State.UNCONFIGURED);  
      if (\!config?.manifest) throw new Error('\[VSRP-001:combat\] Missing manifest configuration.');  
      hostConfig \= Object.freeze({ ...config });  
      lifecycleState \= State.CONFIGURED;  
    },

    init(context) {  
      assertLifecycle(State.CONFIGURED);  
      if (\!context?.eventBus) throw new Error('\[VSRP-001:combat\] Missing host eventBus handle.');  
      hostContext \= context;  
      lifecycleState \= State.INITIALIZED;  
    },

    reset(snapshot) {  
      assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);  
      // Faraday Cage: Deep-clone snapshot to prevent memory contamination  
      sim \= structuredClone(snapshot || {});  
      sim.turn \= 0;  
      sim.phase \= 'START';  
      lifecycleState \= State.READY;  
    },

    update(dt, context) {  
      assertLifecycle(State.READY, State.RUNNING);  
      lifecycleState \= State.RUNNING;  
      // Delegate to pure internal calculators  
      // (Simulation step calculations executed strictly without presentation side-effects)  
    },

    render(renderer, context) {  
      assertLifecycle(State.READY, State.RUNNING);  
      // Presentation Delegation: Delegate to external Tier 3 driver  
      if (renderer && typeof renderer.render \=== 'function') {  
        renderer.render(this.getState(), context?.dispatch);  
      }  
    },

    getState() {  
      assertLifecycle(State.READY, State.RUNNING);  
      return structuredClone(sim); // Return detached serializable POJO  
    },

    getDiagnostics() {  
      return { moduleId: 'combat\_core', lifecycleState, activeUnits: sim?.party?.length || 0 };  
    },

    getModuleInfo() {  
      return Object.freeze({  
        moduleId: 'combat\_core',  
        version: '4.0.0',  
        protocolVersion: 'VSRP-001',  
        capabilities: \['combat', 'ctb\_turns', 'displacement'\],  
      });  
    },

    destroy() {  
      if (lifecycleState \=== State.DESTROYED) return;  
      sim \= null;  
      hostConfig \= null;  
      hostContext \= null;  
      lifecycleState \= State.DESTROYED;  
    },  
  };  
})();

// 4\. Seal Namespace & Expose Facade to Host  
delete window.\_CombatInternal;

if (typeof window \!== 'undefined') {  
  window.EmberlightCombat \= EmberlightCombat;  
}

### **Step 3: Script Ordering in index.html**

In index.html, declare the subsystem dependencies in order, directly followed by the facade:

HTML  
\<\!-- Combat Subsystems (Internal Parts) \--\>  
\<script src\="combat/combat\_calc.js"\>\</script\>  
\<script src\="combat/combat\_queue.js"\>\</script\>  
\<script src\="combat/combat\_displacement.js"\>\</script\>

\<\!-- Combat Facade Entry Point (Seals and Exports) \--\>  
\<script src\="combat.js"\>\</script\>

## **5\. VSRP-001 Validation & Anti-Entropy Invariants**

Structuring a module across multiple files can introduce architectural leaks if discipline is lost. To ensure the **Sentinel Auditor (auditor.js)** continues to report passing checks across all 19 passes, verify these 5 invariant gates:

| Audit Gate | Architectural Invariant | How the Subsystem Topology Enforces It |
| :---- | :---- | :---- |
| **Pass 1: Interface Completeness**  | All 9 canonical methods must exist on the root module. | The root facade exports all 9 methods directly; internal scripts never export partial lifecycles to window. |
| **Pass 1 & 17: Faraday Isolation**  | No mutations to host snapshot objects (hp \= \-999). | The facade executes structuredClone() inside reset() before handing state to any subsystem. |
| **Pass 13: Zero Host Pollution**  | No unmanaged global variables or leaking bindings. | Facade calls delete window.\_ModuleNameInternal immediately upon instantiation. |
| **Pass 17: Update Purity (AC-06)**  | update(dt, context) must never mutate host input queues. | Internal calculation functions act as pure transforms ($f(state, input) \\to delta$). |
| **Pass 17: PRNG Authority (AC-05)**  | Zero calls to global unseeded Math.random(). | Subsystems ingest the seeded prng stream via the facade rather than calling native entropy. |

## **6\. Migration Checklist for Bloated Monoliths**

When breaking down an existing 3,000+ line file:

> 1. **Create the Subsystem Directory:** Create \<module\_name\>/ alongside the root \<module\_name\>.js.  
> 2. **Extract Presentation First:** Move all DOM queries, HTML template interpolation, and Canvas draw methods into \<module\_name\>\_renderer.js.  
> 3. **Isolate Pure Math & Tables:** Move static balance tables, token dictionaries, and damage/curve calculus into \<module\_name\>\_calc.js or \<module\_name\>\_primitives.js.  
> 4. **Wire the Staging Object:** Ensure extracted files assign their public utilities to window.\_\<ModuleName\>Internal.  
> 5. **Trim the Facade:** Strip the root file down to the VSRP-001 lifecycle state machine, event subscriptions, and subsystem coordination.  
> 6. **Purge Namespace:** Add delete window.\_\<ModuleName\>Internal to the bottom of the facade.  
> 7. **Verify via Sentinel:** Double-click index.html and confirm that auditor.js boots with all checks passing.

## **Honest Thoughts**

This topology provides clean organization without introducing unwanted complexity. The web development industry often treats bundlers as an absolute prerequisite for modular code, forgetting that JavaScript's native execution model handles multi-file composition cleanly if you respect execution order and namespace lifecycle.  
By utilizing the temporary staging membrane (window.\_Internal), you gain the readability of small, 200-line focused files while strictly guaranteeing that your root files remain lean facades. More importantly, the entire engine stays fully playable with a simple double-click on index.html directly from the filesystem, preserving zero-overhead local development without CORS complications.
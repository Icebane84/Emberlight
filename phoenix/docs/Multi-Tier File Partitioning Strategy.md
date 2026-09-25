# ARCHITECTURAL SPECIFICATION: Multi-Tier File Partitioning & Monolith Governance Strategy

**Document Identifier:** ARCH-CODE-PARTITION-001
**Version:** 2.0.0-UNIVERSAL
**Timestamp:** 2026-09-20T16:25:00-04:00
**Governing Standard:** VSRP-001 / MPFS-001 / PRS-ARC-020
**Classification:** Universal Vanilla JavaScript Architectural Standard

---

## 1. Executive Summary & Core Premise

In a zero-dependency, zero-bundler vanilla JavaScript architecture (operating natively over `file:///` or standard HTTP without npm packages, Webpack, or Babel), development teams face two opposing architectural hazards:

1. **The Fragmentation Trap:** Splitting code into hundreds of tiny files creates dependency-order fragility, script-tag waterfalls, and cognitive navigation fatigue.
2. **The Monolith Trap:** Keeping 3,000+ lines in a single file risks invisible coupling, accidental variable shadowing, and massive cognitive overhead.

The **Multi-Tier File Partitioning Strategy (MPFS-001)** bridges this divide. It provides a universal, language-native structural methodology combining:

- **Native Editor `#region` Folding** (Spatial Control)
- **Top-Level Manifests & Regex Jump Anchors** (Zero-Latency Navigation)
- **Extraction-Ready JSDoc Contracts** (Static Type Safety & Zero Closure Coupling)
- **The Staging Membrane & Root Facade Pattern** (Multi-File Extraction Protocol)

```plaintext
┌────────────────────────────────────────────────────────────────────────┐
│               UNIVERSAL VANILLA JS PARTITIONING TOPOLOGY               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  1. REGION FOLDING   │ │  2. JUMP ANCHORS     │ │  3. JSDOC CONTRACTS  │
│  //#region [SEC-XX]  │ │  Top Manifest Table  │ │  @typedef, @param    │
│  Collapsible blocks  │ │  Zero-latency regex  │ │  Static type safety  │
│  in IDE Outline      │ │  navigation via F12  │ │  via checkJs: true   │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
                                    │
                                    ▼ (When splitting into multiple files)
┌────────────────────────────────────────────────────────────────────────┐
│     4. MPFS-001 STAGING MEMBRANE & ROOT FACADE SEALING PATTERN         │
│  Sub-modules populate staging -> Root seals global -> Purges membrane   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Structural Layer 1: Native Editor `#region` Folding

Modern editors (VS Code, Cursor, Antigravity) natively parse language-specific `#region` comment directives across JavaScript, CSS, and HTML without plugins or external tooling.

### Syntax by Language

#### JavaScript (`.js`)

```javascript
//#region [SEC-01] INITIALIZATION & LIFECYCLE
function configure(config) {
    // Pure configuration
}

function init(context) {
    // Subsystem initialization
}
//#endregion
```

#### CSS (`.css`)

```css
/* #region [CSS-01] OBSIDIAN SLATE DESIGN TOKENS & TYPOGRAPHY */
:root {
    --bg-primary: #090d13;
    --text-primary: #f8fafc;
    --accent-cyan: #00f0ff;
}
/* #endregion */
```

#### HTML (`.html`)

```html
<!-- #region [DOM-01] MASTER WORKSPACE HEADER & STATUS CONTROLS -->
<header id="workspace-header">
    <div class="brand">PHOENIX SOVEREIGN IDE</div>
    <div id="status-pill">READY</div>
</header>
<!-- #endregion -->
```

### Operational Benefits

- **Fold All Regions:** Press <kbd>Ctrl</kbd> + <kbd>K</kbd>, <kbd>Ctrl</kbd> + <kbd>0</kbd> (or <kbd>Cmd</kbd> + <kbd>K</kbd>, <kbd>Cmd</kbd> + <kbd>0</kbd>). A 6,000-line monolith collapses into an 8-line clean table of contents.
- **Unfold All:** Press <kbd>Ctrl</kbd> + <kbd>K</kbd>, <kbd>Ctrl</kbd> + <kbd>J</kbd>.
- **Outline Navigation:** Open the IDE Symbol/Outline tree (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd>) to click directly between subsystems.

---

## 3. Structural Layer 2: Table of Contents & Regex Jump Anchors

Navigating by manual scrolling causes cognitive friction. Every partitioned file must feature an immutable header block listing exact jump anchors (`[SEC-XX]`, `[CSS-XX]`, `[DOM-XX]`).

### Header Template

```javascript
/**
 * ============================================================================
 * ARCH-001: COMBAT SIMULATION CORE ENGINE
 * Governing Standard: VSRP-001 / MPFS-001
 * Lines: ~3,200 | Authority: Headless Simulation Substrate
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION JUMP ANCHORS (Ctrl+F):
 * [SEC-01] Ambient Type Definitions & DTO Contracts (@typedef)
 * [SEC-02] Module Lifecycle Gate (configure, init, reset, destroy)
 * [SEC-03] CTB Turn Queue & Velocity Calculus
 * [SEC-04] Damage Formulas, Affinity & Critical Strike Matrix
 * [SEC-05] Tactical Displacement Engine (Knockback / Pull)
 * [SEC-06] Status Ailment Engine (Burn, Poison, Stun ticks)
 * [SEC-07] Host State Synchronization & Snapshot Factory (getState)
 * ============================================================================
 */
```

### How to Navigate

Press <kbd>Ctrl</kbd> + <kbd>F</kbd>, type `[SEC-04]`, and press <kbd>Enter</kbd>. You jump directly to the target subsystem header instantly, bypassing manual search terms like `calculateDamage` that may occur dozens of times.

---

## 4. Structural Layer 3: Extraction-Ready JSDoc Contracts

The primary danger of large JavaScript files is **invisible coupling** (functions at line 2,500 mutating variables declared at line 30).

By enforcing JSDoc annotations evaluated via `jsconfig.json` (`"checkJs": true`), vanilla JavaScript gains compile-time type safety with zero build steps.

### Defining Shared DTOs (`@typedef`)

```javascript
//#region [SEC-01] AMBIENT TYPES & DTO CONTRACTS

/**
 * @typedef {Object} BattlerUnit
 * @property {string} id Unique instance token
 * @property {string} name Display name
 * @property {number} hp Current health points
 * @property {number} maxHp Maximum health pool
 * @property {number} atk Attack strength
 * @property {number} def Defense rating
 * @property {'FRONT' | 'BACK'} row Active formation row
 * @property {string[]} ailments Active status conditions
 */

/**
 * @typedef {Object} StrikeCalculationResult
 * @property {number} damage Net damage dealt
 * @property {boolean} isCrit Critical strike flag
 * @property {'WEAK' | 'RESIST' | 'NEUTRAL'} affinity Affinity modifier
 */

//#endregion
```

### Pure Function Contracts (Zero-Closure Leakage)

```javascript
//#region [SEC-04] DAMAGE FORMULAS & AFFINITY ENGINE

/**
 * Pure calculation helper.
 * Zero external closure reads. Ready for instant extraction into a separate file.
 *
 * @param {BattlerUnit} attacker Striking entity
 * @param {BattlerUnit} target Receiving entity
 * @param {number} [skillPower=1.0] Skill potency multiplier
 * @param {number} [randomFloat=0.5] Seeded stochastic variation in [0, 1)
 * @returns {StrikeCalculationResult}
 */
function calculateStrikeDamage(attacker, target, skillPower = 1.0, randomFloat = 0.5) {
    if (!attacker || !target) {
        return { damage: 0, isCrit: false, affinity: 'NEUTRAL' };
    }

    const variance = (randomFloat * 0.1) - 0.05; // +/- 5%
    const isCrit = randomFloat < 0.10;
    const rawDamage = Math.max(1, (attacker.atk * 2) - target.def);
    const finalDamage = Math.floor(rawDamage * skillPower * (isCrit ? 1.5 : 1.0) * (1 + variance));

    return {
        damage: Math.max(1, finalDamage),
        isCrit,
        affinity: 'NEUTRAL'
    };
}

//#endregion
```

---

## 5. Structural Layer 4: The MPFS-001 Multi-File Extraction Pattern

When a domain grows so large that it must be split across physical files, use the **Staging Membrane & Root Facade Sealing Pattern**. This prevents script-tag waterfalls from polluting the global `window` scope with dozens of loose functions.

```plaintext
┌────────────────────────────────────────────────────────┐
│ 1. Sub-Modules populate private staging membrane:      │
│    window._CombatInternal.calc = calculateDamage;      │
│    window._CombatInternal.queue = processTurnQueue;    │
└───────────────────────────┬────────────────────────────┘
                            │ (Executed in topological load order)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Root Facade (combat.js) ingests membrane:           │
│    - Assembles public API singleton                    │
│    - Calls Object.freeze(EmberlightCombat)             │
│    - Purges staging object: delete window._Combat*     │
└────────────────────────────────────────────────────────┘
```

### Sub-Module Example (`combat/combat_calc.js`)

```javascript
(function () {
    'use strict';
    const _membrane = window._CombatInternal = window._CombatInternal || {};

    function calculateDamage(attacker, target) {
        return Math.max(1, (attacker.atk * 2) - target.def);
    }

    _membrane.calculateDamage = calculateDamage;
})();
```

### Root Facade Sealing Example (`combat.js`)

```javascript
const EmberlightCombat = (function () {
    'use strict';
    const _sub = window._CombatInternal || {};

    const publicApi = {
        calculateDamage: _sub.calculateDamage || ((a, b) => 0),
        version: '1.0.0'
    };

    // Seal API singleton to prevent runtime monkey-patching
    Object.freeze(publicApi);

    // Purge the temporary staging membrane completely
    if (typeof window !== 'undefined') {
        delete window._CombatInternal;
    }

    return publicApi;
})();

if (typeof window !== 'undefined') window.EmberlightCombat = EmberlightCombat;
if (typeof module !== 'undefined') module.exports = EmberlightCombat;
```

---

## 6. Canonical Living Reference: `phoenix/core_governor.html`

The flagship living implementation of this universal standard is [`phoenix/core_governor.html`](file:///c:/Users/Chris/Emberlight/phoenix/core_governor.html) (6,800+ lines in a single self-contained monolith):

- **`[CSS-01]` through `[CSS-12]`**: Obsidian Slate design system, two-column layout, Monaco editor viewports, slide-over telemetry drawers.
- **`[DOM-01]` through `[DOM-09]`**: Workspace mode toggles, AST symbol outline tree, Diff staging modals, welcome hubs.
- **`[SEC-00]` through `[SEC-15]`**: Virtual File System (VFS), PEVM Governor, Ollama local AI bridge, 4-tier Crucible Sandbox, Diff preview, Procedural Audio Synth, and Game Dev Workstation.

---

## 7. Operational Directives for AI Agents & Artificers

When an autonomous AI agent inspects, modifies, or refactors a file governed by this standard:

1. **Locate via Jump Anchor:** Always search for the section tag (`[SEC-XX]`) rather than reading the entire file sequentially.
2. **Preserve Section Demarcations:** Edits must remain strictly enclosed between `//#region [SEC-XX]` and `//#endregion`.
3. **Pure Function Signatures:** Never access or mutate outer closure variables from inside a calculation helper. Pass all dependencies as explicit parameters.
4. **Cognitive Complexity Guardrail ($\le 15$):** If a function's complexity exceeds 15, invert control flow using early-return guard clauses and extract small, pure JSDoc-typed helpers co-located directly above the function *inside the same region*.
5. **Zero Placeholders:** Never emit `// ...` or `/* ... */` placeholder comments in replacement blocks. Always emit 100% syntactically complete code.

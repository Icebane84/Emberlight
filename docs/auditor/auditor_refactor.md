`GUCA:SCHEMA_STAGING auditor` — Formalizing the staging membrane contract. Reading function signatures precisely before locking the interface.

Ran command: `Select-String -Path "auditor.js" -Pattern "^\s{2}function [a-zA-Z]" | ForEach-Object { $ln = $_.LineNumber; $line = $_.Line.Trim(); "$ln : $line" }`
Viewed auditor.js:133-142
Viewed auditor.js:139-212
Viewed auditor.js:214-380

I now have everything needed. Here is the formal staging membrane contract:

---

## `GUCA:SCHEMA_STAGING auditor`

```
Module:    EmberlightAuditor
Protocol:  VSRP-001 / MVP-001 / SDCP-001
Namespace: window._AuditorInternal
Sub-files: 7 + 1 facade
```

---

### Staging Membrane Write Order (Topological)

```
auditor/auditor_kernel.js          → window._AuditorInternal.Kernel
auditor/auditor_contracts.js       → window._AuditorInternal.Contracts
auditor/auditor_district_sims.js   → window._AuditorInternal.DistrictSims
auditor/auditor_combat_extended.js → window._AuditorInternal.CombatExtended
auditor/auditor_persistence.js     → window._AuditorInternal.Persistence
auditor/auditor_constitutional.js  → window._AuditorInternal.Constitutional
auditor/auditor_endgame.js         → window._AuditorInternal.Endgame
auditor.js (facade)                → reads all keys, delete window._AuditorInternal, exports
```

---

### ⚡ Critical Dependency: `logAudit` & `sim` Injection Pattern

Every sub-module calls `logAudit()`, which mutates `sim` — a live object that **only exists in the facade closure**. The solution:

**`_AuditorInternal.Kernel.logAudit` is not a static function** — it is a **factory** that the facade injects after creating `sim`:

```js
// In auditor.js facade, after sim = createDefaultState():
window._AuditorInternal.Kernel._bindLog(sim);

// In auditor_kernel.js:
let _boundSim = null;
window._AuditorInternal.Kernel = {
  _bindLog(simRef) {
    _boundSim = simRef;
  },
  logAudit(message, passed = true) {
    if (!_boundSim) return;
    _boundSim.totalChecks += 1;
    if (passed) _boundSim.complianceScore += 1;
    _boundSim.auditLog.push({
      message,
      passed,
      timestamp: new Date().toISOString(),
    });
  },
  // ...
};
```

All other sub-modules call `window._AuditorInternal.Kernel.logAudit(msg, pass)` — they never hold a direct `sim` reference.

---

### Full Interface Contract

```ts
window._AuditorInternal = {

  // ─── auditor_kernel.js ──────────────────────────────────────────────────
  Kernel: {
    /** Binds the live sim accumulator for the current audit run. Called once per reset(). */
    _bindLog(simRef: AuditState): void;

    /** Logs one check result into the bound sim accumulator. */
    logAudit(message: string, passed?: boolean): void;

    /** Recursively Object.freeze()s an object graph. */
    deepFreeze<T extends object>(obj: T): Readonly<T>;

    /** Returns a fresh, zeroed AuditState object. */
    createDefaultState(): AuditState;

    /** Returns a minimal in-process synchronous EventBus instance. */
    createIsolatedEventBus(): { publish(event, payload): void; subscribe(event, cb): Unsubscribe; };
  },

  // ─── auditor_contracts.js ───────────────────────────────────────────────
  Contracts: {
    /** Pass 1 dispatcher — runs tenant signatures, Faraday traps, peripheral driver audits. */
    runContractAndFaradayAudit(
      registeredModules: Record<string, VSRPModule>,
      registeredDrivers: DriverRegistry | null,
      manifest: EmberlightManifest
    ): void;
  },

  // ─── auditor_district_sims.js ───────────────────────────────────────────
  DistrictSims: {
    /** Pass 2 — 20 headless combat match simulations. */
    runInSituCombatAudit(manifest, combatModule, iterations?: number): void;
    /** Pass 3 — Overworld collision matrix. */
    runInSituOverworldAudit(manifest, overworldModule): void;
    /** Pass 4 — Market commerce & economy balance. */
    runInSituMarketAudit(manifest, marketModule): void;
    /** Pass 5 — Progression graph + 77-node Aether validation. */
    runInSituProgressionAudit(manifest, progressionModule): void;
    /** Pass 6 — Lockpick harmonic resonance envelope. */
    runInSituLockpickAudit(manifest, lockpickModule): void;
    /** Pass 7 — Relic Forge determinism & economic envelope. */
    runInSituRelicForgeAudit(manifest, forgeModule): void;
    /** Pass 8 — Pseudo-3D frustum & DDA headless raycast. */
    runInSituPseudo3DAudit(manifest, pseudo3DModule): void;
  },

  // ─── auditor_combat_extended.js ─────────────────────────────────────────
  CombatExtended: {
    /** Pass 9 — SDCP-001 capability registry seal & anti-entropy. */
    runSDCPCapabilityAudit(manifest, eventBusRef): void;
    /** Pass 10 — Formation topology & backline shielding invariance. */
    runInSituFormationShieldingAudit(manifest, combatModule): void;
    /** Pass 11 — Boss phase shaders, status ailment DOT ticks. */
    runInSituBossAndAilmentAudit(manifest, combatModule, vfxModule): void;
    /** Pass 12 — Dual-perspective 960×360 / 480×260 immersion buffer scaling. */
    runInSituDualPerspectiveAudit(manifest, pseudo3DModule): void;
  },

  // ─── auditor_persistence.js ─────────────────────────────────────────────
  Persistence: {
    /** Pass 13 — EventBus tokenization, compression budget, peripheral teardowns. */
    runPersistenceAndTeardownAudit(manifest, bus, drivers): void;
    /** Sub-pass — Battler sprite & biome backdrop synthesis. */
    runCombatAestheticsAudit(manifest, battlerBaker, backdropDriver): void;
    /** Pass 15 — Chest walkability, overworld navigation, input queue flush. */
    runDistrictTransitionsAndChestAudit(manifest, overworldModule, inputDriver, bus): void;
    /** Pass 16 — Dynamic stat projection, quest hierarchy, field pouch. */
    runSurfacingAndLegibilityAudit(manifest): void;
  },

  // ─── auditor_constitutional.js ──────────────────────────────────────────
  Constitutional: {
    /** Pass 17 — All 10 AC acceptance criteria (AC-01 through AC-10). */
    runConstitutionalComplianceAudit(
      manifest,
      registeredModules: Record<string, VSRPModule>,
      registeredDrivers: DriverRegistry | null,
      bus
    ): void;
  },

  // ─── auditor_endgame.js ─────────────────────────────────────────────────
  Endgame: {
    /** Pass 18 — KNOCKBACK / PULL / Boss immunity displacement invariance. */
    runTacticalDisplacementAudit(manifest, combatModule): void;
    /** Pass 19 — Status deep analysis, armory paper-doll, radar projection. */
    runDeepAnalysisWorkstationAudit(manifest, statusModule, armoryModule, battlerDriver): void;

    // --- Dispatch Spine ---
    /** Resolves a module from the targets dict with global window fallback. */
    resolveTargetModule(targets, key: string, globalFallback): VSRPModule | undefined;
    /** Resolves the pseudo-3D module with BOTH key variants ('pseudo3d' | 'pseudo3D'). */
    resolvePseudo3DTarget(targets): VSRPModule | undefined;
    /** Builds a normalized driver registry from snapshot.drivers or window globals. */
    resolveDriverRegistry(snapshotDrivers): DriverRegistry;
    /** Sequences all 19 audit passes in canonical order. */
    executeAuditPasses(targets, drivers, activeManifest, bus): void;
    /** Default console/output renderer when no Tier 3 auditor renderer is mounted. */
    renderDefaultPresentation(): void;
  },
};
```

---

### Internal Function Cross-Dependency Map

```
auditor_contracts.js depends on:
  ← Kernel.logAudit
  ← Kernel.deepFreeze
  ← Constants: REQUIRED_LIFECYCLE_METHODS, PERIPHERAL_DRIVER_CONTRACTS (injected via facade)

auditor_district_sims.js depends on:
  ← Kernel.logAudit

auditor_combat_extended.js depends on:
  ← Kernel.logAudit
  ← Kernel.deepFreeze  (used in AC-02/07 snapshot freezing)

auditor_persistence.js depends on:
  ← Kernel.logAudit
  ← Kernel.deepFreeze
  ← Kernel.createIsolatedEventBus  (used in auditPersistenceCompression)

auditor_constitutional.js depends on:
  ← Kernel.logAudit
  ← Kernel.deepFreeze

auditor_endgame.js depends on:
  ← Kernel.logAudit
  ← All 5 pass-runner namespaces (called via window._AuditorInternal.*)
```

> [!IMPORTANT]
> `PERIPHERAL_DRIVER_CONTRACTS` (lines 38–102) and `REQUIRED_LIFECYCLE_METHODS` (lines 25–35) are **used by `auditor_contracts.js`** but defined in the facade-level IIFE. Two valid patterns:
>
> 1. **Inject on init** — facade writes them to `_AuditorInternal.Kernel._contracts` and `_AuditorInternal.Kernel._methods` before any sub-module reads them.
> 2. **Keep in `auditor_contracts.js`** — since those constants only serve Pass 1 functions, they can live as private consts inside `auditor_contracts.js` IIFE scope rather than the staging membrane.
>    **Recommendation: Option 2** — constants belong to the sub-module that uses them exclusively.

---

### `index.html` / `load_order.js` Script Tag Order

```html
<!-- Auditor staging sub-modules (dependency order) -->
<script src="auditor/auditor_kernel.js"></script>
<script src="auditor/auditor_contracts.js"></script>
<script src="auditor/auditor_district_sims.js"></script>
<script src="auditor/auditor_combat_extended.js"></script>
<script src="auditor/auditor_persistence.js"></script>
<script src="auditor/auditor_constitutional.js"></script>
<script src="auditor/auditor_endgame.js"></script>
<!-- Facade: seals membrane → deepFreeze → delete → export EmberlightAuditor -->
<script src="auditor.js"></script>
```

---

**Schema locked. Phase 2 is unblocked.** Issue:

- `GUCA:EXTRACT_SUBSYSTEM auditor auditor_kernel.js [UTIL]` — to begin extraction
- or `GUCA:EXTRACT_SUBSYSTEM auditor auditor_contracts.js [PASS1]` — to skip directly to the largest complexity block

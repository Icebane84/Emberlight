# VSRP-001: Universal Module Contract Specification

**Document Identifier:** VSRP-001

**Parent Protocol:** PMIP-001 (Phoenix Modularization & Integration Protocol)

**Version:** 1.0.0-LOCKED

**Timestamp:** 2026-09-02T19:05:00Z

**Classification:** Technical Standard / Normative Contract

**Index Anchor:** PRS-001

---

## 1. Purpose & Scope

This specification establishes the normative, authoritative contract governing all software modules intended for execution within the Phoenix Runtime Engine.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

This standard applies to:

* Native Phoenix runtime subsystems (Combat, Overworld, Dialogue, Progression).
* Standalone vertical slices and isolated playable prototypes.
* External or legacy systems wrapped via adapter gaskets.
* Headless simulation engines and deterministic test harnesses.

---

## 2. Core Architectural Principles

* **Boundary Invariance:** A module is an ephemeral, bounded execution tenant. It does not own persistent game state.
* **Separation of Concerns:** Authoritative state simulation is strictly decoupled from visual, audio, or tactile presentation.
* **Execution-History Invariance:** Module state must be purely a function of configuration, initial snapshot, and sequential inputs. Previous runs or stale lifecycles MUST NOT leave lingering side effects.
* **Zero Host Pollution:** A module MUST NOT register unmanaged global bindings, mutate runtime-level objects, or assume singleton ownership of the browser or platform environment.

---

## 3. Module Lifecycle State Machine

A VSRP-001 compliant module MUST implement and strictly enforce the following formal state transitions:

```text
       [ UNCONFIGURED ]
              │
              │ configure(config)
              ▼
        [ CONFIGURED ]
              │
              │ init(context)
              ▼
       [ INITIALIZED ]
              │
              │ reset(snapshot)
              ▼
           [ READY ] ◄──────────────────┐
              │                         │
              │ update(dt)              │ reset(snapshot)
              ▼                         │
          [ RUNNING ] ──────────────────┘

  render() ───────────────► Presentation projection only (No state transition)
  destroy() ──────────────► [ DESTROYED ]
```

### State Definitions & Lifecycle Rules

* **UNCONFIGURED:** The initial instantiated state. Calling `init()`, `reset()`, `update()`, or `render()` while in this state is FORBIDDEN and MUST throw a lifecycle error.
* **CONFIGURED:** Static operational parameters have been ingested and verified. Configuration is locked; calling `configure()` after leaving `UNCONFIGURED` MUST throw a lifecycle error.
* **INITIALIZED:** Host context and capability-scoped handles have been bound. The module is anchored to the host environment but is not yet primed with simulation entities.
* **READY:** Authoritative working state has been seeded or reset via snapshot. The module is primed for simulation step execution.
* **RUNNING:** Active simulation cycle. Transitioned automatically and exclusively upon invocation of `update(dt)`. Invoking `render()` MUST NOT cause a lifecycle state transition.
* **DESTROYED:** Terminal lifecycle phase. All resources, listeners, handles, and references are released. Calling `update()`, `render()`, `reset()`, `init()`, or `configure()` on a `DESTROYED` instance MUST throw an error. Calling `destroy()` on an already `DESTROYED` instance MUST be a safe no-op.

---

## 4. Interface Declaration & Method Semantics

A compliant module MUST export an object exposing exactly these nine methods:

```javascript
const PhoenixModuleInterface = {
  configure(config) {},
  init(context) {},
  reset(stateSnapshot) {},
  update(dt, context) {},
  render(renderer, context) {},
  getState() {},
  getDiagnostics() {},
  getModuleInfo() {},
  destroy() {}
};
```

### 4.1. `configure(config)`

* **Description:** Ingests the static configuration dictionary containing operational parameters (balance tables, keymaps, feature flags, tuning variables).
* **Constraints:**
* `configure()` MUST succeed exactly once. Calling `configure()` after the module has left `UNCONFIGURED` MUST throw a lifecycle error.
* Properties MUST be validated using explicit existence checks (e.g., `config?.tuning?.moveSpeed !== undefined`) rather than truthiness evaluations.
* MUST NOT perform DOM allocations, audio context instantiation, network queries, or storage access.
* Configuration MUST become immutable upon method completion. Mid-execution mutation of rules is FORBIDDEN; dynamic rule changes require tearing down the module and instantiating a new instance.

### 4.2. `init(context)`

* **Description:** Connects the module to the host runtime harness.
* **Parameters:** Receives a capability-scoped `ModuleContext` object containing host-owned mount handles, audio dispatchers, and event bus references.
* **Constraints:**
* MUST NOT assume ownership of `window`, `document.body`, or global styles.
* Any event listeners registered MUST be attached strictly to host-provided container nodes or tracked internally for deterministic teardown during `destroy()`.
* MUST NOT begin authoritative simulation loops or fire presentation animations.

### 4.3. `reset(stateSnapshot)`

* **Description:** Primes or restores the module using an external state snapshot conforming to the module’s documented state schema.
* **Constraints:**
* Given identical configuration and an identical state snapshot, `reset(stateSnapshot)` MUST produce an authoritatively equivalent state regardless of prior execution history.
* MUST accept `null` or `undefined` to perform a clean default boot.
* MUST purge all transient operational buffers, stale cooldown timers, active tweens, and queued animation indices from previous sessions.

### 4.4. `update(dt, context)`

* **Description:** Advances the internal simulation state by a fixed delta time `dt` (in seconds).
* **Constraints:**
* MUST perform **simulation only**.
* MUST NOT mutate DOM, CSS styles, canvas buffers, WebGL contexts, or external host objects.
* MUST operate strictly using the host-provided timestep `dt`. The module MUST NOT instantiate independent authoritative clocks, `setInterval`, `setTimeout`, or unmanaged `requestAnimationFrame` loops.
* MUST be deterministic: identical state and inputs evaluated across identical timesteps must produce identical state deltas.

### 4.5. `render(renderer, context)`

* **Description:** Projects current simulation state onto the host-provided presentation target.
* **Parameters:** Accepts a host-managed `renderer` interface (e.g., Canvas 2D context, WebGL context, or scoped DOM fragment) and peripheral rendering context.
* **Constraints:**
* The module's authoritative simulation state is read-only during render. Renderer state MAY be modified through the host-provided renderer interface.
* MUST NOT modify authoritative simulation state.
* MUST NOT cause a lifecycle state transition.
* MUST handle zero-presentation execution gracefully: if `renderer` is omitted or null (headless test harnesses), `render()` MUST complete with zero errors.

### 4.6. `getState()`

* **Description:** Returns a detached, serializable snapshot capturing the authoritative working state.
* **Constraints:**
* MUST return a detached plain JavaScript object (`POJO`). It MUST NOT return live internal object references or closures that permit external mutation of internal memory.
* The returned snapshot MUST be JSON-serializable (no circular dependencies, DOM node references, or functions).
* Passing this output back into `reset(stateSnapshot)` MUST reproduce an authoritatively equivalent state.

### 4.7. `getDiagnostics()`

* **Description:** Returns an operational telemetry dictionary detailing performance and system health (e.g., active entity counts, step latency, memory buffers, active event subscriptions).
* **Constraints:**
* Executing `getDiagnostics()` MUST cause zero side effects on simulation state.
* Telemetry data MUST be kept strictly isolated from the authoritative payload returned by `getState()`.

### 4.8. `getModuleInfo()`

* **Description:** Returns static module metadata and capability declarations.
* **Constraints:**
* MUST conform to the following schema:

```javascript
{
  moduleId: 'combat_core',
  version: '1.0.0',
  protocolVersion: 'VSRP-001',
  dependencies: [],
  capabilities: ['combat', 'events.combat_hit_landed']
}
```

### 4.9. `destroy()`

* **Description:** Releases all acquired resources and terminates module existence.
* **Constraints:**
* MUST completely release all event subscriptions, DOM listeners, timers, worker threads, GPU/canvas buffers, and references to host-provided objects.
* Calling `destroy()` on an already `DESTROYED` instance MUST be a safe no-op. Calling any other interface method on a `DESTROYED` instance MUST throw an error.
* Following invocation, the instance MUST be completely eligible for garbage collection.

---

## 5. ModuleContext & Host Interaction

Modules communicate with the host runtime exclusively through the `ModuleContext` injected during `init(context)` and passed into `update(dt, context)`:

* **Capability Scoping:** A `ModuleContext` MUST expose only host capabilities declared by the module contract; modules MUST NOT receive unrestricted access to host internals.
* **Three-Layer Decoupled Input Architecture:**
  1. *Remappable Keymap Dictionary (Configuration):* Physical key bindings are defined externally in mutable keymap profiles (`data/settings.json` and `manifest.DefaultSettings.input.keymap`) mapping hardware event codes (`KeyW`, `ArrowUp`, `Space`) to canonical action tokens (`UP`, `CONFIRM`, `TOGGLE_EXPAND_DECK`, etc.). Ingested into `module.configure({ keymap })`.
  2. *Host Input Manager (Event Translation):* The host runtime owns all DOM event listeners (`keydown`, `keyup`, `blur`). It captures hardware events, translates them through the active keymap, and maintains an internal action buffer. Direct `addEventListener('keydown')` registration inside simulation tenants is FORBIDDEN.
  3. *Capability-Scoped Input Ingestion (`context.input`):* The host injects normalized input states into `update(dt, context)` or `handleHostAction(action)`. Simulation logic evaluates `context.input.isPressed(action)` or `context.input.isDown(action)`. Headless test runners can inject mock input objects (`{ isPressed: (act) => act === 'ATTACK' }`) with zero DOM dependencies.
* **Centralized Configuration Manifest (`settings.json`):** Serves as the immutable manifest for all static operational parameters, tuning tables, keymaps, and preference toggles injected during `configure(config)`:
  * `input.keymap`: Hardware-to-action bindings.
  * `audio`: Master, SFX, and BGM volume thresholds and mute flags.
  * `tuning`: Encounter rates, critical multipliers, and status tick frequencies.
  * `accessibility`: Screen shake, CRT scanlines, and high contrast flags.
  * `debug`: Diagnostic overlays, collision mesh rendering, and telemetry logging.
* **Event Dispatching:** Asynchronous notifications (e.g., entity deaths, tile collisions, critical hits) MUST be dispatched to the host using the host-provided `EventBus` handle (`context.eventBus.publish(eventType, payload)`). Modules MUST NOT call external tenant methods directly.

---

## 6. Error Handling Semantics

* **No Silent Swallowing:** A module MUST NOT swallow initialization or runtime errors via empty catch blocks.
* **Fatal Initialization:** Any fatal error occurring during `configure()` or `init()` MUST throw an explicit exception and halt the lifecycle, preventing transition to the `READY` state.
* **Runtime Surfacing:** Exceptions occurring during `update()` or `render()` MUST surface immediately to the host diagnostics/error channel.
* **Integrity Guard:** A module MUST NOT silently reset, corrupt, or substitute authoritative state in response to an unhandled runtime error.

---

## 7. Forbidden Patterns (Constitutional Violations)

The following practices constitute immediate grounds for compliance failure:

1. **Global Namespace Squatting:** Attaching properties to `window` or `document` outside of host-approved debug toggles.
2. **Authoritative State Leaks:** Returning live object references from `getState()` that permit callers to mutate internal properties without invoking `reset()`.
3. **Cross-Tenant Telepathy:** Accessing, invoking, or depending on another tenant's global instance or DOM view.
4. **Autonomous Clocks:** Instantiating internal simulation tickers (`setInterval`, `setTimeout`, private RAFs) that decouple logic from the host's `update(dt)` tick.
5. **Mutation in Render:** Mutating health, positions, cooldowns, or simulation counters inside `render()`.
6. **Silent Repair:** An integration harness modifying a module's internal code to fix an incompatibility without an explicit contract revision.

---

## 8. Compliance Gate & Acceptance Rubric

A module is declared **VSRP-001 COMPLIANT** if and only if every condition below evaluates to **PASS**. A single failure results in an overall verdict of **FAIL**.

```text
[ ] 01. All nine canonical interface methods are present and exported.
[ ] 02. configure() succeeds exactly once; re-configuration throws a lifecycle error.
[ ] 03. Configuration becomes completely immutable prior to runtime execution.
[ ] 04. init() binds strictly to host-provided containers without global leaks.
[ ] 05. reset(snapshot) produces authoritatively equivalent state regardless of history.
[ ] 06. reset(null) reboots module cleanly to documented default state.
[ ] 07. update(dt) performs simulation only and references no presentation APIs.
[ ] 08. update(dt) respects host timestep and contains zero independent clocks.
[ ] 09. render() causes zero mutations to authoritative simulation state.
[ ] 10. render() causes no lifecycle state transitions.
[ ] 11. getState() returns a detached, serializable snapshot (no live references).
[ ] 12. Complete round-trip fidelity: getState() -> reset(snapshot) yields authoritatively equivalent state.
[ ] 13. getDiagnostics() produces telemetry with zero simulation side effects.
[ ] 14. getModuleInfo() matches the defined metadata and capability schema.
[ ] 15. ModuleContext exposes only contract-declared host capabilities.
[ ] 16. Input is ingested strictly via canonical action tokens or bitmasks.
[ ] 17. Cross-boundary communication occurs strictly via declared EventBus channels.
[ ] 18. destroy() purges all resources; calling destroy() repeatedly is a safe no-op.
[ ] 19. Illegal lifecycle transitions throw explicit lifecycle errors.
[ ] 20. All exceptions are surfaced to host channels without silent suppression.

VERDICT: [ PASS | FAIL ]
```

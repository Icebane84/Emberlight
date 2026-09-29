# The 4-Tier Sovereign Error Handling Stack

In high-performance vanilla JavaScript, runtime error handling relies on **deterministic boundary containment, zero-throw return codes, and an outer supervisor watchdog loop**, completely eliminating the fatal failure mode where a single unhandled exception halts the requestAnimationFrame pump and freezes the tab.
Traditional JavaScript web apps scatter try/catch indiscriminately or let errors bubble to window.onerror. In a 60Hz real-time simulation, doing this creates severe garbage-collection churn from stack trace generation and risks catastrophic loop termination.

## ---

**Architectural Breakdown: What, How, and Why**

### **1\. The Core Failure Mode: Unhandled Exception in the Tick Chain**

* **What:** When an uncaught ReferenceError or TypeError throws inside an animation frame callback, the JavaScript execution context halts immediately.
* **How:** Because the exception is unhandled, execution unwinds to the browser host before reaching the trailing requestAnimationFrame(accumulatorLoop) statement. The loop permanently dies. The DOM remains frozen in place with no recovery path other than manual browser reload.
* **Why:** In multi-paradigm systems like our dual-modal Necro-Bunker, domain simulation (kinematics, pathing, AI) must be strictly decoupled from host execution survivability. A flaw in a crawler's pathing logic should degrade or reset that entity—it must never kill the rendering engine or input apparatus.

## ---

**The 4-Tier Sovereign Error Handling Stack**

Plaintext

┌────────────────────────────────────────────────────────────────────────┐
│                   SOVEREIGN ERROR RECOVERY TOPOLOGY                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   TIER 1: STATIC PRE-BOOT AUDITING (Compile-Time Prevention)           │
│   • 'use strict' \+ Pre-boot AST linter (auditSystemSourceCode)         │
│   • Scans loops, undeclared identifiers, and missing jump anchors      │
│                                                                        │
│   TIER 2: ZERO-THROW RETURN CODES (Hot-Path In-Band Signaling)         │
│   • Hot loops never call \`throw new Error()\`                           │
│   • Return discrete hex bitmasks (ERR\_0x01 \- ERR\_0x0F) or booleans     │
│   • Zero stack-trace allocations (ERL-HOT-ALLOC compliance)            │
│                                                                        │
│   TIER 3: SUBSYSTEM CIRCUIT BREAKERS (Fault Isolation)                 │
│   • Isolate rendering from physics; isolate 3D raycaster from 2D grid  │
│   • Tripping a breaker falls back to clean stub/wireframe, not crash   │
│                                                                        │
│   TIER 4: SUPERVISOR WATCHDOG LOOP (Outer Loop Resilience)             │
│   • Single outer try/catch enclosing tick evaluation                   │
│   • Catches catastrophic crashes, writes to Stream B crash tombstone   │
│   • Enforces requestAnimationFrame re-queueing to preserve UI clock   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

### ---

**Tier 1: Static Pre-Boot Auditing (Prevention)**

* **What:** Static AST boundary enforcement running inside an inline script before the engine ever calls its first tick.
* **How:** auditSystemSourceCode(document.documentElement.outerHTML) checks variable scoping, required subsystem tokens, and bans raw console.log statements in hot paths (\[INV-08\]).
* **Why:** The cheapest error to handle is the one that prevents a broken binary from launching in the first place.

### **Tier 2: Zero-Throw Return Codes (Hot-Path Execution)**

* **What:** Complete ban on throw new Error() inside hot execution loops (stepSimulation(), render3D(), renderBlueprint()).
* **How:** Instantiating new Error() dynamically allocates memory on the JavaScript heap and forces the V8 engine to capture a costly C++ callstack, causing garbage collection frame spikes. Functions in the hot loop signal failure using **in-band numerical return codes** or **mutating out-parameters**:

JavaScript

// ANTI-PATTERN: Dynamic throw inside 60Hz loop
function castRay(x, y) {
    if (x \< 0) throw new Error("Out of bounds"); // Allocates object, unwinds stack
    return perpDist;
}

// SOVEREIGN PATTERN: In-band numerical status or failure sentinel
const RAY\_OOB\_SENTINEL \= \-1.0;
function castRay(x, y) {
    if (x \< 0 || x \>= MAP\_DIM || y \< 0 || y \>= MAP\_DIM) {
        return RAY\_OOB\_SENTINEL; // Zero allocations, instant branch
    }
    return perpDist;
}

### **Tier 3: Subsystem Circuit Breakers (Fault Isolation)**

* **What:** Containment boundaries that prevent failures in peripheral rendering code from poisoning the core physics accumulator or vice versa.
* **How:** If the 3D raycaster crashes due to an unhandled projection edge case, a circuit breaker increments a failure counter. If failures exceed a threshold (e.g., 3 consecutive frames), the engine flips a fallback latch: it temporarily disables the 3D viewport and drops into safe 2D Blueprint mode while dumping an error packet to the diagnostics stream.

### **Tier 4: The Supervisor Watchdog Loop (Chassis Survivability)**

* **What:** A self-healing master execution wrapper around the 60Hz accumulator loop.
* **How:** A single top-level try/catch wraps the simulation and draw execution inside accumulatorLoop. If an unforeseen error throws, the catch block intercepts it, writes a diagnostic entry to the Stream A HUD ring and Stream B crash tombstone, applies a safe state clamp, and **guarantees that requestAnimationFrame is re-scheduled**:

JavaScript

function accumulatorLoop(timestamp) {
    // 1\. ALWAYS ensure the next frame is queued, even if this tick crashes
    let loopToken \= requestAnimationFrame(accumulatorLoop);

    try {
        const delta \= timestamp \- \_lastTime;
        \_lastTime \= timestamp;
        \_accumulator \+= Math.min(delta, 100.0);

        while (\_accumulator \>= FIXED\_STEP) {
            const inputToken \= InputQueue.drainLatest();
            NecroSimulation.step(inputToken);
            \_accumulator \-= FIXED\_STEP;
        }

        // Modal Viewport Rendering
        if (rawMemoryView.getUint32(OFF\_ACTIVE\_MODE, true) \=== 1) {
            ArchitectRenderer.draw(mousePos);
        } else {
            OperativeRaycaster.draw();
        }

    } catch (fatalError) {
        // 2\. Intercept crash: Log to Stream A and Stream B
        StreamA.push('CRITICAL: Kernel step halted: ' \+ fatalError.message);

        // 3\. Fallback recovery: Clamp state to prevent cascading faults
        \_accumulator \= 0; // Clear accumulator death spiral

        // 4\. Circuit Breaker: Auto-swap to stable 2D view if 3D crashes
        rawMemoryView.setUint32(OFF\_ACTIVE\_MODE, 1, true);
    }
}

## ---

**Error Handling Pattern Comparison**

| Metric / Dimension       | Traditional Web Dev (try/catch per call)                 | Unhandled Fail-Fast (Default Browser)   | Sovereign 4-Tier Strategy (PSGC-001)                            |
| :----------------------- | :------------------------------------------------------- | :-------------------------------------- | :-------------------------------------------------------------- |
| **Performance Overhead** | High: JIT optimization de-opt, stack-trace GC allocation | Zero (until crash)                      | Zero in hot paths; single static wrapper on tick loop           |
| **Crash Behavior**       | Swallowed errors; silent broken states                   | Total engine freeze; white-screen death | Contained degradation; engine continues running                 |
| **Determinism**          | Non-deterministic recovery                               | Zero recovery                           | Fixed binary rollback or Genesis rehydration (PERSIST-001)      |
| **Diagnostics**          | Spams developer console                                  | Fails silently on user screen           | Dual-stream ring buffer (Stream A) \+ OPFS tombstone (Stream B) |

### ---

**Honest Thoughts**

In professional game engines (C++, Rust, or hardened JS), the golden rule is **never let an exception leave the frame boundary**.
When that ReferenceError: i is not defined popped up in your dev console, it killed the game not because the bug itself was unfixable, but because there was no supervisory watchdog around the accumulatorLoop to catch it and say: *"The physics tick had a scoping error; log it to the HUD, skip that entity calculation, and keep rendering the screen."*
By putting a single supervisor block around the root frame loop and strictly using numerical status codes inside hot loops instead of dynamic throws, you get the best of both worlds: maximum JIT execution speed without the risk of a single syntax slip freezing the entire browser tab.

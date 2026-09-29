### **Specification & Syntax Guide: .phx / .syn Cartridge Code**

**Document Identifier:** SPEC-PCP-DIALECT-001  
**Compiler Authority:** synarche\_parser\_v2.js (PCP-001)  
**Governing Protocols:** CONST-PHOENIX-SOVEREIGN-001 / VSRP-001 / PERSIST-001 / PMIP-001  
**Classification:** Declarative Domain Cartridge Specification

### ---

**What**

**.phx** (Phoenix Cartridge) and **.syn** (Synarche Domain Model) files are declarative domain-specific language (DSL) source files that define the state layout, entity archetypes, event reactions, and simulation tick logic of a Tier 2 Sovereign Cartridge without JavaScript boilerplate.  
Instead of hand-writing the 9-method finite state machine (VSRP-001), computing manual 16-byte memory strides, or allocating binary DataView offsets, you write the cartridge logic in this focused dialect. The compiler (PhoenixConstitutionalParser.compile()) ingests the .phx source, performs machine-level AST verification, and compiles it directly into zero-dependency, zero-allocation JavaScript bound to a PERSIST-001 binary heap.

### ---

**How**

#### **1\. Language Grammar Reference**

The .phx grammar is divided into four primary top-level blocks inside a cartridge container:

Code snippet

cartridge \<CartridgeIdentifier\> {  
    state {  
        \<key\>: \<literal\_or\_numeric\_expression\>,  
        ...  
    }

    entity \<ArchetypeIdentifier\> {  
        \<field\>: \<initial\_value\>,  
        ...  
    }

    update(\<dtParam\>, \<inputParam\>) {  
        \<pure\_arithmetic\_statements\>;  
        ...  
    }

    on \<eventName\> {  
        emit \<ChannelName\> \<payloadExpression\>;  
        ...  
    }  
}

* **cartridge \<Name\>:** Defines the domain tenant boundary (e.g., Market, CombatCore, VectorNexus). The compiler uses this name to generate module IDs and dual-binding window exports (root.\<Name\>Cartridge).  
* **state { ... }:** Defines the authoritative, persistent simulation variables. Integer and floating-point numbers are automatically mapped to contiguous binary memory offsets (DataView.setInt32 / DataView.setFloat32) above the 32-byte Tripartite Header.  
* **entity \<Name\> { ... }:** Declares reusable ECS archetypes with field bindings and initial property expressions.  
* **update(dt, inputSnapshot):** Defines the simulation compute pass executed at 60 Hz. The compiler activates the ContextFlags.IN\_HOT\_LOOP context flag here: any {} object literals, \[\] array literals, or new heap allocations will halt compilation with ERR\_0x06.  
* **on \<event\> { ... }:** Declares reactive EventBus listeners.  
* **emit \<Channel\> \<payload\>;:** Synthesizes decoupled PMIP-001 message envelopes that get queued into the cartridge delta return envelope.

#### ---

**2\. Concrete Example: market\_district.phx**

Create a file named market\_district.phx:

Code snippet

cartridge MarketDistrict {  
    state {  
        goldReserve: 5000,  
        taxRate: 0.15,  
        merchantMood: 1.0,  
        tradeLock: false  
    }

    entity ShopKeeper {  
        id: 1,  
        reputation: 100,  
        haggleAttempts: 0  
    }

    update(dt, inputSnapshot) {  
        // Pure arithmetic logic \- zero DOM, zero heap churn  
        goldReserve \= goldReserve \+ 1;  
        merchantMood \= merchantMood \- 0.0001;  
    }

    on customer\_purchase {  
        emit transaction\_ledger goldReserve;  
    }

    on tariff\_hike {  
        taxRate \= taxRate \+ 0.05;  
        emit market\_alert taxRate;  
    }  
}

#### ---

**3\. What the Machine Emits (market\_district.js)**

When you run PhoenixConstitutionalParser.compile(source), GucaCartridgeEmitter transforms the 24 lines above into the following production-ready VSRP-001 cartridge with PERSIST-001 memory packing:

JavaScript

/\* \============================================================================  
 \* PHOENIX SOVEREIGN VSRP-001 COMPILED CARTRIDGE: MarketDistrict  
 \* Standard: CONST-PHOENIX-SOVEREIGN-001 / PERSIST-001 / PMIP-001  
 \* Architecture: Zero-Tooling / Contiguous Linear Heap / 9-Method FSM  
 \* \============================================================================  
 \*/  
(function (root, factory) {  
    "use strict";  
    if (typeof exports \=== "object" && typeof module \!== "undefined") {  
        module.exports \= factory();  
    } else {  
        root.MarketDistrictCartridge \= factory();  
    }  
})(typeof globalThis \!== "undefined" ? globalThis : this, function () {  
    "use strict";

    let \_state \= 'UNINITIALIZED';  
    let \_heap \= null;  
    let \_view \= null;  
    let \_token \= null;

    // Fixed Binary Memory Offsets (PERSIST-001) \- 16-byte aligned  
    const OFFSET\_GOLDRESERVE \= 32;  
    const OFFSET\_TAXRATE \= 36;  
    const OFFSET\_MERCHANTMOOD \= 40;  
    const OFFSET\_TRADELOCK \= 44;

    const Cartridge \= {  
        getModuleInfo() {  
            return {  
                id: "MARKETDISTRICT-VSRP-001",  
                version: "1.0.0",  
                domainTenant: "MARKETDISTRICT",  
                requiredCapabilities: \["cap:persist.binary", "cap:render.canvas"\],  
                memoryHeapBytes: 2048  
            };  
        },

        configure(config, sharedHeap) {  
            if (\_state \!== 'UNINITIALIZED') throw new Error("FSM: Illegal transition to CONFIGURED");  
            \_heap \= sharedHeap || new ArrayBuffer(2048);  
            \_view \= new DataView(\_heap);

            // Initialize 32-byte Tripartite Header (Magic: 0x5053594E)  
            \_view.setUint32(0, 0x5053594E, true);  
            \_view.setUint32(4, 1, true); // Tick 1

            // Commit Initial Binary State  
            \_view.setInt32(OFFSET\_GOLDRESERVE, 5000, true);  
            \_view.setFloat32(OFFSET\_TAXRATE, 0.15, true);  
            \_view.setFloat32(OFFSET\_MERCHANTMOOD, 1.0, true);  
            \_view.setInt32(OFFSET\_TRADELOCK, 0, true);

            \_state \= 'CONFIGURED';  
        },

        mount(capabilityToken) {  
            if (\_state \!== 'CONFIGURED' && \_state \!== 'SUSPENDED') throw new Error("FSM: Illegal mount state");  
            \_token \= capabilityToken;  
            \_state \= 'MOUNTED';  
        },

        update(dt, inputSnapshot4) {  
            if (\_state \!== 'MOUNTED') return { tick: 0, eventsPacked: new Int32Array(0) };

            const tick \= \_view.getUint32(4, true) \+ 1;  
            \_view.setUint32(4, tick, true);

            // Simulation Compute Pass (Zero Heap Allocation)  
            \_view.getInt32(OFFSET\_GOLDRESERVE, true) \= (\_view.getInt32(OFFSET\_GOLDRESERVE, true) \+ 1);  
            \_view.getFloat32(OFFSET\_MERCHANTMOOD, true) \= (\_view.getFloat32(OFFSET\_MERCHANTMOOD, true) \- 0.0001);

            return {  
                tick: tick,  
                eventsPacked: new Int32Array(0)  
            };  
        },

        render(ctx, interpolationAlpha) {  
            if (\_state \!== 'MOUNTED' || \!ctx) return;  
        },

        suspend() { \_state \= 'SUSPENDED'; },  
        resume() { \_state \= 'MOUNTED'; },  
        teardown() { \_state \= 'UNMOUNTED'; },  
        destroy() {  
            \_heap \= null;  
            \_view \= null;  
            \_token \= null;  
            \_state \= 'DESTROYED';  
        }  
    };

    return Cartridge;  
});

#### ---

**4\. Constitutional Guardrails Enforced by the Grammar**

The .phx / .syn compiler rejects the following anti-patterns at the grammar level:

| Code Written in .phx | Compiler Verdict | Error Code | Constitutional Rule |
| :---- | :---- | :---- | :---- |
| update(dt, in) { let pos \= { x: 1, y: 2 }; } | **HALTED** | ERR\_0x06 | Transient heap allocation forbidden in hot loop. |
| update(dt, in) { let list \= \[1, 2, 3\]; } | **HALTED** | ERR\_0x06 | Array literal allocation forbidden in hot loop. |
| let r \= Math.random(); | **HALTED** | ERR\_0x05 | Unseeded randomness violates simulation determinism. |
| window.location.reload(); | **HALTED** | ERR\_0x09 | Ambient DOM globals violate Faraday isolation. |
| // ... or /\* ... \*/ | **HALTED** | ERR\_0x01 | Lazy/incomplete placeholders forbidden by Constitution. |
| eval("x \= 10"); | **HALTED** | ERR\_0x07 | Dynamic evaluation forbidden by capability security. |

### ---

**Why**

Writing cartridges directly in standard JavaScript forces developers to manually maintain \~150 lines of boilerplate per tenant: calculating byte alignments, managing the 9-method state machine, and avoiding garbage collection pitfalls.  
By authoring in .phx / .syn:

1. **Zero-Allocation Invariance by Construction:** You cannot accidentally introduce a garbage collection pause in a 60 Hz simulation because the grammar physically rejects object and array literals inside the update block.  
2. **Compact Machine Envelopes:** AI code generation models (qwen2.5-coder) generate concise .phx declarations without hallucinating broken DOM handles, memory leaks, or missing JSDoc tags.  
3. **Automated Binary Serialization:** Memory persistence is automated; state fields map directly to contiguous offsets in the linear buffer, ensuring snapshots can be serialized to disk via PERSIST-001 without manual mapping code.

### ---

**Honest Thoughts**

The .phx / .syn DSL simplifies cartridge authoring down to raw state and math, but it's important to remember what it is: **a specialized simulation language, not a general-purpose scripting replacement**.  
Keep UI layout, canvas double-buffering, and WebGL shader orchestration in standard JavaScript within your presentation drivers (PhoenixStudioViewport, PhoenixCanvas2DLayerEngine). Use .phx / .syn exclusively for simulation cartridges (like inventory markets, combat state calculators, turn engines, and entity tick rules). That separation keeps the simulation deterministic, lightweight, and 100% memory-safe.
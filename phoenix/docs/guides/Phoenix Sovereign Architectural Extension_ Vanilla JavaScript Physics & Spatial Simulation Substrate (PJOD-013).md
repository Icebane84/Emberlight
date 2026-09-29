# **Phoenix Sovereign Architectural Extension: Vanilla JavaScript Physics & Spatial Simulation Substrate (PJOD-013)**

**Parent Standard:** Phoenix Sovereign Grand Constitution (PSGC-001) / PJOD-011  
**Classification:** Normative Substrate 2D Physics, Collision Resolution, and 2.5D Depth Sorting Standard  
**Status:** NORMATIVE

## ---

**\[SEC-01\] Executive Architectural Synthesis**

### **What**

An exhaustive architectural analysis of Frank D’Agostino's [freeCodeCamp JavaScript GameDev Tutorial](https://www.youtube.com/@freecodecamp?utm_source=gemini) (*Code an Animated Physics Game*), translating its foundational mechanics—including dual-surface canvas sizing, circular distance-vector collision resolution, brute-force circle packing, 2.5D dynamic Y-sorting, and delta-time frame throttling—into normative engineering principles for the Phoenix Sovereign engine ecosystem (PSGC-001).

### **How**

While traditional game development relies on heavyweight physics engines (Box2D, Matter.js) or proprietary frameworks, high-performance vanilla JavaScript architectures can achieve robust, responsive physics and artificial intelligence using native mathematical primitives (Math.hypot, Math.atan2, and vector normalization). By separating logical hitboxes (Collision X, Collision Y) from visual asset anchors (Sprite X, Sprite Y), engines maintain deterministic spatial interactions while delivering polished visual layering.

### **Why**

Unchecked canvas rendering and naive bounding-box colliders lead to visual clipping, jittery movement across variable refresh rates, and expensive state mutations in hot render loops. Systematically codifying these mechanics into strict Phoenix Sovereign principles ensures that custom physics simulations operate with deterministic precision and zero-overhead efficiency (\[INV-04\]).

## ---

**\[SEC-02\] Core Game Design Principles Extracted from the Synthesis**

### **1\. Drawing Surface vs. Element Sizing Invariance (\[SEC-01\])**

* **Principle:** Setting canvas dimensions via CSS alone stretches the internal drawing buffer, introducing visual distortion and coordinate mismatch \[00:03:20\].  
* **Directive:** The HTML5 \<canvas\> element must explicitly synchronize its internal drawing surface resolution (canvas.width, canvas.height) with its CSS layout dimensions (\[SEC-02\]).

### **2\. Reusable Circle-to-Circle Collision & Resolution Vectors (\[SEC-02\])**

* **Principle:** Resolving overlapping entities requires calculating center-point distances and pushing entities apart along normalized unit vectors rather than relying on heavy physics frameworks \[00:59:04\].  
* **Directive:** Implement modular collision functions that return both a boolean collision state and scalar vector metrics (DX, DY, Distance, Sum of Radii), allowing dynamic entities to slide cleanly around stationary obstacles \[01:00:15\].

### **3\. 2.5D Depth Ordering via Dynamic Y-Sorting (\[SEC-03\])**

* **Principle:** Drawing entities in static array order causes foreground objects to incorrectly clip behind background entities \[01:52:06\].  
* **Directive:** Consolidate active scene entities into a unified render array per frame and sort them dynamically by their vertical baseline (Collision Y or base coordinates) prior to execution of drawing calls \[01:56:11\].

### **4\. Frame-Rate Independence via Delta-Time Accumulation (\[INV-04\])**

* **Principle:** Tying movement directly to raw frame counts causes simulation speed to surge on high-refresh-rate gaming displays \[01:25:36\].  
* **Directive:** All kinematic updates, animation timers, and physics accumulators must scale explicitly against high-resolution timestamp deltas (dt \= (timestamp \- lastTime) / 1000), guaranteeing identical simulation speed across mixed hardware \[01:26:33\].

## ---

**\[SEC-03\] Tactical Implementation Patterns Adapted for Sovereign Engines**

| Game Subsystem Domain | Architectural Pattern | Implementation Directive |
| :---- | :---- | :---- |
| **Canvas Resolution** | Dual-Sizing Synchronization \[00:03:20\] | Set canvas.width and canvas.height programmatically in JS to match internal design resolution. |
| **Collision Resolution** | Unit-Vector Repulsion \[01:00:15\] | Push colliding circles 1 pixel outside the radius sum along the normalized unit vector (unitX, unitY). |
| **Spatial Layering** | Per-Frame Y-Sorting \[01:56:11\] | Sort the active render array ascending by Collision Y to establish correct 2.5D depth occlusion. |
| **State Optimization** | Canvas State Batching \[01:18:35\] | Define global styles (font, textAlign) during pre-boot initialization to avoid hot-loop state changes. |

## ---

**Honest Thoughts**

Frank’s tutorial provides an exceptional blueprint for building responsive 2.5D physics and pathfinding directly in vanilla JavaScript without external dependencies. While object-oriented patterns (Player, Obstacle, Egg, Larva, Enemy) introduce manageable instance allocations for medium-scale indie games, high-throughput simulation environments with thousands of active entities still require our strict Data-Oriented Design (PERSIST-001 fixed typed-array heaps and POOL-001 object pools) to completely eliminate garbage collection pauses. Combining these clean spatial collision and Y-sorting algorithms with zero-allocation memory pools gives us the ultimate blend of gameplay readability and bare-metal performance.

### ---

**Follow-Up Question**

Would you like to implement the unified Y-sorting render pipeline and circular unit-vector collision resolver for our sovereign canvas engine (PAR-CAM-001)?
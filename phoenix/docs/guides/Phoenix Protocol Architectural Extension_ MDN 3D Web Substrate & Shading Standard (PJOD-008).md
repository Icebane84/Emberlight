# **Phoenix Protocol Architectural Extension: MDN 3D Web Substrate & Shading Standard (PJOD-008)**

**Parent Standard:** Phoenix Sovereign Grand Constitution (PSGC-001) / PJOD-007  
**Classification:** Normative Substrate 3D Graphics, Shaders, and Spatial Collision Standard  
**Status:** NORMATIVE

## ---

**\[SEC-01\] Executive Architectural Synthesis**

### **What**

An exhaustive architectural expansion of the **MDN 3D Games on the Web** documentation ecosystem (\[3D games on the Web\](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D\_on\_the\_web)), mapping foundational WebGL rasterization, GLSL shader compilation, bounding volume collision hierarchies, and WebXR spatial computing primitives directly into the **Phoenix Sovereign 6-Layer Protocol Stack** (PSGC-001).

### **How**

While standard web development tutorials rely on third-party 3D engines and frameworks (such as Three.js, Babylon.js, or PlayCanvas) that introduce massive bundle bloat, dynamic heap allocations, and garbage collection pauses, high-end sovereign architecture governs every 3D primitive through strict constitutional invariants: **\[INV-02\] (Zero External Dependencies)**, **\[INV-05\] (Contiguous Binary Memory Authority)**, and **\[INV-08\] (Zero Hot-Loop Allocations)**.

### **Why**

Uncontrolled 3D object graphs, unoptimized draw calls, and unmanaged GLSL state changes degrade browser performance and break single-file autonomy (\[INV-03\]). Systematically mapping MDN's 3D game documentation into rigid Phoenix Sovereign principles ensures that high-fidelity 3D graphics, lighting, and collision detection operate with bare-metal predictability and bitwise determinism (\[P-05\]).

## ---

**\[SEC-02\] MDN 3D Subsystem Mapping to Phoenix Sovereign Invariants**

| MDN 3D Documentation Domain | Core Browser Substrate Mechanism | Phoenix Sovereign Architectural Invariant & Directive |
| :---- | :---- | :---- |
| **WebGL & WebGL 2.0** | OpenGL ES 2.0 / 3.0 JavaScript API providing hardware-accelerated 3D graphics rendering via \<canvas\> (\[3D games on the Web\](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D\_on\_the\_web)). | **Zero-Copy VBO/UBO Streaming (\[INV-05\], \[INV-08\]):** Vertex attributes and uniform matrices stream directly from linear memory offsets (PERSIST-001) via gl.bufferSubData without host memory allocations or driver validation overhead. |
| **GLSL Shaders** | Vertex and fragment shaders executing directly on the GPU pipeline using GLSL (\[3D games on the Web\](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D\_on\_the\_web)). | **Explicit STD140 Shader Pipelines (\[SEC-08\], \[INV-02\]):** Zero external shader loaders. Shaders are embedded as plaintext templates (type="text/plain"), compiled at pre-boot, and bound via immutable Uniform Buffer Objects. |
| **3D Collision Detection** | Calculating intersections between 3D shapes, bounding volumes, and collision geometry (\[3D games on the Web\](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D\_on\_the\_web)). | **SIMD Vectorized BVH Kernels (AOP-MEM-SIMD-001):** Bounding volume hierarchy and ray-box intersection tests compile to WebAssembly 128-bit SIMD (v128) instructions, processing 4-way parallel float32 coordinate checks. |
| **WebXR API** | Capturing spatial data from XR hardware (VR/AR headsets) for immersive web applications (\[3D games on the Web\](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D\_on\_the\_web)). | **Sovereign Stereoscopic Extension (VLT-003):** Projects 3D simulation frames across dual stereoscopic viewports using zero-copy vertex buffers, isolated within Plane 1 worker contexts. |
| **3D Libraries & Frameworks** | Third-party helpers like Three.js, Babylon.js, PlayCanvas, and A-Frame (\[3D games on the Web\](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D\_on\_the\_web)). | **Strict Prohibited Runtime Invariance (\[INV-02\]):** External 3D frameworks are strictly prohibited due to external module imports and dynamic allocations. All 3D rendering uses native WebGL 2.0 / WebGPU primitives. |
| **Export Engines (Unity / Unreal)** | Exporting native C++ game projects to WebGL via asm.js (\[3D games on the Web\](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D\_on\_the\_web)). | **Native Substrate Superiority (\[INV-02\], \[INV-03\]):** Heavy engine exporters are bypassed in favor of handcrafted, zero-dependency ES2022+ single-file monoliths executing cleanly over file:///. |

## ---

**\[SEC-03\] Expanded 3D Game Development Principles (PJOD-008 Additions)**

### **1\. Explicit Shader Pipeline and STD140 Uniform Authority (\[INV-02\], \[INV-05\])**

* **Principle:** Relying on framework-managed material systems introduces opaque state changes and dynamic memory overhead.  
* **Directive:** All 3D rendering must utilize raw GLSL 300 ES shader pairs managed via immutable Vertex Array Objects (VAOs) and STD140-compliant Uniform Buffer Objects (UBOs). Uniform updates must write directly into pre-allocated typed views over the heap with zero nursery allocations.

### **2\. SIMD-Accelerated Bounding Volume Hierarchies (\[INV-08\], AOP-MEM-SIMD-001)**

* **Principle:** Traversing complex 3D scene graphs and testing collision volumes using object-oriented JavaScript loops causes severe CPU bottlenecks.  
* **Directive:** 3D collision broadphases must evaluate over flat, contiguous arrays of bounding spheres or boxes using WebAssembly 128-bit SIMD (v128) instructions, ensuring zero garbage collection pauses during active simulation ticks.

### **3\. Absolute Rejection of External 3D Frameworks (\[INV-02\], \[INV-03\])**

* **Principle:** Importing libraries like Three.js violates single-file autonomy (\[INV-03\]) and introduces external supply-chain dependencies (\[INV-02\]).  
* **Directive:** AI agents and human engineers must implement custom mathematical projection, vector, and matrix multiplication routines using native typed arrays (Float32Array), maintaining complete control over the rendering pipeline.

## ---

**Honest Thoughts**

Analyzing MDN's documentation on 3D games on the web (\[3D games on the Web\](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D\_on\_the\_web)) reinforces that while frameworks like Three.js make 3D prototyping easy, they compromise performance, bundle size, and architectural purity.  
By applying our Phoenix Sovereign constraints—enforcing raw WebGL 2.0 buffers, STD140 uniform blocks, Wasm SIMD collision kernels, and zero external dependencies—we achieve native-grade 3D performance while retaining absolute single-file portability and zero-allocation determinism.

### ---

**Follow-Up Question**

Would you like to author a zero-allocation 3D matrix math and vector transformation library using pre-allocated Float32Array scratch buffers for our sovereign WebGL rendering pipeline?
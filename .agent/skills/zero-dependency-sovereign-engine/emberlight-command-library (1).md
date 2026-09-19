**Document Identifier:** GUCA-CMD-EMBERLIGHT-001  
**Timestamp:** 2026-09-06T13:12:00-04:00  
**Governing Standard:** VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-001  
**Index Anchor:** PRS-001

## **1\. Testing & Sentinel Auditing Commands**

### **CMD-AUDIT-SENTINEL: Full 19-Pass Verification Gate Check**

* **Purpose:** Instructs the model to evaluate modifications against all 127 checks across the 19 Sentinel passes, simulating the execution of testing/test\_sentinel.js and verifying zero-entropy compliance before code delivery.  
* **Template Prompt:**

Plaintext  
Target Subsystem: \[FILE\_NAME.js\]  
Task: Audit and verify recent code changes against the Sentinel Gatekeeper.

Execute the following steps:  
1\. Review the modifications made to \[FILE\_NAME.js\].  
2\. Cross-reference the changes against the 19 Sentinel passes in auditor.js (specifically Passes \[PASS\_NUMBERS, e.g., 1, 2, 10, 17, 18\]).  
3\. Validate that running \`node testing/test\_sentinel.js\` will output:  
   "=== SENTINEL AUDIT 100% SUCCESS: 127/127 CHECKS PASSED \==="  
4\. Assert that:  
   \- All 9 canonical VSRP-001 lifecycle methods remain intact and properly exported.  
   \- Snapshot isolation (AC-02) is maintained with zero live host reference leakage.  
   \- PRNG stream authority (AC-05) is preserved with zero unseeded Math.random() calls.  
   \- Post-destruction guards (AC-09) throw explicit lifecycle errors.  
5\. If any check fails, state the exact failure condition and provide the precise code fix.

### **CMD-AUDIT-FARADAY: Memory Isolation & Snapshot Mutation Audit**

* **Purpose:** Validates that a Tier 2 simulation tenant maintains strict Faraday memory isolation in its working memory, uses structuredClone() on snapshot ingestion, and emits mutations purely via sealed delta envelopes.  
* **Template Prompt:**

Plaintext  
Target File: \[TIER\_2\_FILE.js\]  
Task: Enforce VSRP-001 Faraday Isolation (Rule 1 & AC-02).

Inspect \[TIER\_2\_FILE.js\] and confirm that:  
1\. Working state is fully enclosed inside a private closure (\`sim\`).  
2\. The \`reset(snapshot)\` method strictly ingests state via \`structuredClone(snapshot)\`. Zero object references (such as party arrays, inventory dictionaries, or flag maps) may remain linked to the host.  
3\. The tenant contains ZERO references to browser DOM primitives (\`window\`, \`document\`, \`localStorage\`, \`HTMLElement\`, \`alert\`).  
4\. State transitions leave the tenant exclusively via \`hostContext.eventBus.publish('\<district\>:resolved', envelope)\`.  
5\. The \`getState()\` method returns a detached POJO snapshot that does not leak internal private references.

Refactor any violating lines immediately, preserving existing \`//\#region\` structural boundaries.

### **CMD-TEST-SUBSYSTEM: Targeted Headless Harness Execution**

* **Purpose:** Instructs the model to run and validate specific domain test harnesses (test\_combat\_input.js, test\_hotkeys\_and\_expansion.js, test\_persistence\_wiring.js, test\_input\_settings\_integration.js, or test\_combat\_victory\_transition.js) without browser interaction.  
* **Template Prompt:**

Plaintext  
Target Test Suite: testing/\[TEST\_SCRIPT.js\]  
Target Modules: \[LIST\_OF\_FILES.js\]  
Task: Validate domain-specific behavior against headless Node assertions.

Context:  
The test harness runs headlessly using Node standard modules (\`node:vm\`, \`node:fs\`, \`node:assert\`) without third-party npm packages.

Instructions:  
1\. Examine the test cases inside \`testing/\[TEST\_SCRIPT.js\]\`.  
2\. Trace the execution flow through the target modules in memory.  
3\. Confirm that all assertions pass cleanly with zero uncaught exceptions.  
4\. If testing input or hotkeys:  
   \- Verify that hardware keys map correctly to action tokens via \`EmberlightInput\`.  
   \- Ensure \`input.clear()\` properly flushes the active key queue on transitions.  
5\. If testing combat or persistence:  
   \- Confirm damage formulas, CTB delays, or sparse coordinate compression budgets (\<2.5KB) meet specification.  
6\. Provide an itemized pass/fail breakdown matching the test harness console output.

## **2\. Refactoring & Optimization Commands**

### **CMD-REFACTOR-REGION: Bounded In-Region Modification**

* **Purpose:** Allows safe, targeted modification of functional logic strictly inside a defined //\#region \[SEC-XX\] block without modifying out-of-scope code or leaking variables into parent closures.  
* **Template Prompt:**

Plaintext  
Target File: \[FILE\_NAME.js\]  
Target Section: //\#region \[SEC-XX\] \[SECTION\_NAME\]  
Task: Refactor logic within designated region boundaries.

Constraints:  
1\. Confine all code additions, deletions, and edits strictly inside \`//\#region \[SEC-XX\]\` and \`//\#endregion\`.  
2\. DO NOT delete, rename, or alter the region header or footer comments.  
3\. DO NOT introduce closure variables that leak outside this region.  
4\. Ensure all newly introduced internal functions are pure, receiving their dependencies explicitly via parameters.  
5\. Preserve the top-level table of contents and navigation anchors intact.  
6\. Return ONLY the refactored code block enclosed within the exact \`//\#region\` and \`//\#endregion\` tags.

Objective:  
\[DESCRIBE SPECIFIC REFACTORING / OPTIMIZATION GOAL HERE\]

### **CMD-EXTRACT-MODULE: Pure Function Extraction & Gasket Decoupling**

* **Purpose:** Prepares monolithic code sections for extraction into standalone modules by eliminating parent closure dependencies and parameterizing all external state access.  
* **Template Prompt:**

Plaintext  
Source File: \[SOURCE\_FILE.js\]  
Target Section: //\#region \[SEC-XX\] \[SECTION\_NAME\]  
Destination File: \[NEW\_MODULE\_FILE.js\]  
Task: Extract functional subsystem into an extraction-ready module.

Execution Rules:  
1\. Convert all functions in \`\[SEC-XX\]\` into pure, deterministic procedures.  
2\. Remove any direct reads/writes to module-level closure variables (\`sim\`, \`hostContext\`, \`state\`); inject required data via explicit parameters.  
3\. If seeded randomness is needed, accept \`prng\` as a parameter typed as \`import('./prng.js').EmberlightPRNG\`.  
4\. Wrap the extracted code using the Universal IIFE Dual-Binding Pattern:  
   \`\`\`javascript  
   const EmberlightModuleName \= (() \=\> {  
     // Pure procedural methods  
     return { ... };  
   })();  
   if (typeof window \!== 'undefined') window.EmberlightModuleName \= EmberlightModuleName;  
   if (typeof module \!== 'undefined') module.exports \= EmberlightModuleName;

> 1. Generate the updated \<script\> tag for index.html and the updated scripts array entry for testing/test\_sentinel.js.

\---

\#\#\# CMD-OPTIMIZE-PERF: 60 FPS Compositor & Zero-GC Loop Optimization

\* \*\*Purpose:\*\* Refactors presentation drivers and particle loops to prevent garbage-collection stutter, eliminate DOM layout thrashing, and enforce GPU-accelerated transforms\[cite: 1, 5\].  
\* \*\*Template Prompt:\*\*

\`\`\`text  
Target File: \[RENDERER\_OR\_VFX\_FILE.js\]  
Performance Target: 60 FPS (\<= 16.67ms frame budget) / Zero-GC in simulation loops

Instructions:  
1\. Eliminate per-frame heap allocations inside \`update()\` and \`render()\`:  
   \- Replace dynamic array instantiation (\`\[\]\`, \`new Array()\`) with pre-allocated TypedArrays (\`Float32Array\`, \`Uint8ClampedArray\`) or indexed object pools.  
   \- Disallow \`structuredClone()\` or object spreading inside 60Hz tick loops.  
2\. Eliminate layout thrashing:  
   \- Disallow continuous calls to \`getBoundingClientRect()\`, \`offsetWidth\`, or \`innerHTML\` inside animation loops.  
   \- Cache centroid buffers and update DOM elements exclusively via CSS hardware transforms (\`transform: translate3d(...)\`) and class toggles.  
3\. Assert that canvas offscreen operations pre-render complex sprites into Base64 PNGs or cached buffers during boot rather than mid-frame.  
4\. Output the refactored loop accompanied by a sub-millisecond execution timing analysis.

## **3\. Architecture-Aware Documentation Commands**

### **CMD-DOC-INDEX: In-File Table of Contents & Anchor Synthesis**

* **Purpose:** Generates or synchronizes an architectural file header, numbered section tags (\[SEC-XX\]), and collapsible region boundaries across large flat-directory modules.  
* **Template Prompt:**

Plaintext  
Target File: \[FILE\_NAME.js\]  
Target Protocol: \[VSRP-001-DISTRICT-X or COMPONENT\_PROTOCOL\]  
Task: Construct architectural Table of Contents and jump anchors.

Instructions:  
1\. Analyze the functional subsystems inside \[FILE\_NAME.js\].  
2\. Generate an architectural header block at lines 1–40 using this exact format:  
   \`\`\`javascript  
   /\*\*  
    \* \============================================================================  
    \* EMBERLIGHT SOVEREIGN ENGINE: \[SUBSYSTEM NAME\]  
    \* Document Identifier: \[DOC-ID\]  
    \* Governing Protocol:  \[PROTOCOL-ID\]  
    \* Authority:           \[Host SSOT | Ephemeral Simulation | Peripheral Presentation | Math Kernel\]  
    \* \============================================================================  
    \*  
    \* TABLE OF CONTENTS & NAVIGATION ANCHORS:  
    \*   \[SEC-01\] Type Definitions & Contract Schemas  
    \*   \[SEC-02\] Canonical 9-Method Lifecycle Gateway  
    \*   ...  
    \* \============================================================================  
    \*/

> 1. Wrap each functional section in the corresponding native folding region:  
>    //\#region \[SEC-XX\] \[SECTION\_NAME\] ... //\#endregion.  
> 2. Ensure every anchor in the Table of Contents matches its \#region tag exactly to enable zero-latency search via Ctrl \+ F.

\---

### **CMD-DOC-JSDOC: Strict Type Contract Annotation (\`checkJs: true\`)**

\* **Purpose:** Generates comprehensive JSDoc \`@typedef\`, \`@param\`, and \`@returns\` definitions so VS Code's internal language service provides static type checking without a TypeScript compiler.  
\* **Template Prompt:**

\`\`\`text  
Target File: \[FILE\_NAME.js\]  
Target Functions: \[FUNCTION\_NAMES or //\#region \[SEC-XX\]\]  
Task: Author strict JSDoc type contracts for zero-dependency static validation.

Requirements:  
1\. Define comprehensive \`@typedef\` domain objects for all state shapes, snapshots, action tokens, and event payloads at the head of the file or section.  
2\. Annotate every function with:  
   \- Clear architectural description (indicating whether it is pure or state-mutating).  
   \- \`@param\` with explicit primitive or custom typedef types (use \`{import('./file.js').Type}\` for cross-file types).  
   \- \`@returns\` with explicit return shapes (use \`@returns {void}\` if no return).  
3\. If an input or parameter is optional, mark it as \`\[paramName\]\`.  
4\. Ensure all parameter types align with \`jsconfig.json\` rules so VS Code flags type errors under \`"checkJs": true\` without requiring any npm type-checking packages.

###

## **4\. Integration & Diagnostics Commands**

### **CMD-DIAG-ASSERTION: Headless VM Assertion Failure Triage**

* **Purpose:** Analyzes stack traces and assertion failures emitted by Node's built-in test runner, mapping the failure directly to the responsible architectural invariant.  
* **Template Prompt:**

Plaintext  
Error Output:  
"""  
\[PASTE TERMINAL ASSERTION FAILURE / STACK TRACE HERE\]  
"""

Task: Triage and rectify test failure.

Follow this systematic resolution protocol:  
1\. Isolate the failing test script and line number (e.g., \`testing/test\_sentinel.js:Pass 18\`).  
2\. Identify the broken invariant:  
   \- Is it an AC-01 lifecycle signature mismatch?  
   \- Is it an AC-02 snapshot isolation leak?  
   \- Is it an AC-04/AC-05 non-deterministic PRNG replay drift?  
   \- Is it a tactical displacement / formation shielding failure?  
3\. Pinpoint the root cause within the offending module.  
4\. Deliver the minimal, exact code modification required to restore the test to passing status.  
5\. Provide terminal verification instructions to confirm the test suite exits with code 0\.

### **CMD-DIAG-ENTROPY: PRNG Authority & Zero-Math.random Verification**

* **Purpose:** Scans target simulation modules, identifies unauthorized global Math.random() invocations, and transitions simulation entropy to the deterministic EmberlightPRNG stream.  
* **Template Prompt:**

Plaintext  
Target Files: \[Tier 2 Simulation Files or Tier 4 Procedural Kernels\]  
Task: Attest PRNG Authority (AC-05) and eliminate unseeded entropy.

Instructions:  
1\. Scan the target file(s) for any occurrence of global \`Math.random()\`.  
2\. For every occurrence:  
   \- If located inside a Tier 2 simulation tenant or Tier 4 math kernel, flag it as a CRITICAL CONSTITUTIONAL VIOLATION.  
   \- Replace \`Math.random()\` with explicit calls to \`prng.nextFloat()\`, \`prng.nextInt(min, max)\`, or \`prng.choice(arr)\`.  
3\. Verify that the \`prng\` stream instance is:  
   \- Passed down deterministically through \`reset(snapshot)\` or context updates.  
   \- Serialized in \`getState()\` via \`prng.getState()\` to preserve bit-exact replayability.  
4\. Assert that running Pass 5 and Pass 17 of \`auditor.js\` confirms zero global random calls during active simulation cycles.

### **CMD-DIAG-LIFECYCLE: VSRP-001 State Machine & Teardown Remediation**

* **Purpose:** Inspects module lifecycle transitions, ensuring strict adherence to the state machine (UNCONFIGURED \-\> CONFIGURED \-\> INITIALIZED \-\> READY \-\> RUNNING \-\> DESTROYED) and guaranteeing idempotent teardown.  
* **Template Prompt:**

Plaintext  
Target Module: \[MODULE\_NAME.js\]  
Task: Remediate VSRP-001 Lifecycle State Machine and Teardown Leaks.

Audit the module against VSRP-001 Section 3 and Section 4.9:  
1\. Verify the formal state transition guard \`assertLifecycle(...allowedStates)\`:  
   \- Ensure \`configure()\` can only be called from \`UNCONFIGURED\` and locks configuration.  
   \- Ensure \`init()\`, \`reset()\`, \`update()\`, and \`render()\` throw if invoked out of sequence.  
2\. Verify teardown idempotency in \`destroy()\`:  
   \- Purge all DOM handles, canvas buffers, Web Audio oscillator nodes, and timers.  
   \- Release and unbind all \`EventBus\` subscription tokens (\`unsub()\`).  
   \- Confirm that calling \`destroy()\` repeatedly is a safe no-op.  
   \- Confirm that calling any other method after \`destroy()\` throws an explicit lifecycle exception.  
3\. Validate that Pass 13 and Pass 17 (AC-09) in \`auditor.js\` evaluate to PASS.

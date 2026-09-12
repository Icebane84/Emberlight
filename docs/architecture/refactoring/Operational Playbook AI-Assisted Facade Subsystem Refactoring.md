# **Operational Playbook: AI-Assisted Facade Subsystem Refactoring**

**Document Identifier:** AOP-REF-FACADE-001
**Parent Protocol:** VSRP-001 (Universal Module Contract Specification)
**Architecture:** Facade / Subsystem Entry Point Decomposition
**Classification:** Operational Playbook & AI Prompting Guardrails
**Index Anchor:** PRS-001
**Timestamp:** 2026-09-08T17:34:00Z

## **1\. Architectural Intent**

When using an AI collaborator to decompose 2,000–4,000+ line monolithic scripts into the Facade / Subsystem Topology, language models have distinct failure modes:

> 1. They attempt to introduce ES Module syntax (import/export), breaking the zero-dependency file:// double-click capability.
> 2. They alter function signatures, formulas, or polygon coordinates rather than performing pure structural extraction.
> 3. They drop or summarize intermediate sections of code to save tokens.
> 4. They break VSRP-001 lifecycle assertions, snapshot isolation, or peripheral driver registrations.

To guarantee zero regression, you must enforce a deterministic, multi-prompt workflow bounded by rigid architectural guardrails.

## **2\. Core Operational Constraints & Prompt Guardrails**

Provide these non-negotiable constraints to the AI collaborator prior to initiating any refactoring pass:

### **The Master Constraint Block (Copy-Paste into AI Context)**

> ### **🛑 NON-NEGOTIABLE ARCHITECTURAL CONSTRAINTS**

1. **Zero Tooling / Zero ESM (file:// Invariance):**
   - DO NOT use import, export, export default, or require().
   - All output must run natively in a standard browser via plain \<script src="..."\> tags loaded over file://.
2. **Temporary Staging Membrane:**
   - Every extracted internal subsystem must attach its public functions/data strictly to a single staging namespace: window.\_\<ModuleName\>Internal \= window.\_\<ModuleName\>Internal || {};.
   - Subsystems must wrap their execution inside an IIFE (() \=\> { 'use strict'; ... })();.
   - The root facade file must explicitly call delete window.\_\<ModuleName\>Internal; immediately after instantiating its closure to enforce zero host namespace pollution.
3. **Strict Code Preservation (Zero Summarization, Zero Math Drift):**
   - DO NOT summarize, hallucinate, optimize, or truncate polygon coordinate arrays, canvas paths, damage formulas, or lookup tables.
   - Every single line of math and drawing logic from the target sections must be extracted verbatim.
4. **VSRP-001 Contract Invariance:**
   - The root facade file must export the complete canonical 9-method VSRP-001 interface: configure, init, reset, update, render, getState, getDiagnostics, getModuleInfo, and destroy.
   - Snapshot isolation (Faraday cage), deterministic PRNG handling, and peripheral driver telemetry must remain completely unmutated.

## **3\. The 4-Phase Step-by-Step Refactoring Workflow**

Decomposition must be executed across sequential, atomic prompts. Never ask the AI to refactor an entire 4,000-line file in a single prompt.

┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Structural Audit & Boundary Partitioning │
│ (AI plans file targets & staging dictionary keys) │
└──────────────────────────────┬──────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Subsystem File Extractions (Atomic Steps) │
│ (Extracts verbatim math/drawing into staging namespace) │
└──────────────────────────────┬──────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Root Facade Construction & Staging Purge │
│ (Builds VSRP-001 interface, ingests staging, deletes key) │
└──────────────────────────────┬──────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: Harness Wiring & Sentinel Audit Verification │
│ (Updates index.html tags and validates auditor.js) │
└─────────────────────────────────────────────────────────────┘

### **Phase 1: Structural Audit & Boundary Partitioning**

- **What:** Instruct the AI to analyze the target monolith and design the subsystem layout without writing implementation code yet.
- **Prompt to AI:**

Markdown
We are refactoring the monolithic file \`\[FILENAME.js\]\` into the VSRP-001 Facade / Subsystem Entry Point Topology.

Read the entire file and generate a Refactoring Plan containing:
1\. Target Subsystem Files: Propose 3 to 5 logical subsystem files to be placed in \`\[MODULENAME\]/\` (e.g., primitives, calculators, entities, pipeline).
2\. Staging Interface Schema: Explicitly define the exact keys and signatures that will attach to \`window.\_\[MODULENAME\]Internal\`.
3\. Root Facade Scope: Identify which lifecycle methods and caching structures will remain inside the root \`\[FILENAME.js\]\`.

DO NOT output full code yet. Adhere strictly to the Master Constraints (No ESM, zero tooling, preserve all math/coordinates).

### **Phase 2: Atomic Subsystem File Extractions**

- **What:** Direct the AI to generate one subsystem file at a time, ensuring complete fidelity.
- **Prompt Template to AI (Repeat for each internal file):**

Markdown
Implement Subsystem \[X\]: \`\[MODULENAME\]/\[SUBSYSTEM_FILE.js\]\`.

Extract exclusively the following sections from the source file:
\- Target Sections: \[LIST SECTIONS, e.g., SEC-01 Palettes and SEC-02 Drawing Primitives\]

Requirements:
1\. Wrap the entire file in an IIFE.
2\. Ingest required dependencies from \`window.\_\[MODULENAME\]Internal\`.
3\. Export all extracted functions/objects onto \`window.\_\[MODULENAME\]Internal.\[SUB_KEY\]\`.
4\. Output the COMPLETE code. DO NOT omit, summarize, or truncate arrays, coordinates, or formulas. DO NOT write \`// ...rest of code\`.
5\. DO NOT use ES module \`export\` or \`import\` syntax.

### **Phase 3: Root Facade Construction & Staging Purge**

- **What:** Assemble the thin, contract-compliant entry point at the root level.
- **Prompt to AI:**

Markdown
Implement the root facade entry point: \`\[FILENAME.js\]\`.

Requirements:
1\. Ingest all sub-modules from \`window.\_\[MODULENAME\]Internal\` at the top of the closure.
2\. Implement the canonical VSRP-001 9-method interface (\`configure\`, \`init\`, \`reset\`, \`update\`, \`render\`, \`getState\`, \`getDiagnostics\`, \`getModuleInfo\`, \`destroy\`).
3\. Retain caching, telemetry, and Faraday snapshot cloning at the facade level.
4\. Immediately after closing the IIFE, add \`delete window.\_\[MODULENAME\]Internal;\` to guarantee zero global scope pollution.
5\. Export the instance to \`window.\[CANONICAL_MODULE_NAME\]\`.
6\. Output the complete, un-truncated facade file (\~150–250 LOC).

### **Phase 4: Harness Wiring & Sentinel Verification**

- **What:** Update the host execution harness and run automated verification.
- **Procedure:**
  1. Add the new script tags to index.html directly before the facade script:
     HTML
     \<\!-- Subsystems in dependency order \--\>
     \<script src\="\[MODULENAME\]/subsystem_1.js"\>\</script\>
     \<script src\="\[MODULENAME\]/subsystem_2.js"\>\</script\>

     \<\!-- Root VSRP-001 Facade Entry Point \--\>
     \<script src\="\[FILENAME.js\]"\>\</script\>

  2. Double-click index.html from the file system (file://).
  3. Verify that auditor.js runs its 19-pass battery and outputs 100% PASS with zero NaN errors, zero lifecycle violations, and zero Faraday breaches.

## **4\. Troubleshooting AI Deviations**

| AI Mistake / Deviation                      | Root Cause                                   | Exact Correction Directive to Give AI                                                                                                                                                                  |
| :------------------------------------------ | :------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uses export default or import               | Habitual training on modern bundlers / Node. | _"VIOLATION: You used ESM syntax. The project must run directly in the browser via file://. Remove all import/export statements and bind strictly to window.\_\[MODULENAME\]Internal inside an IIFE."_ |
| Writes // ...rest of drawing coordinates... | Token conservation behavior.                 | _"VIOLATION: Code truncation detected. You must emit every single polygon array and coordinate point without ellipsis or shortcuts."_                                                                  |
| Leaks staging variables to window           | Forgot to seal the membrane.                 | _"VIOLATION: Staging object leaked. Ensure delete window.\_\[MODULENAME\]Internal; is called at the end of the root facade file."_                                                                     |
| Alters formula math or roundings            | AI trying to 'clean up' or refactor logic.   | _"VIOLATION: Logic drift. Extract the code with zero alterations to formulas, operators, bitwise logic, or math routines."_                                                                            |

## **Honest Thoughts**

The biggest failure point when asking an AI to refactor code is asking it to do too much at once. If you paste a 3,000-line file like battler_baker.js or combat.js into an LLM and say "split this into files," the AI will almost always hallucinate shortened versions of polygon arrays or damage tables to fit into its token budget.
By forcing the AI through the 4-phase sequence—first approving the blueprint, then extracting one subsystem per prompt with a strict ban on code summarization, and finally assembling the lean facade—you eliminate hallucination risk. The Sentinel auditor (auditor.js) acts as your final ground truth: if the AI dropped even a single required telemetry field or broke Faraday snapshot cloning, the gatekeeper will catch it on boot.

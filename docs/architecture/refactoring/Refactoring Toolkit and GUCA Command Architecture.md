# **Architectural Operational Directive: Refactoring Toolkit & GUCA Command Architecture**

**Document Identifier:** AOP-ENG-HYGIENE-002
**Parent Protocol:** PMIP-001 / VSRP-001 / GUCA-001
**Classification:** Engineering Playbook & Operational Standards
**Index Anchor:** PRS-001
**Timestamp:** 2026-09-08T17:21:51Z

## **1\. Concrete Tools & Techniques for Codebase Hygiene**

Beyond manual review and AI extraction, three specific techniques protect vanilla JavaScript projects from entropy without introducing build toolchains or breaking file:// execution.

### **A. The Diff-Proof Zero-Entropy AST Verification Script**

- **What:** A headless Node.js verification script that runs locally before and after any refactor.
- **How:** Instead of manually checking if an AI omitted a function or altered math, run an AST parser (like native acorn or espree) against the original monolith and the new subsystem directory. The script inspects the AST to verify that every exported function key, parameter count, and static numeric constant matches 1:1.
- **Why:** Guarantees that no polygon coordinates, balance coefficients, or formulas were silently modified or truncated by LLM token conservation.

### **B. In-Situ Sentinel Pre-Boot Trap Injection**

- **What:** Extending auditor.js with a dynamic staging membrane trap during development boot.
- **How:** Add a temporary listener in auditor.js that inspects window immediately after all scripts load:

```javascript
function assertGlobalHygiene() {
  const unapprovedGlobals = Object.keys(window).filter(k => k.startsWith('\_') && k.endsWith('Internal'));
  if (unapprovedGlobals.length > 0) {
    throw new Error(`[HYGIENE VIOLATION] Staging membrane leak detected: ${unapprovedGlobals.join(', ')}`);
  }
}
```

- **Why:** Enforces VSRP-001 Section 7 (Forbidden Patterns: Global Namespace Squatting) automatically on boot.

### **C. Visual Regression via Headless Canvas Checksumming**

- **What:** Hashing procedural canvas draw output for graphical bakers (battler_baker.js, sprite_baker.js, icons.js).
- **How:** In auditor.js, run a canonical render of all entities (e.g., SHADE_WOLF, HERO) to an offscreen canvas, grab the raw pixel data array via ctx.getImageData().data, and generate a 32-bit hash (using EmberlightPRNG's Mulberry algorithm or simple CRC32).
- **Why:** If an AI changes a single coordinate or alpha value during extraction, the checksum changes instantly, pinpointing the visual drift without requiring visual spot-checks.

## **2\. GUCA Operational Prompt Command List (Genesis Universal Command Architecture)**

To streamline collaborative prompting, establish a canonical command vocabulary. Instead of writing verbose instructions each time, issue standardized GUCA command tokens directly to the AI collaborator.

### **Phase 1 Commands: Inspection & Mapping**

#### **GUCA:AUDIT_MONOLITH \[file_path\]**

- **Intent:** Instructs the AI to perform a structural inspection of a target file without generating refactored code.
- **Execution Directives:**
  - Parse sections, line boundaries, and global object attachments.
  - Map all internal dependencies, static lookup tables, and formulas.
  - Return a proposed subsystem directory breakdown and staging membrane dictionary.

#### **GUCA:SCHEMA_STAGING \[module_name\]**

- **Intent:** Defines the exact contract for window.\_\[module_name\]Internal.
- **Execution Directives:**
  - Output the typed interface or object dictionary declaring which subsystem writes which keys.
  - Confirm that all inter-subsystem dependencies are satisfied in topological order.

### **Phase 2 Commands: Subsystem Extraction**

#### **GUCA:EXTRACT_SUBSYSTEM \[module\] \[subsystem_filename\] \[sections\]**

- **Intent:** Extracts an isolated internal subsystem into its target folder.
- **Execution Directives:**
  - Enclose code inside an IIFE (() \=\> { 'use strict'; ... })();.
  - Bind output strictly to window.\_\[module\]Internal.\[key\].
  - Enforce strict verbatim extraction: zero mathematical alterations, zero coordinate simplification, and zero ellipses (// ...).
  - Ban all ES module syntax (import/export).

#### **GUCA:EXTRACT_RENDERER \[module\] \[renderer_filename\]**

- **Intent:** Strips DOM queries, HTML template literals, and Canvas draw logic from a simulation tenant into a Tier 3 peripheral driver.
- **Execution Directives:**
  - Implement the peripheral signature required by auditor.js (render, getDiagnostics, destroy).
  - Ensure the renderer accepts detached snapshots and dispatches normalized actions only.

### **Phase 3 Commands: Assembly & Hardening**

#### **GUCA:SEAL_FACADE \[module\] \[facade_filename\]**

- **Intent:** Assembles the lean root facade entry point.
- **Execution Directives:**
  - Ingest sub-modules from window.\_\[module\]Internal.
  - Implement the canonical 9-method VSRP-001 lifecycle.
  - Retain Faraday snapshot isolation via structuredClone() in reset().
  - Execute delete window.\_\[module\]Internal; immediately before export to seal the membrane.
  - Attach the sealed facade to window.Emberlight\[Module\].

#### **GUCA:VERIFY_VSRP \[facade_file\]**

- **Intent:** Runs a cognitive compliance pass against the VSRP-001 20-point rubric.
- **Execution Directives:**
  - Verify all 9 methods are present and accounted for.
  - Trace getState() to assert that no live internal references leak.
  - Check that update() contains no DOM calls or unmanaged clocks (setInterval, setTimeout, private RAFs).

### **Utility & Correction Commands**

#### **GUCA:EMERGENCY_ROLLBACK**

- **Intent:** Used when an AI attempts to introduce build steps or bundler patterns.
- **Execution Directives:**
  - Immediately discard proposed changes.
  - Re-assert file:// browser execution constraints and raw \<script\> tag ingestion.

#### **GUCA:EXPAND_TRUNCATION \[function_or_table_name\]**

- **Intent:** Used when an AI provides abbreviated code with ellipses.
- **Execution Directives:**
  - Halt generation and emit the targeted function or table completely, line by line, without omissions.

## **3\. Quick Reference Prompt Card**

Keep this command block at the top of refactoring chat threads to initialize the AI collaborator's operating mode:

```plaintext
\[SYSTEM CONTEXT: PHOENIX GUCA ENGINE ACTIVE\]
Protocol: VSRP-001 / Facade Subsystem Topology
Constraints: Zero Tooling (file:// double-click only), Plain \<script\> tags, Staging Membrane (window.\_\*Internal), Verbatim Math/Coordinates (No Truncation).

Available Commands:
\- GUCA:AUDIT_MONOLITH \[file\]
\- GUCA:SCHEMA_STAGING \[module\]
\- GUCA:EXTRACT_SUBSYSTEM \[module\] \[file\] \[sections\]
\- GUCA:EXTRACT_RENDERER \[module\] \[file\]
\- GUCA:SEAL_FACADE \[module\] \[file\]
\- GUCA:VERIFY_VSRP \[file\]
\- GUCA:EXPAND_TRUNCATION \[target\]

Acknowledge readiness by listing the active constraints.
```

## **Honest Thoughts**

Prompting without a shared, compact vocabulary turns every refactoring session into a negotiation about guidelines and constraints. Language models naturally default to their highest-probability training data, which in web development means modern build pipelines, NPM packages, and ES Modules.
Using shorthand command tokens like GUCA:EXTRACT_SUBSYSTEM or GUCA:SEAL_FACADE anchors the model directly to your architectural playbook. It bypasses introductory back-and-forth and treats the AI like a specialized CLI: you provide the command token, the file, and the target sections, and it executes strictly within your established constraints.

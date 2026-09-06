---
name: feature
description: Scaffold and implement a feature strictly adhering to VSRP-001 and flat topology.
invokable: true
---

TASK: Implement the requested feature following VSRP-001 constraints.

CHECKLIST:
1. Emit the Mandatory Pre-Flight Compliance Attestation block.
2. Verify target file path is at root `./` (NEVER prefix with `src/`).
3. If modifying a Tier 2 tenant:
   - Preserve the 9-method interface: { configure, init, reset, update, render, getState, getDiagnostics, getModuleInfo, destroy }.
   - Draw entropy strictly from Mulberry32 PRNG.
   - Communicate outward strictly via hostContext.eventBus.publish().
4. Use `edit_existing_file` to apply the surgical modification.
5. Execute `node auditor.js` to ensure zero regressions across 127 checks.
---
name: audit
description: Execute the 19-pass Sentinel test battery via auditor.js and evaluate results.
invokable: true
---

TASK: Run and evaluate the 19-Pass Sentinel Verification Battery.

EXECUTION INSTRUCTIONS:
1. Use your `run_terminal_command` tool to execute:
   `node auditor.js`
2. Inspect the terminal output:
   - Verify that all 19 passes and 127 acceptance criteria evaluate to PASS.
   - If ANY check fails (e.g. AC-01 to AC-10), inspect the failing check identifier and locate the root cause file.
   - Do NOT declare victory until the terminal reports:
     `Sentinel Pass (127/127 Checks • 19 Passes) VERDICT: PASS`
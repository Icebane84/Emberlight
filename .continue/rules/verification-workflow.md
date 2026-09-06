---
name: Emberlight Post-Edit Verification Workflow
description: Automates Sentinel test battery execution after code changes
globs: "*.js"
---

# 🧪 Verification & Audit Protocol

After modifying any JavaScript file in the repository:
1. Use the terminal execution tool to run the Sentinel battery:
   `node auditor.js`
2. Inspect the terminal output. Confirm all 127 checks across 19 passes evaluate to PASS.
3. If any assertion fails or an illegal lifecycle mutation is detected, immediately repair the diff before reporting completion.
---
name: inspect
description: Deeply inspect an architectural subsystem without generating code edits.
invokable: true
---

TASK: Perform a read-only architectural analysis.

CONSTRAINTS:
- You are in READ-ONLY mode.
- Do NOT generate code diffs or call `edit_existing_file`.
- Reference `ARCHITECTURE.md` as the authoritative mental model.
- Analyze the requested component using the What/How/Why framework.
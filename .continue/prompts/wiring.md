---
name: wiring
description: Audit the global namespace wiring, Faraday boundaries, and script tag registration.
invokable: true
---

TASK: Audit the cross-module wiring across the flat directory.

EXECUTION INSTRUCTIONS:
1. Use `grep_search` to verify NO simulation tenants violate the Faraday rules:
   - Search for `document\.` and `window\.` inside Tier 2 files (`combat.js`, `overworld.js`, `armory.js`, `progression.js`, `relic_forge.js`).
   - Search for `setTimeout` or `setInterval` across Tier 2 and Tier 4.
   - Search for `Math\.random\(` in simulation logic.
   - Search for `^import\b` or `\bexport\s+default` to ensure zero ES module syntax.
2. Read `index.html` and verify that all 34 files are registered in strict script loading order:
   - Tier 4 (Kernels: manifest, prng, etc.)
   - Tier 1 (Host: event_bus, session_store, runtime)
   - Tier 2 (Districts: combat, overworld, etc.)
   - Tier 3 (Drivers & Renderers)
3. Report any broken references, missing window.Emberlight* exports, or unmanaged clocks.
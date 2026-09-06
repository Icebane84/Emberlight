---
name: add-enemy
description: Add a new enemy archetype conforming to manifest.js and battler_baker.js
---

Review `manifest.js` for enemy stats and `battler_baker.js` for procedural 64x64 pixel rendering passes.
Add the requested enemy conforming strictly to Tier 4 pure data standards:
- Frozen data entry in `EmberlightManifest.Enemies`
- Modular battler pass in `battler_baker.js` (no external sprites)
- Zero DOM references and zero unseeded randomness
---
name: audit
description: Governs the 21-Pass Sentinel Headless Audit runner, VSRP-001 constitutional acceptance criteria (AC-01 to AC-10), anti-theater assertion suites, and state isolation verification.
globs: "auditor.js, auditor/*.js, testing/test_sentinel.js, testing/load_order.js"
alwaysApply: false
version: 2.0.0
---

# AGENT OPERATIONAL SPECIFICATION: Sentinel Multi-Pass Audit Engine

**Document Identifier:** SKILL-EMBERLIGHT-AUDIT-002
**Protocol Version:** VSRP-001 / SDCP-001 / ARCH-001-EMBERLIGHT
**Environment:** Headless Node.js Standard Library (`node:vm`, `node:assert`)

---

## 1. Core Purpose & Architectural Mandate

The Sentinel Audit Engine (`auditor.js` + `auditor/*.js`) executes a 21-Pass, 134-Check deterministic battery to verify zero-leakage, strict state isolation, PRNG authority, and constitutional compliance across all Emberlight simulation tenants and peripheral drivers.

---

## 2. VSRP-001 Constitutional Acceptance Criteria (AC-01 through AC-10)

Every simulation tenant (`combat`, `overworld`, `progression`, `armory`, `market`, `chronicle`, `status`, `relic_forge`, `lockpick`, `dungeon_gen`, `settings`) is formally audited against the 10 Constitutional Criteria:

1. **AC-01 (Lifecycle Contract):** Tenant MUST expose the canonical 9-method interface:
   `configure()`, `init()`, `reset()`, `update()`, `render()`, `getState()`, `getDiagnostics()`, `getModuleInfo()`, `destroy()`.
2. **AC-02 (Snapshot Isolation):** Post-reset mutations on the host snapshot object MUST NOT contaminate internal tenant state (`structuredClone` required).
3. **AC-03 (State Round-Trip Idempotency):** Executing `tenant.reset(tenant.getState())` MUST produce identical state without drift.
4. **AC-04 (Deterministic Replay):** Identical initial seeds and identical sequential action streams MUST yield bit-exact simulation outcomes.
5. **AC-05 (PRNG Authority):** Zero invocations of global unseeded `Math.random()` in authoritative simulation logic (`EmberlightPRNG` required).
6. **AC-06 (Update Purity):** `tenant.update(dt, context)` MUST NEVER mutate host input queue objects or array references.
7. **AC-07 (Render Idempotency):** `tenant.render()` MUST be 100% side-effect-free with respect to simulation state.
8. **AC-08 (Metadata Schema):** `getModuleInfo()` MUST return `{ moduleId, version, protocolVersion, capabilities }`.
9. **AC-09 (Destruction Idempotency):** `destroy()` MUST be idempotent; post-destruction calls MUST be safely gated.
10. **AC-10 (Anti-Theater Verification):** All assertions MUST execute real behavioral state transitions rather than mocked no-ops.

---

## 3. 21-Pass Sentinel Architecture Reference

- **Pass 1:** Contract & Faraday Isolation Battery (`AC-01` to `AC-10`)
- **Pass 2:** Headless Combat Simulation (20 Matches, Zero NaN, Zero Leak)
- **Pass 3:** Overworld Simulation & Collision Matrix
- **Pass 4:** Market Commerce & Economy Balance
- **Pass 5:** Progression & Skill Tree Graph Validation (77 Nodes, Respec)
- **Pass 6:** Harmonic Lockpick Resonance & Envelope Battery
- **Pass 7:** Relic Forge Determinism & Economic Envelope Battery
- **Pass 8:** Pseudo-3D Raycaster Headless Buffer & Telemetry Battery
- **Pass 9:** SDCP-001 Capability Registry & Anti-Entropy Seal
- **Pass 10:** Formation Topology & Backline Shielding Invariance
- **Pass 11:** Boss Phase Shaders & Status Ailment Invariance
- **Pass 12:** Dual-Perspective & 3D Raycaster Immersion Battery (960x360 / 75° FOV)
- **Pass 13:** Persistence Compression (<2.5KB) & EventBus Teardown Battery
- **Pass 14:** Battler Sprite Synthesis (10/10 Battlers) & Procedural Backdrops (4 Biomes)
- **Pass 15:** Overworld Mutability, Chest Looting & Navigation Invariance
- **Pass 16:** Surfacing & Legibility Engine Battery (Dynamic Stats, 5 Quests, Pouch)
- **Pass 17:** VSRP-001 Constitutional Compliance Battery (`AC-01` to `AC-10`)
- **Pass 18:** Tactical Displacement & Row Invariance (Knockback / Pull / Boss Immunity)
- **Pass 19:** Deep Analysis Mode & Workstation Architecture (Biometrics, Radar Canvas)
- **Pass 20:** 4-Quadrant War Table Skeleton & Projection Battery (`PMIP-001`)
- **Pass 21:** 4-Quadrant Combat Station Integration Battery (8x6 Grid, Threat Oracle, Hero Chassis)

---

## 4. Execution & Verification Command

```bash
node testing/run_all_tests.js
```

---

## 5. Audit Failure Remediation (ERL-001)

When any of the 21 Sentinel passes fail:

1. Identify the failing pass number and constitutional criterion (`AC-01` through `AC-10`).
2. Match against the canonical fix patterns in [`.agent/skills/error-resolution-ledger/SKILL.md`](file:///c:/Users/Chris/Emberlight/.agent/skills/error-resolution-ledger/SKILL.md).
3. Apply the verified patch and verify 100% pass across all 21 passes without regressions.

// cSpell:ignore SSOT VSRP
/**
 * @fileoverview SSOT — Canonical Emberlight engine script load order.
 *
 * This file is the **single authoritative source** of topological dependency order
 * for all engine modules. It is consumed by every VM-based headless test harness via:
 *
 *   const scripts = require('./load_order.js');
 *
 * The matching `<script>` block in `index.html` must stay in sync with this list.
 * Run `node testing/gen_html_scripts.js` to audit for drift.
 *
 * @protocol VSRP-001
 * @version 1.0.0
 */
'use strict';

/** @type {readonly string[]} */
const EMBERLIGHT_SCRIPT_LOAD_ORDER = Object.freeze([
  // ── Tier 4: Kernels & Static Schema ──────────────────────────────────────
  // Manifest domain subsystems (populate window._ManifestInternal staging membrane)
  'manifest/manifest_config.js',
  'manifest/manifest_actors.js',
  'manifest/manifest_items.js',
  'manifest/manifest_progression.js',
  'manifest/manifest_world.js',
  'manifest/manifest_narrative.js',
  'manifest/manifest_calculators.js',
  // Manifest facade (seals membrane → deepFreeze → export EmberlightManifest)
  'manifest/manifest.js',
  'prng.js',

  // ── Tier 1: Host Harness Core ─────────────────────────────────────────────
  'session_store.js',
  'event_bus.js',

  // ── Tier 1: World & Ecology Systems ───────────────────────────────────────
  'world_ecology.js',
  'district_router.js',

  // ── Tier 3: Audio Peripheral Drivers ──────────────────────────────────────
  'acoustic_sfx.js',
  'synth_soundtrack.js',
  'synthetic_voice.js',

  // ── Tier 3: Input Peripheral Driver ───────────────────────────────────────
  'input.js',

  // ── Tier 3: Icon & Asset Bakers ───────────────────────────────────────────
  'icons.js',
  'skill_icons.js',
  'party_icons.js',
  'sprite_baker.js',

  // ── Tier 3: Rendering Pipeline ────────────────────────────────────────────
  'combat_vfx.js',
  'dynamic_lights.js',
  'pseudo_3d_renderer.js',
  'shader_compositor.js',
  'battler_baker.js',
  'battle_backdrop.js',
  'threat_oracle.js',
  'cockpit_renderer.js',
  'combat_renderer.js',
  'map_renderer.js',
  'armory_renderer.js',
  'chronicle_renderer.js',
  'progression_renderer.js',
  'market_renderer.js',
  'status_renderer.js',
  'relic_forge_renderer.js',

  // ── Tier 2: Ephemeral Simulation Districts ────────────────────────────────
  'progression.js',
  'combat.js',
  'script.js',       // Browser menu bootstrap — safe headlessly in mock context
  'overworld.js',
  'armory.js',
  'market.js',
  'chronicle.js',
  'status.js',

  // ── Tier 4: Audit Kernel (VSRP-001 staged membrane sub-modules) ──────────
  'auditor/auditor_kernel.js',        // Kernel: logAudit, deepFreeze, createDefaultState, createIsolatedEventBus
  'auditor/auditor_contracts.js',     // Pass 1: Contract & Faraday isolation battery
  'auditor/auditor_district_sims.js', // Pass 2–8: In-situ district simulation battery
  'auditor/auditor_combat_extended.js', // Pass 9–12: SDCP, formation, boss/ailment, dual-perspective
  'auditor/auditor_persistence.js',   // Pass 13–16: Persistence, aesthetics, transitions, surfacing
  'auditor/auditor_constitutional.js', // Pass 17: VSRP-001 constitutional compliance (AC-01–AC-10)
  'auditor/auditor_endgame.js',       // Pass 18–19 + SPINE: displacement, deep analysis, executeAuditPasses
  'auditor.js',                        // Facade: ingests membrane, purges _AuditorInternal, exports EmberlightAuditor

  // ── Tier 2 (cont.) ────────────────────────────────────────────────────────
  'relic_forge.js',
  'dungeon_gen.js',
  'lockpick.js',
  'settings.js',

  // ── Tier 1: Persistence ───────────────────────────────────────────────────
  'save_manager.js',

  // ── Tier 1: Orchestration & Entry Point ───────────────────────────────────
  'runtime.js',
]);

if (typeof module !== 'undefined') module.exports = EMBERLIGHT_SCRIPT_LOAD_ORDER;

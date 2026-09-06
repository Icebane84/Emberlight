The One Critical Rule for JavaScript Migration
Because Emberlight uses classic browser waterfall <script> tags (where modules register on window / global scope without a bundler like Vite or Webpack), execution order in index.html is strictly mandatory.

If moving JS files to subfolders,

index.html
must be updated to match the subfolder paths while strictly preserving the loading sequence:

 <!-- 1. INFRASTRUCTURE & EVENT SUBSTRATE -->
<script src="js/subsystems/manifest.js"></script>
<script src="js/subsystems/prng.js"></script>
<script src="js/subsystems/session_store.js"></script>
<script src="js/subsystems/event_bus.js"></script>
<script src="js/subsystems/world_ecology.js"></script>
<script src="js/subsystems/district_router.js"></script>

<!-- 2. AUDIO & INPUT DRIVERS -->
<script src="js/drivers/acoustic_sfx.js"></script>
<script src="js/drivers/synth_soundtrack.js"></script>
<script src="js/drivers/synthetic_voice.js"></script>
<script src="js/drivers/input.js"></script>

<!-- 3. PROCEDURAL BAKERS & RENDER DRIVERS -->
<script src="js/drivers/icons.js"></script>
<script src="js/drivers/skill_icons.js"></script>
<script src="js/drivers/party_icons.js"></script>
<script src="js/drivers/sprite_baker.js"></script>
<script src="js/drivers/combat_vfx.js"></script>
<script src="js/drivers/dynamic_lights.js"></script>
<script src="js/drivers/pseudo_3d_renderer.js"></script>
<script src="js/drivers/shader_compositor.js"></script>
<script src="js/drivers/battler_baker.js"></script>
<script src="js/drivers/battle_backdrop.js"></script>
<script src="js/drivers/threat_oracle.js"></script>
<script src="js/drivers/cockpit_renderer.js"></script>
<script src="js/drivers/combat_renderer.js"></script>
<script src="js/drivers/map_renderer.js"></script>
<script src="js/drivers/overworld_renderer.js"></script>
<script src="js/drivers/armory_renderer.js"></script>
<script src="js/drivers/chronicle_renderer.js"></script>
<script src="js/drivers/progression_renderer.js"></script>
<script src="js/drivers/market_renderer.js"></script>
<script src="js/drivers/status_renderer.js"></script>
<script src="js/drivers/relic_forge_renderer.js"></script>

<!-- 4. CORE SIMULATION TENANTS -->
<script src="js/core/progression.js"></script>
<script src="js/core/combat.js"></script>
<script src="js/core/script.js"></script>
<script src="js/core/overworld.js"></script>
<script src="js/core/armory.js"></script>
<script src="js/core/market.js"></script>
<script src="js/core/chronicle.js"></script>
<script src="js/core/status.js"></script>
<script src="js/core/auditor.js"></script>
<script src="js/core/relic_forge.js"></script>
<script src="js/core/lockpick.js"></script>
<script src="js/core/settings.js"></script>

<!-- 5. PROCEDURAL CARVERS & LIFECYCLE RUNTIME -->
<script src="js/subsystems/dungeon_gen.js"></script>
<script src="js/subsystems/save_manager.js"></script>
<script src="js/runtime.js"></script>

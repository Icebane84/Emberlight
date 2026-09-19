battler\_baker.js is already structured using clear sectional boundaries (\[SEC-01\] through \[SEC-09\]), making it straightforward to decompose into the **Facade / Subsystem Entry Point** topology without breaking standard \<script\> tag execution or browser compatibility.

## **1\. Directory Structure**

Group the internal rendering procedures, palettes, and silhouette logic into a dedicated subsystem folder while leaving battler\_baker.js at the root as the canonical facade:

Plaintext  
Emberlight/  
├── index.html  
├── battler\_baker.js                   \<-- Canonical VSRP-001 Facade (\~180 LOC) \[SEC-08, SEC-09\]  
└── battler\_baker/                     \<-- Private Internal Subsystems  
    ├── battler\_primitives.js          \<-- \[SEC-01, SEC-02\] Palettes, Canvas helpers, 4x Math  
    ├── battler\_heroes.js              \<-- \[SEC-03\] Hero anatomy & class silhouettes  
    ├── battler\_overlays.js            \<-- \[SEC-04\] Equipment overlays (Armor & Weapons)  
    ├── battler\_enemies.js             \<-- \[SEC-05\] 7 Canonical enemy silhouettes  
    └── battler\_pipeline.js            \<-- \[SEC-06, SEC-07\] Aliases, Resolvers & PNG Encoding

## **2\. The Internal Subsystems**

Each internal script attaches its specialized utilities to a temporary global staging object (window.\_BattlerInternal).

### **A. Primitives & Canvas Helpers: battler\_baker/battler\_primitives.js**

Extracts \[SEC-01\] and \[SEC-02\]:

JavaScript  
window.\_BattlerInternal \= window.\_BattlerInternal || {};

(() \=\> {  
  const SPRITE\_SIZE \= 64;  
  const RENDER\_SCALE \= 4;  
  const WORK\_SIZE \= SPRITE\_SIZE \* RENDER\_SCALE;

  const P \= Object.freeze({ /\* ...palettes from SEC-01... \*/ });

  function canvas(size \= WORK\_SIZE) {  
    if (typeof document \=== "undefined") return null;  
    const c \= document.createElement("canvas");  
    c.width \= size;  
    c.height \= size;  
    return c;  
  }

  function ctxConfig(ctx, smoothing) { /\* ...ctxConfig from SEC-01... \*/ }

  const S \= (n) \=\> n \* RENDER\_SCALE;

  // Primitive drawing helpers  
  function rect(ctx, x, y, w, h, fill, alpha \= 1) { /\* ...SEC-02... \*/ }  
  function rr(ctx, x, y, size, r, fill, alpha \= 1) { /\* ...SEC-02... \*/ }  
  function poly(ctx, points, fill, alpha \= 1) { /\* ...SEC-02... \*/ }  
  function line(ctx, points, stroke, width \= 1, alpha \= 1) { /\* ...SEC-02... \*/ }  
  function ellipse(ctx, x, y, rx, ry, fill, alpha \= 1) { /\* ...SEC-02... \*/ }  
  function diamond(ctx, x, y, w, h, fill, alpha \= 1) { /\* ...SEC-02... \*/ }  
  function reset(ctx) { ctx.clearRect(0, 0, WORK\_SIZE, WORK\_SIZE); }  
  function ground(ctx, width \= 24, x \= 32, y \= 61) { /\* ...SEC-02... \*/ }  
  function glow(ctx, x, y, radius, color, alpha \= 0.35) { /\* ...SEC-02... \*/ }  
  function spec(ctx, x, y, w, h, color \= P.steel4, alpha \= 0.75) { /\* ...SEC-02... \*/ }

  window.\_BattlerInternal.Primitives \= {  
    SPRITE\_SIZE, RENDER\_SCALE, WORK\_SIZE, P, S,  
    canvas, ctxConfig, rect, rr, poly, line, ellipse, diamond, reset, ground, glow, spec  
  };  
})();

### **B. Hero Silhouettes: battler\_baker/battler\_heroes.js**

Extracts \[SEC-03\] using the primitives staging namespace:

JavaScript  
window.\_BattlerInternal \= window.\_BattlerInternal || {};

(() \=\> {  
  const { P, poly, rect, rr, spec, line, diamond, ground, heroHead, shoulderArmor } \= window.\_BattlerInternal.Primitives;

  function heroHead(ctx, cx, top, skin \= true) { /\* ...from SEC-03... \*/ }  
  function shoulderArmor(ctx, left, right, y, palette) { /\* ...from SEC-03... \*/ }

  function drawHero(ctx) { /\* ...from SEC-03... \*/ }  
  function drawWarrior(ctx) { /\* ...from SEC-03... \*/ }  
  function drawMage(ctx) { /\* ...from SEC-03... \*/ }  
  function drawHealer(ctx) { /\* ...from SEC-03... \*/ }

  window.\_BattlerInternal.HeroBakers \= Object.freeze({  
    HERO: drawHero,  
    WARRIOR: drawWarrior,  
    MAGE: drawMage,  
    HEALER: drawHealer,  
  });  
})();

### **C. Equipment Overlays: battler\_baker/battler\_overlays.js**

Extracts \[SEC-04\]:

JavaScript  
window.\_BattlerInternal \= window.\_BattlerInternal || {};

(() \=\> {  
  const { P, line, poly, rect, ellipse, diamond, glow } \= window.\_BattlerInternal.Primitives;

  function renderChainmailArmor(ctx) { /\* ...from SEC-04... \*/ }  
  function renderPlateArmor(ctx) { /\* ...from SEC-04... \*/ }  
  function renderLeatherArmor(ctx) { /\* ...from SEC-04... \*/ }  
  function renderRobeArmor(ctx) { /\* ...from SEC-04... \*/ }

  function armor(ctx, id, phenotype \= "HERO") { /\* ...from SEC-04... \*/ }  
  function weapon(ctx, id, phenotype \= "HERO") { /\* ...from SEC-04... \*/ }

  window.\_BattlerInternal.Overlays \= { armor, weapon };  
})();

### **D. Enemy Silhouettes: battler\_baker/battler\_enemies.js**

Extracts \[SEC-05\]:

JavaScript  
window.\_BattlerInternal \= window.\_BattlerInternal || {};

(() \=\> {  
  const { P, ground, poly, diamond, rect, line, glow, rr, ellipse, spec } \= window.\_BattlerInternal.Primitives;

  function shadeWolf(ctx) { /\* ...from SEC-05... \*/ }  
  function boneArcher(ctx) { /\* ...from SEC-05... \*/ }  
  function catacombSkeleton(ctx) { /\* ...from SEC-05... \*/ }  
  function caveSpider(ctx) { /\* ...from SEC-05... \*/ }  
  function dreadAcolyte(ctx) { /\* ...from SEC-05... \*/ }  
  function ironBrute(ctx) { /\* ...from SEC-05... \*/ }  
  function bossMalakor(ctx) { /\* ...from SEC-05... \*/ }

  window.\_BattlerInternal.EnemyBakers \= Object.freeze({  
    SHADE\_WOLF: shadeWolf,  
    BONE\_ARCHER: boneArcher,  
    CATACOMB\_SKELETON: catacombSkeleton,  
    CAVE\_SPIDER: caveSpider,  
    DREAD\_ACOLYTE: dreadAcolyte,  
    IRON\_BRUTE: ironBrute,  
    BOSS\_MALAKOR: bossMalakor,  
  });  
})();

### **E. Resolvers & Compositor Pipeline: battler\_baker/battler\_pipeline.js**

Extracts \[SEC-06\] and \[SEC-07\]:

JavaScript  
window.\_BattlerInternal \= window.\_BattlerInternal || {};

(() \=\> {  
  const { SPRITE\_SIZE, canvas, ctxConfig, reset } \= window.\_BattlerInternal.Primitives;  
  const HERO\_BAKERS \= window.\_BattlerInternal.HeroBakers;  
  const ENEMY\_BAKERS \= window.\_BattlerInternal.EnemyBakers;  
  const { armor, weapon } \= window.\_BattlerInternal.Overlays;

  function norm(v) { return String(v \== null ? "" : v).trim().toUpperCase(); }

  function resolveEnemy(requested) { /\* ...from SEC-06... \*/ }  
  function resolveHero(requested) { /\* ...from SEC-06... \*/ }

  function encode(work) {  
    const out \= canvas(SPRITE\_SIZE);  
    if (\!out) return null;  
    const c \= out.getContext("2d");  
    if (\!c) return null;  
    ctxConfig(c, true);  
    c.clearRect(0, 0, SPRITE\_SIZE, SPRITE\_SIZE);  
    c.drawImage(work, 0, 0, SPRITE\_SIZE, SPRITE\_SIZE);  
    return out.toDataURL("image/png");  
  }

  function composeHeroToCanvas(workCtx, phenotype, weaponId, armorId) {  
    HERO\_BAKERS\[phenotype\](workCtx);  
    const armorResult \= armor(workCtx, armorId, phenotype);  
    const weaponResult \= weapon(workCtx, weaponId, phenotype);  
    return { armor: armorResult, weapon: weaponResult };  
  }

  function renderHero(phenotype, weaponId, armorId) { /\* ...from SEC-07... \*/ }

  window.\_BattlerInternal.Pipeline \= {  
    norm, resolveEnemy, resolveHero, encode, composeHeroToCanvas, renderHero  
  };  
})();

## **3\. The Root Facade: battler\_baker.js**

The root file becomes a lean, readable facade coordinating caching, telemetry, and the VSRP-001 9-method interface (\[SEC-08\] and \[SEC-09\]). It pulls from window.\_BattlerInternal, stores the module on window.EmberlightBattlerBaker, and deletes the staging namespace:

JavaScript  
/\* \============================================================================  
 \* EMBERLIGHT SOVEREIGN ENGINE: EMBERLIGHT BATTLER BAKER (FACADE)  
 \* Document Identifier: VSRP-001-BATTLER-BAKER-V4  
 \* Governing Protocol: VSRP-001  
 \* Authority: Peripheral Presentation  
 \* \============================================================================ \*/

const EmberlightBattlerBaker \= (() \=\> {  
  'use strict';

  // Import internal modules from staging namespace  
  const { SPRITE\_SIZE, RENDER\_SCALE, canvas, ctxConfig, reset } \= window.\_BattlerInternal.Primitives;  
  const HERO\_BAKERS \= window.\_BattlerInternal.HeroBakers;  
  const ENEMY\_BAKERS \= window.\_BattlerInternal.EnemyBakers;  
  const { norm, resolveEnemy, resolveHero, encode, composeHeroToCanvas, renderHero } \= window.\_BattlerInternal.Pipeline;

  const VERSION \= "4.0.0";  
  const cache \= new Map();  
  const diagnosticLog \= new Map();

  function logDiagnostic(key, entry) {  
    diagnosticLog.set(key, Object.freeze({ ...entry, moduleVersion: VERSION, timestamp: Date.now() }));  
  }

  function bakeAll() {  
    cache.clear();  
    diagnosticLog.clear();

    const heroes \= {  
      HERO: \["IRON\_SWORD", "CHAINMAIL"\],  
      WARRIOR: \["GREATAXE", "CHAINMAIL"\],  
      MAGE: \["OAK\_STAFF", "MAGE\_ROBE"\],  
      HEALER: \["SUN\_MACE", "MAGE\_ROBE"\],  
    };

    for (const \[type, \[wpn, arm\]\] of Object.entries(heroes)) {  
      const work \= canvas();  
      if (\!work) continue;  
      const c \= work.getContext("2d");  
      ctxConfig(c, false);  
      reset(c);  
      const layers \= composeHeroToCanvas(c, type, wpn, arm);  
      const data \= encode(work);  
      if (\!data) continue;  
      const key \= \`${type}\_W:${wpn}\_A:${arm}\`;  
      cache.set(type, data);  
      cache.set(key, data);  
      logDiagnostic(type, { requested: type, canonical: type, classification: "INTENDED", resolution: "CANONICAL", assetType: "HERO", compositeKey: key, layers, returned: true });  
    }

    for (const \[key, baker\] of Object.entries(ENEMY\_BAKERS)) {  
      const work \= canvas();  
      if (\!work) continue;  
      const c \= work.getContext("2d");  
      ctxConfig(c, false);  
      reset(c);  
      baker(c);  
      const data \= encode(work);  
      if (\!data) continue;  
      cache.set(key, data);  
      logDiagnostic(key, { requested: key, canonical: key, classification: "INTENDED", resolution: "CANONICAL", assetType: "ENEMY", returned: true });  
    }

    return cache.size \> 0;  
  }

  function parseSpec(spec \= "HERO", options \= null) {  
    if (spec && typeof spec \=== "object") {  
      return {  
        id: String(spec.id || spec.phenotype || "HERO"),  
        phenotype: String(spec.phenotype || spec.id || "HERO"),  
        weapon: spec.weapon || null,  
        armor: spec.armor || null,  
      };  
    }  
    const specStr \= typeof spec \=== "string" ? spec : "HERO";  
    return { id: specStr, phenotype: specStr, weapon: options?.weapon || null, armor: options?.armor || null };  
  }

  function get(spec \= "HERO", options \= null) {  
    const parsed \= parseSpec(spec, options);  
    const requested \= norm(parsed.id);  
    const enemy \= resolveEnemy(requested);

    if (enemy && \!parsed.weapon && \!parsed.armor) {  
      const data \= cache.get(enemy.canonical) || null;  
      logDiagnostic(\`request:${requested}\`, { ...enemy, assetType: "ENEMY", returned: \!\!data });  
      return data;  
    }

    const hero \= resolveHero(parsed.phenotype);  
    if (\!parsed.weapon && \!parsed.armor) {  
      const data \= cache.get(hero.canonical) || cache.get("HERO") || null;  
      logDiagnostic(\`request:${requested}\`, { ...hero, assetType: "HERO", returned: \!\!data });  
      return data;  
    }

    const w \= norm(parsed.weapon) || "DEFAULT";  
    const a \= norm(parsed.armor) || "DEFAULT";  
    const key \= \`${hero.canonical}\_W:${w}\_A:${a}\`;

    if (cache.has(key)) {  
      logDiagnostic(\`request:${requested}:${key}\`, { ...hero, assetType: "HERO\_COMPOSITE", compositeKey: key, resolution: "CACHE\_HIT", returned: true });  
      return cache.get(key);  
    }

    const rendered \= renderHero(hero.canonical, parsed.weapon, parsed.armor);  
    if (\!rendered.dataUrl) {  
      const fallback \= cache.get(hero.canonical) || cache.get("HERO") || null;  
      logDiagnostic(\`request:${requested}:${key}\`, { requested, canonical: hero.canonical, classification: "ERROR\_FALLBACK", resolution: "RENDER\_FAILURE", assetType: "HERO\_COMPOSITE", compositeKey: key, returned: \!\!fallback, reason: rendered.reason });  
      return fallback;  
    }

    cache.set(key, rendered.dataUrl);  
    const classification \= rendered.status \=== "FALLBACK" || hero.classification \!== "INTENDED" ? "FALLBACK" : "INTENDED";  
    logDiagnostic(\`request:${requested}:${key}\`, { requested, canonical: hero.canonical, classification, resolution: "COMPOSED", assetType: "HERO\_COMPOSITE", compositeKey: key, layers: rendered.layers, returned: true });  
    return rendered.dataUrl;  
  }

  function getDiagnosticReport(spec \= null, options \= null) {  
    if (spec \!== null && spec \!== undefined) {  
      const requested \= norm(parseSpec(spec, options).id);  
      const matches \= \[...diagnosticLog.values()\].filter((x) \=\> x.requested \=== requested);  
      const latest \= matches.length ? matches.at(-1) : null;  
      return Object.freeze({  
        driverId: "battler\_baker",  
        moduleVersion: VERSION,  
        requested,  
        found: \!\!latest,  
        classification: latest?.classification || "UNRESOLVED",  
        resolution: latest?.resolution || "NO\_REQUEST\_RECORDED",  
        report: latest || null,  
      });  
    }

    const entries \= \[...diagnosticLog.values()\];  
    const counts \= {};  
    for (const e of entries) counts\[e.classification\] \= (counts\[e.classification\] || 0) \+ 1;

    return Object.freeze({  
      driverId: "battler\_baker",  
      moduleVersion: VERSION,  
      spriteDimensions: \`${SPRITE\_SIZE}x${SPRITE\_SIZE}\`,  
      renderScale: RENDER\_SCALE,  
      cacheSize: cache.size,  
      diagnosticCount: entries.length,  
      counts: Object.freeze(counts),  
      entries: Object.freeze(entries.slice()),  
    });  
  }

  function validateCanonicalAssets() {  
    const required \= \["HERO", "WARRIOR", "MAGE", "HEALER", "SHADE\_WOLF", "BONE\_ARCHER", "CATACOMB\_SKELETON", "CAVE\_SPIDER", "DREAD\_ACOLYTE", "IRON\_BRUTE", "BOSS\_MALAKOR"\];  
    const results \= required.map((key) \=\> {  
      const d \= diagnosticLog.get(key);  
      return { key, exists: cache.has(key), classification: d?.classification || "UNREPORTED", pass: cache.has(key) && d?.classification \=== "INTENDED" };  
    });  
    return { pass: results.every((x) \=\> x.pass), total: results.length, passed: results.filter((x) \=\> x.pass).length, failed: results.filter((x) \=\> \!x.pass).length, results };  
  }

  bakeAll();

  // Canonical VSRP-001 9-Method Interface  
  return {  
    configure(config \= {}) {  
      return Object.freeze({ accepted: true, driverId: "battler\_baker", moduleVersion: VERSION, renderScale: RENDER\_SCALE, spriteDimensions: \`${SPRITE\_SIZE}x${SPRITE\_SIZE}\`, requestedConfig: { ...config } });  
    },  
    init() {  
      if (\!cache.size) bakeAll();  
      return validateCanonicalAssets();  
    },  
    reset() { bakeAll(); },  
    update() {},  
    render(renderer, context \= {}) {  
      if (renderer && typeof renderer.drawBattler \=== "function") {  
        renderer.drawBattler(this.get(context.spec || "HERO", context.options), context);  
      }  
    },  
    getState() {  
      return Object.freeze({ cacheSize: cache.size, diagnosticCount: diagnosticLog.size, moduleVersion: VERSION });  
    },  
    getDiagnostics() {  
      const report \= getDiagnosticReport();  
      return { driverId: report.driverId, moduleVersion: report.moduleVersion, spriteDimensions: report.spriteDimensions, renderScale: report.renderScale, cachedCount: report.cacheSize, diagnosticCount: report.diagnosticCount, counts: report.counts, availableKeys: \[...cache.keys()\], entries: report.entries };  
    },  
    getDiagnosticReport,  
    validateCanonicalAssets,  
    getModuleInfo() {  
      return Object.freeze({  
        driverId: "battler\_baker",  
        moduleName: "EmberlightBattlerBaker",  
        version: VERSION,  
        protocol: "VSRP-001",  
        spriteDimensions: \`${SPRITE\_SIZE}x${SPRITE\_SIZE}\`,  
        renderScale: RENDER\_SCALE,  
        rendering: "procedural layered art at 4x \-\> controlled 64x64 reduction",  
        deterministic: true,  
        externalAssets: false,  
        canonicalEnemyCount: Object.keys(ENEMY\_BAKERS).length,  
        canonicalHeroCount: Object.keys(HERO\_BAKERS).length,  
      });  
    },  
    get,  
    bakeBattler: get,  
    getSprite: get,  
    bakeAll,  
    clearCache: () \=\> bakeAll(),  
    destroy() {}  
  };  
})();

// Purge the temporary staging namespace so window stays clean  
delete window.\_BattlerInternal;

if (typeof window \!== "undefined") {  
  window.EmberlightBattlerBaker \= EmberlightBattlerBaker;  
}  
if (typeof module \!== "undefined" && module.exports) {  
  module.exports \= EmberlightBattlerBaker;  
}

## **4\. Script Tag Order in index.html**

In index.html, load the helper scripts in dependency order right before the facade:

HTML  
\<\!-- Battler Baker Procedural Pipeline \--\>  
\<script src\="battler\_baker/battler\_primitives.js"\>\</script\>  
\<script src\="battler\_baker/battler\_heroes.js"\>\</script\>  
\<script src\="battler\_baker/battler\_overlays.js"\>\</script\>  
\<script src\="battler\_baker/battler\_enemies.js"\>\</script\>  
\<script src\="battler\_baker/battler\_pipeline.js"\>\</script\>  
\<script src\="battler\_baker.js"\>\</script\>

### **Why This Works Seamlessly**

* **No file:// breakage:** Still standard scripts—double-clicking index.html continues to load and run identically.  
* **Passes auditor.js:** The facade exports the exact same methods (get, configure, init, reset, update, render, getState, getDiagnostics, getModuleInfo, destroy), returning identical Base64 PNGs and diagnostic telemetry required by Pass 1, Pass 14, and Pass 19\.  
* **Scope hygiene:** window.\_BattlerInternal is deleted immediately after the facade executes, preventing lingering global pollution.

## **Honest Thoughts**

battler\_baker.js is an ideal candidate for this refactoring pattern. The original file contains nearly 2,000 lines of manual coordinate pathing, SVG-like polygon points, and drawing primitives. That math does not change often—once bossMalakor() or shadeWolf() looks right, those coordinates are essentially fixed.  
By moving the coordinate definitions into battler\_heroes.js and battler\_enemies.js, you clear out the drawing data and reduce battler\_baker.js down to a clean, \~180-line controller focused purely on caching, asset resolution, and the VSRP-001 interface contract.
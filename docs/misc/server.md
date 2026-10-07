🤖 **Applying the Mask of `[The Magician]` wielding `@[code-artificer]`...**

**Yes, absolutely.** You can use the Phoenix Sovereign Web IDE 100% offline on your laptop (even on an airplane or completely disconnected from Wi-Fi).

The entire system was architected under the **Faraday Cage protocol (Law 11)** and **PSGC-001 / VSRP-001**:

* **Zero npm packages**
* **Zero external CDN scripts** (no unpkg, cdnjs, or Google fonts)
* **Zero external telemetry or cloud tracking**

---

### What Works 100% Offline

| Subsystem                   | Offline Implementation                                                                                              | Capabilities                                                                                                                                                                  |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code Editor**             | [phoenix_editor_core.js](file:///c:/Users/Chris/Emberlight/phoenix/runtime/phoenix_editor_core.js) & `CodeMirror 6` | Full syntax highlighting, line virtualization, key-sink input, undo/redo transaction buffer.                                                                                  |
| **Linter & Type System**    | [core_governor.html](file:///c:/Users/Chris/Emberlight/phoenix/core_governor.html) `[SEC-06]`                       | Tri-language AST linter, JSDoc type checking, Faraday gate validation.                                                                                                        |
| **Visual Diff & Staging**   | Myers 1986 SES algorithm in `[SEC-12]`                                                                              | Hunk-by-hunk visual diff review, staging, and reject/apply buttons.                                                                                                           |
| **Procedural Audio Studio** | [phoenix_zzfx.js](file:///c:/Users/Chris/Emberlight/phoenix/runtime/phoenix_zzfx.js) `[SEC-13]`                     | Real-time procedural audio synthesis, 8 canonical presets, and sound mutation (`🎲 Mutate Sound`) via Web Audio API.                                                           |
| **Game Engine & Viewport**  | [phoenix_sovereign_engine.js](file:///c:/Users/Chris/Emberlight/phoenix/phoenix_sovereign_engine.js) `[SEC-14]`     | 2D tilemap renderer, Mode-7 pseudo-3D, 3D DDA voxel engine, and terrain raymarcher.                                                                                           |
| **Disk Synchronization**    | Web File System Access (FSA) API                                                                                    | Open your project folder directly into the browser and save files back to your local laptop disk.                                                                             |
| **Local AI Copilot**        | [SEC-03] Local Bridge (`localhost:11434` / `1234`)                                                                  | If you have [Ollama](https://ollama.ai) or LM Studio running locally on your laptop, the copilot drawer connects directly over `localhost` with zero cloud data transmission. |

---

### How to Run It Offline on Your Laptop

Because modern web browsers restrict cross-file `<iframe>` and File System Access on raw `file:///` URLs for security reasons, the recommended way to run it offline is using any local offline HTTP server:

#### Option 1: Official Zero-Dependency Sovereign Server (Recommended)

From the project root, simply run:

```bash
node tools/server.js
# Or specify a custom port or auto-open browser:
node tools/server.js 8080 --open
```

* **Zero npm dependencies** (pure Node standard library).
* **Automatic Port Fallback:** If port 8080 is occupied, it automatically increments to 8081, 8082, etc.
* **Faraday & Cross-Origin Isolation:** Pre-configures `COOP`, `COEP`, and `CORP` headers for `SharedArrayBuffer` and WebAssembly.
* **Direct Root Routing:** Automatically routes `/` and `/phoenix/` to `phoenix/core_governor.html`.

#### Option 2: Built-in Python Server (Zero Install)

Open a terminal in `C:\Users\Chris\Emberlight` and run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/phoenix/core_governor.html` in your browser.

#### Option 3: Quick One-Liner Server

From the project root:

```bash
npx --yes serve .
# or
node -e "const http = require('http'), fs = require('fs'), path = require('path'); http.createServer((req, res) => { const f = path.join('.', req.url === '/' ? 'phoenix/core_governor.html' : req.url); fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end('Not found'); return; } res.end(data); }); }).listen(8000, () => console.log('Offline IDE running at http://localhost:8000/phoenix/core_governor.html'));"
```

#### Option 4: Monolith Self-Contained Artifact

You can click **"Export Monolith HTML"** in the IDE or run `node phoenix/monolith_exporter.js`. This inlines all scripts, CSS, and assets into a **single standalone HTML file** that you can double-click and open anywhere.

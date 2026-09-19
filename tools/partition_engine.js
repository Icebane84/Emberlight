const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('c:/Users/Chris/Emberlight/phoenix/core_governor.html');
let content = fs.readFileSync(targetPath, 'utf8');

const TOP_BANNER = `<!--
 ============================================================================
 PHOENIX SOVEREIGN WEB IDE & GOVERNANCE WORKBENCH
 Document Identifier: LEDGER-PHOENIX-SOVEREIGN-001
 Governing Protocols: MPFS-001 / VSRP-001 / SDCP-001 / PERSIST-001 / PMIP-001 / MVP-001 / PRS-SPEC-GOVERNANCE-001
 Parent Standard: Phoenix Rosetta Stone (PRS-001) / PRS-SPEC-STACK-002
 Classification: Immutable AI Collaboration & Anti-Entropy Manifest & Routing Map
 Sovereign Mask: The Hierophant wielding @[sovereign-artificer]
 Version: 8.0.0-ULTIMATE-FUSION
 
 [P-01] ZERO-TOOLING & FILE:// INVARIANCE:
   - Absolute zero npm packages, bundlers, or build tools required.
   - Zero ES Module external fetches. Single-file self-contained execution.
   - Runs cleanly over local file:/// origin or local HTTP endpoints.
 
 [P-02] 3-PLANE VIRTUAL LEXICAL TOPOLOGY (VLT-003):
   - Plane 0: Presentation, tokens, layout, canvas & audio DAC drivers.
   - Plane 1: Isolated Worker Kernel, simulation substrate & ambient types.
   - Plane 2: Main Thread Coordinator, capability attenuation & Sentinel auditor.
 
 [P-03] DETERMINISTIC ENTROPY & GOVERNANCE:
   - Zero Math.random() in authoritative state. Seeded PRNG stream.
   - Constitutional PEVM state transactions pass pre-flight Sentinel audits.
 
 [P-04] LESSONS LEARNED & ANTI-PATTERNS:
   - Avoid unescaped inline script/style tags in string literals.
   - Avoid cross-plane reference leakage; use transferable message envelopes.
   - Keep hot execution paths zero-allocation to eliminate GC stutter.
 
 [P-05] AI REFACTORING ROUTING MAP (Ctrl+F Jump Anchors):
   - CSS Tokens & Layout           -> Jump to [CSS-01] through [CSS-12]
   - DOM Structural Containers     -> Jump to [DOM-01] through [DOM-09]
   - Ambient Type Registry & DTOs  -> Jump to [SEC-00-GLOBALS]
   - VFS State & Catalog           -> Jump to [SEC-01]
   - Governor & Sentinel Registry  -> Jump to [SEC-02]
   - WebLLM / Ollama Local AI      -> Jump to [SEC-03]
   - File Tree & AST Outline       -> Jump to [SEC-04]
   - Syntax Tokenizer              -> Jump to [SEC-05]
   - Tri-Language Linter           -> Jump to [SEC-06]
   - Code Formatter & Quick Fixes  -> Jump to [SEC-07]
   - AI Crucible Sandbox           -> Jump to [SEC-08]
   - IntelliSense & Fuzzy Search   -> Jump to [SEC-09]
   - Find & Replace Studio HUD     -> Jump to [SEC-10]
   - Spotlight Command Palette     -> Jump to [SEC-11]
   - Diff Preview & Staging Studio -> Jump to [SEC-12]
   - Procedural Audio Synthesizer  -> Jump to [SEC-13]
   - Game Dev Workstation Engine   -> Jump to [SEC-14]
   - Shortcuts & Master Bootloader -> Jump to [SEC-15]
 ============================================================================
-->`;

// Replace DOCTYPE and insert top banner
if (!content.includes('LEDGER-PHOENIX-SOVEREIGN-001')) {
    content = content.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n' + TOP_BANNER);
}

// -----------------------------------------------------------------------------
// CSS Region Injections
// -----------------------------------------------------------------------------

// [CSS-01]
const CSS_01_START = `		/* #region [CSS-01] DESIGN TOKENS & CSS VARIABLE DOCSTRINGS
		 * Centralized HSL and hex design tokens, glow filters, and typography.
		 * --bg-base: Deep abyssal viewport background (#060b0f)
		 * --bg-surface: Structural panel container background (#0a0f16)
		 * --bg-panel: Elevated card/drawer background (#0e1620)
		 * --accent: Radiant emerald bioluminescent highlight (#00ffcc)
		 * --glow: Radial blur diffusion for active sovereign elements
		 */
		:root {`;
content = content.replace(/\/\*\s*── Design tokens ──+ \*\/\s*:root\s*\{/, CSS_01_START);

// [CSS-02]
const CSS_02_START = `		/* #endregion */

		/* #region [CSS-02] MASTER GRID & APP SHELL LAYOUT
		 * 3-Pane responsive grid container (#app) with collapsible telemetry rail.
		 */
		*,
		*::before,
		*::after {`;
content = content.replace(/\/\*\s*── Master App Layout ──+ \*\/\s*\*,/, CSS_02_START);

// [CSS-03]
const CSS_03_START = `		/* #endregion */

		/* #region [CSS-03] HEADER BAR & WORKSPACE MODE SWITCHER
		 * Branding logo, system status pill, and workspace mode switcher pills.
		 */
		#header {`;
content = content.replace(/\/\*\s*── Header Bar ──+ \*\/\s*#header\s*\{/, CSS_03_START);

// [CSS-04]
const CSS_04_START = `		/* #endregion */

		/* #region [CSS-04] LEFT SIDEBAR, TREE ACCORDIONS & SYMBOL OUTLINE
		 * Collapsible project module groupings, search bar, and AST symbol navigation.
		 */
		#sidebar-panel {`;
content = content.replace(/\/\*\s*── Left Sidebar: Workspace & File Tree ──+ \*\/\s*#sidebar-panel\s*\{/, CSS_04_START);

// [CSS-05]
const CSS_05_START = `		/* #endregion */

		/* #region [CSS-05] CENTER EDITOR, TABS & SYNTAX BACKDROP
		 * Tab selector bar, line-numbered gutter, textarea, and syntax canvas.
		 */
		#editor-panel {`;
content = content.replace(/\/\*\s*── Center: Editor Studio ──+ \*\/\s*#editor-panel\s*\{|#editor-panel\s*\{/, CSS_05_START);

// [CSS-06]
const CSS_06_START = `		/* #endregion */

		/* #region [CSS-06] FIND & REPLACE STUDIO HUD
		 * Floating search HUD with regex, whole-word, match case, and batch replacement.
		 */
		#find-replace-hud {`;
content = content.replace(/\/\*\s*2\.\s*Find & Replace Floating HUD\s*\*\/\s*#find-replace-hud\s*\{/, CSS_06_START);

// [CSS-07]
const CSS_07_START = `		/* #endregion */

		/* #region [CSS-07] PROBLEMS & DIAGNOSTICS DRAWER
		 * Collapsible bottom drawer for multi-language syntax & linter diagnostics.
		 */
		#problems-panel {`;
content = content.replace(/\/\*\s*Collapsible Bottom Problems & Diagnostics Panel\s*\*\/\s*#problems-panel\s*\{|#problems-panel\s*\{/, CSS_07_START);

// [CSS-08]
const CSS_08_START = `		/* #endregion */

		/* #region [CSS-08] CONSOLIDATED ACTION TOOLBAR & TOOLS DROPDOWN
		 * Bottom patch action bar, widened AI prompt input, and Tools popover.
		 */
		.patch-action-bar {`;
content = content.replace(/\/\*\s*Visual selection patcher bar\s*\*\/\s*\.patch-action-bar\s*\{/, CSS_08_START);

// [CSS-09]
const CSS_09_START = `		/* #endregion */

		/* #region [CSS-09] INLINE AI PALETTE & COMMAND SPOTLIGHT MODALS
		 * Floating Ctrl+K AI copilot prompt modal and global Spotlight palette.
		 */
		.inline-ai-palette {`;
content = content.replace(/\/\*\s*Inline Floating AI Command Palette \(Ctrl\+K\)\s*\*\/\s*\.inline-ai-palette\s*\{/, CSS_09_START);

// [CSS-10]
const CSS_10_START = `		/* #endregion */

		/* #region [CSS-10] VISUAL STAGING DRAWER & AUDIO SFX STUDIO
		 * Diff patch staging drawer and Web Audio procedural synthesis controls.
		 */
		#staging-studio-drawer {`;
content = content.replace(/\/\*\s*Visual Staging Studio Modal \/ Drawer\s*\*\/\s*#staging-studio-drawer\s*\{/, CSS_10_START);

// [CSS-11]
const CSS_11_START = `		/* #endregion */

		/* #region [CSS-11] RIGHT TELEMETRY SIDEBAR, SENTINEL MATRIX & COLLAPSIBLE RAIL
		 * 21-Pass Sentinel matrix, OPFS receipt journal, and mini vertical rail.
		 */
		#ledger-panel {`;
content = content.replace(/\/\*\s*── Right Sidebar: Sentinel Audit Matrix & Ledger ──+ \*\/\s*#ledger-panel\s*\{/, CSS_11_START);

// [CSS-12]
const CSS_12_START = `		/* #endregion */

		/* #region [CSS-12] GAME DEV WORKSTATION VIEWPORT & TILEMAP STUDIO
		 * Full-screen 2D/3D graphics engine stage, scene inspector, and tile palette.
		 */
		.workspace-mode-btn {`;
content = content.replace(/\/\* =+\s*\*\s*6\.\s*DEDICATED FULL-SCREEN GAME DEV WORKSTATION STUDIO\s*\* =+\s*\*\/\s*\.workspace-mode-btn\s*\{/, CSS_12_START);

// Close CSS-12 before </style>
content = content.replace(/\s*<\/style>/, '\n\t\t/* #endregion */\n\t</style>');

// -----------------------------------------------------------------------------
// HTML DOM Region Injections
// -----------------------------------------------------------------------------

// [DOM-01]
const DOM_01 = `	<!-- #region [DOM-01] MASTER HEADER & WORKSPACE CONTROLS -->
		<header id="header">`;
content = content.replace(/<!-- Header -->\s*<header id="header">|<header id="header">/, DOM_01);

// [DOM-02]
const DOM_02 = `	<!-- #endregion -->

		<!-- #region [DOM-02] LEFT EXPLORER & SYMBOL OUTLINE ASIDE -->
		<aside id="sidebar-panel" aria-label="Project Explorer">`;
content = content.replace(/<!-- Left Sidebar: Project Explorer & AST Region Navigator -->\s*<aside id="sidebar-panel"/, DOM_02);

// [DOM-03]
const DOM_03 = `	<!-- #endregion -->

		<!-- #region [DOM-03] EDITOR MAIN CONTAINER & TABS -->
		<main id="editor-panel" aria-label="Editor Studio">`;
content = content.replace(/<!-- Center: Visual Code & Diff Studio -->\s*<main id="editor-panel"/, DOM_03);

// [DOM-04]
const DOM_04 = `		<!-- #region [DOM-04] CODE SYNTAX BACKDROP, TEXTAREA & RUNTIME VIEWPORT -->
			<div class="editor-stage">`;
content = content.replace(/<div class="editor-stage">/, DOM_04);

// [DOM-05]
const DOM_05 = `		<!-- #endregion -->

		<!-- #region [DOM-05] PROBLEMS & DIAGNOSTICS DRAWER -->
				<div id="problems-panel" class="collapsed" aria-label="Problems and Diagnostics Panel">`;
content = content.replace(/<!-- Collapsible Bottom Problems & Diagnostics Panel -->\s*<div id="problems-panel"/, DOM_05);

// [DOM-06]
const DOM_06 = `		<!-- #endregion -->

			<!-- #region [DOM-06] CONSOLIDATED ACTION TOOLBAR & TOOLS DROPDOWN -->
			<div class="patch-action-bar">`;
content = content.replace(/<!-- Visual Selection & AI Copilot Action Bar -->\s*<div class="patch-action-bar">/, DOM_06);

// [DOM-07]
const DOM_07 = `			<!-- #endregion -->

			<!-- #region [DOM-07] PGE-DSL-1 STAGING DRAWER & SFX AUDIO STUDIO -->
			<div id="staging-studio-drawer" aria-label="PGE-DSL-1 Staging Studio">`;
content = content.replace(/<!-- Visual Staging Studio Drawer -->\s*<div id="staging-studio-drawer"/, DOM_07);

// [DOM-08]
const DOM_08 = `		<!-- #endregion -->
		</main>

		<!-- #region [DOM-08] GAME DEV WORKSTATION WORKSPACE -->
		<section id="game-studio-workspace" aria-label="Game Dev Workstation Studio">`;
content = content.replace(/<\/main>\s*<!-- Full-Screen Dedicated Game Dev Workstation Studio -->\s*<section id="game-studio-workspace"/, DOM_08);

// [DOM-09]
const DOM_09 = `		<!-- #endregion -->

		<!-- #region [DOM-09] RIGHT TELEMETRY SIDEBAR, OPFS JOURNAL & MODALS -->
		<!-- Collapsed Mini Rail for Right Sidebar -->
		<div id="ledger-collapsed-rail"`;
content = content.replace(/<\/section>\s*<!-- Collapsed Mini Rail for Right Sidebar -->\s*<div id="ledger-collapsed-rail"/, '</section>\n\n' + DOM_09);

// Close DOM-09 before closing div / scripts
content = content.replace(/<div id="toast-container"><\/div>/, '<div id="toast-container"></div>\n\t<!-- #endregion -->');

// -----------------------------------------------------------------------------
// JavaScript Region Injections
// -----------------------------------------------------------------------------

const AMBIENT_GLOBALS = `		//#region [SEC-00-GLOBALS] EMBEDDED AMBIENT CONTRACT REGISTRY (Virtual globals.d.ts)
		/**
		 * @typedef {Object} VFSModule
		 * @property {string} path - Canonical relative module path (e.g. 'combat/combat_actions.js')
		 * @property {string} domain - Sovereign domain tenant identifier
		 * @property {string} source - Raw JavaScript / HTML / CSS source text
		 */

		/**
		 * @typedef {Object} DiagnosticItem
		 * @property {number} line - 1-based source line number
		 * @property {number} col - 1-based column number
		 * @property {string} message - Human-readable diagnostic explanation
		 * @property {'error'|'warn'|'info'} severity - Diagnostic severity level
		 * @property {string} [rule] - Governing linter rule identifier
		 * @property {string} [quickFix] - Automated quick-fix suggestion string
		 */

		/**
		 * @typedef {Object} AIProposal
		 * @property {string} schemaVersion - Standard protocol identifier (e.g. 'PGE-DSL-1')
		 * @property {string} target - Target relative file path
		 * @property {string} operation - Mutation operation (e.g. 'REPLACE', 'MODIFY')
		 * @property {string} search - Target code anchor string
		 * @property {string} content - Replacement source code
		 * @property {string} intent - Human or AI intent rationale
		 */

		/**
		 * @typedef {Object} SentinelPassResult
		 * @property {number} index - 1-based pass index (1..21)
		 * @property {string} name - Pass name and assertion scope
		 * @property {boolean} passed - Assertion verification status
		 * @property {string} [reason] - Failure explanation if rejected
		 */

		/**
		 * @typedef {Object} SymbolIndexEntry
		 * @property {string} name - Symbol identifier name
		 * @property {'function'|'class'|'const'|'region'} kind - Symbol lexical kind
		 * @property {number} line - 1-based line number where symbol is declared
		 * @property {string} [doc] - Extracted JSDoc comment summary
		 * @property {string} [signature] - Inferred function signature
		 */
		//#endregion

		//#region [SEC-01] VFS STATE & CANONICAL MODULE CATALOG`;

content = content.replace(/'use strict';\s*\/\/\s*1\.\s*Canonical in-memory catalog/, `'use strict';\n\n${AMBIENT_GLOBALS}\n\t\t// 1. Canonical in-memory catalog`);

// [SEC-02]
content = content.replace(/\/\* =+\s*\*\s*GOVERNOR & SENTINEL INITIALIZATION\s*\* =+\s*\*\//, `//#endregion\n\n\t\t//#region [SEC-02] GOVERNOR & SENTINEL SPECIFICATION REGISTRY`);

// [SEC-03]
content = content.replace(/\/\* =+\s*\*\s*OLLAMA & WEBLLM LOCAL AI COPILOT\s*\* =+\s*\*\//, `//#endregion\n\n\t\t//#region [SEC-03] OLLAMA & WEBLLM LOCAL AI COPILOT BRIDGE`);

// [SEC-04]
content = content.replace(/\/\* =+\s*\*\s*UI RENDERING, SYMBOL OUTLINE & AST NAVIGATOR\s*\* =+\s*\*\//, `//#endregion\n\n\t\t//#region [SEC-04] ACCORDION FILE TREE & AST SYMBOL OUTLINE`);

// [SEC-05]
content = content.replace(/function _highlightSyntax\(code\)\s*\{/, `//#endregion\n\n\t\t//#region [SEC-05] SYNTAX HIGHLIGHTER & TOKENIZER ENGINE\n\t\t/**\n\t\t * Tokenizes and syntax-highlights source code for backdrop projection.\n\t\t * @param {string} code - Raw source code\n\t\t * @returns {string} HTML markup with syntax highlighting spans\n\t\t */\n\t\tfunction _highlightSyntax(code) {`);

// [SEC-06]
content = content.replace(/\/\* =+\s*\*\s*TRI-LANGUAGE LINTER & MONOLITH EXTRACTOR[\s\S]*?function _lintJavaScriptLine/, `//#endregion\n\n\t\t//#region [SEC-06] TRI-LANGUAGE LINTER & MONOLITH EXTRACTOR\n\t\t/**\n\t\t * Lints a single JavaScript source line against sovereign standards.\n\t\t * @param {string} lineText\n\t\t * @param {number} lineNum\n\t\t * @param {string[]} lines\n\t\t * @param {DiagnosticItem[]} diags\n\t\t */\n\t\tfunction _lintJavaScriptLine`);

// [SEC-07]
content = content.replace(/function _formatCode\(code\)\s*\{/, `//#endregion\n\n\t\t//#region [SEC-07] ZERO-DEPENDENCY CODE FORMATTER & QUICK FIXES\n\t\t/**\n\t\t * Formats JavaScript source code with normalized 2-space indentation.\n\t\t * @param {string} code\n\t\t * @returns {string} Formatted code\n\t\t */\n\t\tfunction _formatCode(code) {`);

// [SEC-08]
content = content.replace(/function _runAISandboxVerification\(baseSource, proposal, filePath\)\s*\{/, `//#endregion\n\n\t\t//#region [SEC-08] AI CRUCIBLE & SANDBOX REPAIR ENGINE\n\t\t/**\n\t\t * Evaluates proposal mutations in an isolated in-memory crucible before governor commit.\n\t\t * @param {string} baseSource\n\t\t * @param {AIProposal} proposal\n\t\t * @param {string} filePath\n\t\t * @returns {{passed: boolean, error?: string, diagnostics: DiagnosticItem[], patchedSource: string}}\n\t\t */\n\t\tfunction _runAISandboxVerification(baseSource, proposal, filePath) {`);

// [SEC-09]
content = content.replace(/function _indexAllVFSFiles\(\)\s*\{/, `//#endregion\n\n\t\t//#region [SEC-09] WORKSTATION INTELLISENSE & FUZZY SEARCH\n\t\t/**\n\t\t * Rebuilds the in-memory AST symbol index across all VFS files.\n\t\t */\n\t\tfunction _indexAllVFSFiles() {`);

// [SEC-10]
content = content.replace(/function _openFindHUD\(replaceMode = false\)\s*\{/, `//#endregion\n\n\t\t//#region [SEC-10] FIND, REPLACE & REGEX STUDIO HUD\n\t\t/**\n\t\t * Opens the floating Find/Replace HUD.\n\t\t * @param {boolean} [replaceMode=false]\n\t\t */\n\t\tfunction _openFindHUD(replaceMode = false) {`);

// [SEC-11]
content = content.replace(/function _openCommandPalette\(initialPrefix = '>'\)\s*\{/, `//#endregion\n\n\t\t//#region [SEC-11] SPOTLIGHT COMMAND PALETTE MODAL\n\t\t/**\n\t\t * Opens the Ctrl+K spotlight command palette.\n\t\t * @param {string} [initialPrefix='>']\n\t\t */\n\t\tfunction _openCommandPalette(initialPrefix = '>') {`);

// [SEC-12]
content = content.replace(/function _updateDiffPreview\(\)\s*\{/, `//#endregion\n\n\t\t//#region [SEC-12] VISUAL DIFF PREVIEW & STAGING STUDIO\n\t\t/**\n\t\t * Computes line-by-line diff and renders interactive hunk cards.\n\t\t */\n\t\tfunction _updateDiffPreview() {`);

// [SEC-13]
content = content.replace(/function _openAudioStudio\(\)\s*\{/, `//#endregion\n\n\t\t//#region [SEC-13] PROCEDURAL AUDIO SYNTHESIZER & SFX STUDIO\n\t\t/**\n\t\t * Opens the procedural Web Audio synthesizer drawer.\n\t\t */\n\t\tfunction _openAudioStudio() {`);

// [SEC-14]
content = content.replace(/function _selectStudioEntity\(entId\)\s*\{/, `//#endregion\n\n\t\t//#region [SEC-14] LIVE GAME RUNTIME STUDIO & GAME DEV WORKSTATION\n\t\t/**\n\t\t * Selects an entity in the Game Dev Workstation scene hierarchy.\n\t\t * @param {string} entId\n\t\t */\n\t\tfunction _selectStudioEntity(entId) {`);

// [SEC-15]
content = content.replace(/function _handleGlobalShortcuts\(e\)\s*\{/, `//#endregion\n\n\t\t//#region [SEC-15] MASTER GLOBAL SHORTCUTS, TOOLS DROPDOWN & BOOTSTRAP\n\t\t/**\n\t\t * Dispatches global workstation keyboard shortcuts.\n\t\t * @param {KeyboardEvent} e\n\t\t */\n\t\tfunction _handleGlobalShortcuts(e) {`);

// Close SEC-15 at the end before </script>
content = content.replace(/\s*<\/script>\s*<\/body>/, '\n\t\t//#endregion\n\t</script>\n</body>');

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Partitioning successfully applied! New lines:', content.split('\n').length);

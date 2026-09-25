/**
 * ============================================================================
 * PHOENIX SOVEREIGN ENGINE & WORKBENCH: AMBIENT TYPE DECLARATIONS
 * Protocol: VLT-003 / PGE-DSL-1 / PGE-RECEIPT-1 / SDCP-001 / PERSIST-001
 * Zero-runtime type declaration file for IDE static analysis and autocomplete.
 * ============================================================================
 *
 * CANONICAL TABLE OF CONTENTS (CMD-DOC-INDEX):
 * [TYP-01] PROPOSAL, RECEIPT & GOVERNANCE DTOs ................... Line 0024
 * [TYP-02] REGION SCAFFOLDING & CONTRACT VERIFICATION ............ Line 0112
 * [TYP-03] PROCEDURAL AUDIO SYNTHESIZER & SFX .................... Line 0183
 * [TYP-04] SYMBOL INDEXER & FUZZY SEARCH ENGINE .................. Line 0233
 * [TYP-05] CHUNK DIFF ENGINE & AST RECONCILIATION ................ Line 0305
 * [TYP-06] RUNTIME SANDBOX & 2D/3D GRAPHICS SUBSTRATES ........... Line 0360
 * [TYP-07] CODE FORMATTER & LEXER TOKENIZER ...................... Line 0466
 * [TYP-08] LINTER SUITE & COGNITIVE COMPLEXITY ................... Line 0608
 * [TYP-09] ERROR RESOLUTION LEDGER (ERL-001) & REMEDIATION PIPELINE .. Line 0653
 * [TYP-10] SPECIFICATION, CAPABILITY & SOVEREIGN STORAGE ......... Line 0736
 * [TYP-11] WEBLLM WORKER BRIDGE & MONOLITH EXPORTER .............. Line 0833
 * [TYP-12] VSRP-001 CARTRIDGE RUNTIME & ENGINE UMBRELLA FACADE ... Line 0873
 * [TYP-13] STCP-001 TRANSDUCTION COMPILER & SYNARCHE PARSER ...... Line 1088
 * ============================================================================
 */

//#region [TYP-01] --- PROPOSAL, RECEIPT & GOVERNANCE DTOs
/**
 * @typedef PhoenixChangeDTO
 * @description Atomic filesystem or AST modification directive within a governance proposal.
 */
declare interface PhoenixChangeDTO {
  /** The operation type, e.g. create_file, replace_text, delete_file, insert_before, insert_after */
  type: "create_file" | "replace_text" | "delete_file" | "insert_before" | "insert_after" | string;
  /** Relative target file path in the sovereign workspace */
  path?: string;
  /** Verbatim search snippet or regex pattern for replacement */
  search?: string;
  /** Replacement or newly created file content */
  content?: string;
  /** Constitutional governance rule associated with the change */
  rule?: string;
  /** Remediation pipeline vector or agent mask */
  via?: string;
  [key: string]: unknown;
}

/**
 * @typedef PhoenixProposalDTO
 * @description Formal PGE-DSL-1 governance proposal submitted to the Phoenix Governor.
 */
declare interface PhoenixProposalDTO {
  /** Canonical schema identifier, typically 'PGE-DSL-1' */
  schemaVersion: string;
  /** Unique proposal UUID */
  proposalId: string;
  /** Target file path or subsystem URI */
  target: string;
  /** High-level proposal operation type */
  operation: "CREATE" | "MODIFY" | "DELETE" | "REPLACE" | string;
  /** Human or machine rationale for the proposed change */
  intent: string;
  /** Ordered array of atomic change directives */
  changes: PhoenixChangeDTO[];
  /** Expected architectural and behavioral invariants that must remain valid */
  expectedInvariants: string[];
  /** Verification suites requested before transaction commitment */
  testsRequested: string[];
  /** Minimum capability attenuation grants required for proposal execution */
  requiredCapabilities: string[];
  [key: string]: unknown;
}

/**
 * @typedef PhoenixReceiptDTO
 * @description Immutable PGE-RECEIPT-1 cryptographic execution receipt emitted after gate verification.
 */
declare interface PhoenixReceiptDTO {
  /** Canonical receipt schema identifier, typically 'PGE-RECEIPT-1' */
  receiptVersion: string;
  /** Unique cryptographic receipt identifier */
  receiptId: string;
  /** Associated proposal identifier */
  proposalId: string;
  /** Atomic storage transaction ID if committed, or null if aborted */
  transactionId: string | null;
  /** ISO-8601 creation timestamp */
  timestamp: string;
  /** Execution status */
  status: "PASS" | "REJECTED" | "ERROR" | string;
  /** Failing or terminal evaluation gate */
  gate: "ALL_GATES" | "STRUCTURAL_GATE" | "CAPABILITY_GATE" | "BEHAVIOR_GATE" | "EXECUTION" | string;
  /** Diagnostic log details or error stack payload */
  details: unknown;
  /** Issuing sovereign governance authority */
  authority: string;
  /** Cryptographic and governance protocols governing evaluation */
  protocols: string[];
  /** SHA-256 integrity hash of proposal and resulting diff */
  integrity: string;
  /** Name of the final passing gate */
  gatePassed?: string;
  /** Optional integrity hash alias */
  integrityHash?: string;
  /** True if underlying file or AST was updated */
  sourceUpdated?: boolean;
  /** True if rollback occurred due to gate rejection */
  rollbackOccurred?: boolean;
  /** Collection of diagnostic objects gathered during gate execution */
  diagnostics?: unknown[];
  [key: string]: unknown;
}
//#endregion [TYP-01]

//#region [TYP-02] --- REGION SCAFFOLDING & CONTRACT VERIFICATION
/**
 * @typedef RegionInspectionResult
 * @description Structural analysis of #region markers within a source file.
 */
declare interface RegionInspectionResult {
  /** True if all regions are monotonically ordered and properly closed */
  valid: boolean;
  /** Total number of discovered regions */
  count: number;
  /** Detailed metadata for each region */
  regions: Array<{ id: string; title: string; line: number }>;
}

/**
 * @typedef ScaffoldResult
 * @description Output of automatic region scaffolding with AST invariance verification.
 */
declare interface ScaffoldResult {
  /** Transformed source text containing structured #region blocks */
  scaffoldedSource: string;
  /** True if executable AST tokens are 100% byte-for-byte identical (ERL-11) */
  astEquivalent: boolean;
  /** Number of generated region blocks */
  regionCount: number;
}

/**
 * @typedef ContractVerificationResult
 * @description Constitutional contract compliance report against declared capabilities.
 */
declare interface ContractVerificationResult {
  /** True if source adheres to all capability constraints */
  compliant: boolean;
  /** Array of verified capability tokens */
  verifiedCapabilities: string[];
  /** Undeclared capabilities or contract discrepancies detected */
  discrepancies: string[];
}

/**
 * @typedef DependencyAnalysisResult
 * @description Static topological dependency analysis of global symbols and channels.
 */
declare interface DependencyAnalysisResult {
  /** Global variables and symbols read by the code */
  reads: string[];
  /** Global variables and symbols written by the code */
  writes: string[];
  /** Event channels published or subscribed to */
  events: string[];
}

/**
 * @typedef PhoenixRegionScaffolderFacade
 * @description Subsystem for enforcing monotonic #region boundaries and AST invariance.
 */
declare interface PhoenixRegionScaffolderFacade {
  /** Strips comments from JavaScript source for AST invariance comparisons */
  stripComments(source: string): string;
  /** Inspects source text for #region balance and ordering */
  inspectRegions(source: string): RegionInspectionResult;
  /** Automatically reorganizes code into canonical numbered #region blocks */
  scaffoldRegions(source: string, filename?: string): ScaffoldResult;
  /** Verifies capability contract compliance */
  verifyContract(source: string, declaredCapabilities?: string[]): ContractVerificationResult;
  /** Analyzes global reads, writes, and event channels */
  analyzeDependencies(source: string): DependencyAnalysisResult;
}

/**
 * @typedef PhoenixHostInfillEngineFacade
 * @description Subsystem for deterministic host-side slot-filling and micro-envelope synthesis.
 */
declare interface PhoenixHostInfillEngineFacade {
  /** Extracts the target line, leading indentation, and surrounding context window */
  buildMicroContext(source: string, lineNum: number, radius?: number): {
    targetLine: string;
    leadingIndent: string;
    contextLines: string[];
    targetLineIndex: number;
  } | null;
  /** Parses model output via Hybrid Fallback: JSON schema or raw code slice */
  parseModelOutput(raw: string): string;
  /** Assembles a valid PGE-DSL-1 proposal envelope deterministically from host memory */
  assembleInfillProposal(targetPath: string, targetLine: string, rawReplacement: string, leadingIndent?: string): PhoenixProposalDTO;
}
//#endregion [TYP-02]

//#region [TYP-03] --- PROCEDURAL AUDIO SYNTHESIZER & SFX
/**
 * @typedef PhoenixAudioSynthesizerFacade
 * @description Zero-dependency Web Audio API procedural sound synthesizer.
 */
declare interface PhoenixAudioSynthesizerFacade {
  /** Preconfigured SFX parameter presets */
  PRESETS: Record<string, {
    wave: string;
    freqStart: number;
    freqEnd: number;
    attack: number;
    decay: number;
    sustain: number;
    release?: number;
    volume: number;
    sweepType?: string;
  }>;
  /** Plays procedural sound effect in the browser audio context */
  playProceduralSFX(params: Record<string, unknown>): Promise<void>;
  /** Generates standalone or eventbus JavaScript code to reproduce the SFX */
  generateSFXCode(params: Record<string, unknown>, format?: "standalone" | "eventbus"): string;
}

/**
 * @typedef PhoenixStudioAudioFacade
 * @description Workbench audio dock controller and oscilloscope visualizer.
 */
declare interface PhoenixStudioAudioFacade {
  /** Opens the audio dock drawer */
  open(): void;
  /** Closes the audio dock drawer */
  close(): void;
  /** Loads an audio preset by key */
  loadPreset(presetKey: string): void;
  /** Updates UI parameter badge displays */
  updateBadges(): void;
  /** Retrieves currently active synthesizer parameters */
  getParams(): Record<string, unknown>;
  /** Plays the current sound effect preview */
  preview(): void;
  /** Renders visual oscilloscope waveform to the canvas */
  renderOscilloscope(): void;
  /** Randomizes synthesizer parameters for sound exploration */
  randomize(): void;
  /** Exports audio reproduction source code */
  exportCode(): void;
}
//#endregion [TYP-03]

//#region [TYP-04] --- SYMBOL INDEXER & FUZZY SEARCH ENGINE
/**
 * @typedef PhoenixSymbolItem
 * @description Indexed code symbol metadata entry.
 */
declare interface PhoenixSymbolItem {
  /** Unique symbol identifier */
  id: string;
  /** Symbol display label */
  title: string;
  /** Symbol classification */
  kind: "function" | "class" | "const" | "region" | string;
  /** 1-based line number in source */
  line: number;
  /** File path where symbol is declared */
  file?: string;
  /** Extended detail or signature */
  detail?: string;
}

/**
 * @typedef PhoenixSymbolIndexerFacade
 * @description Constructor interface for the workspace symbol indexer.
 */
declare interface PhoenixSymbolIndexerFacade {
  new (): PhoenixSymbolIndexerInstance;
}

/**
 * @typedef PhoenixSymbolIndexerInstance
 * @description Workspace-wide symbol indexer supporting definition lookup and autocomplete.
 */
declare interface PhoenixSymbolIndexerInstance {
  /** Indexes all functions, classes, and regions in a source file */
  indexSource(path: string, code: string): PhoenixSymbolItem[];
  /** Evicts a file from the symbol cache */
  removeFile(path: string): void;
  /** Searches indexed symbols by prefix */
  findSymbols(prefix: string): PhoenixSymbolItem[];
  /** Locates symbol declaration for Go To Definition navigation */
  findDefinition(symbolName: string, activePath?: string): { file: string; line: number } | null;
  /** Produces autocomplete candidate suggestions */
  getCompletions(prefix: string): PhoenixSymbolItem[];
  /** Clears the entire symbol database */
  clear(): void;
  /** Returns symbol cache diagnostics and hit metrics */
  getDiagnostics(): Record<string, unknown>;
}

/**
 * @typedef PhoenixFuzzySearchFacade
 * @description Substring and subsequence fuzzy scoring engine.
 */
declare interface PhoenixFuzzySearchFacade {
  /** Computes match score between query and target string */
  score(query: string, text: string): number;
  /** Filters and sorts candidate array by fuzzy match score */
  filter<T>(query: string, items: T[], keySelector?: (item: T) => string): T[];
}

/**
 * @typedef PhoenixSearchEngineFacade
 * @description Workspace multi-file text search and replace utility.
 */
declare interface PhoenixSearchEngineFacade {
  /** Finds all occurrences of query in source text */
  findAll(source: string, query: string, options?: { matchCase?: boolean; matchWholeWord?: boolean; useRegex?: boolean }): Array<{ line: number; col: number; text: string }>;
  /** Replaces occurrences in source text */
  replaceAll(source: string, query: string, replacement: string, options?: { matchCase?: boolean; matchWholeWord?: boolean; useRegex?: boolean }): { result: string; count: number };
}
//#endregion [TYP-04]

//#region [TYP-05] --- CHUNK DIFF ENGINE & AST RECONCILIATION
/**
 * @typedef DiffHunkLine
 * @description Single line within a unified diff hunk.
 */
declare interface DiffHunkLine {
  /** Line mutation classification: context, deletion, or addition */
  type: "ctx" | "del" | "add";
  /** Verbatim line text */
  text: string;
  /** 1-based line number in original file, or null if added */
  oldLine: number | null;
  /** 1-based line number in modified file, or null if deleted */
  newLine: number | null;
}

/**
 * @typedef DiffHunk
 * @description Unified diff hunk representation with line mappings.
 */
declare interface DiffHunk {
  /** Unique hunk identifier */
  id: number | string;
  /** Starting line in original source */
  oldStart: number;
  /** Line count in original source */
  oldCount: number;
  /** Starting line in modified source */
  newStart: number;
  /** Line count in modified source */
  newCount: number;
  /** Verbatim deleted lines */
  delLines: string[];
  /** Verbatim added lines */
  addLines: string[];
  /** Detailed line records */
  lines: DiffHunkLine[];
  /** Unified diff header snippet */
  header: string;
}

/**
 * @typedef DiffWordToken
 * @description Intra-line diff word or symbol token.
 */
declare interface DiffWordToken {
  /** Text content of the token */
  text: string;
  /** Diff status of token */
  type: 'eq' | 'del' | 'add';
}

/**
 * @typedef DiffSplitPane
 * @description One pane (left or right) of a paired split diff row.
 */
declare interface DiffSplitPane {
  /** Line change type or pad spacer */
  type: 'ctx' | 'del' | 'add' | 'pad';
  /** Text content of the line */
  text: string;
  /** 1-based line number or null if pad */
  lineNum: number | null;
  /** Optional intra-line word tokens */
  tokens?: DiffWordToken[];
}

/**
 * @typedef DiffSplitRow
 * @description Paired horizontal row for side-by-side split diff display.
 */
declare interface DiffSplitRow {
  /** Left pane (Original / Baseline SSOT) */
  left: DiffSplitPane;
  /** Right pane (Modified / Working Tree) */
  right: DiffSplitPane;
}

/**
 * @typedef PhoenixChunkDiffEngineFacade
 * @description Pure JavaScript Myers-based chunk diff engine supporting interactive staging.
 */
declare interface PhoenixChunkDiffEngineFacade {
  /** Computes unified diff hunks between original and modified text */
  computeHunks(original: string, modified: string, contextLines?: number): DiffHunk[];
  /** Commits a specific hunk into the source document */
  applyHunk(source: string, hunk: DiffHunk | { oldStart: number; delLines?: string[]; oldCount?: number; addLines?: string[] }): string;
  /** Reverts a specific hunk from the modified document */
  rejectHunk(source: string, hunk: DiffHunk | { newStart: number; addLines?: string[]; newCount?: number; delLines?: string[] }): string;
  /** Computes intra-line word/token diff between two strings */
  computeWordDiff(oldStr: string, newStr: string): { oldTokens: DiffWordToken[]; newTokens: DiffWordToken[] };
  /** Aligns a hunk's lines into paired side-by-side rows with intra-line word diffs */
  alignHunkSplit(hunk: DiffHunk): DiffSplitRow[];
  /** Reconciles and applies a multi-line search/replace hunk with fuzzy anchor recovery and relative indentation infill */
  reconcileFuzzyHunk(
    source: string,
    search: string,
    content: string,
    options?: {
      confidenceThreshold?: number;
      anchorThreshold?: number;
      activeLine?: number;
      tolerance?: number;
    }
  ): {
    pass: boolean;
    patchedSource: string;
    matchedLine: number;
    confidence: number;
    method: 'EXACT' | 'FUZZY' | 'NORMALIZED' | 'NONE';
  };
}
//#endregion [TYP-05]

//#region [TYP-06] --- RUNTIME SANDBOX & 2D/3D GRAPHICS SUBSTRATES
/**
 * @typedef PhoenixRuntimeSandboxFacade
 * @description Headless and browser iframe execution sandbox harness.
 */
declare interface PhoenixRuntimeSandboxFacade {
  /** Packages virtual filesystem entries into a standalone executable HTML document */
  buildRuntimeHTML(vfs: Map<string, string>, entryPath?: string): string;
  /** Instantiates a 60Hz deterministic game accumulator loop */
  createTickController(options: { onTick: (dt: number, tick: number) => void; fps?: number }): { start(): void; stop(): void; step(): void; isRunning(): boolean };
}

/**
 * @typedef PhoenixWebGLBatcherFacade
 * @description High-performance WebGL 2D/3D batched particle renderer.
 */
declare interface PhoenixWebGLBatcherFacade {
  /** Creates an isolated particle emitter pool */
  createParticleSystem(maxParticles?: number): {
    emit(x: number, y: number, count?: number, options?: Record<string, unknown>): void;
    update(dt: number): void;
    render(renderer: { drawQuad(x: number, y: number, w: number, h: number, uvs: number[], color: number[]): void }): void;
    clear(): void;
  };
}

/**
 * @typedef PhoenixCanvas2DLayerEngineFacade
 * @description Multi-layered 2D tilemap renderer with screen-shake camera.
 */
declare interface PhoenixCanvas2DLayerEngineFacade {
  /** Creates an orthographic 2D camera with trauma-based screen shake */
  createCamera(options?: { x?: number; y?: number; zoom?: number }): {
    x: number;
    y: number;
    zoom: number;
    addTrauma(amount: number): void;
    applyTransform(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void;
    resetTransform(ctx: CanvasRenderingContext2D): void;
    worldToScreen(wx: number, wy: number, screenW: number, screenH: number): { x: number; y: number };
    screenToWorld(sx: number, sy: number, screenW: number, screenH: number): { x: number; y: number };
  };
  /** Renders 2D grid tilemap with culling */
  renderTilemap(
    ctx: CanvasRenderingContext2D,
    grid: number[][],
    tileSize: number,
    paletteMap: Record<number, string>,
    camera: unknown,
    screenW: number,
    screenH: number
  ): { renderedTiles: number };
}

/**
 * @typedef PhoenixPseudo3DRaycasterFacade
 * @description Wolfenstein-style DDA raycaster engine for 2.5D pseudo-3D perspective.
 */
declare interface PhoenixPseudo3DRaycasterFacade {
  /** Casts columns across horizontal screen width against a 2D tile grid */
  castRays(
    grid: number[][],
    camera: { x: number; y: number; angle: number; fov?: number },
    screenW: number,
    screenH: number,
    textures?: Record<number, HTMLCanvasElement | ImageBitmap>
  ): Array<{ x: number; distance: number; wallType: number; wallHeight: number; side: number }>;
}

/**
 * @typedef PhoenixVoxel3DEngineFacade
 * @description 3D Discrete Differential Analyzer (DDA) volumetric voxel engine.
 */
declare interface PhoenixVoxel3DEngineFacade {
  /** Allocates a 3D binary linear byte buffer for voxel storage */
  createVolume(dimX: number, dimY: number, dimZ: number): { data: Uint8Array; dimX: number; dimY: number; dimZ: number };
  /** Sets a voxel value at 3D integer coordinates */
  setVoxel(volume: unknown, x: number, y: number, z: number, val: number): void;
  /** Reads a voxel value at 3D integer coordinates */
  getVoxel(volume: unknown, x: number, y: number, z: number): number;
  /** Performs 3D Amanatides-Woo DDA voxel ray march */
  castRay3D(volume: unknown, origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxSteps?: number): { hit: boolean; x: number; y: number; z: number; voxel: number; normal: [number, number, number] };
  /** Generates procedural 3D dungeon volume */
  generateDungeonVolume(dimX?: number, dimY?: number, dimZ?: number): unknown;
  /** Renders 3D voxel volume into canvas 2D context */
  renderVoxelView(ctx: CanvasRenderingContext2D, volume: unknown, camera: unknown, screenW: number, screenH: number, options?: Record<string, unknown>): void;
}

/**
 * @typedef PhoenixTerrainRaymarcherFacade
 * @description Analytic procedural heightmap terrain raymarcher.
 */
declare interface PhoenixTerrainRaymarcherFacade {
  /** Samples procedural terrain elevation at world coordinates (x, z) */
  sampleHeight(x: number, z: number, scale?: number, maxHeight?: number): number;
  /** Computes surface normal gradient */
  computeNormal(x: number, z: number, eps?: number): [number, number, number];
  /** Raymarches procedural terrain along viewing vector */
  castTerrainRay(origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxDist?: number, stepSize?: number): { hit: boolean; distance: number; x: number; y: number; z: number; height: number; normal: [number, number, number]; material: string };
  /** Renders terrain elevation view to canvas */
  renderTerrainView(ctx: CanvasRenderingContext2D, camera: unknown, screenW: number, screenH: number, options?: Record<string, unknown>): void;
  /** Generates WebGL GLSL terrain fragment shader source */
  getWebGLTerrainShaderSource(): string;
}
//#endregion [TYP-06]

//#region [TYP-07] --- CODE FORMATTER & LEXER TOKENIZER
/**
 * @typedef CodeFormatterOptions
 * @description Formatting configuration for indentation and spacing.
 */
declare interface CodeFormatterOptions {
  /** Space indentation size */
  indent?: number;
  /** Use tab characters instead of spaces */
  tab?: boolean;
}

/**
 * @typedef FunctionSliceDTO
 * @description Extracted function declaration boundary in source text.
 */
declare interface FunctionSliceDTO {
  /** 1-based end line of the function */
  endLine: number;
  /** Full verbatim function body string */
  fnBody: string;
}

/**
 * @typedef FunctionSignatureInfoDTO
 * @description Function declaration identifier and parameter list.
 */
declare interface FunctionSignatureInfoDTO {
  /** Function name */
  name: string;
  /** Parameter identifier array */
  params: string[];
}

/**
 * @typedef LineComplexityScoreDTO
 * @description Token complexity distribution for a single source line.
 */
declare interface LineComplexityScoreDTO {
  structuralHits: number;
  logicalOps: number;
  openBraces: number;
  closeBraces: number;
}

/**
 * @typedef FunctionComplexityScanResultDTO
 * @description Cognitive complexity measurement for an individual function.
 */
declare interface FunctionComplexityScanResultDTO {
  name: string;
  line: number;
  endLine: number;
  complexity: number;
  score: number;
  codeSlice: string;
}

/**
 * @typedef StructuralLintIssueDTO
 * @description Static AST or regex lint rule diagnostic warning/error.
 */
declare interface StructuralLintIssueDTO {
  line: number;
  col: number;
  message: string;
  severity: "error" | "warning";
}

/**
 * @typedef DiagnosticInputDTO
 * @description Universal input envelope for diagnostic analysis and quick-fix resolution.
 */
declare interface DiagnosticInputDTO {
  rule?: string;
  message?: string;
  line?: number;
  fnName?: string;
}

/**
 * @typedef CommentStripStateDTO
 * @description State accumulator for comment stripping token scanner.
 */
declare interface CommentStripStateDTO {
  inBlock: boolean;
  inLine: boolean;
  inStr: string | null;
}

/**
 * @typedef PhoenixCodeFormatterFacade
 * @description Deterministic AST code beautifier for JavaScript and JSON.
 */
declare interface PhoenixCodeFormatterFacade {
  /** Formats JavaScript source code adhering to constitutional style rules */
  formatJS(code: string, options?: CodeFormatterOptions): string;
  /** Formats JSON text with canonical indentation */
  formatJSON(jsonStr: string, indent?: number): string;
}

/**
 * @typedef LexerTokenDTO
 * @description Lexical token emitted by PhoenixLexer.
 */
declare interface LexerTokenDTO {
  type: string;
  value: string;
  line?: number;
  col?: number;
  start?: number;
  end?: number;
}

/**
 * @typedef LexerLineResultDTO
 * @description Output of line-by-line syntax highlighting tokenizer.
 */
declare interface LexerLineResultDTO {
  tokens: Array<{ type: string; value: string }>;
  endState: { state: number; braceDepth: number; depthStack: number[] };
}

/**
 * @typedef PhoenixLexerFacade
 * @description Streaming, stateful syntax highlighting tokenizer for code editor backdrops.
 */
declare interface PhoenixLexerFacade {
  STATES: {
    CODE: number;
    BLOCK_COMMENT: number;
    TEMPLATE_LITERAL: number;
    TEMPLATE_INTERPOLATION: number;
    REGEX: number;
  };
  /** Tokenizes entire code buffer */
  tokenize(code: string): LexerTokenDTO[];
  /** Tokenizes a single line preserving state machine carryover (ERL-16) */
  tokenizeLine(line: string, startState?: { state: number; braceDepth?: number; depthStack?: number[] } | null): LexerLineResultDTO;
}
//#endregion [TYP-07]

//#region [TYP-08] --- LINTER SUITE & COGNITIVE COMPLEXITY
/**
 * @typedef HotLoopViolationDTO
 * @description Allocation detected in 60Hz simulation loops (VSRP-001 violation).
 */
declare interface HotLoopViolationDTO {
  line: number;
  col: number;
  type: string;
  message: string;
  severity: "error" | "warning";
  snippet: string;
}

/**
 * @typedef JSDocParityResultDTO
 * @description Discrepancy between function parameters and JSDoc tags.
 */
declare interface JSDocParityResultDTO {
  line: number;
  functionName: string;
  issue: string;
  message: string;
  expectedParams: string[];
  actualParams: string[];
}

/**
 * @typedef PhoenixLinterSuiteFacade
 * @description Static analysis and constitutional compliance verification suite.
 */
declare interface PhoenixLinterSuiteFacade {
  /** Measures cognitive complexity of code block */
  calculateCognitiveComplexity(code: string): number;
  /** Scans all functions in source for complexity threshold violations */
  scanFunctionsComplexity(code: string, threshold?: number): FunctionComplexityScanResultDTO[];
  /** Executes structural lint rules on source */
  lintCode(source: string, filename?: string): StructuralLintIssueDTO[];
  /** Scans update/render hot loops for illegal transient object/closure allocations (ERL-27) */
  auditHotLoopAllocations(source: string, contextName?: string | null): HotLoopViolationDTO[];
  /** Verifies JSDoc comment parameter parity across all exported functions */
  verifyJSDocParity(source: string): JSDocParityResultDTO[];
}
//#endregion [TYP-08]

//#region [TYP-09] --- ERROR RESOLUTION LEDGER (ERL-001) & REMEDIATION PIPELINE
/**
 * @typedef ERLResolutionTemplate
 * @description Canonical automated self-repair pattern stored in the Error Resolution Ledger.
 */
declare interface ERLResolutionTemplate {
  /** Unique template identifier (e.g. ERL-01) */
  id: string;
  /** Diagnostic fingerprint string */
  fingerprint: string;
  /** Associated constitutional or SonarQube rule */
  rule: string;
  /** Human-readable failure description */
  description: string;
  /** Exact code pattern or regex to match */
  searchPattern: string;
  /** Replacement code template */
  replacePattern: string;
  /** True if searchPattern is a regular expression */
  isRegex?: boolean;
  /** Hash of verification test receipt proving pattern correctness */
  verifiedReceipt?: string;
  /** ISO-8601 registration timestamp */
  timestamp?: string;
  /** Count of successful automated fast-path applications */
  useCount?: number;
  /** SynarcheLexer exact token match offsets avoiding string literals and comments */
  tokenMatch?: {
    start: number;
    end: number;
    matchedText: string;
  };
}

/**
 * @typedef PhoenixErrorResolutionLedgerFacade
 * @description Constructor interface for PhoenixErrorResolutionLedger.
 */
declare interface PhoenixErrorResolutionLedgerFacade {
  new (): PhoenixErrorResolutionLedgerInstance;
}

/**
 * @typedef PhoenixErrorResolutionLedgerInstance
 * @description Fast-path remediation pattern catalog and fingerprint matcher.
 */
declare interface PhoenixErrorResolutionLedgerInstance {
  /** Registers a canonical resolution pattern */
  record(template: ERLResolutionTemplate): void;
  /** Looks up a template by exact fingerprint */
  lookup(fingerprint: string): ERLResolutionTemplate | null;
  /** Matches diagnostic and source line to an existing template */
  findMatch(diag: DiagnosticInputDTO, lineText?: string): ERLResolutionTemplate | null;
  /** Computes canonical diagnostic fingerprint */
  computeFingerprint(diag: DiagnosticInputDTO, lineText?: string): string;
  /** Scans source code for known anti-patterns */
  scanAntiPatterns(sourceCode: string): Array<{ rule: string; description: string; pattern: string }>;
  /** Exports all templates as NDJSON */
  exportNDJSON(): string;
  /** Imports templates from NDJSON */
  importNDJSON(ndjson: string): number;
  /** Retrieves all registered templates */
  getAllEntries(): ERLResolutionTemplate[];
  /** Total registered template count */
  size: number;
}

/**
 * @typedef PhoenixBatchRemediationPipelineFacade
 * @description Automated multi-pass diagnostic repair pipeline.
 */
declare interface PhoenixBatchRemediationPipelineFacade {
  /** Executes fast-path pattern matching and sandboxed verification across diagnostic array */
  executeFastPath(
    sourceCode: string,
    diagnostics: Array<DiagnosticInputDTO & { col?: number; quickFix?: unknown }>,
    filePath: string,
    ledger: PhoenixErrorResolutionLedgerInstance,
    sandboxVerifier?: (patchedSource: string) => { pass: boolean; remainingErrors?: unknown[] }
  ): {
    pass: boolean;
    patchedSource: string;
    fastPathApplied: number;
    unresolvedDiagnostics: Array<unknown>;
    appliedChanges: Array<unknown>;
  };
}
//#endregion [TYP-09]

//#region [TYP-10] --- SPECIFICATION, CAPABILITY & SOVEREIGN STORAGE
/**
 * @typedef PhoenixSpecificationRegistryInstance
 * @description Target specification registry governing AST target requirements.
 */
declare interface PhoenixSpecificationRegistryInstance {
  /** Registers a target specification contract */
  registerTarget(id: string, targetSpec: Record<string, unknown>): void;
  /** Retrieves target specification by identifier */
  getTarget(id: string): Record<string, unknown> | null;
}

/**
 * @typedef PhoenixCapabilityRegistryInstance
 * @description Cryptographic capability attenuation registry (SDCP-001).
 */
declare interface PhoenixCapabilityRegistryInstance {
  /** Grants capability token to execution context */
  grant(cap: string): void;
  /** Revokes capability token from execution context */
  revoke(cap: string): void;
  /** Checks if execution context possesses capability token */
  has(cap: string): boolean;
}

/**
 * @typedef PhoenixReceiptLedgerInstance
 * @description Append-only cryptographic ledger of execution receipts.
 */
declare interface PhoenixReceiptLedgerInstance {
  /** Records receipt into append-only memory ledger */
  record(receipt: PhoenixReceiptDTO): void;
  /** Lists all historical receipts */
  list(): PhoenixReceiptDTO[];
  /** Total receipt count */
  size: number;
}

/**
 * @typedef PhoenixSovereignStorageInstance
 * @description Local persistent storage abstraction backed by OPFS and File System Access API.
 */
declare interface PhoenixSovereignStorageInstance {
  /** Initializes underlying storage handles */
  initialize(): Promise<PhoenixSovereignStorageInstance>;
  /** Writes persistent key-value pair */
  write(name: string, value: unknown): Promise<boolean>;
  /** Reads persistent key-value pair */
  read(name: string): Promise<unknown>;
  /** Prompts user to select local physical workspace directory */
  selectProjectDirectory(): Promise<FileSystemDirectoryHandle>;
  /** Mounts directory handle for physical file synchronizations */
  mountProjectDirectory(dirHandle: FileSystemDirectoryHandle): FileSystemDirectoryHandle;
  /** Reads file content from physical disk */
  readProjectFile(filePath: string): Promise<string>;
  /** Writes file content to physical disk */
  writeProjectFile(filePath: string, text: string): Promise<boolean>;
  /** True if Origin Private File System is available */
  hasOPFS: boolean;
  /** True if physical project directory is mounted */
  hasProject: boolean;
}

/**
 * @typedef PhoenixGovernorInstance
 * @description Central constitutional governor coordinating proposals, verification gates, and storage.
 */
declare interface PhoenixGovernorInstance {
  /** Boots governor subsystems */
  initialize(): Promise<PhoenixGovernorInstance>;
  /** Registers source text in governor VFS */
  registerSource(path: string, content: string): void;
  /** Retrieves source text from governor VFS */
  getSource(path: string): string | null;
  /** Commits source file to physical disk */
  writeSourceToDisk(filePath: string, content?: string): Promise<boolean>;
  /** Submits proposal to 5-pass verification crucible */
  submitProposal(proposal: PhoenixProposalDTO | Record<string, unknown>, subject?: string): Promise<PhoenixReceiptDTO>;
  /** Alias for submitProposal */
  submit(proposal: PhoenixProposalDTO | Record<string, unknown>, subject?: string): Promise<PhoenixReceiptDTO>;
  /** Returns all issued receipts */
  getReceipts(): PhoenixReceiptDTO[];
  /** Returns governor diagnostic metrics */
  diagnostics(): Record<string, unknown>;
  /** Destroys governor runtime */
  destroy(): void;
  /** Sovereign storage instance */
  storage: PhoenixSovereignStorageInstance;
  /** Target specification registry */
  spec: PhoenixSpecificationRegistryInstance;
  /** Capability attenuation registry */
  capabilities: PhoenixCapabilityRegistryInstance;
  /** Receipt ledger */
  receipts: PhoenixReceiptLedgerInstance;
  /** Dispatches automated AI self-repair loop */
  repairLoop(
    receipt: PhoenixReceiptDTO,
    proposal: PhoenixProposalDTO,
    agentId: string,
    bridge: PhoenixWebLLMWorkerBridgeInstance,
    parser: (raw: string) => PhoenixProposalDTO | Promise<PhoenixProposalDTO>
  ): Promise<PhoenixReceiptDTO>;
}
//#endregion [TYP-10]

//#region [TYP-11] --- WEBLLM WORKER BRIDGE & MONOLITH EXPORTER
/**
 * @typedef PhoenixMonolithExporterFacade
 * @description Bundler for compiling sovereign engines and games into single-file zero-dependency HTML.
 */
declare interface PhoenixMonolithExporterFacade {
  /** Bundles virtual filesystem, WASM kernels, and shaders into single self-contained HTML file */
  exportMonolith(bundle: {
    title: string;
    sources: Array<{ path: string; content: string }>;
    wasmKernels?: Array<{ name: string; base64: string }>;
    shaders?: Array<{ name: string; code: string }>;
    receipts?: unknown[];
  }): string;
  /** Asynchronous exporter variant */
  exportMonolithAsync(bundle: unknown): Promise<string>;
}

/**
 * @typedef PhoenixWebLLMWorkerBridgeInstance
 * @description WebWorker IPC bridge for local on-device WebLLM inference (Faraday isolation).
 */
declare interface PhoenixWebLLMWorkerBridgeInstance {
  /** Boots isolated WebWorker running WebLLM engine */
  start(adapterFactorySource: string, config?: Record<string, unknown>): Promise<void>;
  /** Generates raw text completion */
  generate(prompt: string, options?: { maxTokens?: number; temperature?: number; onToken?: (t: string) => void }): Promise<string>;
  /** Generates structured proposal with iterative self-repair crucible */
  generateProposalWithSelfHealing(prompt: string, options?: Record<string, unknown>, maxTrials?: number): Promise<{ proposal: Record<string, unknown>; rawText: string; trials: number }>;
  /** Pings worker bridge */
  ping(): Promise<unknown>;
  /** Terminates worker */
  destroy(): Promise<void>;
  /** True if bridge is fully loaded and ready */
  isReady: boolean;
  /** Readiness alias */
  ready: boolean;
}
//#endregion [TYP-11]

//#region [TYP-12] --- VSRP-001 CARTRIDGE RUNTIME & ENGINE UMBRELLA FACADE
/**
 * @typedef PhoenixStudioViewportFacade
 * @description Studio 2D/3D viewport canvas controller and entity scene tree visualizer.
 */
declare interface PhoenixStudioViewportFacade {
  /** Initializes canvas viewport and input listeners */
  init(): void;
  /** Toggles studio workspace mode (e.g. 2d, 3d, raymarch) */
  toggleWorkspaceMode(mode: string): void;
  /** Switches architecture tier */
  switchTier(tierKey: string): void;
  /** Selects entity in the scene tree inspector */
  selectEntity(entId: string): void;
  /** Renders visual scene hierarchy */
  renderSceneTree(): void;
  /** Updates entity property inspector */
  updateProperties(entId: string): void;
  /** Renders active engine visualization */
  renderActiveEngine(): void;
}

/**
 * @typedef CartridgeTemporalTick
 * @description Deterministic time step payload passed to VSRP-001 cartridge update().
 */
declare interface CartridgeTemporalTick {
  /** Delta time in seconds since previous frame (capped at 0.1s) */
  deltaTime: number;
  /** Total elapsed simulation time in seconds */
  elapsedTime: number;
}

/**
 * @typedef CartridgeInputState
 * @description Keyboard and pointer input state accessor passed to cartridge update().
 */
declare interface CartridgeInputState {
  /** Checks if key or code is currently depressed */
  isDown(keyCode: string): boolean;
}

/**
 * @typedef VSRPCartridgeFacade
 * @description Sovereign game cartridge interface complying with the 9-Method FSM (VSRP-001).
 */
declare interface VSRPCartridgeFacade {
  /** Canonical protocol tag, must equal 'VSRP-001' */
  protocol: 'VSRP-001';
  /** Human-readable cartridge name */
  name: string;
  /** Semantic version string */
  version: string;
  /** Author or sovereign entity */
  author: string;
  /** Target architectural tier (1, 2, or 3) */
  tier: number;
  /** Declared capabilities */
  capabilities: ReadonlyArray<string>;
  /** Internal active game state */
  state: Record<string, unknown>;
  /** Linear memory buffers and heaps */
  memory: Record<string, unknown>;
  /** Method 1: Configures simulated host environment and audio hooks */
  configure(ctx: { requestLinearMemory?: (bytes: number) => ArrayBuffer; capabilities?: Record<string, unknown> }): void;
  /** Method 2: Binds viewport canvas */
  boot(canvas: HTMLCanvasElement | null): void;
  /** Method 3: Transitions cartridge to ACTIVE state */
  activate(): void;
  /** Method 4: Advances simulation by temporal tick with input */
  update(tick: CartridgeTemporalTick, input: CartridgeInputState): { protocol: string; updates: unknown[] };
  /** Method 5: Renders current frame to 2D context */
  render(ctx: CanvasRenderingContext2D): void;
  /** Method 6: Suspends simulation loop */
  suspend(): void;
  /** Method 7: Serializes PERSIST-001 linear memory to Uint8Array for zero-state hotswapping */
  serialize(): Uint8Array;
  /** Method 8: Deserializes PERSIST-001 linear memory after hotswap without state reset */
  deserialize(buffer: ArrayBuffer | Uint8Array): void;
  /** Method 9: Destroys instance and releases memory */
  destroy(): void;
}

/**
 * @typedef PhoenixStarterPackFacade
 * @description Bundled starter game cartridges and simulation modules.
 */
declare interface PhoenixStarterPackFacade {
  MODULES: ReadonlyArray<{ path: string; domain: string; source: string }>;
  getModule(path: string): { path: string; domain: string; source: string } | null;
}

/**
 * @typedef PhoenixSovereignEngineFacade
 * @description Umbrella namespace exposing all Phoenix Sovereign Engine subsystems.
 */
declare interface PhoenixSovereignEngineFacade {
  VERSION: string;
  PROTOCOLS: readonly string[];
  STATES: Readonly<Record<string, string>>;
  STATUS: Readonly<Record<string, string>>;
  GATES: Readonly<Record<string, string>>;
  SCHEMA_VERSION: string;
  RECEIPT_VERSION: string;
  REPAIR_LOOP_CAP: number;
  SpecificationRegistry: new () => PhoenixSpecificationRegistryInstance;
  CapabilityRegistry: new () => PhoenixCapabilityRegistryInstance;
  ReceiptLedger: new (limit?: number) => PhoenixReceiptLedgerInstance;
  SovereignStorage: new (namespace?: string) => PhoenixSovereignStorageInstance;
  Governor: new (options?: Record<string, unknown>) => PhoenixGovernorInstance;
  validateProposalShape(p: unknown): string[];
  lintSource(source: string): string[];
  stable(value: unknown): string;
  hash(text: string): string;
  uid(prefix?: string): string;
  hashBuffer(buffer: ArrayLike<number>): string;
  computeFramebufferHash(target: unknown): string;
  validateFramebufferSignature(renderFn: Function, goldenHash: string, width?: number, height?: number): { pass: boolean; hash: string; expected: string };
  executeWithTimeout(fn: Function, timeoutMs?: number, context?: unknown): Promise<unknown>;
  extractFaultSlice(source: string, change: unknown, failure: unknown): { targetPath: string; scopeName: string; failureReason: string; faultSlice: string };
  PhoenixAudioSynthesizer: PhoenixAudioSynthesizerFacade;
  PhoenixSymbolIndexer: PhoenixSymbolIndexerFacade;
  PhoenixLexer: PhoenixLexerFacade;
  PhoenixFuzzySearch: PhoenixFuzzySearchFacade;
  PhoenixSearchEngine: PhoenixSearchEngineFacade;
  PhoenixChunkDiffEngine: PhoenixChunkDiffEngineFacade;
  PhoenixRuntimeSandbox: PhoenixRuntimeSandboxFacade;
  PhoenixWebGLBatcher: PhoenixWebGLBatcherFacade;
  PhoenixCanvas2DLayerEngine: PhoenixCanvas2DLayerEngineFacade;
  PhoenixPseudo3DRaycaster: PhoenixPseudo3DRaycasterFacade;
  PhoenixVoxel3DEngine: PhoenixVoxel3DEngineFacade;
  PhoenixTerrainRaymarcher: PhoenixTerrainRaymarcherFacade;
  PhoenixCodeFormatter: PhoenixCodeFormatterFacade;
  PhoenixLinterSuite: PhoenixLinterSuiteFacade;
  PhoenixErrorResolutionLedger: PhoenixErrorResolutionLedgerFacade;
  PhoenixBatchRemediationPipeline: PhoenixBatchRemediationPipelineFacade;
  PhoenixRegionScaffolder: PhoenixRegionScaffolderFacade;
  PhoenixHostInfillEngine: PhoenixHostInfillEngineFacade;
}

/**
 * @typedef SentinelEvaluatorOptions
 * @description Configuration overrides for Sentinel proposal evaluation.
 */
declare interface SentinelEvaluatorOptions {
  skipRepairLoop?: boolean;
  timeoutMs?: number;
}

declare var PhoenixSovereignEngine: PhoenixSovereignEngineFacade;
declare var PhoenixGovernor: PhoenixGovernorInstance | undefined;
declare var PhoenixWebLLMBridge: PhoenixWebLLMWorkerBridgeInstance | undefined;
declare var PhoenixProposalParser: ((rawText: string) => PhoenixProposalDTO | Promise<PhoenixProposalDTO>) | undefined;
declare var PhoenixERLLedger: PhoenixErrorResolutionLedgerInstance | undefined;
declare var evaluateProposalWithSentinel: (
  proposal: PhoenixProposalDTO | Record<string, unknown>,
  subject?: string,
  overrideOptions?: SentinelEvaluatorOptions
) => Promise<PhoenixReceiptDTO>;
declare var PhoenixMonolithExporter: PhoenixMonolithExporterFacade;
declare var PhoenixStarterPack: PhoenixStarterPackFacade;
declare var PhoenixAudioSynthesizer: PhoenixAudioSynthesizerFacade;
declare var PhoenixWebGLBatcher: PhoenixWebGLBatcherFacade;
declare var PhoenixCanvas2DLayerEngine: PhoenixCanvas2DLayerEngineFacade;
declare var PhoenixPseudo3DRaycaster: PhoenixPseudo3DRaycasterFacade;
declare var PhoenixVoxel3DEngine: PhoenixVoxel3DEngineFacade;
declare var PhoenixTerrainRaymarcher: PhoenixTerrainRaymarcherFacade;
declare var PhoenixStudioAudio: PhoenixStudioAudioFacade;
declare var PhoenixStudioViewport: PhoenixStudioViewportFacade;

/**
 * Ambient extensions to global Window interface for browser workbench operations.
 */
interface Window {
  PhoenixSovereignEngine?: PhoenixSovereignEngineFacade;
  PhoenixGovernor?: PhoenixGovernorInstance;
  PhoenixWebLLMBridge?: PhoenixWebLLMWorkerBridgeInstance;
  PhoenixProposalParser?: (rawText: string) => PhoenixProposalDTO | Promise<PhoenixProposalDTO>;
  PhoenixERLLedger?: PhoenixErrorResolutionLedgerInstance;
  evaluateProposalWithSentinel?: (
    proposal: PhoenixProposalDTO | Record<string, unknown>,
    subject?: string,
    overrideOptions?: SentinelEvaluatorOptions
  ) => Promise<PhoenixReceiptDTO>;
  PhoenixStudioViewport?: PhoenixStudioViewportFacade;
  PhoenixStudioAudio?: PhoenixStudioAudioFacade;
  PhoenixAudioSynthesizer?: PhoenixAudioSynthesizerFacade;
  PhoenixMonolithExporter?: PhoenixMonolithExporterFacade;
  PhoenixStarterPack?: PhoenixStarterPackFacade;
  PhoenixWebGLBatcher?: PhoenixWebGLBatcherFacade;
  PhoenixCanvas2DLayerEngine?: PhoenixCanvas2DLayerEngineFacade;
  PhoenixPseudo3DRaycaster?: PhoenixPseudo3DRaycasterFacade;
  PhoenixVoxel3DEngine?: PhoenixVoxel3DEngineFacade;
  PhoenixTerrainRaymarcher?: PhoenixTerrainRaymarcherFacade;
  SynarcheCompiler?: SynarcheCompilerFacade;
  SynarcheLexer?: SynarcheLexerFacade;
  SynarcheParser?: SynarcheParserFacade;
  GUCAEmitter?: GUCAEmitterFacade;
  SynarcheASTFactory?: SynarcheASTFactoryFacade;
  SynarcheStatementParser?: SynarcheStatementParserFacade;
  SynarcheTypeSystem?: SynarcheTypeSystemFacade;
  SynarcheTypeEnvironment?: SynarcheTypeEnvironmentFacade;
  SynarcheTypeInferenceEngine?: SynarcheTypeInferenceEngineFacade;
  _mountCartridgeToStudio?: (jsCode: string, cartridgeName?: string) => VSRPCartridgeFacade | null;
  _unmountCartridgeFromStudio?: () => void;
  _mountActiveCartridge?: () => void;
  buildMachineDiagnosticEnvelope?: (targetFile: string, sourceCode: string, diagnostics: unknown[], activeLine?: number, options?: unknown) => string;
}
//#endregion [TYP-12]

//#region [TYP-13] --- STCP-001 TRANSDUCTION COMPILER & SYNARCHE PARSER
/**
 * @typedef {'DIRECTIVE'|'KEYWORD'|'IDENTIFIER'|'LITERAL_STRING'|'LITERAL_NUMBER'|'LITERAL_BOOL'|'SYMBOL'|'COMMENT'|'WHITESPACE'|'EOF'} SynarcheTokenType
 */
declare type SynarcheTokenType =
  | 'DIRECTIVE'
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'LITERAL_STRING'
  | 'LITERAL_NUMBER'
  | 'LITERAL_BOOL'
  | 'SYMBOL'
  | 'COMMENT'
  | 'WHITESPACE'
  | 'EOF';

/**
 * @typedef SynarcheToken
 * @description Atomic lexical token emitted by SynarcheLexer scanner.
 */
declare interface SynarcheToken {
  type: SynarcheTokenType;
  value: string;
  start: number;
  end: number;
  line: number;
  col: number;
}

/**
 * ============================================================================
 * [STCP-003] RECURSIVE-DESCENT AST NODE DEFINITIONS
 * ============================================================================
 */
declare interface SynarcheBaseNode {
  line?: number;
  col?: number;
}

declare interface SynarcheIdentifierNode extends SynarcheBaseNode {
  type: 'Identifier';
  name: string;
}

declare interface SynarcheLiteralNode extends SynarcheBaseNode {
  type: 'Literal';
  value: unknown;
  raw: string;
  kind?: string;
  literalType: 'number' | 'string' | 'boolean' | 'null';
}

declare interface SynarcheBinaryExprNode extends SynarcheBaseNode {
  type: 'BinaryExpr';
  operator: string;
  left: SynarcheExpressionNode;
  right: SynarcheExpressionNode;
}

declare interface SynarcheUnaryExprNode extends SynarcheBaseNode {
  type: 'UnaryExpr';
  operator: string;
  argument: SynarcheExpressionNode;
  prefix: boolean;
}

declare interface SynarcheCallExprNode extends SynarcheBaseNode {
  type: 'CallExpr';
  callee: SynarcheExpressionNode;
  arguments: SynarcheExpressionNode[];
  args?: SynarcheExpressionNode[];
}

declare interface SynarcheMemberExprNode extends SynarcheBaseNode {
  type: 'MemberExpr';
  object: SynarcheExpressionNode;
  property: string;
  computed: boolean;
}

declare interface SynarcheAssignExprNode extends SynarcheBaseNode {
  type: 'AssignExpr';
  operator: string;
  left: SynarcheIdentifierNode | SynarcheMemberExprNode;
  right: SynarcheExpressionNode;
  target?: SynarcheIdentifierNode | SynarcheMemberExprNode;
  value?: SynarcheExpressionNode;
}

declare type SynarcheExpressionNode =
  | SynarcheIdentifierNode
  | SynarcheLiteralNode
  | SynarcheBinaryExprNode
  | SynarcheUnaryExprNode
  | SynarcheCallExprNode
  | SynarcheMemberExprNode
  | SynarcheAssignExprNode;

declare interface SynarcheVarDeclNode extends SynarcheBaseNode {
  type: 'VarDecl';
  kind: 'let' | 'const' | 'var';
  name: string;
  init: SynarcheExpressionNode | null;
  inferredType: string | null;
}

declare interface SynarcheBlockStmtNode extends SynarcheBaseNode {
  type: 'BlockStmt';
  body: SynarcheStatementNode[];
}

declare interface SynarcheIfStmtNode extends SynarcheBaseNode {
  type: 'IfStmt';
  test: SynarcheExpressionNode;
  consequent: SynarcheStatementNode;
  alternate: SynarcheStatementNode | null;
}

declare interface SynarcheWhileStmtNode extends SynarcheBaseNode {
  type: 'WhileStmt';
  test: SynarcheExpressionNode;
  body: SynarcheStatementNode;
}

declare interface SynarcheReturnStmtNode extends SynarcheBaseNode {
  type: 'ReturnStmt';
  argument: SynarcheExpressionNode | null;
}

declare interface SynarcheExprStmtNode extends SynarcheBaseNode {
  type: 'ExprStmt';
  expression: SynarcheExpressionNode;
}

declare type SynarcheStatementNode =
  | SynarcheVarDeclNode
  | SynarcheBlockStmtNode
  | SynarcheIfStmtNode
  | SynarcheWhileStmtNode
  | SynarcheReturnStmtNode
  | SynarcheExprStmtNode
  | SynarcheAssignExprNode;

/**
 * @typedef SynarcheMemoryField
 * @description PERSIST-001 typed memory layout entry for linear binary heaps.
 */
declare interface SynarcheMemoryField {
  name: string;
  type: 'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32' | 'f32' | 'f64';
  size: number;
  offset: number;
  isArray: boolean;
  arrayLength: number;
}

/**
 * @typedef SynarcheMemoryLayout
 * @description Complete linear memory partition layout descriptor.
 */
declare interface SynarcheMemoryLayout {
  fields: SynarcheMemoryField[];
  totalBytes: number;
}

/**
 * @typedef SynarcheStateField
 * @description High-level JavaScript state field descriptor.
 */
declare interface SynarcheStateField {
  name: string;
  type: string;
  defaultValue: string;
}

/**
 * @typedef SynarcheMixinDefinition
 * @description Reusable mixin behavior module for cartridge composition.
 */
declare interface SynarcheMixinDefinition {
  name: string;
  methods: Map<string, string>;
  fields: Set<string>;
}

/**
 * @typedef SynarcheLifecycleHandler
 * @description VSRP-001 lifecycle callback handler block with parsed AST statements.
 */
declare interface SynarcheLifecycleHandler {
  params: string[];
  body: string;
  statements?: SynarcheStatementNode[];
}

/**
 * @typedef SynarcheEventHandler
 * @description Reactive event bus listener or emitter binding.
 */
declare interface SynarcheEventHandler {
  kind: 'listen' | 'emit';
  topic: string;
  payloadParam?: string;
  expression?: string;
  body?: string;
}

/**
 * @typedef ConstitutionalReceipt
 * @description Immutable proof-carrying admission receipt issued by STCP-002.
 */
declare interface ConstitutionalReceipt {
  status: 'ADMITTED' | 'REJECTED';
  constitutionId: string;
  protocolVersion: string;
  compilerVersion: string;
  timestamp: number;
  astHash: string;
  capabilities: readonly string[];
  memoryBytesRequired: number;
  passedRules: readonly string[];
  failedRules: readonly string[];
  errors: readonly string[];
}

/**
 * @typedef CartridgeAST
 * @description Abstract Syntax Tree for STCP-001 / .synarche cartridges.
 */
declare interface CartridgeAST {
  name: string;
  version: string;
  author: string;
  tier: number;
  capabilities: string[];
  memoryLayout: SynarcheMemoryLayout;
  state: SynarcheStateField[];
  usedMixins: string[];
  mixins: Map<string, SynarcheMixinDefinition>;
  handlers: Map<string, SynarcheLifecycleHandler>;
  eventHandlers: SynarcheEventHandler[];
  admissionReceipt?: ConstitutionalReceipt;
  inferredTypes?: Map<string, string>;
}

/**
 * @typedef SynarcheLexerOptions
 * @description Configuration for lexical tokenization.
 */
declare interface SynarcheLexerOptions {
  preserveTrivia?: boolean;
}

/**
 * @typedef SynarcheParserOptions
 * @description Configuration for mixin-stack AST parsing.
 */
declare interface SynarcheParserOptions {
  mode?: 'STRICT' | 'SLOPPY';
  source?: string;
}

/**
 * @typedef SynarcheEmitterOptions
 * @description Configuration for JavaScript code emission.
 */
declare interface SynarcheEmitterOptions {
  format?: 'IIFE' | 'CJS';
  mode?: 'STRICT' | 'SLOPPY';
  admission?: ConstitutionalReceipt;
}

/**
 * @typedef SynarcheCompileOptions
 * @description End-to-end compilation options.
 */
declare interface SynarcheCompileOptions {
  mode?: 'STRICT' | 'SLOPPY';
  format?: 'IIFE' | 'CJS';
}

/**
 * @typedef SynarcheCompileResult
 * @description Result payload of STCP-001 compilation.
 */
declare interface SynarcheCompileResult {
  ok: boolean;
  code?: string;
  ast?: CartridgeAST;
  receipt?: ConstitutionalReceipt;
  capabilities: string[];
  errors: string[];
  memoryBytesRequired: number;
}

/**
 * @typedef SynarcheLexerFacade
 * @description Lexical scanner for .synarche and JavaScript source.
 */
declare interface SynarcheLexerFacade {
  tokenize(source: string, options?: SynarcheLexerOptions): SynarcheToken[];
}

/**
 * @typedef SynarcheParserFacade
 * @description Mixin-stack parser for Cartridge AST validation.
 */
declare interface SynarcheParserFacade {
  parse(tokens: SynarcheToken[], options?: SynarcheParserOptions): { ast: CartridgeAST; errors: string[]; receipt?: ConstitutionalReceipt };
}

/**
 * @typedef SynarcheAdmissionAuthorityFacade
 * @description STCP-002 Constitutional admission authority and AST proof generator.
 */
declare interface SynarcheAdmissionAuthorityFacade {
  admit(ast: CartridgeAST, preErrors?: string[], options?: SynarcheParserOptions): ConstitutionalReceipt;
}

/**
 * @typedef GUCAEmitterFacade
 * @description Generic Universal Cartridge Assembly emitter.
 */
declare interface GUCAEmitterFacade {
  emit(ast: CartridgeAST, options?: SynarcheEmitterOptions): string;
}

/**
 * @typedef SynarcheASTFactoryFacade
 * @description STCP-003 AST Node construction factory.
 */
declare interface SynarcheASTFactoryFacade {
  identifier(name: string): SynarcheIdentifierNode;
  literal(value: unknown, raw: string, literalType: 'number' | 'string' | 'boolean' | 'null'): SynarcheLiteralNode;
  binaryExpr(operator: string, left: SynarcheExpressionNode, right: SynarcheExpressionNode): SynarcheBinaryExprNode;
  unaryExpr(operator: string, argument: SynarcheExpressionNode, prefix?: boolean): SynarcheUnaryExprNode;
  callExpr(callee: SynarcheExpressionNode, args: SynarcheExpressionNode[]): SynarcheCallExprNode;
  memberExpr(object: SynarcheExpressionNode, property: string, computed?: boolean): SynarcheMemberExprNode;
  assignExpr(operator: string, left: SynarcheIdentifierNode | SynarcheMemberExprNode, right: SynarcheExpressionNode): SynarcheAssignExprNode;
  varDecl(kind: 'let' | 'const' | 'var', name: string, init?: SynarcheExpressionNode | null): SynarcheVarDeclNode;
  blockStmt(body: SynarcheStatementNode[]): SynarcheBlockStmtNode;
  ifStmt(test: SynarcheExpressionNode, consequent: SynarcheStatementNode, alternate?: SynarcheStatementNode | null): SynarcheIfStmtNode;
  whileStmt(test: SynarcheExpressionNode, body: SynarcheStatementNode): SynarcheWhileStmtNode;
  returnStmt(argument?: SynarcheExpressionNode | null): SynarcheReturnStmtNode;
  exprStmt(expression: SynarcheExpressionNode): SynarcheExprStmtNode;
}

/**
 * @typedef SynarcheStatementParserFacade
 * @description STCP-003 Recursive-descent statement & expression parser constructor.
 */
declare interface SynarcheStatementParserFacade {
  new (tokens: SynarcheToken[], errors?: string[]): {
    parseStatements(): SynarcheStatementNode[];
    parseStatement(): SynarcheStatementNode | null;
    parseExpression(): SynarcheExpressionNode | null;
  };
}

/**
 * @typedef SynarcheCompilerFacade
 * @description Master transduction compiler facade.
 */
declare interface SynarcheCompilerFacade {
  tokenize(source: string, options?: SynarcheLexerOptions): SynarcheToken[];
  parse(tokens: SynarcheToken[], options?: SynarcheParserOptions): { ast: CartridgeAST; errors: string[]; receipt?: ConstitutionalReceipt };
  admit(ast: CartridgeAST, errors?: string[], options?: SynarcheParserOptions): ConstitutionalReceipt;
  emit(ast: CartridgeAST, options?: SynarcheEmitterOptions): string;
  compile(source: string, options?: SynarcheCompileOptions): SynarcheCompileResult;
  lint(source: string, options?: unknown): unknown[];
  ASTFactory: SynarcheASTFactoryFacade;
  StatementParser: SynarcheStatementParserFacade;
  TypeSystem: SynarcheTypeSystemFacade;
  TypeEnvironment: SynarcheTypeEnvironmentFacade;
  TypeInferenceEngine: SynarcheTypeInferenceEngineFacade;
}

/**
 * @typedef SynarcheTypeDescriptor
 * @description Hindley-Milner type descriptor.
 */
declare interface SynarcheTypeDescriptor {
  kind: 'Primitive' | 'Variable' | 'Array' | 'Function' | 'Record';
  name?: string;
  id?: number;
  instance?: SynarcheTypeDescriptor | null;
  elementType?: SynarcheTypeDescriptor;
  params?: SynarcheTypeDescriptor[];
  returnType?: SynarcheTypeDescriptor;
  fields?: Map<string, SynarcheTypeDescriptor>;
}

/**
 * @typedef SynarcheTypeSystemFacade
 * @description STCP-003 Hindley-Milner Type System constructor.
 */
declare interface SynarcheTypeSystemFacade {
  new (): {
    createPrimitive(name: string): SynarcheTypeDescriptor;
    createVariable(name?: string): SynarcheTypeDescriptor;
    createArray(elementType: SynarcheTypeDescriptor): SynarcheTypeDescriptor;
    createFunction(params: SynarcheTypeDescriptor[], returnType: SynarcheTypeDescriptor): SynarcheTypeDescriptor;
    createRecord(fields: Map<string, SynarcheTypeDescriptor> | Record<string, SynarcheTypeDescriptor>): SynarcheTypeDescriptor;
    prune(type: SynarcheTypeDescriptor): SynarcheTypeDescriptor;
    occursInType(v: SynarcheTypeDescriptor, type: SynarcheTypeDescriptor): boolean;
    formatType(type: SynarcheTypeDescriptor): string;
    isNumeric(type: SynarcheTypeDescriptor): boolean;
    unify(a: SynarcheTypeDescriptor, b: SynarcheTypeDescriptor, node?: unknown, errors?: string[]): boolean;
  };
}

/**
 * @typedef SynarcheTypeEnvironmentFacade
 * @description Scoped type environment constructor.
 */
declare interface SynarcheTypeEnvironmentFacade {
  new (parent?: unknown): {
    parent: unknown;
    bindings: Map<string, SynarcheTypeDescriptor>;
    set(name: string, type: SynarcheTypeDescriptor): void;
    get(name: string): SynarcheTypeDescriptor | null;
    has(name: string): boolean;
    createChild(): unknown;
  };
}

/**
 * @typedef SynarcheTypeInferenceEngineFacade
 * @description Recursive-descent AST Type Inference Engine constructor.
 */
declare interface SynarcheTypeInferenceEngineFacade {
  new (types?: unknown): {
    types: unknown;
    createRootEnvironment(ast: CartridgeAST): unknown;
    inferCartridge(ast: CartridgeAST, errors?: string[]): { inferredTypes: Map<string, string>; typeErrors: string[] };
    infer(node: unknown, env: unknown, errors: string[]): SynarcheTypeDescriptor;
  };
}

declare var SynarcheCompiler: SynarcheCompilerFacade;
declare var SynarcheLexer: SynarcheLexerFacade;
declare var SynarcheParser: SynarcheParserFacade;
declare var SynarcheAdmissionAuthority: SynarcheAdmissionAuthorityFacade;
declare var GUCAEmitter: GUCAEmitterFacade;
declare var SynarcheASTFactory: SynarcheASTFactoryFacade;
declare var SynarcheStatementParser: SynarcheStatementParserFacade;
declare var SynarcheTypeSystem: SynarcheTypeSystemFacade;
declare var SynarcheTypeEnvironment: SynarcheTypeEnvironmentFacade;
declare var SynarcheTypeInferenceEngine: SynarcheTypeInferenceEngineFacade;
declare var CONSTITUTIONAL_RULE_REGISTRY: Record<string, { id: string; name: string; phase: string; severity: string }>;
//#endregion [TYP-13]

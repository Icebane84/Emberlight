/**
 * ============================================================================
 * PHOENIX SOVEREIGN ENGINE & WORKBENCH: AMBIENT TYPE DECLARATIONS
 * Protocol: VLT-003 / PGE-DSL-1 / PGE-RECEIPT-1 / SDCP-001 / PERSIST-001
 * Zero-runtime type declaration file for VS Code static analysis.
 * ============================================================================
 */

declare interface PhoenixChangeDTO {
  type: "create_file" | "replace_text" | "delete_file" | "insert_before" | "insert_after" | string;
  path?: string;
  search?: string;
  content?: string;
  rule?: string;
  via?: string;
  [key: string]: unknown;
}

declare interface PhoenixProposalDTO {
  schemaVersion: string;
  proposalId: string;
  target: string;
  operation: "CREATE" | "MODIFY" | "DELETE" | "REPLACE" | string;
  intent: string;
  changes: PhoenixChangeDTO[];
  expectedInvariants: string[];
  testsRequested: string[];
  requiredCapabilities: string[];
  [key: string]: unknown;
}

declare interface PhoenixReceiptDTO {
  receiptVersion: string;
  receiptId: string;
  proposalId: string;
  transactionId: string | null;
  timestamp: string;
  status: "PASS" | "REJECTED" | "ERROR" | string;
  gate: "ALL_GATES" | "STRUCTURAL_GATE" | "CAPABILITY_GATE" | "BEHAVIOR_GATE" | "EXECUTION" | string;
  details: unknown;
  authority: string;
  protocols: string[];
  integrity: string;
  gatePassed?: string;
  integrityHash?: string;
  sourceUpdated?: boolean;
  rollbackOccurred?: boolean;
  diagnostics?: unknown[];
  [key: string]: unknown;
}

declare interface RegionInspectionResult {
  valid: boolean;
  count: number;
  regions: Array<{ id: string; title: string; line: number }>;
}

declare interface ScaffoldResult {
  scaffoldedSource: string;
  astEquivalent: boolean;
  regionCount: number;
}

declare interface ContractVerificationResult {
  compliant: boolean;
  verifiedCapabilities: string[];
  discrepancies: string[];
}

declare interface DependencyAnalysisResult {
  reads: string[];
  writes: string[];
  events: string[];
}

declare interface PhoenixRegionScaffolderFacade {
  stripComments(source: string): string;
  inspectRegions(source: string): RegionInspectionResult;
  scaffoldRegions(source: string, filename?: string): ScaffoldResult;
  verifyContract(source: string, declaredCapabilities?: string[]): ContractVerificationResult;
  analyzeDependencies(source: string): DependencyAnalysisResult;
}

declare interface PhoenixAudioSynthesizerFacade {
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
  playProceduralSFX(params: Record<string, unknown>): Promise<void>;
  generateSFXCode(params: Record<string, unknown>, format?: "standalone" | "eventbus"): string;
}

declare interface PhoenixSymbolItem {
  id: string;
  title: string;
  kind: "function" | "class" | "const" | "region" | string;
  line: number;
  file?: string;
  detail?: string;
}

declare interface PhoenixSymbolIndexerFacade {
  new (): PhoenixSymbolIndexerInstance;
}

declare interface PhoenixSymbolIndexerInstance {
  indexSource(path: string, code: string): PhoenixSymbolItem[];
  removeFile(path: string): void;
  findSymbols(prefix: string): PhoenixSymbolItem[];
  findDefinition(symbolName: string, activePath?: string): { file: string; line: number } | null;
  getCompletions(prefix: string): PhoenixSymbolItem[];
  clear(): void;
  getDiagnostics(): Record<string, unknown>;
}

declare interface PhoenixFuzzySearchFacade {
  score(query: string, text: string): number;
  filter<T>(query: string, items: T[], keySelector?: (item: T) => string): T[];
}

declare interface PhoenixSearchEngineFacade {
  findAll(source: string, query: string, options?: { matchCase?: boolean; matchWholeWord?: boolean; useRegex?: boolean }): Array<{ line: number; col: number; text: string }>;
  replaceAll(source: string, query: string, replacement: string, options?: { matchCase?: boolean; matchWholeWord?: boolean; useRegex?: boolean }): { result: string; count: number };
}

declare interface DiffHunk {
  id: string;
  startLine: number;
  endLine: number;
  originalText: string;
  newText: string;
  accepted: boolean;
}

declare interface PhoenixChunkDiffEngineFacade {
  computeHunks(original: string, modified: string): DiffHunk[];
  applyHunk(source: string, hunk: DiffHunk): string;
  rejectHunk(source: string, hunk: DiffHunk): string;
}

declare interface PhoenixRuntimeSandboxFacade {
  buildRuntimeHTML(vfs: Map<string, string>, entryPath?: string): string;
  createTickController(options: { onTick: (dt: number, tick: number) => void; fps?: number }): { start(): void; stop(): void; step(): void; isRunning(): boolean };
}

declare interface PhoenixWebGLBatcherFacade {
  createParticleSystem(maxParticles?: number): {
    emit(x: number, y: number, count?: number, options?: Record<string, unknown>): void;
    update(dt: number): void;
    render(renderer: { drawQuad(x: number, y: number, w: number, h: number, uvs: number[], color: number[]): void }): void;
    clear(): void;
  };
}

declare interface PhoenixCanvas2DLayerEngineFacade {
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

declare interface PhoenixPseudo3DRaycasterFacade {
  castRays(
    grid: number[][],
    camera: { x: number; y: number; angle: number; fov?: number },
    screenW: number,
    screenH: number,
    textures?: Record<number, HTMLCanvasElement | ImageBitmap>
  ): Array<{ x: number; distance: number; wallType: number; wallHeight: number; side: number }>;
}

declare interface PhoenixVoxel3DEngineFacade {
  createVolume(dimX: number, dimY: number, dimZ: number): { data: Uint8Array; dimX: number; dimY: number; dimZ: number };
  setVoxel(volume: unknown, x: number, y: number, z: number, val: number): void;
  getVoxel(volume: unknown, x: number, y: number, z: number): number;
  castRay3D(volume: unknown, origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxSteps?: number): { hit: boolean; x: number; y: number; z: number; voxel: number; normal: [number, number, number] };
  generateDungeonVolume(dimX?: number, dimY?: number, dimZ?: number): unknown;
  renderVoxelView(ctx: CanvasRenderingContext2D, volume: unknown, camera: unknown, screenW: number, screenH: number, options?: Record<string, unknown>): void;
}

declare interface PhoenixTerrainRaymarcherFacade {
  sampleHeight(x: number, z: number, scale?: number, maxHeight?: number): number;
  computeNormal(x: number, z: number, eps?: number): [number, number, number];
  castTerrainRay(origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxDist?: number, stepSize?: number): { hit: boolean; distance: number; x: number; y: number; z: number; height: number; normal: [number, number, number]; material: string };
  renderTerrainView(ctx: CanvasRenderingContext2D, camera: unknown, screenW: number, screenH: number, options?: Record<string, unknown>): void;
  getWebGLTerrainShaderSource(): string;
}

declare interface PhoenixCodeFormatterFacade {
  formatJS(code: string, options?: { indent?: number; tab?: boolean }): string;
  formatJSON(jsonStr: string): string;
}

declare interface PhoenixLinterSuiteFacade {
  calculateCognitiveComplexity(code: string): number;
  scanFunctionsComplexity(code: string, threshold?: number): Array<{ name: string; line: number; endLine: number; complexity: number; score: number; codeSlice: string }>;
  lintCode(source: string, filename?: string): Array<{ line: number; col: number; message: string; severity: "error" | "warning" }>;
}

declare interface ERLResolutionTemplate {
  id: string;
  fingerprint: string;
  rule: string;
  description: string;
  searchPattern: string;
  replacePattern: string;
  isRegex?: boolean;
  verifiedReceipt?: string;
  timestamp?: string;
  useCount?: number;
}

declare interface PhoenixErrorResolutionLedgerFacade {
  new (): PhoenixErrorResolutionLedgerInstance;
}

declare interface PhoenixErrorResolutionLedgerInstance {
  record(template: ERLResolutionTemplate): void;
  findMatch(diag: { rule?: string; message?: string }, lineText?: string): ERLResolutionTemplate | null;
  computeFingerprint(diag: { rule?: string }, lineText?: string): string;
  exportNDJSON(): string;
  importNDJSON(ndjson: string): number;
  getAllEntries(): ERLResolutionTemplate[];
  size: number;
}

declare interface PhoenixBatchRemediationPipelineFacade {
  executeFastPath(
    sourceCode: string,
    diagnostics: Array<{ rule?: string; message?: string; line?: number; col?: number }>,
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

declare interface PhoenixSpecificationRegistryInstance {
  registerTarget(id: string, targetSpec: Record<string, unknown>): void;
  getTarget(id: string): Record<string, unknown> | null;
}

declare interface PhoenixCapabilityRegistryInstance {
  grant(cap: string): void;
  revoke(cap: string): void;
  has(cap: string): boolean;
}

declare interface PhoenixReceiptLedgerInstance {
  record(receipt: PhoenixReceiptDTO): void;
  list(): PhoenixReceiptDTO[];
  size: number;
}

declare interface PhoenixSovereignStorageInstance {
  initialize(): Promise<PhoenixSovereignStorageInstance>;
  write(name: string, value: unknown): Promise<boolean>;
  read(name: string): Promise<unknown>;
  hasOPFS: boolean;
  hasProject: boolean;
}

declare interface PhoenixGovernorInstance {
  initialize(): Promise<PhoenixGovernorInstance>;
  registerSource(path: string, content: string): void;
  getSource(path: string): string | null;
  submitProposal(proposal: PhoenixProposalDTO | Record<string, unknown>, subject?: string): Promise<PhoenixReceiptDTO>;
  getReceipts(): PhoenixReceiptDTO[];
  diagnostics(): Record<string, unknown>;
  destroy(): void;
}

declare interface PhoenixMonolithExporterFacade {
  exportMonolith(bundle: {
    title: string;
    sources: Array<{ path: string; content: string }>;
    wasmKernels?: Array<{ name: string; base64: string }>;
    shaders?: Array<{ name: string; code: string }>;
    receipts?: unknown[];
  }): string;
  exportMonolithAsync(bundle: unknown): Promise<string>;
}

declare interface PhoenixWebLLMWorkerBridgeInstance {
  start(adapterFactorySource: string, config?: Record<string, unknown>): Promise<void>;
  generate(prompt: string, options?: { maxTokens?: number; temperature?: number; onToken?: (t: string) => void }): Promise<string>;
  generateProposalWithSelfHealing(prompt: string, options?: Record<string, unknown>, maxTrials?: number): Promise<{ proposal: Record<string, unknown>; rawText: string; trials: number }>;
  ping(): Promise<unknown>;
  destroy(): Promise<void>;
  isReady: boolean;
  ready: boolean;
}

declare interface PhoenixSovereignEngineFacade {
  VERSION: string;
  PROTOCOLS: string[];
  STATES: Record<string, string>;
  STATUS: Record<string, string>;
  GATES: Record<string, string>;
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
}

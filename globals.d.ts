/* cSpell:words VSRP Vitals Tilemap */
// NOSONAR
/**
 * EMBERLIGHT SOVEREIGN ENGINE: AMBIENT GLOBAL EXTENSIONS
 * Protocol Anchor: VSRP-001 / PRS-001
 * Zero-runtime type declaration file for VS Code static analysis.
 */

declare interface NodeRequire {
  (id: string): unknown;
  resolve?(id: string): string;
  cache?: Record<string, unknown>;
}

declare interface NodeModule {
  exports: unknown;
  id?: string;
  filename?: string;
  loaded?: boolean;
}

declare var global: any;
declare var Buffer: any;

declare interface VSRPTenantModule<TState = Record<string, unknown>> {
  configure?(config?: Record<string, unknown>): void;
  init(context?: Record<string, unknown> | unknown, ...args: unknown[]): void;
  reset(snapshot?: Partial<TState> | unknown): void;
  getState(): TState | null;
  update(dt: number, context?: Record<string, unknown> | unknown): void;
  render(target?: unknown, ...args: unknown[]): void;
  getDiagnostics(): Record<string, unknown>;
  getModuleInfo(): {
    moduleId: string;
    version: string;
    protocolVersion: string;
    capabilities: string[];
  };
  getInfo?(): {
    moduleId: string;
    version: string;
    protocolVersion: string;
    capabilities: string[];
  };
  destroy(): void;
  createInstance?(options?: Record<string, unknown>): VSRPTenantModule<TState>;
  [customMethodOrProperty: string]: unknown;
}

declare interface VSRPPeripheralRenderer {
  init?(
    config?: Record<string, unknown>,
    context?: Record<string, unknown>,
  ): void;
  render?(target?: unknown, ...args: unknown[]): void;
  getDiagnostics(): Record<string, unknown>;
  destroy(): void;
  createInstance?(options?: Record<string, unknown>): VSRPPeripheralRenderer;
  [customMethodOrProperty: string]: unknown;
}

declare interface EventBusBroker {
  subscribe<T extends string & keyof EmberlightEventMap>(
    event: T,
    handler: (payload: EmberlightEventMap[T]) => void,
  ): () => void;
  publish<T extends string & keyof EmberlightEventMap>(
    event: T,
    payload?: EmberlightEventMap[T],
  ): void;
  clear(): void;
  getListenerCount(event?: string): number;
  [customMethodOrProperty: string]: unknown;
}

declare interface DistrictRouterBroker {
  init(context?: Record<string, unknown>): void;
  DISTRICT_VIEWS?: string[];
  registerHandlers?: (
    handlers: Record<string, (payload?: unknown) => void>,
  ) => void;
  switchDistrict?: (
    district: string,
    viewId?: string,
    snapshot?: unknown,
  ) => void;
  mountDistrict?: (
    district: string,
    payload?: unknown,
    context?: unknown,
  ) => void;
  handleCancelAction?: () => void;
  getActiveDistrict?: () => string;
  setActiveDistrict?: (d: string) => void;
  getDiagnostics(): Record<string, unknown>;
  destroy(): void;
  [customProperty: string]: unknown;
}

declare interface SaveManagerFacade {
  CURRENT_VERSION?: string;
  STORAGE_KEY?: string;
  LEGACY_STORAGE_KEY?: string;
  SAVE_SLOTS?: readonly {
    id: string;
    label: string;
    storageKey: string;
    isAuto: boolean;
  }[];
  MIGRATIONS?: Record<string, (raw: SavePayloadDTO) => SavePayloadDTO>;
  init?(
    config?: Record<string, unknown>,
    context?: Record<string, unknown>,
  ): void;
  migrate?(payload: SavePayloadDTO): SavePayloadDTO;
  hasSave?(slotId?: string): boolean;
  save(
    stateSnapshot: SavePayloadDTO | Record<string, unknown>,
    slotId?: string,
  ): boolean;
  load(slotId?: string): SavePayloadDTO | Record<string, unknown> | null;
  deleteSlot?(slotId: string): boolean;
  deleteSave?(slotId?: string): boolean;
  clear?(slotId?: string): boolean;
  listSlots?(): Record<string, unknown>[];
  getSaveMetadata?(
    slotId?: string,
  ): SaveMetadataDTO | Record<string, unknown> | null;
  getAllSaveMetadata?(): SaveMetadataDTO[];
  getMostRecentSlotId(): string;
  resolveLocationName(
    saveData: SavePayloadDTO | Record<string, unknown>,
  ): string;
  exportSave?(slotId?: string): string | null;
  importSave?(serializedJson: string, slotId?: string): boolean;
  getDiagnostics?(): Record<string, unknown>;
  destroy?(): void;
  [customProperty: string]: unknown;
}

declare interface PRNGFacade {
  create(seed?: number | string): {
    nextInt(min: number, max: number): number;
    nextFloat(): number;
    nextBool(chance?: number): boolean;
    choice?<T>(array: readonly T[] | T[]): T | undefined;
    shuffle?<T>(array: readonly T[] | T[]): T[];
    getState(): number;
    setState(seed: number | string): void;
    fork?(): unknown;
    [key: string]: unknown;
  };
  nextInt?(min: number, max: number): number;
  nextFloat?(): number;
  nextBool?(chance?: number): boolean;
  [customProperty: string]: unknown;
}

declare interface EmberlightManifestFacade {
  schemaVersion: string;
  protocolVersion: string;
  DefaultSettings: Record<string, unknown>;
  SessionConfig: Record<string, unknown>;
  ExplorationConfig: Record<string, unknown>;
  Curves: Record<string, unknown>;
  PartyRoster: Record<string, SaveCharacterDTO>;
  Phenotypes: Record<string, unknown>;
  Classes: Record<string, unknown>;
  Items: Record<string, ItemRecord>;
  Enemies: Record<string, EnemyTemplate>;
  Encounters: Record<string, unknown>;
  AetherEssences: Record<string, unknown>;
  AetherNodes: Record<string, SkillNode>;
  SkillTrees: Record<string, unknown>;
  TileLegend: Record<string, unknown>;
  OverworldMap: string[][];
  TownMaps: Record<string, string[][]>;
  Ailments: Record<string, unknown>;
  Quests: Record<string, QuestRecord>;
  WorldMutations: Record<string, unknown>;
  Shops: Record<string, unknown>;
  Dialogues: Record<string, unknown>;
  calculateGearStats: (equipment: unknown) => unknown;
  computeCharacterStats: (
    character?: unknown,
    level?: number,
    gearStats?: unknown,
    nodes?: unknown[],
  ) => SaveCharacterDTO & Record<string, unknown>;
  getResolvedMap: (
    mapName: string,
    mutations?: Record<string, string>,
  ) => string[][];
  [customProperty: string]: unknown;
}

declare interface ManifestInternalStaging {
  Config?: Record<string, unknown>;
  Actors?: Record<string, unknown>;
  Items?: Record<string, unknown>;
  Progression?: Record<string, unknown>;
  World?: Record<string, unknown>;
  Narrative?: Record<string, unknown>;
  Calculators?: Record<string, unknown>;
  [key: string]: unknown;
}

declare interface CombatInternalStaging {
  Actions?: Record<string, unknown>;
  AI?: Record<string, unknown>;
  Calculations?: Record<string, unknown>;
  Calc?: Record<string, unknown>;
  State?: Record<string, unknown>;
  Displacement?: Record<string, unknown>;
  TurnCycle?: Record<string, unknown>;
  Queue?: Record<string, unknown>;
  Orchestrator?: Record<string, unknown>;
  [key: string]: unknown;
}

declare interface BattlerLayerResult {
  kind?: string;
  family?: string;
  tag?: string;
  ctx?: unknown;
  canvas?: unknown;
  [key: string]: unknown;
}

declare interface BattlerSpec {
  id?: string;
  phenotype?: string;
  weapon?: unknown;
  armor?: unknown;
  gear?: Record<string, unknown>;
  palette?: Record<string, unknown>;
  [key: string]: unknown;
}

declare interface EnemyResolution {
  requested?: string;
  canonical?: string;
  baker?: unknown;
  classification?: string;
  resolution?: string;
  reason?: string;
  [key: string]: unknown;
}

declare interface HeroResolution {
  requested?: string;
  canonical?: string;
  baker?: unknown;
  classification?: string;
  resolution?: string;
  reason?: string;
  [key: string]: unknown;
}

declare interface RenderHeroResult {
  dataUrl?: string | null;
  status?: string;
  reason?: string;
  layers?: unknown;
  [key: string]: unknown;
}

declare interface DiagnosticReport {
  driverId?: string;
  moduleVersion?: string;
  timestamp?: number;
  message?: string;
  classification?: string;
  resolution?: string;
  requested?: string;
  found?: boolean;
  report?: unknown;
  spriteDimensions?: string;
  renderScale?: number;
  cacheSize?: number;
  diagnosticCount?: number;
  counts?: Record<string, number> | Readonly<Record<string, number>>;
  entries?: readonly unknown[];
  [key: string]: unknown;
}

declare interface AssetValidationResult {
  pass: boolean;
  results?: unknown[];
  errors?: string[];
  [key: string]: unknown;
}

declare interface BattlerBakerPrimitivesStaging {
  VERSION?: string;
  SPRITE_SIZE?: number;
  RENDER_SCALE?: number;
  WORK_SIZE?: number;
  cache?: Map<string, unknown>;
  diagnosticLog?: Map<string, unknown>;
  P?: Record<string, string>;
  canvas?: unknown;
  ctxConfig?: unknown;
  [key: string]: unknown;
}

declare interface BattlerBakerInternalStaging {
  Primitives?: BattlerBakerPrimitivesStaging;
  Heroes?: Record<string, unknown>;
  Equipment?: Record<string, unknown>;
  Enemies?: Record<string, unknown>;
  Compositor?: Record<string, unknown>;
  Pipeline?: Record<string, unknown>;
  [key: string]: unknown;
}

declare interface AuditorKernelStaging {
  _bindLog?: (simRef: unknown) => void;
  getBoundSim?: () => unknown;
  deepFreeze?: <T>(obj: T) => Readonly<T>;
  createDefaultState?: () => unknown;
  logAudit?: (message: string, passed?: boolean) => void;
  createIsolatedEventBus?: () => unknown;
  [key: string]: unknown;
}

declare interface AuditorContractsStaging {
  runContractAndFaradayAudit?: (
    registeredModules?: unknown,
    registeredDrivers?: unknown,
    manifest?: unknown
  ) => unknown;
  [key: string]: unknown;
}

declare interface AuditorDistrictSimsStaging {
  runInSituCombatAudit?: (manifest?: unknown, combatModule?: unknown, iterations?: number) => unknown;
  runInSituOverworldAudit?: (_manifest?: unknown, overworldModule?: unknown) => unknown;
  runInSituMarketAudit?: (_manifest?: unknown, marketModule?: unknown) => unknown;
  runInSituProgressionAudit?: (manifest?: unknown, progressionModule?: unknown) => unknown;
  runInSituLockpickAudit?: (_manifest?: unknown, lockpickModule?: unknown) => unknown;
  runInSituRelicForgeAudit?: (_manifest?: unknown, forgeModule?: unknown) => unknown;
  runInSituPseudo3DAudit?: (_manifest?: unknown, pseudo3DModule?: unknown) => unknown;
  [key: string]: unknown;
}

declare interface AuditorCombatExtendedStaging {
  runSDCPCapabilityAudit?: (_manifest?: unknown, eventBusRef?: unknown) => unknown;
  runInSituFormationShieldingAudit?: (manifest?: unknown, combatModule?: unknown) => unknown;
  runInSituBossAndAilmentAudit?: (manifest?: unknown, combatModule?: unknown, vfxModule?: unknown) => unknown;
  runInSituDualPerspectiveAudit?: (_manifest?: unknown, pseudo3DModule?: unknown) => unknown;
  [key: string]: unknown;
}

declare interface AuditorPersistenceStaging {
  runPersistenceAndTeardownAudit?: (manifest?: unknown, eventBus?: unknown, drivers?: unknown) => unknown;
  runCombatAestheticsAudit?: (manifest?: unknown, battlerDriver?: unknown, backdropDriver?: unknown) => unknown;
  runDistrictTransitionsAndChestAudit?: (manifest?: unknown, overworldModule?: unknown, inputDriver?: unknown, bus?: unknown) => unknown;
  runSurfacingAndLegibilityAudit?: (manifest?: unknown) => unknown;
  [key: string]: unknown;
}

declare interface AuditorConstitutionalStaging {
  runConstitutionalComplianceAudit?: (manifest?: unknown, registeredModules?: unknown, _registeredDrivers?: unknown, _bus?: unknown) => unknown;
  [key: string]: unknown;
}

declare interface AuditorEndgameStaging {
  runTacticalDisplacementAudit?: (manifest?: unknown, combatModule?: unknown) => unknown;
  runDeepAnalysisWorkstationAudit?: (_manifest?: unknown, statusModule?: unknown, _armoryModule?: unknown, battlerDriver?: unknown) => unknown;
  runWarTableSkeletonAndProjectionAudit?: (activeManifest?: unknown, combatModule?: unknown, _combatRenderer?: unknown, eventBus?: unknown) => unknown;
  runCombatStationIntegrationAudit?: (activeManifest?: unknown, combatModule?: unknown, _combatRenderer?: unknown) => unknown;
  runFullAudit?: (options?: unknown) => unknown;
  executeAuditPasses?: (targets?: unknown, drivers?: unknown, activeManifest?: unknown, bus?: unknown) => unknown;
  resolveDriverRegistry?: (snapshotDrivers?: unknown) => unknown;
  renderDefaultPresentation?: (sim?: unknown, hostContext?: unknown) => unknown;
  [key: string]: unknown;
}

declare interface AuditorInternalStaging {
  Kernel?: AuditorKernelStaging;
  Contracts?: AuditorContractsStaging;
  DistrictSims?: AuditorDistrictSimsStaging;
  CombatExtended?: AuditorCombatExtendedStaging;
  Persistence?: AuditorPersistenceStaging;
  Constitutional?: AuditorConstitutionalStaging;
  Endgame?: AuditorEndgameStaging;
  [key: string]: unknown;
}

declare var require: NodeRequire;
declare var module: NodeModule;
declare var _ManifestInternal: ManifestInternalStaging;
declare var _DynamicLightsInternal: Record<string, unknown>;
declare var _CombatInternal: CombatInternalStaging;
declare var _MapInternal: Record<string, unknown>;
declare var _Pseudo3DInternal: Record<string, unknown>;
declare var _BattlerBakerInternal: BattlerBakerInternalStaging;
declare var _DungeonGenInternal: Record<string, unknown>;
declare var _AuditorInternal: AuditorInternalStaging;
declare var EmberlightManifest: EmberlightManifestFacade;
declare var EmberlightCombat: VSRPTenantModule;
declare var EmberlightCombatRenderer: VSRPPeripheralRenderer;
declare var EmberlightCombatBackdrop: VSRPPeripheralRenderer & {
  createInstance?: (options?: Record<string, unknown>) => unknown;
};
declare var EmberlightBattleBackdrop: VSRPPeripheralRenderer & {
  createInstance?: (options?: Record<string, unknown>) => unknown;
};
declare var EmberlightCombatVFX: VSRPPeripheralRenderer;
declare var EmberlightOverworld: VSRPTenantModule;
declare var EmberlightOverworldRenderer: VSRPPeripheralRenderer;
declare var EmberlightOverworldLighting: VSRPPeripheralRenderer;
declare var EmberlightDynamicLights: VSRPPeripheralRenderer & {
  createInstance?: (options?: Record<string, unknown>) => unknown;
};
declare var EmberlightStatus: VSRPTenantModule;
declare var EmberlightStatusRenderer: VSRPPeripheralRenderer;
declare var EmberlightArmory: VSRPTenantModule;
declare var EmberlightArmoryRenderer: VSRPPeripheralRenderer;
declare var EmberlightProgression: VSRPTenantModule;
declare var EmberlightProgressionRenderer: VSRPPeripheralRenderer;
declare var EmberlightMarket: VSRPTenantModule;
declare var EmberlightMarketRenderer: VSRPPeripheralRenderer;
declare var EmberlightChronicle: VSRPTenantModule;
declare var EmberlightChronicleRenderer: VSRPPeripheralRenderer;
declare var EmberlightRelicForge: VSRPTenantModule;
declare var EmberlightRelicForgeRenderer: VSRPPeripheralRenderer;
declare var EmberlightLockpick: VSRPTenantModule;
declare var EmberlightAuditor: VSRPTenantModule;
declare var EmberlightSettings: VSRPTenantModule;
declare var EmberlightCockpitRenderer: VSRPPeripheralRenderer;
declare var EmberlightMapRenderer: VSRPPeripheralRenderer;
declare var EmberlightPseudo3D: VSRPTenantModule;
declare var EmberlightPseudo3DRenderer: VSRPPeripheralRenderer;
declare var EmberlightScript: VSRPTenantModule;
declare var EmberlightCorridorSensor: VSRPTenantModule;
declare var EmberlightDungeonGen: Record<string, unknown>;
declare var EmberlightFieldPouch: Record<string, unknown>;
declare var EmberlightPartyIcons: {
  bakeAll(): void;
  get(phenotype?: string): string | null;
  [key: string]: unknown;
};
declare var EmberlightSkillIcons: {
  bakeAll(): void;
  get(nodeId: string): string | null;
  [key: string]: unknown;
};
declare var EmberlightIcons: Record<string, unknown>;
declare var EmberlightSoundtrack: Record<string, unknown>;
declare var EmberlightVoice: Record<string, unknown>;
declare var EmberlightShaderCompositor: Record<string, unknown>;
declare var EmberlightSpriteBaker: Record<string, unknown>;
declare var EmberlightBattlerBaker: Record<string, unknown>;
declare interface AcousticSFXDiagnostics {
  serviceId: string;
  contextState: string;
  activeZone: string;
  userUnlocked: boolean;
  isMuted: boolean;
  masterVolume: number;
  limiterActive?: boolean;
  activeNodeCount: number;
  dryLevel: number;
  wetLevel: number;
  [key: string]: unknown;
}

declare interface AcousticSFXFacade extends VSRPTenantModule {
  play(sfxName: string, pan?: number): void;
  playSFX(sfxName: string, pan?: number): void;
  setZone(zoneKey: "MEADOW" | "TOWN" | "CRYPT" | string): void;
  setMasterVolume(level: number): number;
  toggleMute(): boolean;
  getDiagnostics(): AcousticSFXDiagnostics;
  destroy(): void;
  [key: string]: unknown;
}

declare var EmberlightAcousticSFX: AcousticSFXFacade;
declare var EmberlightAudio: AcousticSFXFacade;
declare var EmberlightThreatOracle: VSRPPeripheralRenderer & {
  createInstance?: (options?: Record<string, unknown>) => unknown;
};
declare var EmberlightTacticalRadar: VSRPPeripheralRenderer & {
  createInstance?: (options?: Record<string, unknown>) => unknown;
};
declare var EmberlightHeroChassis: VSRPPeripheralRenderer & {
  createInstance?: (options?: Record<string, unknown>) => unknown;
};
declare var EmberlightSpatialFlank: VSRPPeripheralRenderer & {
  createInstance?: (options?: Record<string, unknown>) => unknown;
};
declare var EmberlightLockpickEnvelope: VSRPPeripheralRenderer & {
  createInstance?: (options?: Record<string, unknown>) => unknown;
};
declare var EmberlightSessionStore: Record<string, unknown>;
declare var EmberlightEventBus: EventBusBroker;
declare var EmberlightDistrictRouter: DistrictRouterBroker;
declare var EmberlightWorldEcology: Record<string, unknown>;
declare var EmberlightPRNG: PRNGFacade;
declare var EmberlightSaveManager: SaveManagerFacade;
declare var EmberlightInput: Record<string, unknown>;
declare interface GameRuntimeFacade {
  init?: (config?: Record<string, unknown>) => void;
  handleInputAction?: (
    action: string,
    code?: string,
    shiftKey?: boolean,
  ) => void;
  switchDistrict?: (district: string) => void;
  [key: string]: unknown;
}

declare var StorageManager: Record<string, unknown>;
declare var GameRuntime: GameRuntimeFacade;
declare var EventBus: EventBusBroker;
declare var getParty: (() => SaveCharacterDTO[]) | undefined;
declare var getInventory: (() => Record<string, number>) | undefined;
declare var getGold: (() => number) | undefined;
declare var getQuests: (() => Record<string, unknown>) | undefined;

declare interface Window {
  [key: string]: unknown;
  _ManifestInternal: ManifestInternalStaging;
  _DynamicLightsInternal: Record<string, unknown>;
  _CombatInternal: CombatInternalStaging;
  _MapInternal: Record<string, unknown>;
  _Pseudo3DInternal: Record<string, unknown>;
  _BattlerBakerInternal?: BattlerBakerInternalStaging;
  _DungeonGenInternal: Record<string, unknown>;
  _AuditorInternal?: AuditorInternalStaging;
  EmberlightManifest?: EmberlightManifestFacade;
  EmberlightCombat?: VSRPTenantModule;
  EmberlightCombatRenderer?: VSRPPeripheralRenderer;
  EmberlightCombatBackdrop?: VSRPPeripheralRenderer;
  EmberlightBattleBackdrop?: VSRPPeripheralRenderer;
  EmberlightCombatVFX?: VSRPPeripheralRenderer;
  EmberlightOverworld?: VSRPTenantModule;
  EmberlightOverworldRenderer?: VSRPPeripheralRenderer;
  EmberlightOverworldLighting?: VSRPPeripheralRenderer;
  EmberlightDynamicLights?: VSRPPeripheralRenderer;
  EmberlightStatus?: VSRPTenantModule;
  EmberlightStatusRenderer?: VSRPPeripheralRenderer;
  EmberlightArmory?: VSRPTenantModule;
  EmberlightArmoryRenderer?: VSRPPeripheralRenderer;
  EmberlightProgression?: VSRPTenantModule;
  EmberlightProgressionRenderer?: VSRPPeripheralRenderer;
  EmberlightMarket?: VSRPTenantModule;
  EmberlightMarketRenderer?: VSRPPeripheralRenderer;
  EmberlightChronicle?: VSRPTenantModule;
  EmberlightChronicleRenderer?: VSRPPeripheralRenderer;
  EmberlightRelicForge?: VSRPTenantModule;
  EmberlightRelicForgeRenderer?: VSRPPeripheralRenderer;
  EmberlightLockpick?: VSRPTenantModule;
  EmberlightAuditor?: VSRPTenantModule;
  EmberlightSettings?: VSRPTenantModule;
  EmberlightCockpitRenderer?: VSRPPeripheralRenderer;
  EmberlightMapRenderer?: VSRPPeripheralRenderer;
  EmberlightPseudo3D?: VSRPTenantModule;
  EmberlightPseudo3DRenderer?: VSRPPeripheralRenderer;
  EmberlightScript?: VSRPTenantModule;
  EmberlightCorridorSensor?: VSRPTenantModule;
  EmberlightDungeonGen?: Record<string, unknown>;
  EmberlightFieldPouch?: Record<string, unknown>;
  EmberlightPartyIcons?: Record<string, unknown>;
  EmberlightSkillIcons?: Record<string, unknown>;
  EmberlightIcons?: Record<string, unknown>;
  EmberlightSoundtrack?: Record<string, unknown>;
  EmberlightVoice?: Record<string, unknown>;
  EmberlightShaderCompositor?: Record<string, unknown>;
  EmberlightSpriteBaker?: Record<string, unknown>;
  EmberlightBattlerBaker?: Record<string, unknown>;
  EmberlightSynthSoundtrack?: Record<string, unknown>;
  EmberlightSyntheticVoice?: Record<string, unknown>;
  EmberlightAcousticSFX?: AcousticSFXFacade;
  EmberlightAudio?: AcousticSFXFacade;
  EmberlightThreatOracle?: VSRPPeripheralRenderer & {
    forecastTimeline?: (...args: unknown[]) => unknown;
    [key: string]: unknown;
  };
  EmberlightSessionStore?: Record<string, unknown>;
  EmberlightEventBus?: EventBusBroker;
  EmberlightDistrictRouter?: DistrictRouterBroker;
  EmberlightWorldEcology?: Record<string, unknown>;
  EmberlightPRNG?: PRNGFacade;
  EmberlightSaveManager?: SaveManagerFacade;
  EmberlightInput?: Record<string, unknown>;
  StorageManager?: Record<string, unknown>;
  GameRuntime?: GameRuntimeFacade;
  getParty?: () => SaveCharacterDTO[];
  getInventory?: () => Record<string, number>;
  getGold?: () => number;
  getQuests?: () => Record<string, unknown>;
  EventBus?: EventBusBroker;
}

/**
 * Base Numerical Vitals & Combat Statistics
 */
declare interface BaseStats {
  hp?: number;
  mp?: number;
  atk?: number;
  def?: number;
  agi?: number;
}

/**
 * Full Character Vital Snapshot Statistics
 */
declare interface CharacterStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  agi: number;
}

/**
 * Entity Vital & State Snapshot Contract
 */
declare interface CharacterSnapshot {
  id?: string;
  name?: string;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  alive?: boolean;
  ailments?: string[];
  phenotype?: string;
  level?: number;
  exp?: number;
  atk?: number;
  def?: number;
  agi?: number;
}

/**
 * 4-Quadrant War Table Ambient DTO Interfaces (AOP-COMBAT-STATION-002)
 */
declare interface SpatialNode {
  id: string;
  name: string;
  phenotype?: string;
  key?: string;
  row: string;
  hp?: number;
  maxHp?: number;
  alive: boolean;
  isBoss?: boolean;
  gridX: number;
  gridY: number;
  isCurrentTurn: boolean;
}

declare interface HazardTile {
  x: number;
  y: number;
  type: string;
}

declare interface DisplacementVector {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: string;
  isWallImpact: boolean;
}

declare interface ThreatVector {
  enemyId: string;
  enemyName: string;
  targetHeroId: string | null;
  targetHeroName: string;
  heroIndex: number;
  isCharged: boolean;
}

declare interface Q1SpatialProjection {
  gridDimensions: { cols: number; rows: number };
  partyFormation: readonly SpatialNode[];
  enemyFormation: readonly SpatialNode[];
  hazardTiles: readonly HazardTile[];
  activeVectors: readonly DisplacementVector[];
  threatVectors: readonly ThreatVector[];
  allies: readonly SpatialNode[];
  enemies: readonly SpatialNode[];
}

declare interface Q2ClashProjection {
  biome: string;
  activeTurnIndex: number;
  phase: string;
  enrageFactor: number;
  allies: readonly SpatialNode[];
  enemies: readonly SpatialNode[];
  activeClashAnimation: string | null;
}

declare interface Q3OracleFoe {
  id: string;
  name: string;
  weaknesses: string[];
  resistances: string[];
  immunities: string[];
  alive: boolean;
  hp?: number;
  maxHp?: number;
}

declare interface Q3OracleProjection {
  turnQueue: unknown[];
  forecastQueue: unknown[];
  log: unknown[];
  threatVectors: readonly ThreatVector[];
  enemies: readonly Q3OracleFoe[];
}

declare interface Q4HeroVital {
  id: string;
  name: string;
  phenotype: string;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  row: string;
  alive: boolean;
  ailments: string[];
  isCurrentTurn: boolean;
}

declare interface Q4DeckProjection {
  activeCharId: string | null;
  activeHeroIndex: number;
  selectedTab: string;
  pendingSkill: unknown | null;
  pendingItem: string | null;
  partyVitals: readonly Q4HeroVital[];
  inventory: Record<string, number>;
  phase: string;
}

declare interface CombatWarTableProjection {
  q1Spatial: Readonly<Q1SpatialProjection>;
  q2Clash: Readonly<Q2ClashProjection>;
  q3Oracle: Readonly<Q3OracleProjection>;
  q4Deck: Readonly<Q4DeckProjection>;
  snapshot: unknown;
}

/**
 * ============================================================================
 * [MANIFEST & DOMAIN SCHEMA FACADES] - ARCH-SPEC-MANIFEST-001
 * ============================================================================
 */

/**
 * Static Item & Equipment Record Schema
 */
declare interface ItemRecord {
  id: string;
  name: string;
  type: "WEAPON" | "ARMOR" | "ACCESSORY" | "CONSUMABLE" | "MATERIAL" | string;
  tier?: number;
  cost?: number;
  price?: number;
  description?: string;
  stats?: BaseStats;
  effect?: unknown;
  subType?: string;
  icon?: string;
}

/**
 * 3-Slot Equipment Mapping Contract
 */
declare interface EquipmentSlotMap {
  WEAPON?: string | null;
  ARMOR?: string | null;
  ACCESSORY?: string | null;
  [slot: string]: string | null | undefined;
}

/**
 * Progression Aether Node & Skill Definition
 */
declare interface SkillNode {
  id: string;
  name: string;
  type: "active" | "passive";
  subType?: string;
  tier: number;
  spCost?: number;
  description?: string;
  mpCost?: number;
  power?: number;
  target?: string;
  ailment?: string;
  duration?: number;
  statBonus?: BaseStats;
  requires?: string[];
  icon?: string;
  displacement?: {
    type: "KNOCKBACK" | "PULL";
    tiles?: number;
  };
}

/**
 * Enemy Template & Bestiary Record
 */
declare interface EnemyTemplate {
  id: string;
  name: string;
  key?: string;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  atk: number;
  def: number;
  agi: number;
  exp: number;
  gold: number;
  weaknesses?: string[];
  resistances?: string[];
  immunities?: string[];
  drops?: Array<{ id: string; chance: number }>;
  isBoss?: boolean;
  phaseTwoActive?: boolean;
  skills?: string[];
  ai?: string;
}

/**
 * Quest Stage & Narrative Record
 */
declare interface QuestStage {
  stage: number;
  description: string;
  targetType?: string;
  targetId?: string;
  targetCount?: number;
  dialogueKey?: string;
}

declare interface QuestRecord {
  id: string;
  title: string;
  description: string;
  category?: string;
  stages: QuestStage[];
  rewards?: {
    exp?: number;
    gold?: number;
    items?: Array<{ id: string; count: number }>;
  };
}

/**
 * ============================================================================
 * [PERSISTENCE & SAVE SYSTEM FACADES] - VSRP-001-SAVE-001
 * ============================================================================
 */

declare interface SaveEquipmentDTO {
  weapon?: string | null;
  armor?: string | null;
  accessory?: string | null;
}

declare interface SaveCharacterDTO {
  id?: string;
  name?: string;
  phenotype?: string;
  class?: string;
  level?: number;
  exp?: number;
  skillPoints?: number;
  unspentSP?: number;
  unlocked?: string[];
  unlockedNodes?: string[];
  spent?: Record<string, number>;
  equipment?: SaveEquipmentDTO;
  ailments?: unknown[];
  alive?: boolean;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  atk?: number;
  def?: number;
  agi?: number;
}

declare interface SaveMetadataDTO {
  slotId?: string;
  version: string;
  timestamp: string;
  partySize: number;
  avgLevel: number;
  gold: number;
}

declare interface SaveDungeonSpecDTO {
  seed: number;
  depth: number;
  width: number;
  height: number;
  mutations: Record<string, string>;
}

declare interface SavePayloadDTO {
  slotId?: string;
  version?: string;
  timestamp?: string;
  canonicalParty?: SaveCharacterDTO[];
  party?: SaveCharacterDTO[];
  canonicalGold?: number;
  gold?: number;
  canonicalInventory?: Record<string, number>;
  inventory?: Record<string, number>;
  canonicalWorldPos?: { x: number; y: number; mapId?: string };
  worldPos?: { x: number; y: number; mapId?: string };
  canonicalFlags?: Record<string, boolean>;
  flags?: Record<string, boolean>;
  canonicalQuests?: Record<string, unknown>;
  quests?: Record<string, unknown>;
  canonicalDungeonDepth?: number;
  dungeonDepth?: number;
  canonicalDungeonSpec?: SaveDungeonSpecDTO | null;
  dungeonSpec?: SaveDungeonSpecDTO | null;
  canonicalSurfaceMutations?: Record<string, string>;
  surfaceMutations?: Record<string, string>;
  canonicalTownMutations?: Record<string, string>;
  townMutations?: Record<string, string>;
  canonicalTownId?: string | null;
  townId?: string | null;
  canonicalMacroPos?: { x: number; y: number };
  macroPos?: { x: number; y: number };
  canonicalStepCounter?: number;
  stepCounter?: number;
  canonicalSurfaceMap?: string[][];
  canonicalDungeonFloor?: number;
}

/**
 * ============================================================================
 * [OVERWORLD & KINEMATICS FACADES] - VSRP-001-OVERWORLD-001
 * ============================================================================
 */

declare interface OverworldPosition {
  x: number;
  y: number;
  mapId?: string;
  facing?: "NORTH" | "SOUTH" | "EAST" | "WEST" | string;
}

declare interface WorldMutationMap {
  [coordKey: string]: string;
}

/**
 * ============================================================================
 * [PUB/SUB EVENT MAP SCHEMA FACADE] - VSRP-001-EVENT-BUS
 * ============================================================================
 */

declare interface EmberlightEventMap {
  "input:action": {
    action: string;
    code?: string;
    shiftKey?: boolean;
    [key: string]: unknown;
  };
  "overworld:step": {
    pos: OverworldPosition & { inTown?: boolean; townId?: string | null };
    tile: string;
    facing: string;
    depth: number;
    townId?: string | null;
  };
  "overworld:encounter": {
    encounterKey: string;
    pos?: OverworldPosition;
    tile?: string;
  };
  "overworld:sfx": { sfx?: string; [key: string]: unknown };
  "world:zone_change": {
    zone?: string;
    townId?: string | null;
    [key: string]: unknown;
  };
  "stage:biome": { biome: string };
  "combat:resolved": {
    outcome: "VICTORY" | "DEFEAT" | "FLED" | string;
    exp?: number;
    gold?: number;
    loot?: Record<string, number>;
    [key: string]: unknown;
  };
  "combat:action_dispatched": {
    action: string;
    targetId?: string;
    skillId?: string;
    [key: string]: unknown;
  };
  "combat:sfx": {
    sfx?: string;
    cue?: string;
    soundId?: string;
    volume?: number;
    [key: string]: unknown;
  };
  "status:updated": { party?: unknown[]; [key: string]: unknown };
  "status:notice": { message: string; [key: string]: unknown };
  "status:toast": { message: string; tone?: string; [key: string]: unknown };
  "status:resolved": Record<string, unknown>;
  "status:field_spell_cast": Record<string, unknown>;
  "dialogue:sfx": { sfx: string; [key: string]: unknown };
  "dialogue:char": Record<string, unknown>;
  "dialogue:resolved": Record<string, unknown>;
  "relic_forge:sfx": { sfx: string; [key: string]: unknown };
  "relic_forge:resolved": Record<string, unknown>;
  "progression:sfx": { sfx: string; [key: string]: unknown };
  "progression:node_unlocked": Record<string, unknown>;
  "settings:resolved": Record<string, unknown>;
  "audio:sfx": { cue: string; [key: string]: unknown };
  "vfx:trigger": { effect: string; pos?: unknown; [key: string]: unknown };
  "system:command": { command: string; [key: string]: unknown };
  [customEvent: string]: unknown;
}

/**
 * Nominal branded primitive types to prevent variable transposition bugs.
 */
declare type EntityId = string & { readonly __brand: unique symbol };
declare type ItemId = string & { readonly __brand: unique symbol };
declare type QuestId = string & { readonly __brand: unique symbol };
declare type SkillId = string & { readonly __brand: unique symbol };
declare type Milliseconds = number & { readonly __brand: unique symbol };
declare type GoldAmount = number & { readonly __brand: unique symbol };

/**
 * ============================================================================
 * [RUNTIME STAGING MEMBRANE SCHEMA] - VSRP-001-RUNTIME-STAGING
 * ============================================================================
 */
declare interface RuntimeInternalStaging {
  State?: Record<string, unknown>;
  Presentation?: Record<string, unknown>;
  Interactions?: Record<string, unknown>;
  Navigation?: Record<string, unknown>;
  Stepper?: Record<string, unknown>;
  Events?: Record<string, unknown>;
}

declare interface Window {
  _RuntimeInternal?: RuntimeInternalStaging;
}
declare var _RuntimeInternal: RuntimeInternalStaging | undefined;

/**
 * ============================================================================
 * [COMBAT DOMAIN ENTITY & ACTION CONTRACTS] - VSRP-001-COMBAT-SCHEMAS
 * ============================================================================
 */
declare interface CombatEntity {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  alive: boolean;
  row?: 'FRONT' | 'BACK' | 'BOTH';
  isBoss?: boolean;
  isGuarding?: boolean;
  weakness?: string;
  weaknesses?: string[];
  resistance?: string;
  resistances?: string[];
  [key: string]: unknown;
}

declare interface ActionDescriptor {
  type: string;
  targetIndex?: number;
  targetSlot?: number;
  isAlly?: boolean;
  skill?: unknown;
  skillId?: string;
  itemId?: string;
  intentId?: string;
  actionType?: string;
  targetId?: string;
  targetTile?: { x: number; y: number };
  tab?: string;
  [key: string]: unknown;
}

declare interface CombatSimulationState {
  party: CombatEntity[];
  enemies: CombatEntity[];
  turnQueue: Array<{ entity: CombatEntity; [key: string]: unknown }>;
  activeTurnIndex: number;
  phase?: string;
  pendingSkill?: unknown;
  pendingItem?: string | null;
  selectedTab?: string;
  inventory?: Record<string, number>;
  [key: string]: unknown;
}

/**
 * ============================================================================
 * [PHOENIX SOVEREIGN GOVERNOR & RUNTIME CONTRACTS] - PGE-DSL-1 / VSRP-001
 * ============================================================================
 */
declare interface PhoenixReceiptDTO {
  receiptVersion: string;
  receiptId: string;
  proposalId: string;
  transactionId: string | null;
  timestamp: string;
  status: 'PASS' | 'REJECTED' | 'ERROR' | string;
  gate: string;
  details?: unknown;
  authority: string;
  protocols: string[];
  integrity?: string;
  [key: string]: unknown;
}

declare interface PhoenixProposalChangeDTO {
  type: 'replace_text' | 'insert_before' | 'insert_after' | 'create_file' | 'delete_file' | string;
  path: string;
  search?: string;
  content?: string;
  [key: string]: unknown;
}

declare type PhoenixChangeDTO = PhoenixProposalChangeDTO;

declare interface PhoenixFailureDTO {
  reason?: string;
  message?: string;
  name?: string;
  gate?: string;
  [key: string]: unknown;
}

declare interface PhoenixProposalDTO {
  schemaVersion?: string;
  proposalId: string;
  target?: string;
  operation?: 'MODIFY' | 'CREATE' | 'DELETE' | 'REPLACE' | string;
  intent?: string;
  requiredCapabilities?: string[];
  expectedInvariants?: string[];
  testsRequested?: string[];
  changes?: PhoenixProposalChangeDTO[];
  explanation?: string;
  [key: string]: unknown;
}

declare interface PhoenixTargetDescriptor {
  id?: string;
  tenant?: string;
  path?: string;
  writable?: boolean;
  allowedOperations?: string[];
  capabilities?: string[];
  dependencies?: string[];
  [key: string]: unknown;
}

declare interface PhoenixSpecificationRegistry {
  readonly targets: Map<string, PhoenixTargetDescriptor>;
  readonly contracts: Map<string, Function>;
  readonly invariants: Map<string, Function>;
  readonly tests: Map<string, Function>;
  registerTarget(name: string, descriptor: PhoenixTargetDescriptor | Record<string, unknown>): void;
  registerContract(name: string, fn: Function): void;
  registerInvariant(name: string, fn: Function): void;
  registerTest(name: string, fn: Function): void;
  getTarget?(name: string): PhoenixTargetDescriptor | undefined;
  listTargets?(): string[];
  getInvariant?(name: string): ((state: unknown) => boolean | string) | undefined;
  getTest?(name: string): ((state: unknown) => boolean | string) | undefined;
}

declare interface PhoenixCapabilityRegistry {
  readonly grants?: Map<string, unknown>;
  grant(subject: string, capability: string, target: string, transactionId?: string | null, expiryTick?: number): void;
  revoke?(subject: string, capability: string, target?: string): void;
  has(subject: string, capability: string, target?: string, transactionId?: string | null, currentTick?: number): boolean;
  revokeTransaction?(transactionId: string): void;
  clearTransaction?(transactionId: string): void;
  pruneExpired?(currentTick: number): void;
  tick?(currentTick: number): void;
  list?(): unknown[];
}

declare interface PhoenixJournal {
  readonly items?: PhoenixReceiptDTO[];
  append(receipt: PhoenixReceiptDTO | Record<string, unknown>): void;
  list(): PhoenixReceiptDTO[];
  latest(): PhoenixReceiptDTO | null;
  verifyIntegrity?(): boolean;
  readonly size: number;
  readonly length?: number;
}

declare interface PhoenixStorage {
  readonly namespace?: string;
  readonly hasOPFS?: boolean;
  readonly hasProject?: boolean;
  initialize?(): Promise<unknown>;
  init?(): Promise<void>;
  ready?: boolean;
  type?: string;
  write?(name: string, value: unknown): Promise<boolean>;
  read?(name: string): Promise<unknown>;
  readJournal(): Promise<PhoenixReceiptDTO[]>;
  appendJournalEntry(receipt: PhoenixReceiptDTO | Record<string, unknown>): Promise<void>;
  readFile?(filename: string): Promise<string | null>;
  writeFile?(filename: string, value: string): Promise<void>;
  getASTCache?(sourceHash: string): Promise<unknown>;
  setASTCache?(sourceHash: string, astData: unknown): Promise<void>;
  getCachedModelWeight?(modelId: string): Promise<{ sizeBytes: number; [key: string]: unknown } | null>;
  setCachedModelWeight?(modelId: string, sizeBytes: number): Promise<void>;
  selectProjectDirectory?(): Promise<unknown>;
  readProjectFile?(filePath: string): Promise<string>;
  writeProjectFile?(filePath: string, text: string): Promise<void>;
  astCache?: {
    get(sourceHash: string): unknown;
    set(sourceHash: string, astData: unknown): void;
  };
  weightCache?: {
    get(modelId: string): { sizeBytes: number; [key: string]: unknown } | null;
    set(modelId: string, sizeBytes: number): void;
  };
  requestLocalWorkspaceAccess?(): Promise<boolean>;
  readLocalWorkspaceFile?(filePath: string): Promise<string>;
  writeLocalWorkspaceFile?(filePath: string, text: string): Promise<void>;
}

declare interface PhoenixGovernorOptions {
  spec?: PhoenixSpecificationRegistry;
  capabilities?: PhoenixCapabilityRegistry;
  storage?: PhoenixStorage;
  initialState?: Record<string, unknown>;
  onReceipt?: (receipt: PhoenixReceiptDTO) => void;
}

declare interface PhoenixGovernorInstance {
  state: 'NEW' | 'READY' | 'TRANSACTION' | 'DESTROYED' | string;
  spec: PhoenixSpecificationRegistry;
  capabilities: PhoenixCapabilityRegistry;
  storage: PhoenixStorage;
  initialize(): Promise<void>;
  registerSource(filePath: string, content: string, descriptor?: Record<string, unknown>): void;
  getSource(filePath: string): string | undefined;
  checkCapability(subject: string, target: string, operation: string, transactionId?: string | null): boolean;
  validateStructural(proposal: PhoenixProposalDTO): string[];
  validateInvariants(proposal: PhoenixProposalDTO): string[];
  executeTests(proposal: PhoenixProposalDTO, context?: unknown): string[];
  submit(proposal: PhoenixProposalDTO, subject?: string): Promise<PhoenixReceiptDTO>;
  repairLoop(
    receipt: PhoenixReceiptDTO,
    originalProposal: PhoenixProposalDTO,
    subject?: string,
    llmBridge?: unknown,
    proposalParser?: (raw: string) => Promise<PhoenixProposalDTO>,
    maxAttempts?: number
  ): Promise<PhoenixReceiptDTO>;
  getReceipts(): PhoenixReceiptDTO[];
  diagnostics(): {
    state: string;
    stats: { proposals: number; accepted: number; rejected: number; errors: number };
    registeredSources: string[];
    journalLength: number;
    opfsActive: boolean;
  };
  destroy(): Promise<void>;
}

declare interface PhoenixSymbolRecord {
  name: string;
  type: string;
  file: string;
  line: number;
  col: number;
  signature: string;
  jsdoc: string;
}

declare interface PhoenixHunkDTO {
  id: number;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  delLines: string[];
  addLines: string[];
  lines: Array<{ type: string; text: string; oldLine: number | null; newLine: number | null }>;
  header: string;
}

declare interface PhoenixSovereignEngineFacade {
  VERSION: string;
  PROTOCOLS: readonly string[];
  STATES: Readonly<{ NEW: 'NEW'; READY: 'READY'; TRANSACTION: 'TRANSACTION'; DESTROYED: 'DESTROYED' }>;
  STATUS: Readonly<{ PASS: 'PASS'; REJECTED: 'REJECTED'; ERROR: 'ERROR' }>;
  GATES: Readonly<Record<string, string>>;
  SCHEMA_VERSION: string;
  RECEIPT_VERSION: string;
  REPAIR_LOOP_CAP: number;
  SpecificationRegistry: new () => PhoenixSpecificationRegistry;
  CapabilityRegistry: new () => PhoenixCapabilityRegistry;
  ReceiptLedger: new () => PhoenixJournal;
  SovereignStorage: new (namespace?: string) => PhoenixStorage;
  Governor: new (options?: PhoenixGovernorOptions) => PhoenixGovernorInstance;
  validateProposalShape: (proposal: unknown) => { valid: boolean; errors: string[] };
  lintSource: (source: string) => string[];
  stable: (value: unknown) => string;
  hash: (value: unknown) => string;
  uid: (prefix: string) => string;
  hashBuffer: (buf: Uint8Array | Uint8ClampedArray | number[] | ArrayBuffer) => string;
  computeFramebufferHash: (canvas: unknown, width?: number, height?: number) => string;
  validateFramebufferSignature: (renderFn: Function, goldenHash: string, width?: number, height?: number) => { pass: boolean; hash: string; expected: string };
  executeWithTimeout: <T>(fn: () => Promise<T> | T, timeoutMs?: number) => Promise<T>;
  extractFaultSlice: (code: string, error: Error | string) => { functionName: string; slice: string; lineNumber: number };
  PhoenixAudioSynthesizer: {
    PRESETS: Record<string, { type?: string; freq?: number; decay?: number; sweep?: number; [k: string]: unknown }>;
    playProceduralSFX(params: Record<string, unknown>, audioCtx?: AudioContext | null): Promise<boolean>;
    generateSFXCode(soundName: string, params: Record<string, unknown>): string;
  };
  PhoenixSymbolIndexer: new () => {
    indexFile(filePath: string, code: string): PhoenixSymbolRecord[];
    removeFile(filePath: string): void;
    findDefinition(symbolName: string): PhoenixSymbolRecord[];
    getCompletions(prefix: string): PhoenixSymbolRecord[];
    getAllSymbols(filePath?: string | null): PhoenixSymbolRecord[];
    clear(): void;
  };
  PhoenixFuzzySearch: {
    score(pattern: string, candidate: string): number;
    filter<T>(pattern: string, items: T[], keyGetter?: (item: T) => string): T[];
  };
  PhoenixSearchEngine: {
    findAll(text: string, query: string, options?: { matchCase?: boolean; wholeWord?: boolean; isRegex?: boolean }): Array<{ index: number; length: number; line: number; col: number; matchText: string }>;
    replaceAll(text: string, query: string, replacement: string, options?: { matchCase?: boolean; wholeWord?: boolean; isRegex?: boolean }): { text: string; count: number };
  };
  PhoenixChunkDiffEngine: {
    computeHunks(oldText: string, newText: string, contextLines?: number): PhoenixHunkDTO[];
    applyHunk(baseText: string, hunk: PhoenixHunkDTO): string;
    rejectHunk(stagedText: string, hunk: PhoenixHunkDTO): string;
  };
  PhoenixRuntimeSandbox: {
    buildRuntimeHTML(vfsMap: Map<string, string> | Record<string, string>, entryFile?: string): string;
    createTickController(config?: { onTick?: (tickState: { frameCount: number; delta: number; timestamp: number }) => void; targetFPS?: number }): {
      play(): void;
      stop(): void;
      pause(): void;
      step(count?: number): void;
      getState(): { running: boolean; paused: boolean; frameCount: number; currentFPS: number; targetFPS: number };
      setFPS(fps: number): void;
    };
  };
  PhoenixWebGLBatcher: {
    DEFAULT_VS: string;
    DEFAULT_FS: string;
    POST_CRT_FS: string;
    compileShader(gl: WebGLRenderingContext | WebGL2RenderingContext, type: number, source: string): WebGLShader | null;
    createProgram(gl: WebGLRenderingContext | WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram | null;
    createBatcher(gl: WebGLRenderingContext | WebGL2RenderingContext, maxQuads?: number): {
      begin(width: number, height: number): void;
      drawQuad(x: number, y: number, w: number, h: number, uvs?: number[] | { u0?: number; v0?: number; u1?: number; v1?: number }, color?: number[] | { r?: number; g?: number; b?: number; a?: number }): void;
      flush(): number;
      destroy(): void;
    };
    createParticleSystem(maxParticles?: number): {
      emit(x: number, y: number, count?: number, config?: { color?: number[]; speed?: number; life?: number; size?: number }): void;
      update(dt: number): void;
      render(batcher: { drawQuad(x: number, y: number, w: number, h: number, uvs?: unknown, color?: unknown): void }): void;
      getCount(): number;
      clear(): void;
    };
  };
  PhoenixCanvas2DLayerEngine: {
    createCamera(options?: { x?: number; y?: number; zoom?: number; minZoom?: number; maxZoom?: number }): {
      x: number;
      y: number;
      zoom: number;
      rotation: number;
      addTrauma(amount: number): void;
      update(dt: number): void;
      lookAt(targetX: number, targetY: number, lerp?: number): void;
      setZoom(z: number): void;
      getShakeOffset(): { offsetX: number; offsetY: number; offsetAngle: number };
      applyTransform(ctx: CanvasRenderingContext2D, viewportW: number, viewportH: number): void;
      resetTransform(ctx: CanvasRenderingContext2D): void;
      worldToScreen(worldX: number, worldY: number, viewportW: number, viewportH: number): { x: number; y: number };
      screenToWorld(screenX: number, screenY: number, viewportW: number, viewportH: number): { x: number; y: number };
    };
    renderTilemap(ctx: CanvasRenderingContext2D, grid: (number | string)[][], tileSize: number, tilePalette: Record<string | number, { color?: string; char?: string; solid?: boolean; [k: string]: unknown }>, camera: { x: number; y: number; zoom: number; [k: string]: unknown }, viewportW: number, viewportH: number): number;
    renderParallax(ctx: CanvasRenderingContext2D, colorOrCanvas: string | HTMLCanvasElement, speedRatio: number, camera: { x: number; y: number; [k: string]: unknown }, viewportW: number, viewportH: number): void;
  };
    PhoenixPseudo3DRaycaster: {
    castRays(mapGrid: (number | string)[][], player: { x: number; y: number; angle: number }, fov?: number, numRays?: number): Array<{ rayIndex: number; rayAngle: number; distance: number; hitTile: number | string; side: number; wallX: number; mapX: number; mapY: number }>;
    render3DView(ctx: CanvasRenderingContext2D, rayResults: Array<{ rayIndex: number; rayAngle: number; distance: number; hitTile: number | string; side: number; wallX: number; mapX: number; mapY: number }>, screenW: number, screenH: number, options?: { ceilingColor?: string; floorColor?: string; wallColor?: string; fogDensity?: number }): void;
    projectSprites(sprites: Array<{ x: number; y: number; [k: string]: unknown }>, player: { x: number; y: number; angle: number }, fov?: number, screenW?: number, screenH?: number): Array<{ sprite: { x: number; y: number; [k: string]: unknown }; distance: number; screenX: number; screenY: number; width: number; height: number }>;
  };
  PhoenixVoxel3DEngine: {
    createVolume(sizeX?: number, sizeY?: number, sizeZ?: number, defaultVoxel?: number): { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array };
    getVoxel(volume: { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }, x: number, y: number, z: number): number;
    setVoxel(volume: { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }, x: number, y: number, z: number, voxelType: number): boolean;
    castRay3D(volume: { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }, origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxDist?: number): { hit: boolean; distance: number; x: number; y: number; z: number; voxel: number; side: number; face: string; normal: number[] };
    generateDungeonVolume(sizeX?: number, sizeY?: number, sizeZ?: number): { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array };
    renderVoxelView(ctx: CanvasRenderingContext2D, volume: { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }, camera: { x: number; y: number; z: number; yaw?: number; pitch?: number }, screenW: number, screenH: number, options?: { fov?: number; numRays?: number; fogDensity?: number; palette?: Record<number, string> }): void;
  };
  PhoenixTerrainRaymarcher: {
    hash2(x: number, z: number): number;
    noise2(x: number, z: number): number;
    fbm(x: number, z: number, octaves?: number): number;
    sampleHeight(x: number, z: number, scale?: number, maxHeight?: number): number;
    computeNormal(x: number, z: number, eps?: number): number[];
    castTerrainRay(origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxDist?: number, stepSize?: number): { hit: boolean; distance: number; x: number; y: number; z: number; height: number; normal: number[]; material: string };
    renderTerrainView(ctx: CanvasRenderingContext2D, camera: { x: number; y: number; z: number; yaw?: number; pitch?: number }, screenW: number, screenH: number, options?: { fov?: number; numRays?: number; sunAngle?: number; fogDensity?: number }): void;
    getWebGLTerrainShaderSource(): string;
  };
  PhoenixCodeFormatter: {
    formatJS(code: string, options?: { indent?: number; tab?: boolean }): string;
    formatJSON(jsonStr: string, indent?: number): string;
  };
  PhoenixLinterSuite: {
    lintCode(source: string, filename?: string): Array<{ line: number; col: number; message: string; severity: 'error' | 'warning' }>;
  };
}

declare interface PhoenixWebLLMWorkerBridgeInstance {
  ready: boolean;
  isReady: boolean;
  start(adapterFactory: unknown, config?: Record<string, unknown>): Promise<this>;
  generate(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      top_p?: number;
      topP?: number;
      repeat_penalty?: number;
      repeatPenalty?: number;
      onToken?: (token: string) => void;
      signal?: AbortSignal;
    }
  ): Promise<string>;
  ping(): Promise<boolean>;
  destroy(): Promise<void>;
}

declare interface PhoenixMonolithExporterFacade {
  exportMonolith(options?: {
    title?: string;
    engineVersion?: string;
    sources?: Array<{ path: string; content: string }>;
    wasmKernels?: Array<{ name: string; base64: string }>;
    shaders?: Array<{ name: string; source?: string; wgsl?: string }>;
    stylesheets?: string[];
    headTags?: string[];
    receipts?: PhoenixReceiptDTO[] | unknown[];
  }): string;
  exportMonolithAsync(options?: {
    title?: string;
    engineVersion?: string;
    sources?: Array<{ path: string; content: string }>;
    wasmKernels?: Array<{ name: string; base64: string }>;
    shaders?: Array<{ name: string; source?: string; wgsl?: string }>;
    stylesheets?: string[];
    headTags?: string[];
    receipts?: PhoenixReceiptDTO[] | unknown[];
    includeOPFSJournal?: boolean;
  }): Promise<string>;
}

declare interface PhoenixAudioSynthesizerFacade {
  PRESETS: Record<string, unknown>;
  getAudioContext(): AudioContext | null;
  createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer;
  playProceduralSFX(preset: string | Record<string, unknown>, audioCtx?: AudioContext | null): void;
  generateSFXCode(presetKey: string, fnName?: string): string;
}

declare interface PhoenixSymbolIndexerFacade {
  indexSource(path: string, code: string): Array<{ name: string; kind: string; line: number; jsdoc?: string; signature?: string; section?: string }>;
  removeFile(path: string): void;
  getSymbolsForFile(path: string): Array<{ name: string; kind: string; line: number; jsdoc?: string; signature?: string; section?: string }>;
  searchSymbols(query: string, limit?: number): Array<{ name: string; kind: string; file: string; line: number; jsdoc?: string }>;
  getCompletionsAtCursor(prefix: string, limit?: number): Array<{ label: string; kind: string; insertText: string; detail: string; documentation?: string }>;
}

declare interface PhoenixFuzzySearchFacade {
  score(str: string, query: string): number;
  filter<T>(list: T[], query: string, keyExtractor?: (item: T) => string): T[];
}

declare interface PhoenixSearchEngineFacade {
  searchInFiles(files: Record<string, string>, query: string, options?: { matchCase?: boolean; matchWholeWord?: boolean; isRegex?: boolean }): Array<{ file: string; line: number; col: number; match: string; lineText: string }>;
  replaceInFiles(files: Record<string, string>, query: string, replacement: string, options?: { matchCase?: boolean; matchWholeWord?: boolean; isRegex?: boolean }): { modifiedFiles: Record<string, string>; matchCount: number };
}

declare interface PhoenixChunkDiffEngineFacade {
  computeHunks(oldText: string, newText: string, contextSize?: number): Array<{ oldStart: number; oldCount: number; newStart: number; newCount: number; lines: string[]; addLines?: string[]; delLines?: string[] }>;
  applyHunk(originalText: string, hunk: { oldStart: number; oldCount: number; newStart: number; newCount: number; lines: string[]; addLines?: string[]; delLines?: string[] }): { success: boolean; result?: string; error?: string };
  rejectHunk(originalText: string, hunk: { oldStart: number; oldCount: number; newStart: number; newCount: number; lines: string[]; addLines?: string[]; delLines?: string[] }): { success: boolean; result?: string; error?: string };
}

declare interface PhoenixRuntimeSandboxFacade {
  createSandboxedBundle(files: Record<string, string>, entryPoint?: string, options?: { title?: string; extraScripts?: string[]; extraStyles?: string[] }): string;
  createTickController(config?: { onTick?: (tickState: { frameCount: number; delta: number; timestamp: number }) => void; targetFPS?: number }): {
    play(): void;
    pause(): void;
    step(count?: number): void;
    stop(): void;
    getState(): { running: boolean; paused: boolean; frameCount: number; currentFPS: number; targetFPS: number };
    setFPS(fps: number): void;
  };
}

declare interface PhoenixWebGLBatcherFacade {
  DEFAULT_VS: string;
  DEFAULT_FS: string;
  POST_CRT_FS: string;
  compileShader(gl: WebGLRenderingContext | WebGL2RenderingContext | null, type: number, source: string): WebGLShader | null;
  createProgram(gl: WebGLRenderingContext | WebGL2RenderingContext | null, vsSource: string, fsSource: string): WebGLProgram | null;
  createParticleSystem(maxParticles?: number): {
    emit(x: number, y: number, vx?: number, vy?: number, color?: [number, number, number, number], life?: number, size?: number): void;
    update(dt: number): void;
    getParticleArray(): Float32Array;
    getParticleCount(): number;
    clear(): void;
  };
}

declare interface PhoenixCanvas2DLayerEngineFacade {
  createCamera(x?: number, y?: number, zoom?: number): {
    x: number;
    y: number;
    zoom: number;
    rotation: number;
    trauma: number;
    addTrauma(amount: number): void;
    update(dt: number): void;
    getShakeOffset(): { offsetX: number; offsetY: number; offsetAngle: number };
    applyTransform(ctx: CanvasRenderingContext2D, viewportW: number, viewportH: number): void;
    resetTransform(ctx: CanvasRenderingContext2D): void;
    worldToScreen(worldX: number, worldY: number, viewportW: number, viewportH: number): { x: number; y: number };
    screenToWorld(screenX: number, screenY: number, viewportW: number, viewportH: number): { x: number; y: number };
  };
  renderTilemap(ctx: CanvasRenderingContext2D, grid: (number | string)[][], tileSize: number, tilePalette: Record<string | number, string | { color: string }>, camera: { screenToWorld: (sx: number, sy: number, vw: number, vh: number) => { x: number; y: number } }, viewportW: number, viewportH: number): number;
  renderParallax(ctx: CanvasRenderingContext2D, colorOrCanvas: string | HTMLCanvasElement | ImageBitmap, speedRatio: number, camera: { x: number; y: number }, viewportW: number, viewportH: number): void;
}

declare interface PhoenixPseudo3DRaycasterFacade {
  castRays(mapGrid: (number | string)[][], player: { angle: number; x: number; y: number }, fov?: number, numRays?: number): Array<{ rayIndex: number; rayAngle: number; distance: number; hitTile: number | string; side: number; wallX: number; mapX: number; mapY: number }>;
  render3DView(ctx: CanvasRenderingContext2D, rayResults: Array<{ rayIndex: number; rayAngle: number; distance: number; hitTile: number | string; side: number; wallX: number; mapX: number; mapY: number }>, screenW: number, screenH: number, options?: { ceilingColor?: string; floorColor?: string; wallColor?: string; fogDensity?: number }): void;
  projectSprites(sprites: Array<{ x: number; y: number; [key: string]: unknown }>, player: { angle: number; x: number; y: number }, fov?: number, screenW?: number, screenH?: number): Array<{ sprite: { x: number; y: number; [key: string]: unknown }; distance: number; screenX: number; screenY: number; width: number; height: number }>;
}

declare interface PhoenixVoxel3DEngineFacade {
  createVolume(sizeX?: number, sizeY?: number, sizeZ?: number, defaultVoxel?: number): { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array };
  getVoxel(volume: { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }, x: number, y: number, z: number): number;
  setVoxel(volume: { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }, x: number, y: number, z: number, voxelType: number): boolean;
  castRay3D(volume: { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }, origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxDist?: number): { hit: boolean; distance: number; x: number; y: number; z: number; voxel: number; face: string; normal: number[] };
  generateDungeonVolume(sizeX?: number, sizeY?: number, sizeZ?: number): { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array };
  renderVoxelView(ctx: CanvasRenderingContext2D, volume: { sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }, camera: { x: number; y: number; z: number; yaw: number; pitch: number }, screenW: number, screenH: number, options?: { fov?: number; numRays?: number; fogDensity?: number; palette?: Record<number, string> }): void;
}

declare interface PhoenixTerrainRaymarcherFacade {
  hash2(x: number, z: number): number;
  noise2(x: number, z: number): number;
  fbm(x: number, z: number, octaves?: number): number;
  sampleHeight(x: number, z: number, scale?: number, maxHeight?: number): number;
  computeNormal(x: number, z: number, eps?: number): [number, number, number];
  castTerrainRay(origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxDist?: number, stepSize?: number): { hit: boolean; distance: number; hitPos: { x: number; y: number; z: number }; height: number; normal: [number, number, number] };
  renderTerrainView(ctx: CanvasRenderingContext2D, camera: { x: number; y: number; z: number; yaw: number; pitch: number }, screenW: number, screenH: number, options?: { fov?: number; numRays?: number; maxDist?: number; sunDir?: [number, number, number] }): void;
  getWebGLTerrainShaderSource(): string;
}

declare interface PhoenixCodeFormatterFacade {
  formatJS(code: string, options?: { indent?: number; tab?: boolean }): string;
  formatJSON(jsonStr: string, indent?: number): string;
}

declare interface PhoenixLinterSuiteFacade {
  lintCode(source: string, filename?: string): Array<{ line: number; col: number; message: string; severity: 'error' | 'warning' }>;
}

declare interface ERLResolutionTemplate {
  id: string;
  fingerprint: string;
  rule: string;
  description: string;
  searchPattern: string;
  replacePattern: string;
  verifiedReceipt?: string;
  timestamp?: string;
  useCount?: number;
}

declare interface PhoenixErrorResolutionLedgerInstance {
  computeFingerprint(diag: { rule?: string; message?: string; line?: number; fnName?: string }, lineText?: string): string;
  lookup(fingerprint: string): ERLResolutionTemplate | null;
  findMatch(diag: { rule?: string; message?: string; line?: number; fnName?: string }, lineText?: string): ERLResolutionTemplate | null;
  record(entry: ERLResolutionTemplate): void;
  exportNDJSON(): string;
  importNDJSON(ndjson: string): number;
  getAll(): ERLResolutionTemplate[];
  clear(): void;
}

declare interface PhoenixErrorResolutionLedgerFacade {
  new (): PhoenixErrorResolutionLedgerInstance;
}

declare interface PhoenixBatchRemediationPipelineFacade {
  remediateFileWithFastPath(
    source: string,
    diagnostics: Array<{ rule?: string; message?: string; line?: number; col?: number; severity?: string; fnName?: string }>,
    erl: PhoenixErrorResolutionLedgerInstance
  ): { patchedSource: string; resolvedCount: number; unresolved: Array<{ rule?: string; message?: string; line?: number; col?: number; severity?: string; fnName?: string }> };
}

declare interface PhoenixSovereignEngineFacade {
  VERSION: string;
  PROTOCOLS: readonly string[];
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
  computeFramebufferHash(target: ImageData | HTMLCanvasElement | OffscreenCanvas | ArrayLike<number> | null): string;
  validateFramebufferSignature(renderFn: Function, goldenHash: string, width?: number, height?: number): { pass: boolean; hash: string; expected: string };
  executeWithTimeout(fn: Function, timeoutMs?: number, context?: unknown): Promise<unknown>;
  extractFaultSlice(source: string, change: unknown, failure: unknown): { targetPath: string; scopeName: string; failureReason: string; faultSlice: string };
  scanAntiPatterns(source: string): Array<{ line: number; col: number; rule: string; message: string; severity: 'error' | 'warning' }>;
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
}

declare var PhoenixSovereignEngine: PhoenixSovereignEngineFacade;
declare var PhoenixGovernor: PhoenixGovernorInstance | undefined;
declare var PhoenixWebLLMBridge: PhoenixWebLLMWorkerBridgeInstance | undefined;
declare var PhoenixProposalParser: ((rawText: string) => Promise<PhoenixProposalDTO>) | undefined;
declare var PhoenixMonolithExporter: PhoenixMonolithExporterFacade;
declare var PhoenixWebLLMWorkerBridge: new () => PhoenixWebLLMWorkerBridgeInstance;
declare var phoenixWebGPUAdapterStubFactory: () => unknown;
declare var phoenixOllamaAdapterFactory: (config?: { host?: string; model?: string }) => Promise<unknown>;
declare var phoenixProposalParser: (rawText: string) => Promise<PhoenixProposalDTO>;
declare var buildIntentPrompt: (intent: string, targetFile: string, sourceCode: string) => string;
declare var buildDiagnosticDebugPrompt: (targetFile: string, sourceCode: string, diagnostics: Array<{ rule?: string; message?: string; line?: number; col?: number; severity?: string }>, activeLine?: number) => string;
declare function evaluateProposalWithSentinel(
  proposal: PhoenixProposalDTO | Record<string, unknown>,
  subject?: string,
  overrideOptions?: { skipRepairLoop?: boolean }
): Promise<PhoenixReceiptDTO>;

declare interface Window {
  PhoenixSovereignEngine?: PhoenixSovereignEngineFacade;
  PhoenixGovernor?: PhoenixGovernorInstance;
  PhoenixWebLLMBridge?: PhoenixWebLLMWorkerBridgeInstance;
  PhoenixProposalParser?: (rawText: string) => Promise<PhoenixProposalDTO>;
  PhoenixMonolithExporter?: PhoenixMonolithExporterFacade;
  PhoenixWebLLMWorkerBridge?: new () => PhoenixWebLLMWorkerBridgeInstance;
  phoenixWebGPUAdapterStubFactory?: () => unknown;
  phoenixOllamaAdapterFactory?: () => unknown;
  phoenixProposalParser?: (rawText: string) => Promise<PhoenixProposalDTO>;
  evaluateProposalWithSentinel?: typeof evaluateProposalWithSentinel;
  showDirectoryPicker?: () => Promise<unknown>;
}

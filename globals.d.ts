/* cSpell:words VSRP Vitals */
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
declare var EmberlightSynthSoundtrack: Record<string, unknown>;
declare var EmberlightSyntheticVoice: Record<string, unknown>;
declare var EmberlightAcousticSFX: Record<string, unknown>;
declare var EmberlightAudio: Record<string, unknown>;
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
  EmberlightAcousticSFX?: Record<string, unknown>;
  EmberlightAudio?: Record<string, unknown>;
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

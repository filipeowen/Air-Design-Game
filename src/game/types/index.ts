export type Brand<K, T extends string> = K & { readonly __brand: T };

export type EntityId = Brand<string, "EntityId">;

export type Region =
  | "north-america"
  | "europe"
  | "latin-america"
  | "asia-pacific"
  | "middle-east"
  | "africa"
  | "soviet-market";

export type AircraftCategory = "regional-jet" | "narrow-body" | "wide-body";

export type EmployeeRole = "scientists" | "engineers" | "factoryWorkers" | "salesStaff";

export type DevelopmentStageId =
  | "concept-design"
  | "preliminary-design"
  | "detailed-engineering"
  | "prototype-construction"
  | "ground-testing"
  | "flight-testing"
  | "certification"
  | "production-preparation"
  | "entry-into-service";

export type ProgramStatus = "active" | "paused" | "cancelled" | "certified";

export type ResearchStatus = "active" | "paused" | "completed";

export type FactorySize = "small" | "medium" | "large";

export type FactoryStatus = "building" | "active" | "closed";

export type ProductionLineStatus = "active" | "idle" | "retooling";

export type OrderStatus = "active" | "delivering" | "completed" | "cancelled";

export type EventType = "fixed-global" | "conditional-historical" | "emergent";

export type GameEmailCategory =
  | "executive"
  | "research"
  | "development"
  | "airline"
  | "operations"
  | "market"
  | "competitor"
  | "finance";

export type GameEmailPriority = "low" | "normal" | "high" | "urgent";

export type TechnologyBranch =
  | "propulsion"
  | "aerodynamics"
  | "structures"
  | "avionics"
  | "manufacturing"
  | "safety"
  | "cabin-operations";

export type ResearchEraId =
  | "first-generation-jet-age"
  | "efficiency-deregulation"
  | "digital-aviation"
  | "global-twinjet"
  | "composite-aviation"
  | "sustainable-aviation";

export type TechnologyEffectKey =
  | "fuel"
  | "weight"
  | "reliability"
  | "production"
  | "development"
  | "noise"
  | "safety"
  | "maintenance"
  | "thrust"
  | "certification"
  | "airport"
  | "airlineAppeal"
  | "crewCost"
  | "commonality"
  | "supplierRisk"
  | "complexity"
  | "cost"
  | "cabin"
  | "operations"
  | "tooling"
  | "cybersecurity"
  | "researchPenalty";

export interface GameDate {
  year: number;
  month: number;
}

export interface GameSettings {
  difficulty: "standard" | "forgiving" | "hard";
  autosave: boolean;
  playerCompanyName: string;
}

export interface EmployeeGroup {
  role: EmployeeRole;
  headcount: number;
  averageMonthlySalary: number;
  skill: number;
  morale: number;
  productivity: number;
  assignedTo?: string;
}

export interface ManufacturerStrategy {
  innovationPreference: number;
  riskTolerance: number;
  debtTolerance: number;
  priceAggressiveness: number;
  acquisitionAppetite: number;
  productionConservatism: number;
  customerRelationshipFocus: number;
  governmentContractPreference: number;
  researchIntensity: number;
  longTermPlanning: number;
  preferredSegments: AircraftCategory[];
  preferredRegions: Region[];
}

export interface StrategicAmbition {
  id: string;
  startYear: number;
  endYear: number;
  targetSegment: AircraftCategory;
  targetTechnology?: string[];
  historicalWeight: number;
  requiredConditions: string[];
}

export interface AircraftDesignInput {
  name: string;
  category: AircraftCategory;
  passengerCapacity: number;
  rangeNm: number;
  cruiseSpeedMach: number;
  fuselageLengthM: number;
  fuselageWidthM: number;
  wingAreaM2: number;
  wingSweepDeg: number;
  engineCount: number;
  engineType: "low-bypass-turbofan" | "high-bypass-turbofan" | "advanced-turbofan";
  engineThrustKn: number;
  structuralMaterial: "classic-aluminum" | "improved-aluminum" | "early-composite";
  cabinComfort: number;
  seatingDensity: number;
  reliabilityTarget: number;
  avionicsPackage: "analog" | "improved-analog" | "digital";
  landingGear: "standard" | "reinforced" | "short-field";
  airportCompatibilityTarget: number;
  technologyPackage: string[];
  commonality: number;
}

export interface AircraftDesignMetrics {
  maximumTakeoffWeightKg: number;
  emptyWeightKg: number;
  payloadKg: number;
  fuelCapacityKg: number;
  estimatedRangeNm: number;
  cruiseSpeedMach: number;
  fuelEfficiencyScore: number;
  takeoffPerformanceScore: number;
  landingPerformanceScore: number;
  airportCompatibilityScore: number;
  estimatedReliability: number;
  maintenanceCostPerFlightHour: number;
  developmentCost: number;
  developmentDurationMonths: number;
  unitProductionCost: number;
  certificationDifficulty: number;
  airlineAppeal: number;
  expectedSellingPrice: number;
  expectedProfitMargin: number;
  technologyRisk: number;
  complexity: number;
}

export interface AircraftDesign {
  id: string;
  manufacturerId: string;
  createdTurn: number;
  input: AircraftDesignInput;
  metrics: AircraftDesignMetrics;
  tradeoffs: string[];
  warnings: string[];
}

export interface AircraftProgram {
  id: string;
  manufacturerId: string;
  designId: string;
  name: string;
  category: AircraftCategory;
  stage: DevelopmentStageId;
  stageIndex: number;
  stageProgress: number;
  assignedEngineers: number;
  monthlyBudget: number;
  spentTotal: number;
  delayMonths: number;
  costOverrun: number;
  status: ProgramStatus;
  launchTurn: number;
  expectedCertificationTurn: number;
  designRevision: number;
}

export interface AircraftModel {
  id: string;
  manufacturerId: string;
  designId: string;
  programId: string;
  name: string;
  category: AircraftCategory;
  entryIntoServiceTurn: number;
  listPrice: number;
  productionCost: number;
  reliability: number;
  fuelEfficiencyScore: number;
  capacity: number;
  rangeNm: number;
  monthlySupportCost: number;
  active: boolean;
}

export interface AircraftVariant {
  id: string;
  modelId: string;
  name: string;
  commonality: number;
  capacityChange: number;
  rangeChangeNm: number;
}

export interface Technology {
  id: string;
  name: string;
  branch: TechnologyBranch;
  era: ResearchEraId;
  area: "materials" | "engines" | "aerodynamics" | "avionics" | "manufacturing" | "reliability" | "operations";
  historicalYear: number;
  researchCost: number;
  researchPointsRequired: number;
  prerequisites: string[];
  benefits: Partial<Record<TechnologyEffectKey, number>>;
  effects: string[];
  risks: string[];
  breakthroughPenaltyReduction?: number;
  mutuallyExclusiveWith?: string[];
  position: {
    x: number;
    y: number;
  };
}

export interface ResearchProject {
  id: string;
  manufacturerId: string;
  technologyId: string;
  assignedScientists: number;
  monthlyBudget: number;
  progress: number;
  status: ResearchStatus;
}

export interface Factory {
  id: string;
  manufacturerId: string;
  name: string;
  location: Region;
  country?: string;
  size: FactorySize;
  capacity: number;
  workerCount: number;
  monthlyCost: number;
  status?: FactoryStatus;
  constructionStartedTurn?: number;
  constructionTurnsRemaining?: number;
  closedTurn?: number;
  supportedCategories: AircraftCategory[];
  productionLines: ProductionLine[];
  idleSpace: number;
}

export interface ProductionLine {
  id: string;
  modelId: string;
  category: AircraftCategory;
  targetMonthlyRate: number;
  status: ProductionLineStatus;
  workersAssigned: number;
  toolingReadiness: number;
}

export interface Airline {
  id: string;
  name: string;
  region: Region;
  fleetSize: number;
  financialStrength: number;
  preferredCategory: AircraftCategory;
  priceSensitivity: number;
  reliabilityPreference: number;
  fuelEfficiencyPreference: number;
  relationshipScore: Record<string, number>;
  lastOrderTurn: number;
}

export interface AirlineRelationship {
  airlineId: string;
  manufacturerId: string;
  score: number;
  supportQuality: number;
  deliveryTrust: number;
  cancelledProgramPenalty: number;
}

export interface AircraftOrder {
  id: string;
  manufacturerId: string;
  airlineId: string;
  modelId: string;
  quantity: number;
  delivered: number;
  pricePerAircraft: number;
  orderTurn: number;
  deliveryStartTurn: number;
  depositPaid: number;
  progressPaid: number;
  remainingBalance: number;
  status: OrderStatus;
}

export interface MarketSegment {
  id: AircraftCategory;
  name: string;
  monthlyDemand: number;
  growthRate: number;
  fuelPriceIndex: number;
  pricePressure: number;
  airportConstraint: number;
}

export interface Supplier {
  id: string;
  name: string;
  category: "engines" | "avionics" | "materials" | "landing-gear" | "cabins";
  quality: number;
  capacity: number;
  reliability: number;
}

export interface SupplierContract {
  id: string;
  supplierId: string;
  manufacturerId: string;
  priceMultiplier: number;
  capacityReserved: number;
  qualityModifier: number;
  expiresTurn: number;
}

export interface Loan {
  id: string;
  lender: string;
  principal: number;
  monthlyPayment: number;
  interestRate: number;
  remainingMonths: number;
}

export interface HistoricalEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  turn: number;
  severity: number;
  effects: string[];
}

export interface RandomEvent {
  id: string;
  title: string;
  description: string;
  turn: number;
  affectedManufacturerId?: string;
  cashImpact: number;
  moraleImpact: number;
}

export interface MonthlyFinancialReport {
  manufacturerId: string;
  turn: number;
  aircraftRevenue: number;
  airlineDeposits: number;
  progressPayments: number;
  finalDeliveryPayments: number;
  salaries: number;
  researchExpenses: number;
  developmentExpenses: number;
  factoryExpenses: number;
  productionExpenses: number;
  taxes: number;
  profitOrLoss: number;
  endingCash: number;
  warnings: string[];
}

export interface MonthlyTurnReport {
  turn: number;
  date: GameDate;
  summary: string;
  financialReports: MonthlyFinancialReport[];
  researchCompleted: string[];
  developmentUpdates: string[];
  orders: string[];
  deliveries: string[];
  competitorActions: string[];
  events: HistoricalEvent[];
  warnings: string[];
}

export interface GameEmail {
  id: string;
  turn: number;
  date: GameDate;
  from: string;
  to: string;
  category: GameEmailCategory;
  priority: GameEmailPriority;
  subject: string;
  preview: string;
  body: string[];
  read: boolean;
  relatedEntityId?: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  isPlayer: boolean;
  cash: number;
  debt: number;
  employees: Record<EmployeeRole, EmployeeGroup>;
  factories: Factory[];
  aircraftDesigns: AircraftDesign[];
  aircraftPrograms: AircraftProgram[];
  aircraftModels: AircraftModel[];
  aircraftVariants: AircraftVariant[];
  researchProjects: ResearchProject[];
  unlockedTechnologyIds: string[];
  relationships: Record<string, AirlineRelationship>;
  strategy: ManufacturerStrategy;
  ambitions: StrategicAmbition[];
  marketShare: Record<AircraftCategory, number>;
  reputation: {
    reliability: number;
    safety: number;
    technology: number;
    deliveryPerformance: number;
    customerService: number;
    financialStability: number;
  };
  bankrupt: boolean;
}

export interface PlayerCompany extends Manufacturer {
  isPlayer: true;
}

export interface GameState {
  settings: GameSettings;
  date: GameDate;
  turn: number;
  originalSeed: number;
  randomState: number;
  playerCompanyId: string;
  manufacturers: Record<string, Manufacturer>;
  airlines: Record<string, Airline>;
  marketSegments: Record<AircraftCategory, MarketSegment>;
  technologies: Record<string, Technology>;
  orders: Record<string, AircraftOrder>;
  eventHistory: HistoricalEvent[];
  randomEventHistory: RandomEvent[];
  monthlyHistory: MonthlyTurnReport[];
  emails: GameEmail[];
}

export interface SaveFile {
  version: 1;
  savedAt: string;
  slotId: string;
  gameState: GameState;
}

export interface TurnResult {
  gameState: GameState;
  report: MonthlyTurnReport;
}

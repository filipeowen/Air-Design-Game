import type {
  AircraftCategory,
  AvionicsGeneration,
  CabinClass,
  EngineModelId,
  EnginePosition,
  HighLiftSystem,
  MissionProfile,
  RedundancyLevel,
  StructuralMaterialChoice,
  TestingIntensity,
  WingtipDevice
} from "@/game/types";

export interface WeightAssumptions {
  passengerWeightKg: number;
  checkedBaggagePerPassengerKg: number;
  carryOnPerPassengerKg: number;
  crewWeightKg: number;
  cabinCrewPerPassengers: number;
}

export const WEIGHT_ASSUMPTIONS: WeightAssumptions = {
  passengerWeightKg: 84,
  checkedBaggagePerPassengerKg: 18,
  carryOnPerPassengerKg: 8,
  crewWeightKg: 88,
  cabinCrewPerPassengers: 42
};

export const CABIN_CLASS_DEFAULTS: Record<CabinClass, { seatWidthM: number; seatPitchM: number; weightKg: number; comfortBonus: number }> = {
  economy: { seatWidthM: 0.46, seatPitchM: 0.79, weightKg: 13, comfortBonus: 0 },
  "premium-economy": { seatWidthM: 0.49, seatPitchM: 0.91, weightKg: 16, comfortBonus: 6 },
  business: { seatWidthM: 0.55, seatPitchM: 1.18, weightKg: 28, comfortBonus: 14 },
  first: { seatWidthM: 0.65, seatPitchM: 1.7, weightKg: 46, comfortBonus: 22 }
};

export const DESIGN_CATEGORY_LIMITS: Record<AircraftCategory, {
  fuselageLengthM: [number, number];
  externalDiameterM: [number, number];
  cabinWidthM: [number, number];
  usableCabinLengthM: [number, number];
  wingSpanM: [number, number];
  wingAreaM2: [number, number];
  fuelVolumeM3: [number, number];
  categoryCapacityLimit: number;
  floorLoadPassengerLimit: number;
  baseStructuralWeightKg: number;
  gateSpanLimitM: number;
}> = {
  "regional-jet": {
    fuselageLengthM: [21, 34],
    externalDiameterM: [2.6, 3.6],
    cabinWidthM: [2.2, 3.1],
    usableCabinLengthM: [13, 24],
    wingSpanM: [21, 31],
    wingAreaM2: [48, 92],
    fuelVolumeM3: [8, 24],
    categoryCapacityLimit: 115,
    floorLoadPassengerLimit: 124,
    baseStructuralWeightKg: 12_800,
    gateSpanLimitM: 32
  },
  "narrow-body": {
    fuselageLengthM: [30, 48],
    externalDiameterM: [3.35, 4.45],
    cabinWidthM: [3, 4.05],
    usableCabinLengthM: [21, 36],
    wingSpanM: [27, 39],
    wingAreaM2: [95, 168],
    fuelVolumeM3: [20, 52],
    categoryCapacityLimit: 240,
    floorLoadPassengerLimit: 255,
    baseStructuralWeightKg: 29_500,
    gateSpanLimitM: 40
  },
  "wide-body": {
    fuselageLengthM: [48, 78],
    externalDiameterM: [5.1, 7.2],
    cabinWidthM: [4.7, 6.65],
    usableCabinLengthM: [34, 60],
    wingSpanM: [44, 72],
    wingAreaM2: [240, 410],
    fuelVolumeM3: [72, 185],
    categoryCapacityLimit: 520,
    floorLoadPassengerLimit: 560,
    baseStructuralWeightKg: 88_000,
    gateSpanLimitM: 65
  }
};

export interface EngineOption {
  id: EngineModelId;
  manufacturer: string;
  family: string;
  availableYear: number;
  requiredTechnologyId?: string;
  maxThrustKn: number;
  dryWeightKg: number;
  fuelEfficiency: number;
  reliability: number;
  noise: number;
  maintenanceCost: number;
  purchaseCost: number;
  diameterM: number;
  maturity: number;
  suitableCategories: AircraftCategory[];
  allowedPositions: EnginePosition[];
}

export const ENGINE_OPTIONS: EngineOption[] = [
  {
    id: "jt3d-3b",
    manufacturer: "Pratt & Whitney",
    family: "JT3D-3B",
    availableYear: 1961,
    maxThrustKn: 80,
    dryWeightKg: 2_050,
    fuelEfficiency: 0.64,
    reliability: 58,
    noise: 30,
    maintenanceCost: 1_520,
    purchaseCost: 3_600_000,
    diameterM: 1.35,
    maturity: 82,
    suitableCategories: ["narrow-body", "wide-body"],
    allowedPositions: ["under-wing", "rear-fuselage"]
  },
  {
    id: "jt8d-9",
    manufacturer: "Pratt & Whitney",
    family: "JT8D-9",
    availableYear: 1964,
    maxThrustKn: 64,
    dryWeightKg: 1_650,
    fuelEfficiency: 0.72,
    reliability: 66,
    noise: 42,
    maintenanceCost: 1_180,
    purchaseCost: 2_800_000,
    diameterM: 1.25,
    maturity: 86,
    suitableCategories: ["regional-jet", "narrow-body"],
    allowedPositions: ["under-wing", "rear-fuselage"]
  },
  {
    id: "jt9d-7",
    manufacturer: "Pratt & Whitney",
    family: "JT9D-7",
    availableYear: 1970,
    requiredTechnologyId: "high-bypass-turbofans",
    maxThrustKn: 205,
    dryWeightKg: 3_860,
    fuelEfficiency: 0.88,
    reliability: 62,
    noise: 60,
    maintenanceCost: 2_450,
    purchaseCost: 8_700_000,
    diameterM: 2.4,
    maturity: 55,
    suitableCategories: ["wide-body"],
    allowedPositions: ["under-wing"]
  },
  {
    id: "cfm56-3",
    manufacturer: "CFM",
    family: "CFM56-3",
    availableYear: 1983,
    requiredTechnologyId: "second-generation-high-bypass-turbofans",
    maxThrustKn: 105,
    dryWeightKg: 1_940,
    fuelEfficiency: 0.96,
    reliability: 76,
    noise: 72,
    maintenanceCost: 1_020,
    purchaseCost: 5_800_000,
    diameterM: 1.73,
    maturity: 64,
    suitableCategories: ["regional-jet", "narrow-body"],
    allowedPositions: ["under-wing"]
  },
  {
    id: "v2500-a1",
    manufacturer: "IAE",
    family: "V2500-A1",
    availableYear: 1988,
    requiredTechnologyId: "full-authority-digital-engine-control",
    maxThrustKn: 111,
    dryWeightKg: 2_220,
    fuelEfficiency: 1,
    reliability: 78,
    noise: 76,
    maintenanceCost: 980,
    purchaseCost: 6_400_000,
    diameterM: 1.62,
    maturity: 60,
    suitableCategories: ["narrow-body"],
    allowedPositions: ["under-wing"]
  },
  {
    id: "cf6-50",
    manufacturer: "GE",
    family: "CF6-50",
    availableYear: 1971,
    requiredTechnologyId: "high-bypass-turbofans",
    maxThrustKn: 233,
    dryWeightKg: 4_100,
    fuelEfficiency: 0.91,
    reliability: 69,
    noise: 64,
    maintenanceCost: 2_200,
    purchaseCost: 9_600_000,
    diameterM: 2.34,
    maturity: 58,
    suitableCategories: ["wide-body"],
    allowedPositions: ["under-wing"]
  },
  {
    id: "rb211-524",
    manufacturer: "Rolls-Royce",
    family: "RB211-524",
    availableYear: 1977,
    requiredTechnologyId: "improved-turbine-materials",
    maxThrustKn: 222,
    dryWeightKg: 4_260,
    fuelEfficiency: 0.93,
    reliability: 70,
    noise: 67,
    maintenanceCost: 2_350,
    purchaseCost: 10_200_000,
    diameterM: 2.15,
    maturity: 61,
    suitableCategories: ["wide-body"],
    allowedPositions: ["under-wing"]
  },
  {
    id: "pw4000",
    manufacturer: "Pratt & Whitney",
    family: "PW4000",
    availableYear: 1987,
    requiredTechnologyId: "high-reliability-twinjet-engines",
    maxThrustKn: 267,
    dryWeightKg: 4_550,
    fuelEfficiency: 1.03,
    reliability: 82,
    noise: 78,
    maintenanceCost: 2_050,
    purchaseCost: 12_500_000,
    diameterM: 2.54,
    maturity: 62,
    suitableCategories: ["wide-body"],
    allowedPositions: ["under-wing"]
  },
  {
    id: "ge90-90b",
    manufacturer: "GE",
    family: "GE90-90B",
    availableYear: 1995,
    requiredTechnologyId: "advanced-turbofans",
    maxThrustKn: 400,
    dryWeightKg: 7_550,
    fuelEfficiency: 1.11,
    reliability: 84,
    noise: 82,
    maintenanceCost: 2_850,
    purchaseCost: 20_500_000,
    diameterM: 3.12,
    maturity: 50,
    suitableCategories: ["wide-body"],
    allowedPositions: ["under-wing"]
  }
];

export const MATERIAL_FACTORS: Record<StructuralMaterialChoice, {
  weight: number;
  cost: number;
  risk: number;
  repairDifficulty: number;
  requiredTechnologyId?: string;
}> = {
  "classic-aluminum": { weight: 1, cost: 1, risk: 4, repairDifficulty: 4 },
  "improved-aluminum": { weight: 0.96, cost: 1.04, risk: 7, repairDifficulty: 5, requiredTechnologyId: "improved-aluminum-alloys" },
  "aluminum-lithium": { weight: 0.91, cost: 1.16, risk: 14, repairDifficulty: 7, requiredTechnologyId: "aluminum-lithium-alloys" },
  "early-composite": { weight: 0.9, cost: 1.22, risk: 18, repairDifficulty: 9, requiredTechnologyId: "early-composite-secondary-structures" },
  "composite-secondary": { weight: 0.86, cost: 1.34, risk: 23, repairDifficulty: 11, requiredTechnologyId: "composite-tail-control-surfaces" },
  "primary-composite": { weight: 0.78, cost: 1.58, risk: 34, repairDifficulty: 16, requiredTechnologyId: "primary-composite-structures" }
};

export const HIGH_LIFT_FACTORS: Record<HighLiftSystem, { lift: number; cost: number; risk: number; requiredTechnologyId?: string }> = {
  "simple-flaps": { lift: 1, cost: 1, risk: 2 },
  "double-slotted": { lift: 1.12, cost: 1.06, risk: 6, requiredTechnologyId: "advanced-high-lift-devices" },
  "advanced-high-lift": { lift: 1.23, cost: 1.14, risk: 12, requiredTechnologyId: "advanced-high-lift-devices" }
};

export const WINGTIP_FACTORS: Record<WingtipDevice, { efficiency: number; span: number; cost: number; requiredTechnologyId?: string }> = {
  none: { efficiency: 0, span: 0, cost: 1 },
  "early-wingtip": { efficiency: 3, span: 0.6, cost: 1.03, requiredTechnologyId: "early-wingtip-devices" },
  winglet: { efficiency: 6, span: 0.9, cost: 1.06, requiredTechnologyId: "advanced-winglets" },
  "raked-tip": { efficiency: 8, span: 1.4, cost: 1.09, requiredTechnologyId: "raked-wingtips" }
};

export const SYSTEM_FACTORS: {
  avionics: Record<AvionicsGeneration, { reliability: number; cost: number; risk: number; requiredTechnologyId?: string }>;
  redundancy: Record<RedundancyLevel, { reliability: number; weight: number; cost: number }>;
  testing: Record<TestingIntensity, { reliability: number; months: number; cost: number }>;
} = {
  avionics: {
    analog: { reliability: 0, cost: 1, risk: 2 },
    "improved-analog": { reliability: 3, cost: 1.04, risk: 4, requiredTechnologyId: "improved-avionics" },
    "digital-i": { reliability: 7, cost: 1.12, risk: 12, requiredTechnologyId: "digital-avionics-i" },
    "integrated-modular": { reliability: 12, cost: 1.2, risk: 18, requiredTechnologyId: "integrated-modular-avionics" }
  },
  redundancy: {
    basic: { reliability: 0, weight: 1, cost: 1 },
    standard: { reliability: 5, weight: 1.03, cost: 1.04 },
    enhanced: { reliability: 10, weight: 1.07, cost: 1.09 },
    "triple-redundant": { reliability: 16, weight: 1.12, cost: 1.16 }
  },
  testing: {
    lean: { reliability: -4, months: 0.9, cost: 0.92 },
    standard: { reliability: 0, months: 1, cost: 1 },
    expanded: { reliability: 7, months: 1.12, cost: 1.1 },
    "airline-proving": { reliability: 12, months: 1.22, cost: 1.18 }
  }
};

export const MISSION_RECOMMENDATIONS: Record<MissionProfile, { label: string; rangeWeight: number; capacityWeight: number; comfortWeight: number; airportWeight: number }> = {
  "short-haul": { label: "Short-haul", rangeWeight: 0.5, capacityWeight: 0.8, comfortWeight: 0.7, airportWeight: 1.2 },
  "medium-haul": { label: "Medium-haul", rangeWeight: 0.85, capacityWeight: 0.9, comfortWeight: 0.85, airportWeight: 0.9 },
  "long-haul": { label: "Long-haul", rangeWeight: 1.25, capacityWeight: 0.75, comfortWeight: 1.05, airportWeight: 0.65 },
  "high-capacity": { label: "High-capacity", rangeWeight: 0.8, capacityWeight: 1.35, comfortWeight: 0.6, airportWeight: 0.7 },
  "low-operating-cost": { label: "Low operating cost", rangeWeight: 0.9, capacityWeight: 1, comfortWeight: 0.65, airportWeight: 0.95 },
  "premium-comfort": { label: "Premium comfort", rangeWeight: 0.9, capacityWeight: 0.55, comfortWeight: 1.4, airportWeight: 0.75 },
  "small-airport-operations": { label: "Small-airport operations", rangeWeight: 0.65, capacityWeight: 0.7, comfortWeight: 0.75, airportWeight: 1.45 },
  balanced: { label: "Balanced design", rangeWeight: 1, capacityWeight: 1, comfortWeight: 1, airportWeight: 1 }
};

export const FUEL_DENSITY_KG_PER_M3 = 800;

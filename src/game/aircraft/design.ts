import { AIRCRAFT_CATEGORIES } from "@/data/aircraftCategories";
import type { AircraftCategory, AircraftDesign, AircraftDesignInput, AircraftDesignMetrics } from "@/game/types";

const MATERIAL_WEIGHT_FACTOR: Record<AircraftDesignInput["structuralMaterial"], number> = {
  "classic-aluminum": 1,
  "improved-aluminum": 0.96,
  "early-composite": 0.9
};

const MATERIAL_RISK: Record<AircraftDesignInput["structuralMaterial"], number> = {
  "classic-aluminum": 5,
  "improved-aluminum": 11,
  "early-composite": 24
};

const ENGINE_FUEL_FACTOR: Record<AircraftDesignInput["engineType"], number> = {
  "low-bypass-turbofan": 1,
  "high-bypass-turbofan": 0.88,
  "advanced-turbofan": 0.78
};

const AVIONICS_RELIABILITY: Record<AircraftDesignInput["avionicsPackage"], number> = {
  analog: 0,
  "improved-analog": 4,
  digital: 8
};

export function createDefaultDesignInput(category: AircraftCategory, name = "New aircraft"): AircraftDesignInput {
  const definition = AIRCRAFT_CATEGORIES[category];
  const capacity = Math.round((definition.capacityRange[0] + definition.capacityRange[1]) / 2);
  const range = Math.round((definition.rangeRangeNm[0] + definition.rangeRangeNm[1]) / 2);

  return {
    name,
    category,
    passengerCapacity: capacity,
    rangeNm: range,
    cruiseSpeedMach: category === "regional-jet" ? 0.74 : 0.8,
    fuselageLengthM: category === "wide-body" ? 54 : category === "narrow-body" ? 36 : 26,
    fuselageWidthM: category === "wide-body" ? 5.7 : category === "narrow-body" ? 3.8 : 2.9,
    wingAreaM2: category === "wide-body" ? 310 : category === "narrow-body" ? 125 : 72,
    wingSweepDeg: category === "regional-jet" ? 22 : 28,
    engineCount: category === "wide-body" ? 3 : 2,
    engineType: "low-bypass-turbofan",
    engineThrustKn: category === "wide-body" ? 220 : category === "narrow-body" ? 92 : 55,
    structuralMaterial: "classic-aluminum",
    cabinComfort: 60,
    seatingDensity: 62,
    reliabilityTarget: 72,
    avionicsPackage: "analog",
    landingGear: "standard",
    airportCompatibilityTarget: 65,
    technologyPackage: [],
    commonality: 30
  };
}

export function calculateAircraftDesign(input: AircraftDesignInput): Omit<AircraftDesign, "id" | "manufacturerId" | "createdTurn"> {
  const category = AIRCRAFT_CATEGORIES[input.category];
  const capacityMid = (category.capacityRange[0] + category.capacityRange[1]) / 2;
  const rangeMid = (category.rangeRangeNm[0] + category.rangeRangeNm[1]) / 2;
  const capacityRatio = input.passengerCapacity / capacityMid;
  const rangeRatio = input.rangeNm / rangeMid;
  const speedPressure = Math.max(0, input.cruiseSpeedMach - 0.75) * 70;
  const sweepEfficiency = 100 - Math.abs(input.wingSweepDeg - (input.cruiseSpeedMach > 0.78 ? 30 : 24)) * 2.2;
  const wingLoading = input.passengerCapacity * 92 / Math.max(1, input.wingAreaM2);
  const materialWeightFactor = MATERIAL_WEIGHT_FACTOR[input.structuralMaterial];
  const engineFuelFactor = ENGINE_FUEL_FACTOR[input.engineType];
  const techFuelBonus =
    (input.technologyPackage.includes("early-wingtip-devices") ? 3 : 0) +
    (input.technologyPackage.includes("advanced-winglets") ? 6 : 0) +
    (input.technologyPackage.includes("raked-wingtips") ? 8 : 0) +
    (input.technologyPackage.includes("improved-aerodynamics") ? 3 : 0) +
    (input.technologyPackage.includes("supercritical-wing-research") ? 4 : 0);
  const techReliabilityBonus = input.technologyPackage.includes("reliability-growth-testing") ? 6 : 0;
  const techProductionBonus =
    (input.technologyPackage.includes("improved-assembly-line-organization") ? 2 : 0) +
    (input.technologyPackage.includes("automated-manufacturing") ? 4 : 0) +
    (input.technologyPackage.includes("lean-manufacturing") ? 4 : 0) +
    (input.technologyPackage.includes("digital-factory-integration") ? 4 : 0);
  const comfortWeight = input.cabinComfort * 55;
  const densityPenalty = Math.max(0, 60 - input.seatingDensity) * 40;
  const payloadKg = input.passengerCapacity * 105;
  const fuelCapacityKg = input.rangeNm * (input.passengerCapacity * 0.11 + input.engineCount * 8) * engineFuelFactor;
  const structuralWeight = (category.unitCostBase / 980) * capacityRatio * (0.72 + rangeRatio * 0.24);
  const emptyWeightKg = (structuralWeight + comfortWeight + densityPenalty + input.wingAreaM2 * 42 + input.engineCount * input.engineThrustKn * 12) * materialWeightFactor;
  const maximumTakeoffWeightKg = emptyWeightKg + payloadKg + fuelCapacityKg;
  const thrustToWeight = (input.engineCount * input.engineThrustKn * 101.97) / Math.max(1, maximumTakeoffWeightKg);
  const fuelEfficiencyScore = clamp(
    50 + (1 - engineFuelFactor) * 90 + techFuelBonus + (sweepEfficiency - 70) * 0.2 - rangeRatio * 6 - speedPressure * 0.5,
    5,
    98
  );
  const takeoffPerformanceScore = clamp(35 + thrustToWeight * 220 - wingLoading * 0.55 + (input.landingGear === "short-field" ? 8 : 0), 5, 98);
  const landingPerformanceScore = clamp(70 - wingLoading * 0.7 + (input.landingGear === "short-field" ? 14 : 0) + (input.landingGear === "reinforced" ? 5 : 0), 5, 98);
  const airportCompatibilityScore = clamp(
    category.airportCompatibility - (maximumTakeoffWeightKg / 100_000) * 7 + landingPerformanceScore * 0.23 + (input.airportCompatibilityTarget - 50) * 0.24,
    5,
    98
  );
  const reliabilityCost = Math.max(0, input.reliabilityTarget - 65) * 0.55;
  const estimatedReliability = clamp(
    50 + input.reliabilityTarget * 0.42 + AVIONICS_RELIABILITY[input.avionicsPackage] + techReliabilityBonus - MATERIAL_RISK[input.structuralMaterial] * 0.18,
    20,
    99
  );
  const complexity = clamp(
    category.certificationDifficulty * 0.55 +
      rangeRatio * 15 +
      capacityRatio * 9 +
      speedPressure * 0.45 +
      MATERIAL_RISK[input.structuralMaterial] +
      Math.max(0, input.engineCount - 2) * 5 +
      (input.avionicsPackage === "digital" ? 8 : 0),
    15,
    100
  );
  const developmentCost = category.developmentCostBase * (0.78 + complexity / 92) * (1 + reliabilityCost / 100) * (1 - input.commonality / 450);
  const developmentDurationMonths = Math.round(category.developmentDurationBaseMonths * (0.76 + complexity / 105) * (1 - input.commonality / 500));
  const unitProductionCost = category.unitCostBase * (0.72 + capacityRatio * 0.18 + rangeRatio * 0.18 + complexity / 260) * (1 - techProductionBonus / 100);
  const maintenanceCostPerFlightHour = unitProductionCost / 18_000 * (1.25 - estimatedReliability / 180);
  const certificationDifficulty = clamp(complexity + (input.reliabilityTarget - 70) * 0.25, 10, 100);
  const airlineAppeal = clamp(
    fuelEfficiencyScore * 0.25 +
      estimatedReliability * 0.26 +
      airportCompatibilityScore * 0.13 +
      input.cabinComfort * 0.1 +
      (100 - certificationDifficulty) * 0.08 +
      normalizeFit(input.passengerCapacity, category.capacityRange) * 0.09 +
      normalizeFit(input.rangeNm, category.rangeRangeNm) * 0.09,
    1,
    100
  );
  const expectedSellingPrice = unitProductionCost * (1.32 + airlineAppeal / 260 + (input.category === "wide-body" ? 0.12 : 0));
  const expectedProfitMargin = ((expectedSellingPrice - unitProductionCost) / expectedSellingPrice) * 100;
  const technologyRisk = clamp(MATERIAL_RISK[input.structuralMaterial] + (input.avionicsPackage === "digital" ? 9 : 0) + (input.engineType === "advanced-turbofan" ? 14 : 0) + complexity * 0.12, 2, 80);
  const estimatedRangeNm = Math.round(input.rangeNm * (0.94 + fuelEfficiencyScore / 900 - maximumTakeoffWeightKg / 12_000_000));

  const metrics: AircraftDesignMetrics = {
    maximumTakeoffWeightKg: Math.round(maximumTakeoffWeightKg),
    emptyWeightKg: Math.round(emptyWeightKg),
    payloadKg: Math.round(payloadKg),
    fuelCapacityKg: Math.round(fuelCapacityKg),
    estimatedRangeNm,
    cruiseSpeedMach: input.cruiseSpeedMach,
    fuelEfficiencyScore: round(fuelEfficiencyScore),
    takeoffPerformanceScore: round(takeoffPerformanceScore),
    landingPerformanceScore: round(landingPerformanceScore),
    airportCompatibilityScore: round(airportCompatibilityScore),
    estimatedReliability: round(estimatedReliability),
    maintenanceCostPerFlightHour: Math.round(maintenanceCostPerFlightHour),
    developmentCost: Math.round(developmentCost),
    developmentDurationMonths,
    unitProductionCost: Math.round(unitProductionCost),
    certificationDifficulty: round(certificationDifficulty),
    airlineAppeal: round(airlineAppeal),
    expectedSellingPrice: Math.round(expectedSellingPrice),
    expectedProfitMargin: round(expectedProfitMargin),
    technologyRisk: round(technologyRisk),
    complexity: round(complexity)
  };

  return {
    input,
    metrics,
    tradeoffs: describeTradeoffs(input, metrics),
    warnings: describeWarnings(input, metrics)
  };
}

function describeTradeoffs(input: AircraftDesignInput, metrics: AircraftDesignMetrics): string[] {
  const tradeoffs: string[] = [];

  if (input.rangeNm > AIRCRAFT_CATEGORIES[input.category].rangeRangeNm[1] * 0.88) {
    tradeoffs.push("Long range increases fuel capacity, structural weight, and development cost.");
  }
  if (input.passengerCapacity > AIRCRAFT_CATEGORIES[input.category].capacityRange[1] * 0.88) {
    tradeoffs.push("High seating capacity raises revenue potential but stresses airport and takeoff performance.");
  }
  if (input.engineThrustKn > 110 || input.engineCount > 2) {
    tradeoffs.push("More installed thrust improves field performance but increases fuel burn and unit cost.");
  }
  if (input.structuralMaterial !== "classic-aluminum") {
    tradeoffs.push("Advanced materials reduce weight while increasing certification and supplier risk.");
  }
  if (input.cabinComfort > 70) {
    tradeoffs.push("Comfort boosts airline appeal but adds cabin weight and lowers seating density.");
  }
  if (input.commonality > 50) {
    tradeoffs.push("Commonality lowers development cost and training burden, but limits clean-sheet optimization.");
  }
  if (metrics.technologyRisk > 35) {
    tradeoffs.push("Technology risk can create cost overruns or certification delays during development.");
  }

  return tradeoffs;
}

function describeWarnings(input: AircraftDesignInput, metrics: AircraftDesignMetrics): string[] {
  const warnings: string[] = [];

  if (metrics.takeoffPerformanceScore < 35) {
    warnings.push("Takeoff performance is weak for many airports.");
  }
  if (metrics.airportCompatibilityScore < input.airportCompatibilityTarget - 10) {
    warnings.push("The design misses the selected airport compatibility target.");
  }
  if (metrics.expectedProfitMargin < 18) {
    warnings.push("Expected unit margin is thin.");
  }
  if (metrics.certificationDifficulty > 82) {
    warnings.push("Certification difficulty is high and likely to slow testing.");
  }
  if (metrics.estimatedReliability < 65) {
    warnings.push("Reliability may be below airline expectations.");
  }

  return warnings;
}

function normalizeFit(value: number, range: [number, number]): number {
  const midpoint = (range[0] + range[1]) / 2;
  const width = range[1] - range[0];
  return clamp(100 - Math.abs(value - midpoint) / width * 140, 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

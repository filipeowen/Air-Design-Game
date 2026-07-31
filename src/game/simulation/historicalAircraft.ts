import { AIRCRAFT_CATEGORIES } from "@/data/aircraftCategories";
import {
  getHistoricalAircraftThroughYear,
  type HistoricalAircraftRecord
} from "@/data/historicalAircraft";
import { calculateAircraftDesign, createDefaultDesignInput } from "@/game/aircraft/design";
import { createAircraftProgram } from "@/game/development/process";
import { createProductionLine, getFactoryStatus } from "@/game/factories/process";
import type {
  AircraftDesign,
  AircraftModel,
  GameContentSettings,
  Manufacturer,
  NamingMode
} from "@/game/types";

const START_YEAR = 1970;

export function seedHistoricalAircraftThroughYear(
  manufacturer: Manufacturer,
  year: number,
  turn: number,
  mode: NamingMode
): void {
  if (manufacturer.isPlayer) {
    return;
  }

  for (const record of getHistoricalAircraftThroughYear(manufacturer.identityId ?? manufacturer.id, year, mode)) {
    ensureHistoricalAircraftModel(manufacturer, record, turn);
  }
}

export function releaseHistoricalAircraftForCompetitors(
  manufacturers: Record<string, Manufacturer>,
  year: number,
  turn: number,
  settings: GameContentSettings
): string[] {
  const actions: string[] = [];

  for (const manufacturer of Object.values(manufacturers)) {
    if (manufacturer.isPlayer || manufacturer.bankrupt) {
      continue;
    }

    const records = getHistoricalAircraftThroughYear(manufacturer.identityId ?? manufacturer.id, year, settings.namingMode);
    const releasedThisYear: string[] = [];

    for (const record of records) {
      const created = ensureHistoricalAircraftModel(manufacturer, record, turn);
      if (created && record.entryIntoServiceYear === year) {
        releasedThisYear.push(record.displayName);
      }
    }

    if (releasedThisYear.length > 0) {
      actions.push(`${manufacturer.name} introduced ${releasedThisYear.join(", ")}.`);
    }
  }

  return actions;
}

function ensureHistoricalAircraftModel(
  manufacturer: Manufacturer,
  record: HistoricalAircraftRecord,
  turn: number
): boolean {
  const existing = manufacturer.aircraftModels.find(
    (model) => model.identityId === record.identityId || model.name.toLowerCase() === record.displayName.toLowerCase()
  );

  if (existing) {
    existing.identityId = record.identityId;
    existing.name = record.displayName;
    existing.category = record.category;
    existing.capacity = record.capacity;
    existing.rangeNm = record.rangeNm;
    existing.active = record.productionEndYear === undefined || record.productionEndYear >= yearFromTurn(turn);
    return false;
  }

  const entryTurn = turnForYear(record.entryIntoServiceYear);
  const input = createHistoricalDesignInput(record);
  const calculated = calculateAircraftDesign(input);
  const design: AircraftDesign = {
    id: `design-${manufacturer.id}-${record.identityId}`,
    manufacturerId: manufacturer.id,
    identityId: record.identityId,
    createdTurn: Math.min(turn, entryTurn - calculated.metrics.developmentDurationMonths),
    ...calculated
  };
  const program = createAircraftProgram(manufacturer.id, design, entryTurn - design.metrics.developmentDurationMonths);
  program.status = "certified";
  program.stage = "entry-into-service";
  program.stageIndex = 8;
  program.stageProgress = 100;
  program.expectedCertificationTurn = entryTurn;

  const model: AircraftModel = {
    id: `model-${manufacturer.id}-${record.identityId}`,
    manufacturerId: manufacturer.id,
    identityId: record.identityId,
    designId: design.id,
    programId: program.id,
    name: record.displayName,
    category: record.category,
    entryIntoServiceTurn: entryTurn,
    listPrice: Math.round(design.metrics.expectedSellingPrice * historicalPriceFactor(record)),
    productionCost: Math.round(design.metrics.unitProductionCost * 0.97),
    reliability: Math.round(design.metrics.estimatedReliability),
    fuelEfficiencyScore: Math.max(30, design.metrics.fuelEfficiencyScore - ageFuelPenalty(record.entryIntoServiceYear)),
    capacity: record.capacity,
    rangeNm: record.rangeNm,
    monthlySupportCost: Math.round(design.metrics.maintenanceCostPerFlightHour * 24),
    active: record.productionEndYear === undefined || record.productionEndYear >= yearFromTurn(turn)
  };

  manufacturer.aircraftDesigns.push(design);
  manufacturer.aircraftPrograms.push(program);
  manufacturer.aircraftModels.push(model);
  openHistoricalProductionLine(manufacturer, model, record);
  return true;
}

function createHistoricalDesignInput(record: HistoricalAircraftRecord) {
  const input = createDefaultDesignInput(record.category, record.displayName);
  const category = AIRCRAFT_CATEGORIES[record.category];

  input.passengerCapacity = clamp(record.capacity, category.capacityRange[0], category.capacityRange[1]);
  input.rangeNm = clamp(record.rangeNm, category.rangeRangeNm[0], category.rangeRangeNm[1]);
  input.cruiseSpeedMach = record.cruiseSpeedMach ?? (record.category === "regional-jet" ? 0.74 : 0.8);
  input.engineCount = record.engineCount ?? (record.category === "wide-body" ? 2 : 2);
  input.engineType = record.engineType ?? (record.entryIntoServiceYear >= 1988 ? "advanced-turbofan" : "high-bypass-turbofan");
  input.engineThrustKn = record.engineThrustKn ?? input.engineThrustKn;
  input.structuralMaterial = record.structuralMaterial ?? (record.entryIntoServiceYear >= 2008 ? "early-composite" : "classic-aluminum");
  input.avionicsPackage = record.avionicsPackage ?? (record.entryIntoServiceYear >= 1988 ? "digital" : "analog");
  input.cabinComfort = record.cabinComfort ?? input.cabinComfort;
  input.seatingDensity = record.seatingDensity ?? input.seatingDensity;
  input.reliabilityTarget = record.reliabilityTarget ?? input.reliabilityTarget;
  input.commonality = record.commonality ?? 70;
  input.technologyPackage = [];
  input.intendedEntryIntoServiceYear = record.entryIntoServiceYear;

  return input;
}

function openHistoricalProductionLine(
  manufacturer: Manufacturer,
  model: AircraftModel,
  record: HistoricalAircraftRecord
): void {
  if (!model.active) {
    return;
  }

  const hasLine = manufacturer.factories.some((factory) => factory.productionLines.some((line) => line.modelId === model.id));
  if (hasLine) {
    return;
  }

  const factory = manufacturer.factories.find(
    (candidate) => getFactoryStatus(candidate) === "active" && candidate.supportedCategories.includes(model.category)
  );
  if (!factory) {
    return;
  }

  const defaultRate = model.category === "wide-body" ? 1 : model.category === "narrow-body" ? 3 : 4;
  factory.productionLines.push(createProductionLine(model, record.initialProductionRate ?? defaultRate));
}

function turnForYear(year: number): number {
  return (year - START_YEAR) * 12;
}

function yearFromTurn(turn: number): number {
  return START_YEAR + Math.floor(turn / 12);
}

function ageFuelPenalty(entryIntoServiceYear: number): number {
  return Math.max(0, Math.floor((START_YEAR - entryIntoServiceYear) / 4));
}

function historicalPriceFactor(record: HistoricalAircraftRecord): number {
  if (record.entryIntoServiceYear < START_YEAR) {
    return 0.9;
  }
  if (record.category === "wide-body") {
    return 1.04;
  }
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

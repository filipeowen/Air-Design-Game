import type { AircraftCategory } from "@/game/types";

export interface AircraftCategoryDefinition {
  id: AircraftCategory;
  label: string;
  capacityRange: [number, number];
  rangeRangeNm: [number, number];
  developmentCostBase: number;
  developmentDurationBaseMonths: number;
  unitCostBase: number;
  factoryCapacityRequired: number;
  certificationDifficulty: number;
  airportCompatibility: number;
  baseDemand: number;
}

export const AIRCRAFT_CATEGORIES: Record<AircraftCategory, AircraftCategoryDefinition> = {
  "regional-jet": {
    id: "regional-jet",
    label: "Regional jet",
    capacityRange: [45, 95],
    rangeRangeNm: [700, 1800],
    developmentCostBase: 650_000_000,
    developmentDurationBaseMonths: 34,
    unitCostBase: 14_000_000,
    factoryCapacityRequired: 1,
    certificationDifficulty: 38,
    airportCompatibility: 84,
    baseDemand: 18
  },
  "narrow-body": {
    id: "narrow-body",
    label: "Narrow-body",
    capacityRange: [110, 210],
    rangeRangeNm: [1800, 4200],
    developmentCostBase: 1_600_000_000,
    developmentDurationBaseMonths: 48,
    unitCostBase: 31_000_000,
    factoryCapacityRequired: 2,
    certificationDifficulty: 55,
    airportCompatibility: 68,
    baseDemand: 28
  },
  "wide-body": {
    id: "wide-body",
    label: "Wide-body",
    capacityRange: [230, 420],
    rangeRangeNm: [4200, 8500],
    developmentCostBase: 3_900_000_000,
    developmentDurationBaseMonths: 72,
    unitCostBase: 82_000_000,
    factoryCapacityRequired: 4,
    certificationDifficulty: 74,
    airportCompatibility: 42,
    baseDemand: 10
  }
};

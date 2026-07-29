import { createEmployeeGroup } from "@/game/employees/defaults";
import { GAME_CONTENT_SETTINGS } from "@/data/contentSettings";
import { getManufacturerIdentity } from "@/data/identities";
import type { AircraftCategory, Factory, Manufacturer, ManufacturerStrategy, NamingMode, Region } from "@/game/types";

function strategy(overrides: Partial<ManufacturerStrategy>): ManufacturerStrategy {
  return {
    innovationPreference: 55,
    riskTolerance: 50,
    debtTolerance: 50,
    priceAggressiveness: 50,
    acquisitionAppetite: 20,
    productionConservatism: 50,
    customerRelationshipFocus: 50,
    governmentContractPreference: 40,
    researchIntensity: 50,
    longTermPlanning: 55,
    preferredSegments: ["narrow-body"],
    preferredRegions: ["north-america"],
    ...overrides
  };
}

function factory(id: string, manufacturerId: string, location: Region, size: "small" | "medium" | "large", capacity: number): Factory {
  const supportedCategories: AircraftCategory[] =
    size === "small"
      ? ["regional-jet"]
      : size === "medium"
        ? ["regional-jet", "narrow-body"]
        : ["regional-jet", "narrow-body", "wide-body"];

  return {
    id,
    manufacturerId,
    name: id
      .split("-")
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" "),
    location,
    country: defaultFactoryCountry(location),
    size,
    capacity,
    workerCount: capacity * 160,
    monthlyCost: capacity * 2_700_000,
    status: "active",
    constructionStartedTurn: 0,
    constructionTurnsRemaining: 0,
    supportedCategories,
    productionLines: [],
    idleSpace: capacity
  };
}

function defaultFactoryCountry(location: Region): string {
  if (location === "europe") {
    return "France";
  }
  if (location === "latin-america") {
    return "Brazil";
  }
  if (location === "asia-pacific") {
    return "Japan";
  }
  if (location === "middle-east") {
    return "United Arab Emirates";
  }
  if (location === "africa") {
    return "South Africa";
  }
  if (location === "soviet-market") {
    return "Soviet Union";
  }
  return "United States";
}

export function createBaseManufacturer(
  id: string,
  cash: number,
  preferredRegions: Region[],
  strategyOverrides: Partial<ManufacturerStrategy>,
  mode: NamingMode = GAME_CONTENT_SETTINGS.namingMode
): Manufacturer {
  const identity = getManufacturerIdentity(id, mode);
  return {
    id,
    identityId: identity.id,
    name: identity.displayName,
    isPlayer: false,
    cash,
    debt: cash * 0.25,
    employees: {
      scientists: createEmployeeGroup("scientists", 800, 63),
      engineers: createEmployeeGroup("engineers", 3_200, 66),
      factoryWorkers: createEmployeeGroup("factoryWorkers", 6_500, 62),
      salesStaff: createEmployeeGroup("salesStaff", 580, 60)
    },
    factories: [factory(`${id}-works`, id, preferredRegions[0] ?? "north-america", "medium", 14)],
    aircraftDesigns: [],
    aircraftPrograms: [],
    aircraftModels: [],
    aircraftVariants: [],
    researchProjects: [],
    unlockedTechnologyIds: ["improved-aluminum-alloys", "high-bypass-turbofans"],
    relationships: {},
    strategy: strategy({ preferredRegions, ...strategyOverrides }),
    ambitions: [],
    marketShare: {
      "regional-jet": 0,
      "narrow-body": 0,
      "wide-body": 0
    },
    reputation: {
      reliability: 62,
      safety: 68,
      technology: 55,
      deliveryPerformance: 62,
      customerService: 58,
      financialStability: 65
    },
    bankrupt: false
  };
}

export function createStartingCompetitors(mode: NamingMode = GAME_CONTENT_SETTINGS.namingMode): Manufacturer[] {
  return [
    createBaseManufacturer("pacific-aeroworks", 8_800_000_000, ["north-america"], {
      innovationPreference: 62,
      riskTolerance: 55,
      priceAggressiveness: 46,
      researchIntensity: 58,
      preferredSegments: ["narrow-body", "wide-body"]
    }, mode),
    createBaseManufacturer("dominion-aircraft", 5_200_000_000, ["north-america"], {
      riskTolerance: 48,
      customerRelationshipFocus: 67,
      productionConservatism: 58,
      preferredSegments: ["regional-jet", "narrow-body"]
    }, mode),
    createBaseManufacturer("meridian-aviation", 3_900_000_000, ["europe"], {
      innovationPreference: 70,
      riskTolerance: 43,
      governmentContractPreference: 70,
      preferredSegments: ["wide-body"]
    }, mode),
    createBaseManufacturer("euro-aerospace-consortium", 4_800_000_000, ["europe"], {
      innovationPreference: 64,
      debtTolerance: 62,
      customerRelationshipFocus: 62,
      preferredSegments: ["narrow-body", "wide-body"],
      preferredRegions: ["europe", "middle-east"]
    }, mode),
    createBaseManufacturer("noord-aviation", 1_600_000_000, ["europe"], {
      priceAggressiveness: 58,
      productionConservatism: 66,
      preferredSegments: ["regional-jet"]
    }, mode),
    createBaseManufacturer("atlantico-aeronautics", 900_000_000, ["latin-america"], {
      innovationPreference: 48,
      priceAggressiveness: 66,
      riskTolerance: 45,
      preferredSegments: ["regional-jet"]
    }, mode),
    createBaseManufacturer("sunrise-heavy", 2_400_000_000, ["soviet-market"], {
      innovationPreference: 60,
      governmentContractPreference: 64,
      longTermPlanning: 72,
      preferredSegments: ["regional-jet", "narrow-body"]
    }, mode)
  ];
}

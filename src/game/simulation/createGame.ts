import { createStartingAirlines } from "@/data/airlines";
import { GAME_CONTENT_SETTINGS } from "@/data/contentSettings";
import { getAircraftNameSelection, getDefaultPlayerCompanyName, getManufacturerIdentity } from "@/data/identities";
import { createStartingCompetitors } from "@/data/manufacturers";
import { STARTING_MARKETS } from "@/data/market";
import { TECHNOLOGIES } from "@/data/technologies";
import { calculateAircraftDesign, createDefaultDesignInput } from "@/game/aircraft/design";
import { createAircraftProgram } from "@/game/development/process";
import { createOpeningEmails } from "@/game/email/messages";
import { createEmployeeGroup } from "@/game/employees/defaults";
import { createProductionLine } from "@/game/factories/process";
import type {
  AircraftCategory,
  AircraftDesign,
  AircraftModel,
  Airline,
  AirlineRelationship,
  Factory,
  GameContentSettings,
  GameSettings,
  GameState,
  Manufacturer,
  NamingMode,
  Technology
} from "@/game/types";
import { createRandomSource, normalizeSeed } from "@/game/utils/prng";

export interface NewGameOptions {
  companyName?: string;
  contentSettings?: Partial<GameContentSettings>;
  seed?: number;
}

export function createNewGame(options: NewGameOptions = {}): GameState {
  const contentSettings: GameContentSettings = {
    ...GAME_CONTENT_SETTINGS,
    ...options.contentSettings
  };
  const seed = normalizeSeed(options.seed ?? Math.floor(Date.now() % 2_147_483_647));
  const rng = createRandomSource(seed);
  const technologies = Object.fromEntries(TECHNOLOGIES.map((technology) => [technology.id, technology])) as Record<string, Technology>;
  const airlines = Object.fromEntries(
    createStartingAirlines(contentSettings.namingMode).map((airline) => [airline.id, structuredClone(airline)])
  ) as Record<string, Airline>;
  const player = createPlayerManufacturer(options.companyName ?? getDefaultPlayerCompanyName(contentSettings.namingMode), contentSettings.namingMode);
  const competitors = createStartingCompetitors(contentSettings.namingMode);

  for (const competitor of competitors) {
    addLegacyModel(competitor, "narrow-body", 0, 1970, contentSettings.namingMode);
    if (competitor.strategy.preferredSegments.includes("regional-jet")) {
      addLegacyModel(competitor, "regional-jet", 0, 1970, contentSettings.namingMode);
    }
    if (competitor.strategy.preferredSegments.includes("wide-body")) {
      addLegacyModel(competitor, "wide-body", 0, 1970, contentSettings.namingMode);
    }
  }

  const manufacturers = Object.fromEntries([player, ...competitors].map((manufacturer) => [manufacturer.id, manufacturer])) as Record<string, Manufacturer>;
  seedRelationships(manufacturers, airlines, rng);

  const state: GameState = {
    contentSettings,
    settings: {
      difficulty: "standard",
      autosave: true,
      playerCompanyName: player.name
    },
    date: { year: 1970, month: 1 },
    turn: 0,
    originalSeed: seed,
    randomState: rng.state,
    playerCompanyId: player.id,
    manufacturers,
    airlines,
    marketSegments: structuredClone(STARTING_MARKETS),
    technologies,
    orders: {},
    eventHistory: [],
    randomEventHistory: [],
    monthlyHistory: [],
    emails: []
  };
  state.emails = createOpeningEmails(state);
  return state;
}

function createPlayerManufacturer(companyName: string, mode: NamingMode): Manufacturer {
  const identity = getManufacturerIdentity("player", mode);
  return {
    id: "player",
    identityId: identity.id,
    name: companyName,
    isPlayer: true,
    cash: 2_800_000_000,
    debt: 0,
    employees: {
      scientists: createEmployeeGroup("scientists", 220, 58),
      engineers: createEmployeeGroup("engineers", 820, 60),
      factoryWorkers: createEmployeeGroup("factoryWorkers", 1_300, 58),
      salesStaff: createEmployeeGroup("salesStaff", 120, 55)
    },
    factories: [createPlayerFactory()],
    aircraftDesigns: [],
    aircraftPrograms: [],
    aircraftModels: [],
    aircraftVariants: [],
    researchProjects: [],
    unlockedTechnologyIds: ["improved-aluminum-alloys"],
    relationships: {},
    strategy: {
      innovationPreference: 56,
      riskTolerance: 52,
      debtTolerance: 40,
      priceAggressiveness: 48,
      acquisitionAppetite: 10,
      productionConservatism: 54,
      customerRelationshipFocus: 58,
      governmentContractPreference: 30,
      researchIntensity: 52,
      longTermPlanning: 65,
      preferredSegments: ["regional-jet", "narrow-body"],
      preferredRegions: ["north-america"]
    },
    ambitions: [],
    marketShare: {
      "regional-jet": 0,
      "narrow-body": 0,
      "wide-body": 0
    },
    reputation: {
      reliability: 56,
      safety: 62,
      technology: 45,
      deliveryPerformance: 50,
      customerService: 54,
      financialStability: 70
    },
    bankrupt: false
  };
}

function createPlayerFactory(): Factory {
  return {
    id: "player-renton-works",
    manufacturerId: "player",
    name: "Lakeview Final Assembly",
    location: "north-america",
    country: "United States",
    size: "medium",
    capacity: 8,
    workerCount: 1_300,
    monthlyCost: 15_000_000,
    status: "active",
    constructionStartedTurn: 0,
    constructionTurnsRemaining: 0,
    supportedCategories: ["regional-jet", "narrow-body"],
    productionLines: [],
    idleSpace: 8
  };
}

function addLegacyModel(manufacturer: Manufacturer, category: AircraftCategory, turn: number, year: number, mode: NamingMode): void {
  const nameSelection = getAircraftNameSelection(
    manufacturer.id,
    category,
    year,
    mode,
    manufacturer.aircraftModels.map((model) => model.name)
  );
  const input = createDefaultDesignInput(category, nameSelection.displayName);
  input.structuralMaterial = "classic-aluminum";
  input.avionicsPackage = "analog";
  input.engineType = "high-bypass-turbofan";
  input.commonality = 70;
  input.reliabilityTarget = 66;
  input.technologyPackage = manufacturer.unlockedTechnologyIds;
  input.passengerCapacity = Math.round(input.passengerCapacity * (category === "wide-body" ? 0.95 : 0.92));
  input.rangeNm = Math.round(input.rangeNm * (category === "regional-jet" ? 0.9 : 0.86));

  const calculated = calculateAircraftDesign(input);
  const design: AircraftDesign = {
    id: `design-${manufacturer.id}-${category}-legacy`,
    manufacturerId: manufacturer.id,
    identityId: nameSelection.identityId,
    createdTurn: turn,
    ...calculated
  };
  const program = createAircraftProgram(manufacturer.id, design, -design.metrics.developmentDurationMonths);
  program.status = "certified";
  program.stage = "entry-into-service";
  program.stageIndex = 8;
  program.stageProgress = 100;

  const model: AircraftModel = {
    id: `model-${manufacturer.id}-${category}-legacy`,
    manufacturerId: manufacturer.id,
    identityId: nameSelection.identityId,
    designId: design.id,
    programId: program.id,
    name: input.name,
    category,
    entryIntoServiceTurn: -rnglessAge(category),
    listPrice: Math.round(design.metrics.expectedSellingPrice * 0.92),
    productionCost: Math.round(design.metrics.unitProductionCost * 0.96),
    reliability: Math.round(design.metrics.estimatedReliability),
    fuelEfficiencyScore: Math.max(35, design.metrics.fuelEfficiencyScore - 8),
    capacity: input.passengerCapacity,
    rangeNm: design.metrics.estimatedRangeNm,
    monthlySupportCost: design.metrics.maintenanceCostPerFlightHour * 24,
    active: true
  };

  manufacturer.aircraftDesigns.push(design);
  manufacturer.aircraftPrograms.push(program);
  manufacturer.aircraftModels.push(model);
  const factory = manufacturer.factories.find((candidate) => candidate.supportedCategories.includes(category));
  if (factory) {
    const rate = category === "wide-body" ? 1 : category === "narrow-body" ? 3 : 4;
    factory.productionLines.push(createProductionLine(model, rate));
  }
}

function seedRelationships(
  manufacturers: Record<string, Manufacturer>,
  airlines: Record<string, Airline>,
  rng: ReturnType<typeof createRandomSource>
): void {
  for (const manufacturer of Object.values(manufacturers)) {
    for (const airline of Object.values(airlines)) {
      const regionalBonus = manufacturer.strategy.preferredRegions.includes(airline.region) ? 12 : 0;
      const playerPenalty = manufacturer.isPlayer ? -8 : 0;
      const score = Math.round(44 + regionalBonus + playerPenalty + rng.nextBetween(-8, 8));
      const relationship: AirlineRelationship = {
        airlineId: airline.id,
        manufacturerId: manufacturer.id,
        score,
        supportQuality: score,
        deliveryTrust: Math.max(30, score - 4),
        cancelledProgramPenalty: 0
      };
      manufacturer.relationships[airline.id] = relationship;
      airline.relationshipScore[manufacturer.id] = score;
    }
  }
}

function rnglessAge(category: AircraftCategory): number {
  if (category === "wide-body") {
    return 18;
  }
  if (category === "narrow-body") {
    return 36;
  }
  return 24;
}

export function getPlayerCompany(state: GameState): Manufacturer {
  const player = state.manufacturers[state.playerCompanyId];
  if (!player) {
    throw new Error("Player company is missing from game state.");
  }
  return player;
}

export function updateSettings(state: GameState, settings: Partial<GameSettings>): GameState {
  return {
    ...state,
    settings: {
      ...state.settings,
      ...settings
    }
  };
}

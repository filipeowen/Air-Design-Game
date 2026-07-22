import { createDefaultDesignInput } from "@/game/aircraft/design";
import { launchPlayerAircraftProgram, startPlayerResearch } from "@/game/simulation/actions";
import { createNewGame } from "@/game/simulation/createGame";
import { processMonthlyTurn } from "@/game/simulation/processMonthlyTurn";
import type { AircraftCategory, GameState } from "@/game/types";

export interface HeadlessReport {
  campaigns: number;
  months: number;
  manufacturerSurvivalRate: number;
  averageMarketShare: Record<AircraftCategory, number>;
  averageAircraftProgramsLaunched: number;
  averageAircraftProgramsCancelled: number;
  averageMergers: number;
  averageBankruptcies: number;
  averageDelays: number;
  averageProfitability: number;
  averageActiveManufacturers: number;
  historicalOutcomeFrequency: Record<string, number>;
  airlineOrderDistribution: Record<string, number>;
  researchProgression: Record<string, number>;
  technologyAdoption: Record<string, number>;
}

export function runHeadlessCampaigns(campaigns: number, months: number, seed = 1970): HeadlessReport {
  const aggregate = createEmptyAggregate();

  for (let index = 0; index < campaigns; index += 1) {
    let state = createNewGame({ companyName: `Headless Airframes ${index + 1}`, seed: seed + index * 997 });
    state = bootstrapPlayer(state);

    for (let month = 0; month < months; month += 1) {
      state = processMonthlyTurn(state).gameState;
    }

    collectCampaign(state, aggregate);
  }

  return {
    campaigns,
    months,
    manufacturerSurvivalRate: aggregate.survivingManufacturers / Math.max(1, aggregate.totalManufacturers),
    averageMarketShare: divideCategoryRecord(aggregate.playerMarketShare, campaigns),
    averageAircraftProgramsLaunched: aggregate.programsLaunched / campaigns,
    averageAircraftProgramsCancelled: aggregate.programsCancelled / campaigns,
    averageMergers: 0,
    averageBankruptcies: aggregate.bankruptcies / campaigns,
    averageDelays: aggregate.delays / campaigns,
    averageProfitability: aggregate.playerProfitability / campaigns,
    averageActiveManufacturers: aggregate.activeManufacturers / campaigns,
    historicalOutcomeFrequency: divideRecord(aggregate.historicalOutcomes, campaigns),
    airlineOrderDistribution: aggregate.airlineOrders,
    researchProgression: aggregate.researchProgression,
    technologyAdoption: aggregate.technologyAdoption
  };
}

interface Aggregate {
  totalManufacturers: number;
  survivingManufacturers: number;
  playerMarketShare: Record<AircraftCategory, number>;
  programsLaunched: number;
  programsCancelled: number;
  bankruptcies: number;
  delays: number;
  playerProfitability: number;
  activeManufacturers: number;
  historicalOutcomes: Record<string, number>;
  airlineOrders: Record<string, number>;
  researchProgression: Record<string, number>;
  technologyAdoption: Record<string, number>;
}

function createEmptyAggregate(): Aggregate {
  return {
    totalManufacturers: 0,
    survivingManufacturers: 0,
    playerMarketShare: {
      "regional-jet": 0,
      "narrow-body": 0,
      "wide-body": 0
    },
    programsLaunched: 0,
    programsCancelled: 0,
    bankruptcies: 0,
    delays: 0,
    playerProfitability: 0,
    activeManufacturers: 0,
    historicalOutcomes: {},
    airlineOrders: {},
    researchProgression: {},
    technologyAdoption: {}
  };
}

function bootstrapPlayer(state: GameState): GameState {
  let next = startPlayerResearch(state, "high-bypass-turbofans", 180, 7_000_000);
  next = launchPlayerAircraftProgram(next, createDefaultDesignInput("regional-jet", "Pioneer RJ-70"));
  return next;
}

function collectCampaign(state: GameState, aggregate: Aggregate): void {
  const manufacturers = Object.values(state.manufacturers);
  const player = state.manufacturers[state.playerCompanyId];
  aggregate.totalManufacturers += manufacturers.length;
  aggregate.survivingManufacturers += manufacturers.filter((manufacturer) => !manufacturer.bankrupt).length;
  aggregate.activeManufacturers += manufacturers.filter((manufacturer) => !manufacturer.bankrupt).length;
  aggregate.bankruptcies += manufacturers.filter((manufacturer) => manufacturer.bankrupt).length;
  aggregate.programsLaunched += manufacturers.reduce((sum, manufacturer) => sum + manufacturer.aircraftPrograms.length, 0);
  aggregate.programsCancelled += manufacturers.reduce(
    (sum, manufacturer) => sum + manufacturer.aircraftPrograms.filter((program) => program.status === "cancelled").length,
    0
  );
  aggregate.delays += manufacturers.reduce(
    (sum, manufacturer) => sum + manufacturer.aircraftPrograms.reduce((programSum, program) => programSum + program.delayMonths, 0),
    0
  );
  if (player) {
    aggregate.playerMarketShare["regional-jet"] += player.marketShare["regional-jet"];
    aggregate.playerMarketShare["narrow-body"] += player.marketShare["narrow-body"];
    aggregate.playerMarketShare["wide-body"] += player.marketShare["wide-body"];
    aggregate.playerProfitability += player.cash - 2_800_000_000;
  }

  for (const event of state.eventHistory) {
    aggregate.historicalOutcomes[event.title] = (aggregate.historicalOutcomes[event.title] ?? 0) + 1;
  }
  for (const order of Object.values(state.orders)) {
    aggregate.airlineOrders[order.airlineId] = (aggregate.airlineOrders[order.airlineId] ?? 0) + order.quantity;
  }
  for (const manufacturer of manufacturers) {
    for (const project of manufacturer.researchProjects) {
      aggregate.researchProgression[project.technologyId] = Math.max(
        aggregate.researchProgression[project.technologyId] ?? 0,
        project.progress
      );
    }
    for (const technologyId of manufacturer.unlockedTechnologyIds) {
      aggregate.technologyAdoption[technologyId] = (aggregate.technologyAdoption[technologyId] ?? 0) + 1;
    }
  }
}

function divideCategoryRecord(record: Record<AircraftCategory, number>, divisor: number): Record<AircraftCategory, number> {
  return {
    "regional-jet": round(record["regional-jet"] / divisor),
    "narrow-body": round(record["narrow-body"] / divisor),
    "wide-body": round(record["wide-body"] / divisor)
  };
}

function divideRecord(record: Record<string, number>, divisor: number): Record<string, number> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, round(value / divisor)]));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

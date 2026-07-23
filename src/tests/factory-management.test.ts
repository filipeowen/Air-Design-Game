import { describe, expect, it } from "vitest";
import { AIRCRAFT_CATEGORIES } from "@/data/aircraftCategories";
import { calculateAircraftDesign, createDefaultDesignInput } from "@/game/aircraft/design";
import { getFactoryStatus } from "@/game/factories/process";
import { assignPlayerProductionLine, buildPlayerFactory, closePlayerFactory } from "@/game/simulation/actions";
import { createNewGame } from "@/game/simulation/createGame";
import { processMonthlyTurn } from "@/game/simulation/processMonthlyTurn";
import type { AircraftCategory, AircraftModel, GameState } from "@/game/types";

describe("factory management", () => {
  it("builds new factories over time in the selected country", () => {
    let state = createNewGame({ seed: 910 });
    state = buildPlayerFactory(state, "narrow-body", "France");

    const buildingFactory = state.manufacturers[state.playerCompanyId]!.factories.at(-1)!;
    expect(getFactoryStatus(buildingFactory)).toBe("building");
    expect(buildingFactory.country).toBe("France");
    expect(buildingFactory.location).toBe("europe");
    expect(buildingFactory.constructionTurnsRemaining).toBe(18);
    expect(buildingFactory.idleSpace).toBe(0);

    for (let month = 0; month < 18; month += 1) {
      state = processMonthlyTurn(state).gameState;
    }

    const completedFactory = state.manufacturers[state.playerCompanyId]!.factories.find((factory) => factory.id === buildingFactory.id)!;
    expect(getFactoryStatus(completedFactory)).toBe("active");
    expect(completedFactory.constructionTurnsRemaining).toBe(0);
    expect(completedFactory.idleSpace).toBe(completedFactory.capacity);
  });

  it("lets the player close a factory and removes its operating cost", () => {
    const state = closePlayerFactory(createNewGame({ seed: 112 }), "player-renton-works");
    const result = processMonthlyTurn(state);
    const player = result.gameState.manufacturers[result.gameState.playerCompanyId]!;
    const closedFactory = player.factories.find((factory) => factory.id === "player-renton-works")!;
    const financial = result.report.financialReports.find((report) => report.manufacturerId === player.id)!;

    expect(getFactoryStatus(closedFactory)).toBe("closed");
    expect(closedFactory.idleSpace).toBe(0);
    expect(financial.factoryExpenses).toBe(0);
  });

  it("assigns a certified model to a specific compatible factory", () => {
    let state = createNewGame({ seed: 224 });
    const player = state.manufacturers[state.playerCompanyId]!;
    const regionalModel = createCertifiedModel(state, "regional-jet", "model-player-rj");
    const wideBodyModel = createCertifiedModel(state, "wide-body", "model-player-wb");
    player.aircraftModels.push(regionalModel, wideBodyModel);

    state = assignPlayerProductionLine(state, "player-renton-works", regionalModel.id);
    let factory = state.manufacturers[state.playerCompanyId]!.factories.find((candidate) => candidate.id === "player-renton-works")!;
    expect(factory.productionLines).toHaveLength(1);
    expect(factory.productionLines[0]!.modelId).toBe(regionalModel.id);
    expect(factory.productionLines[0]!.workersAssigned).toBeLessThanOrEqual(state.manufacturers[state.playerCompanyId]!.employees.factoryWorkers.headcount);

    state = assignPlayerProductionLine(state, "player-renton-works", wideBodyModel.id);
    factory = state.manufacturers[state.playerCompanyId]!.factories.find((candidate) => candidate.id === "player-renton-works")!;
    expect(factory.productionLines[0]!.modelId).toBe(regionalModel.id);
  });
});

function createCertifiedModel(state: GameState, category: AircraftCategory, id: string): AircraftModel {
  const input = createDefaultDesignInput(category, AIRCRAFT_CATEGORIES[category].label);
  const design = calculateAircraftDesign(input);
  return {
    id,
    manufacturerId: state.playerCompanyId,
    designId: `design-${id}`,
    programId: `program-${id}`,
    name: input.name,
    category,
    entryIntoServiceTurn: state.turn,
    listPrice: design.metrics.expectedSellingPrice,
    productionCost: design.metrics.unitProductionCost,
    reliability: design.metrics.estimatedReliability,
    fuelEfficiencyScore: design.metrics.fuelEfficiencyScore,
    capacity: input.passengerCapacity,
    rangeNm: design.metrics.estimatedRangeNm,
    monthlySupportCost: design.metrics.maintenanceCostPerFlightHour * 24,
    active: true
  };
}

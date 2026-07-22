import { describe, expect, it } from "vitest";
import { createDefaultDesignInput } from "@/game/aircraft/design";
import { launchPlayerAircraftProgram, startPlayerResearch } from "@/game/simulation/actions";
import { createNewGame } from "@/game/simulation/createGame";
import { processMonthlyTurn } from "@/game/simulation/processMonthlyTurn";

describe("monthly turn processing", () => {
  it("runs multiple in-game years without simulation errors", () => {
    let state = createNewGame({ seed: 3030 });
    state = launchPlayerAircraftProgram(state, createDefaultDesignInput("regional-jet", "Durability RJ"));
    state = startPlayerResearch(state, "high-bypass-turbofans", 180, 7_000_000);

    for (let index = 0; index < 60; index += 1) {
      state = processMonthlyTurn(state).gameState;
    }

    expect(state.turn).toBe(60);
    expect(state.monthlyHistory.length).toBe(60);
    expect(Number.isFinite(state.manufacturers[state.playerCompanyId]!.cash)).toBe(true);
  });
});

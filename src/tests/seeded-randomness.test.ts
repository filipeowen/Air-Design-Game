import { describe, expect, it } from "vitest";
import { createNewGame } from "@/game/simulation/createGame";
import { processMonthlyTurn } from "@/game/simulation/processMonthlyTurn";

describe("seeded randomness", () => {
  it("replays identical outcomes from identical state", () => {
    const state = createNewGame({ seed: 1_970 });

    const first = processMonthlyTurn(state);
    const second = processMonthlyTurn(state);

    expect(first.gameState.randomState).toBe(second.gameState.randomState);
    expect(JSON.stringify(first.report)).toBe(JSON.stringify(second.report));
  });
});

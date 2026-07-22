import { describe, expect, it } from "vitest";
import { createSaveFile, parseSaveFile } from "@/game/save/schema";
import { createNewGame } from "@/game/simulation/createGame";
import { processMonthlyTurn } from "@/game/simulation/processMonthlyTurn";

describe("save and load consistency", () => {
  it("preserves deterministic future outcomes after parsing a save", () => {
    const state = createNewGame({ seed: 2024 });
    const advanced = processMonthlyTurn(state).gameState;
    const save = createSaveFile("test", advanced);
    const loaded = parseSaveFile(JSON.stringify(save)).gameState;

    const fromOriginal = processMonthlyTurn(advanced);
    const fromLoaded = processMonthlyTurn(loaded);

    expect(JSON.stringify(fromLoaded.report)).toBe(JSON.stringify(fromOriginal.report));
  });
});

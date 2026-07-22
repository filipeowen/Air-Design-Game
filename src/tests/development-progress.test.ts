import { describe, expect, it } from "vitest";
import { createDefaultDesignInput } from "@/game/aircraft/design";
import { createFinancialDraft } from "@/game/finance/calculations";
import { processDevelopment } from "@/game/development/process";
import { launchPlayerAircraftProgram } from "@/game/simulation/actions";
import { createNewGame } from "@/game/simulation/createGame";
import { createRandomSource } from "@/game/utils/prng";

describe("development progress", () => {
  it("advances an active aircraft program", () => {
    let state = createNewGame({ seed: 99 });
    state = launchPlayerAircraftProgram(state, createDefaultDesignInput("regional-jet", "QA RJ"));
    const player = state.manufacturers[state.playerCompanyId]!;
    const program = player.aircraftPrograms[0]!;
    program.assignedEngineers = 2_000;
    program.monthlyBudget *= 2;
    const draft = createFinancialDraft(player.id, 1);

    processDevelopment(player, createRandomSource(99), draft, 1);

    expect(program.stageProgress).toBeGreaterThan(0);
    expect(draft.developmentExpenses).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { createFinancialDraft } from "@/game/finance/calculations";
import { createNewGame } from "@/game/simulation/createGame";
import { startPlayerResearch } from "@/game/simulation/actions";
import { processResearch } from "@/game/research/process";

describe("research progress", () => {
  it("advances active research using scientists and budget", () => {
    let state = createNewGame({ seed: 77 });
    state = startPlayerResearch(state, "high-bypass-turbofans", 200, 8_000_000);
    const player = state.manufacturers[state.playerCompanyId]!;
    const project = player.researchProjects[0]!;
    const draft = createFinancialDraft(player.id, 1);

    processResearch(player, state.technologies, draft, state.date.year);

    expect(project.progress).toBeGreaterThan(0);
    expect(draft.researchExpenses).toBe(8_000_000);
  });
});

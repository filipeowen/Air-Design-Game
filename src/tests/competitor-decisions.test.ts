import { describe, expect, it } from "vitest";
import { processCompetitorDecisions } from "@/game/competitors/ai";
import { createNewGame } from "@/game/simulation/createGame";
import { createRandomSource } from "@/game/utils/prng";

describe("competitor decisions", () => {
  it("starts research or program actions using utility scores", () => {
    const state = createNewGame({ seed: 789 });
    const result = processCompetitorDecisions(
      state.manufacturers,
      state.technologies,
      state.marketSegments,
      createRandomSource(789),
      24,
      1972
    );

    expect(result.actions.length).toBeGreaterThan(0);
  });
});

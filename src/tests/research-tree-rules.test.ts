import { describe, expect, it } from "vitest";
import { getAheadOfTimePenaltyMultiplier, getResearchSlotCount, getTechnologyResearchState } from "@/game/research/rules";
import { createNewGame } from "@/game/simulation/createGame";

describe("research tree rules", () => {
  it("allows ahead-of-time research with a penalty once prerequisites are met", () => {
    const state = createNewGame({ seed: 1970 });
    const player = state.manufacturers[state.playerCompanyId]!;
    player.unlockedTechnologyIds.push("high-bypass-turbofans");

    const technology = state.technologies["improved-turbine-materials"]!;
    expect(getTechnologyResearchState(player, technology, 1970, state.technologies)).toBe("available");
    expect(getAheadOfTimePenaltyMultiplier(player, technology, 1970, state.technologies)).toBeGreaterThan(1);
  });

  it("keeps very distant future technologies unavailable under the normal ahead-of-time cap", () => {
    const state = createNewGame({ seed: 1970 });
    const player = state.manufacturers[state.playerCompanyId]!;
    player.unlockedTechnologyIds.push(
      "high-bypass-turbofans",
      "improved-turbine-materials",
      "second-generation-high-bypass-turbofans",
      "digital-avionics-i",
      "full-authority-digital-engine-control",
      "reliability-growth-testing",
      "high-reliability-twinjet-engines",
      "advanced-turbofans",
      "computational-fluid-dynamics",
      "swept-fan-advanced-compressor-design",
      "primary-composite-structures",
      "composite-fan-systems",
      "geared-turbofan-architecture"
    );

    const technology = state.technologies["ultra-high-bypass-engines"]!;
    expect(getTechnologyResearchState(player, technology, 1970, state.technologies)).toBe("unavailable");
  });

  it("limits early player companies to one simultaneous research slot", () => {
    const state = createNewGame({ seed: 1970 });
    const player = state.manufacturers[state.playerCompanyId]!;

    expect(getResearchSlotCount(player)).toBe(1);
  });
});

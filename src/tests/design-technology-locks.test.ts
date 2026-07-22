import { describe, expect, it } from "vitest";
import { createDefaultDesignInput } from "@/game/aircraft/design";
import { launchPlayerAircraftProgram } from "@/game/simulation/actions";
import { createNewGame } from "@/game/simulation/createGame";

describe("aircraft design technology locks", () => {
  it("prevents launching a player aircraft with locked engine, material, and avionics technology", () => {
    const state = createNewGame({ seed: 1970 });
    const input = {
      ...createDefaultDesignInput("narrow-body", "Locked Techliner"),
      engineType: "advanced-turbofan" as const,
      structuralMaterial: "early-composite" as const,
      avionicsPackage: "digital" as const,
      landingGear: "short-field" as const,
      technologyPackage: ["advanced-turbofans", "primary-composite-structures", "digital-avionics-i"]
    };

    const next = launchPlayerAircraftProgram(state, input);
    const player = next.manufacturers[next.playerCompanyId]!;
    const launchedInput = player.aircraftDesigns[0]!.input;

    expect(launchedInput.engineType).toBe("low-bypass-turbofan");
    expect(launchedInput.structuralMaterial).toBe("improved-aluminum");
    expect(launchedInput.avionicsPackage).toBe("analog");
    expect(launchedInput.landingGear).toBe("standard");
    expect(launchedInput.technologyPackage).toEqual([]);
  });
});

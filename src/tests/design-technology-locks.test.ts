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

  it("clamps passenger capacity and range to the selected aircraft category", () => {
    const state = createNewGame({ seed: 1971 });
    const regionalInput = {
      ...createDefaultDesignInput("regional-jet", "Impossible Commuter"),
      passengerCapacity: 400,
      rangeNm: 8_500
    };
    const wideInput = {
      ...createDefaultDesignInput("wide-body", "Tiny Widebody"),
      passengerCapacity: 70,
      rangeNm: 1_000
    };

    const regionalState = launchPlayerAircraftProgram(state, regionalInput);
    const wideState = launchPlayerAircraftProgram(regionalState, wideInput);
    const player = wideState.manufacturers[wideState.playerCompanyId]!;

    expect(player.aircraftDesigns[0]!.input.passengerCapacity).toBe(95);
    expect(player.aircraftDesigns[0]!.input.rangeNm).toBe(1_800);
    expect(player.aircraftDesigns[1]!.input.passengerCapacity).toBe(230);
    expect(player.aircraftDesigns[1]!.input.rangeNm).toBe(4_200);
  });
});

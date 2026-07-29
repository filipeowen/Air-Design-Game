import { describe, expect, it } from "vitest";
import { getAircraftNameSelection } from "@/data/identities";
import { createSaveFile, parseSaveFile } from "@/game/save/schema";
import { createNewGame } from "@/game/simulation/createGame";
import type { GameState, SaveFile } from "@/game/types";

describe("content naming mode", () => {
  it("starts new campaigns with centralized real-world identities", () => {
    const state = createNewGame({ seed: 1970 });
    const manufacturerNames = Object.values(state.manufacturers).map((manufacturer) => manufacturer.name);
    const airlineNames = Object.values(state.airlines).map((airline) => airline.name);
    const competitorModelNames = Object.values(state.manufacturers).flatMap((manufacturer) =>
      manufacturer.isPlayer ? [] : manufacturer.aircraftModels.map((model) => model.name)
    );

    expect(state.contentSettings.namingMode).toBe("real_world");
    expect(state.manufacturers[state.playerCompanyId]?.name).toBe("Boeing");
    expect(state.manufacturers["meridian-aviation"]?.identityId).toBe("meridian-aviation");
    expect(state.airlines["continental-crown"]?.identityId).toBe("continental-crown");
    expect(state.emails[0]?.toEntityId).toBe("player");
    expect(manufacturerNames).toContain("Airbus");
    expect(manufacturerNames).toContain("McDonnell Douglas");
    expect(airlineNames).toContain("United Airlines");
    expect(airlineNames).toContain("Air France");
    expect(airlineNames).toContain("Pan Am");
    expect(airlineNames).toContain("TWA");
    expect(airlineNames).toContain("Qantas");
    expect(airlineNames).not.toContain("British Airways");
    expect(competitorModelNames).toContain("Douglas DC-8");
    expect(competitorModelNames).not.toContain("Airbus A320");
  });

  it("can start as a selected real manufacturer without duplicating that competitor", () => {
    const state = createNewGame({ seed: 1971, playerManufacturerId: "meridian-aviation" });
    const manufacturerNames = Object.values(state.manufacturers).map((manufacturer) => manufacturer.name);

    expect(state.manufacturers[state.playerCompanyId]?.name).toBe("Airbus");
    expect(state.manufacturers[state.playerCompanyId]?.identityId).toBe("meridian-aviation");
    expect(state.settings.playerManufacturerIdentityId).toBe("meridian-aviation");
    expect(state.manufacturers["meridian-aviation"]).toBeUndefined();
    expect(manufacturerNames.filter((name) => name === "Airbus")).toHaveLength(1);
    expect(manufacturerNames).toContain("Boeing");
  });

  it("keeps historical aircraft names behind their availability year", () => {
    expect(getAircraftNameSelection("meridian-aviation", "narrow-body", 1970, "real_world").displayName).not.toBe("Airbus A320");
    expect(getAircraftNameSelection("meridian-aviation", "wide-body", 1970, "real_world").displayName).not.toBe("Airbus A300");
    expect(getAircraftNameSelection("meridian-aviation", "wide-body", 1974, "real_world").displayName).toBe("Airbus A300");
    expect(getAircraftNameSelection("meridian-aviation", "narrow-body", 1988, "real_world").displayName).toBe("Airbus A320");
  });

  it("migrates older fictional saves to the active real-world content setting", () => {
    const fictionalState = createNewGame({ seed: 42, contentSettings: { namingMode: "fictional" } });
    const legacySave = createSaveFile("legacy", fictionalState) as unknown as Omit<SaveFile, "gameState"> & {
      gameState: Omit<GameState, "contentSettings"> & { contentSettings?: GameState["contentSettings"] };
    };
    legacySave.version = 1;
    delete legacySave.gameState.contentSettings;

    const loaded = parseSaveFile(JSON.stringify(legacySave)).gameState;

    expect(loaded.contentSettings.namingMode).toBe("real_world");
    expect(loaded.manufacturers[loaded.playerCompanyId]?.name).toBe("Boeing");
    expect(loaded.manufacturers["pacific-aeroworks"]?.name).toBe("McDonnell Douglas");
    expect(loaded.airlines["continental-crown"]?.name).toBe("United Airlines");
  });
});

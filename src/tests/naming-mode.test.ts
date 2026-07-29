import { describe, expect, it } from "vitest";
import { getAircraftNameSelection, getManufacturerIdentities, getManufacturerIdentity } from "@/data/identities";
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

  it("starts every selectable manufacturer in its home country", () => {
    for (const identity of getManufacturerIdentities("real_world")) {
      const state = createNewGame({ seed: 1980, playerManufacturerId: identity.id });
      const player = state.manufacturers[state.playerCompanyId]!;
      const startingFactory = player.factories[0]!;

      expect(player.name).toBe(identity.displayName);
      expect(startingFactory.country).toBe(identity.country);
    }
  });

  it("keeps generated competitor factories in their home countries", () => {
    const state = createNewGame({ seed: 1981 });

    for (const manufacturer of Object.values(state.manufacturers).filter((candidate) => !candidate.isPlayer)) {
      const identity = getManufacturerIdentity(manufacturer.identityId ?? manufacturer.id, state.contentSettings.namingMode);
      const startingFactory = manufacturer.factories[0]!;

      expect(startingFactory.country).toBe(identity.country);
    }
  });

  it("repairs old selected-manufacturer saves with the hardcoded United States starting factory", () => {
    const state = createNewGame({ seed: 1982, playerManufacturerId: "sunrise-heavy" });
    const player = state.manufacturers[state.playerCompanyId]!;
    const startingFactory = player.factories[0]!;
    startingFactory.name = "Lakeview Final Assembly";
    startingFactory.country = "United States";
    startingFactory.location = "north-america";

    const loaded = parseSaveFile(JSON.stringify(createSaveFile("bad-factory-country", state))).gameState;
    const loadedFactory = loaded.manufacturers[loaded.playerCompanyId]!.factories[0]!;

    expect(loaded.manufacturers[loaded.playerCompanyId]?.name).toBe("Tupolev");
    expect(loadedFactory.name).toBe("Tupolev Final Assembly");
    expect(loadedFactory.country).toBe("Soviet Union");
    expect(loadedFactory.location).toBe("soviet-market");
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

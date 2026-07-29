import { z } from "zod";
import { GAME_CONTENT_SETTINGS } from "@/data/contentSettings";
import {
  getAircraftIdentity,
  getAircraftNameSelection,
  getAirlineIdentity,
  getDefaultPlayerCompanyName,
  getManufacturerIdentity
} from "@/data/identities";
import { ensureEmailInbox } from "@/game/email/messages";
import type { GameContentSettings, GameState, SaveFile } from "@/game/types";

export const saveFileSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  savedAt: z.string(),
  slotId: z.string().min(1),
  gameState: z.custom<GameState>((value) => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const candidate = value as { turn?: unknown; randomState?: unknown; manufacturers?: unknown };
    return typeof candidate.turn === "number" && typeof candidate.randomState === "number" && typeof candidate.manufacturers === "object";
  }, "Invalid game state")
});

export function createSaveFile(slotId: string, gameState: GameState): SaveFile {
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    slotId,
    gameState
  };
}

export function parseSaveFile(value: string): SaveFile {
  const saveFile = saveFileSchema.parse(JSON.parse(value));
  const settings = ensureContentSettings(saveFile.gameState);
  ensureIdentityNames(saveFile.gameState, settings);
  ensureEmailInbox(saveFile.gameState);
  return saveFile;
}

export function ensureContentSettings(state: GameState): GameContentSettings {
  const candidate = state as GameState & { contentSettings?: GameContentSettings };
  candidate.contentSettings ??= { ...GAME_CONTENT_SETTINGS };
  candidate.contentSettings.namingMode ??= GAME_CONTENT_SETTINGS.namingMode;
  return candidate.contentSettings;
}

function ensureIdentityNames(state: GameState, settings: GameContentSettings): void {
  const fictionalPlayerName = getDefaultPlayerCompanyName("fictional");
  for (const manufacturer of Object.values(state.manufacturers)) {
    const identity = getManufacturerIdentity(manufacturer.id, settings.namingMode);
    manufacturer.identityId ??= identity.id;

    if (!manufacturer.isPlayer || manufacturer.name === fictionalPlayerName || state.settings.playerCompanyName === fictionalPlayerName) {
      manufacturer.name = identity.displayName;
      if (manufacturer.isPlayer) {
        state.settings.playerCompanyName = identity.displayName;
      }
    }

    const usedNames: string[] = [];
    for (const model of manufacturer.aircraftModels) {
      const existingIdentity = model.identityId ? getAircraftIdentity(model.identityId, settings.namingMode) : undefined;
      const selection =
        existingIdentity ??
        getAircraftNameSelection(manufacturer.id, model.category, state.date.year, settings.namingMode, usedNames);
      const identityId = "id" in selection ? selection.id : selection.identityId;
      const displayName = "displayName" in selection ? selection.displayName : model.name;

      if (identityId) {
        model.identityId ??= identityId;
      }

      if (!manufacturer.isPlayer && displayName) {
        const oldName = model.name;
        model.name = displayName;
        const design = manufacturer.aircraftDesigns.find((candidate) => candidate.id === model.designId);
        const program = manufacturer.aircraftPrograms.find((candidate) => candidate.id === model.programId);
        if (design?.input.name === oldName) {
          design.identityId ??= model.identityId;
          design.input.name = displayName;
        }
        if (program?.name === `${oldName} Program`) {
          program.name = `${displayName} Program`;
        }
      }

      usedNames.push(model.name);
    }
  }

  for (const airline of Object.values(state.airlines)) {
    const identity = getAirlineIdentity(airline.id, settings.namingMode);
    airline.identityId ??= identity.id;
    airline.name = identity.displayName;
    airline.country = identity.country;
    airline.region = identity.region;
  }
}

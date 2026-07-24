import { z } from "zod";
import { ensureEmailInbox } from "@/game/email/messages";
import type { GameState, SaveFile } from "@/game/types";

export const saveFileSchema = z.object({
  version: z.literal(1),
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
    version: 1,
    savedAt: new Date().toISOString(),
    slotId,
    gameState
  };
}

export function parseSaveFile(value: string): SaveFile {
  const saveFile = saveFileSchema.parse(JSON.parse(value));
  ensureEmailInbox(saveFile.gameState);
  return saveFile;
}

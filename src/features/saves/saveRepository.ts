"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSaveFile, parseSaveFile } from "@/game/save/schema";
import type { GameState, SaveFile } from "@/game/types";

const LOCAL_PREFIX = "aircraft-producer-save:";

export interface SaveSlotSummary {
  slotId: string;
  savedAt: string;
  companyName: string;
  dateLabel: string;
  turn: number;
}

export async function saveGameToSlot(slotId: string, gameState: GameState): Promise<SaveFile> {
  const saveFile = createSaveFile(slotId, gameState);
  window.localStorage.setItem(`${LOCAL_PREFIX}${slotId}`, JSON.stringify(saveFile));

  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from("aircraft_producer_saves").upsert({
      slot_id: slotId,
      saved_at: saveFile.savedAt,
      payload: saveFile
    });
  }

  return saveFile;
}

export async function loadGameFromSlot(slotId: string): Promise<GameState | null> {
  const local = window.localStorage.getItem(`${LOCAL_PREFIX}${slotId}`);
  if (local) {
    return parseSaveFile(local).gameState;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.from("aircraft_producer_saves").select("payload").eq("slot_id", slotId).single();
  if (!data || typeof data.payload !== "object" || data.payload === null) {
    return null;
  }

  const saveFile = parseSaveFile(JSON.stringify(data.payload));
  window.localStorage.setItem(`${LOCAL_PREFIX}${slotId}`, JSON.stringify(saveFile));
  return saveFile.gameState;
}

export function listLocalSaves(): SaveSlotSummary[] {
  const summaries: SaveSlotSummary[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(LOCAL_PREFIX)) {
      continue;
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const save = parseSaveFile(raw);
      summaries.push({
        slotId: save.slotId,
        savedAt: save.savedAt,
        companyName: save.gameState.settings.playerCompanyName,
        dateLabel: `${save.gameState.date.year}-${String(save.gameState.date.month).padStart(2, "0")}`,
        turn: save.gameState.turn
      });
    } catch {
      window.localStorage.removeItem(key);
    }
  }

  return summaries.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function deleteSaveSlot(slotId: string): Promise<void> {
  window.localStorage.removeItem(`${LOCAL_PREFIX}${slotId}`);
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from("aircraft_producer_saves").delete().eq("slot_id", slotId);
  }
}

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

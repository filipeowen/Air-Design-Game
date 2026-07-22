import { calculateAircraftDesign } from "@/game/aircraft/design";
import { createAircraftProgram } from "@/game/development/process";
import { createProductionLine } from "@/game/factories/process";
import { canResearchTechnology, createResearchProject } from "@/game/research/process";
import { hasResearchSlotAvailable } from "@/game/research/rules";
import type { AircraftCategory, AircraftDesignInput, Factory, GameState } from "@/game/types";

export function launchPlayerAircraftProgram(state: GameState, input: AircraftDesignInput): GameState {
  const next = structuredClone(state);
  const player = next.manufacturers[next.playerCompanyId];
  if (!player) {
    throw new Error("Player company is missing.");
  }

  const sanitizedInput = sanitizeAircraftDesignInput(input, player.unlockedTechnologyIds);
  const calculated = calculateAircraftDesign(sanitizedInput);
  const design = {
    id: `design-player-${next.turn}-${sanitizedInput.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    manufacturerId: player.id,
    createdTurn: next.turn,
    ...calculated
  };
  player.aircraftDesigns.push(design);
  player.aircraftPrograms.push(createAircraftProgram(player.id, design, next.turn));
  return next;
}

export function startPlayerResearch(
  state: GameState,
  technologyId: string,
  assignedScientists: number,
  monthlyBudget: number
): GameState {
  const next = structuredClone(state);
  const player = next.manufacturers[next.playerCompanyId];
  if (!player) {
    throw new Error("Player company is missing.");
  }
  const technology = next.technologies[technologyId];
  if (!technology || !canResearchTechnology(player, technology, next.date.year, next.technologies) || !hasResearchSlotAvailable(player)) {
    return next;
  }
  const existing = player.researchProjects.find((project) => project.technologyId === technologyId && project.status === "active");
  if (!existing && !player.unlockedTechnologyIds.includes(technologyId)) {
    player.researchProjects.push(createResearchProject(player.id, technologyId, assignedScientists, monthlyBudget));
  }
  return next;
}

export function sanitizeAircraftDesignInput(input: AircraftDesignInput, unlockedTechnologyIds: string[]): AircraftDesignInput {
  const unlocked = new Set(unlockedTechnologyIds);
  const engineType =
    input.engineType === "advanced-turbofan" && !unlocked.has("advanced-turbofans")
      ? unlocked.has("high-bypass-turbofans")
        ? "high-bypass-turbofan"
        : "low-bypass-turbofan"
      : input.engineType === "high-bypass-turbofan" && !unlocked.has("high-bypass-turbofans")
        ? "low-bypass-turbofan"
        : input.engineType;

  const structuralMaterial =
    input.structuralMaterial === "early-composite" &&
    !unlocked.has("early-composite-secondary-structures") &&
    !unlocked.has("primary-composite-structures")
      ? unlocked.has("improved-aluminum-alloys")
        ? "improved-aluminum"
        : "classic-aluminum"
      : input.structuralMaterial === "improved-aluminum" && !unlocked.has("improved-aluminum-alloys")
        ? "classic-aluminum"
        : input.structuralMaterial;

  const avionicsPackage =
    input.avionicsPackage === "digital" && !unlocked.has("digital-avionics-i")
      ? unlocked.has("improved-avionics")
        ? "improved-analog"
        : "analog"
      : input.avionicsPackage === "improved-analog" && !unlocked.has("improved-avionics")
        ? "analog"
        : input.avionicsPackage;

  const landingGear =
    input.landingGear === "short-field" && !unlocked.has("advanced-high-lift-devices")
      ? "standard"
      : input.landingGear === "reinforced" && !unlocked.has("damage-tolerant-structural-design")
        ? "standard"
        : input.landingGear;

  return {
    ...input,
    engineType,
    structuralMaterial,
    avionicsPackage,
    landingGear,
    technologyPackage: input.technologyPackage.filter((technologyId) => unlocked.has(technologyId))
  };
}

export function updatePlayerProgram(
  state: GameState,
  programId: string,
  changes: { monthlyBudget?: number; assignedEngineers?: number; paused?: boolean; cancelled?: boolean }
): GameState {
  const next = structuredClone(state);
  const player = next.manufacturers[next.playerCompanyId];
  const program = player?.aircraftPrograms.find((candidate) => candidate.id === programId);
  if (!program) {
    return next;
  }

  if (changes.cancelled) {
    program.status = "cancelled";
  } else if (changes.paused !== undefined) {
    program.status = changes.paused ? "paused" : "active";
  }
  if (changes.monthlyBudget !== undefined) {
    program.monthlyBudget = Math.max(0, Math.round(changes.monthlyBudget));
  }
  if (changes.assignedEngineers !== undefined) {
    program.assignedEngineers = Math.max(0, Math.round(changes.assignedEngineers));
  }
  return next;
}

export function changeEmployeeHeadcount(state: GameState, role: keyof GameState["manufacturers"][string]["employees"], delta: number): GameState {
  const next = structuredClone(state);
  const player = next.manufacturers[next.playerCompanyId];
  if (!player) {
    throw new Error("Player company is missing.");
  }
  const group = player.employees[role];
  group.headcount = Math.max(0, group.headcount + delta);
  group.morale = Math.max(25, Math.min(95, group.morale + (delta >= 0 ? 1 : -3)));
  return next;
}

export function buildPlayerFactory(state: GameState, category: AircraftCategory): GameState {
  const next = structuredClone(state);
  const player = next.manufacturers[next.playerCompanyId];
  if (!player) {
    throw new Error("Player company is missing.");
  }

  const factory: Factory = {
    id: `factory-player-${next.turn}-${category}`,
    manufacturerId: player.id,
    name: category === "wide-body" ? "High Bay Assembly" : "Expansion Assembly Hall",
    location: "north-america",
    size: category === "wide-body" ? "large" : "medium",
    capacity: category === "wide-body" ? 12 : 8,
    workerCount: category === "wide-body" ? 2_400 : 1_400,
    monthlyCost: category === "wide-body" ? 32_000_000 : 16_000_000,
    supportedCategories: category === "wide-body" ? ["wide-body"] : ["regional-jet", "narrow-body"],
    productionLines: [],
    idleSpace: category === "wide-body" ? 12 : 8
  };

  const buildCost = category === "wide-body" ? 850_000_000 : 380_000_000;
  player.cash -= buildCost;
  player.factories.push(factory);
  return next;
}

export function assignPlayerProductionLine(state: GameState, modelId: string, targetMonthlyRate: number): GameState {
  const next = structuredClone(state);
  const player = next.manufacturers[next.playerCompanyId];
  const model = player?.aircraftModels.find((candidate) => candidate.id === modelId);
  if (!player || !model) {
    return next;
  }
  const factory = player.factories.find((candidate) => candidate.supportedCategories.includes(model.category));
  if (!factory) {
    return next;
  }
  const existing = factory.productionLines.find((line) => line.modelId === model.id);
  if (existing) {
    existing.targetMonthlyRate = Math.max(0, Math.round(targetMonthlyRate));
    existing.status = existing.targetMonthlyRate > 0 ? "active" : "idle";
  } else {
    factory.productionLines.push(createProductionLine(model, Math.max(0, Math.round(targetMonthlyRate))));
  }
  return next;
}

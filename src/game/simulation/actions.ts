import { AIRCRAFT_CATEGORIES } from "@/data/aircraftCategories";
import { getFactoryRegionForCountry } from "@/data/factoryCountries";
import { calculateAircraftDesign } from "@/game/aircraft/design";
import { createAircraftProgram } from "@/game/development/process";
import { appendGameEmail, ensureEmailInbox } from "@/game/email/messages";
import { createProductionLine, getAssignedFactoryWorkers, getFactoryStatus } from "@/game/factories/process";
import { formatMoney } from "@/game/finance/calculations";
import { canResearchTechnology, createResearchProject } from "@/game/research/process";
import { hasResearchSlotAvailable } from "@/game/research/rules";
import type { AircraftCategory, AircraftDesignInput, AircraftModel, Factory, GameState, Manufacturer } from "@/game/types";

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
  const program = createAircraftProgram(player.id, design, next.turn);
  player.aircraftDesigns.push(design);
  player.aircraftPrograms.push(program);
  appendGameEmail(next, {
    from: "Program Management Office",
    category: "development",
    priority: "high",
    subject: `Program authorized: ${sanitizedInput.name}`,
    preview: `${sanitizedInput.name} has entered concept design with ${program.assignedEngineers.toLocaleString()} engineers assigned.`,
    body: [
      `${sanitizedInput.name} has been approved as a ${AIRCRAFT_CATEGORIES[sanitizedInput.category].label.toLowerCase()} development program.`,
      `Initial monthly budget: ${formatMoney(program.monthlyBudget)}. Expected development duration: ${calculated.metrics.developmentDurationMonths} months.`,
      "Program milestones and engineering issues will be sent to this inbox as they occur."
    ],
    relatedEntityId: program.id
  });
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
    appendGameEmail(next, {
      from: "Research Directorate",
      category: "research",
      priority: "normal",
      subject: `Research authorized: ${technology.name}`,
      preview: `${assignedScientists.toLocaleString()} scientists assigned with ${formatMoney(monthlyBudget)} per month.`,
      body: [
        `${technology.name} has been added to the active research queue.`,
        `Historical availability year: ${technology.historicalYear}. Research requirement: ${technology.researchPointsRequired} RP.`,
        "Completion updates and unlock notifications will arrive through this inbox."
      ],
      relatedEntityId: technology.id
    });
  }
  return next;
}

export function sanitizeAircraftDesignInput(input: AircraftDesignInput, unlockedTechnologyIds: string[]): AircraftDesignInput {
  const unlocked = new Set(unlockedTechnologyIds);
  const category = AIRCRAFT_CATEGORIES[input.category];
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
    passengerCapacity: clampToStep(input.passengerCapacity, category.capacityRange[0], category.capacityRange[1], 1),
    rangeNm: clampToStep(input.rangeNm, category.rangeRangeNm[0], category.rangeRangeNm[1], 50),
    fuselageLengthM: clamp(input.fuselageLengthM, airframeEnvelope(input.category).fuselageLength[0], airframeEnvelope(input.category).fuselageLength[1]),
    fuselageWidthM: clamp(input.fuselageWidthM, airframeEnvelope(input.category).fuselageWidth[0], airframeEnvelope(input.category).fuselageWidth[1]),
    wingAreaM2: clampToStep(input.wingAreaM2, airframeEnvelope(input.category).wingArea[0], airframeEnvelope(input.category).wingArea[1], 1),
    engineType,
    structuralMaterial,
    avionicsPackage,
    landingGear,
    technologyPackage: input.technologyPackage.filter((technologyId) => unlocked.has(technologyId))
  };
}

function airframeEnvelope(category: AircraftCategory): {
  fuselageLength: [number, number];
  fuselageWidth: [number, number];
  wingArea: [number, number];
} {
  if (category === "regional-jet") {
    return {
      fuselageLength: [21, 33],
      fuselageWidth: [2.5, 3.4],
      wingArea: [52, 92]
    };
  }

  if (category === "narrow-body") {
    return {
      fuselageLength: [31, 47],
      fuselageWidth: [3.3, 4.2],
      wingArea: [95, 165]
    };
  }

  return {
    fuselageLength: [48, 76],
    fuselageWidth: [5, 6.8],
    wingArea: [245, 390]
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampToStep(value: number, min: number, max: number, step: number): number {
  const clamped = clamp(value, min, max);
  return Math.round(clamped / step) * step;
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

export function markPlayerEmailRead(state: GameState, emailId: string): GameState {
  const next = structuredClone(state);
  const email = ensureEmailInbox(next).find((candidate) => candidate.id === emailId);
  if (email) {
    email.read = true;
  }
  return next;
}

export function markAllPlayerEmailsRead(state: GameState): GameState {
  const next = structuredClone(state);
  for (const email of ensureEmailInbox(next)) {
    email.read = true;
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
  if (role === "factoryWorkers") {
    rebalanceFactoryWorkers(player);
  }
  return next;
}

export function buildPlayerFactory(state: GameState, category: AircraftCategory, country = "United States"): GameState {
  const next = structuredClone(state);
  const player = next.manufacturers[next.playerCompanyId];
  if (!player) {
    throw new Error("Player company is missing.");
  }

  const isWideBody = category === "wide-body";
  const capacity = isWideBody ? 12 : 8;
  const factory: Factory = {
    id: `factory-player-${next.turn}-${category}-${player.factories.length + 1}`,
    manufacturerId: player.id,
    name: isWideBody ? "High Bay Assembly" : "Expansion Assembly Hall",
    location: getFactoryRegionForCountry(country),
    country,
    size: isWideBody ? "large" : "medium",
    capacity,
    workerCount: 0,
    monthlyCost: isWideBody ? 32_000_000 : 16_000_000,
    status: "building",
    constructionStartedTurn: next.turn,
    constructionTurnsRemaining: isWideBody ? 30 : 18,
    supportedCategories: isWideBody ? ["wide-body"] : ["regional-jet", "narrow-body"],
    productionLines: [],
    idleSpace: 0
  };

  const buildCost = isWideBody ? 850_000_000 : 380_000_000;
  player.cash -= buildCost;
  player.factories.push(factory);
  appendGameEmail(next, {
    from: "Industrial Planning",
    category: "operations",
    priority: "normal",
    subject: `Factory construction started: ${country}`,
    preview: `${factory.name} will take ${factory.constructionTurnsRemaining} months and cost ${formatMoney(buildCost)} up front.`,
    body: [
      `${factory.name} has entered construction in ${country}.`,
      `Planned size: ${factory.size}. Supported aircraft: ${factory.supportedCategories.map((categoryId) => AIRCRAFT_CATEGORIES[categoryId].label).join(", ")}.`,
      `Construction time: ${factory.constructionTurnsRemaining} months. Up-front capital cost: ${formatMoney(buildCost)}.`
    ],
    relatedEntityId: factory.id
  });
  return next;
}

export function closePlayerFactory(state: GameState, factoryId: string): GameState {
  const next = structuredClone(state);
  const player = next.manufacturers[next.playerCompanyId];
  const factory = player?.factories.find((candidate) => candidate.id === factoryId);
  if (!player || !factory || getFactoryStatus(factory) === "closed") {
    return next;
  }

  factory.status = "closed";
  factory.closedTurn = next.turn;
  factory.idleSpace = 0;
  factory.productionLines = factory.productionLines.map((line) => ({
    ...line,
    status: "idle",
    targetMonthlyRate: 0,
    workersAssigned: 0
  }));
  appendGameEmail(next, {
    from: "Industrial Operations",
    category: "operations",
    priority: "high",
    subject: `Factory closed: ${factory.name}`,
    preview: `${factory.name} has been closed and its production lines have been idled.`,
    body: [
      `${factory.name} has been closed as of ${next.date.year}-${String(next.date.month).padStart(2, "0")}.`,
      "Operating costs and production output from this facility have stopped.",
      "Any displaced production should be reassigned from the Factories tab."
    ],
    relatedEntityId: factory.id
  });
  return next;
}

export function idlePlayerFactoryProduction(state: GameState, factoryId: string): GameState {
  const next = structuredClone(state);
  const player = next.manufacturers[next.playerCompanyId];
  const factory = player?.factories.find((candidate) => candidate.id === factoryId);
  if (!player || !factory) {
    return next;
  }
  factory.productionLines = [];
  factory.idleSpace = getFactoryStatus(factory) === "active" ? factory.capacity : 0;
  appendGameEmail(next, {
    from: "Production Control",
    category: "operations",
    priority: "normal",
    subject: `Factory idled: ${factory.name}`,
    preview: `${factory.name} has no aircraft assigned to its production floor.`,
    body: [
      `${factory.name} has been set to idle production.`,
      "Its capacity remains available for a certified compatible aircraft.",
      "No aircraft will be produced from this facility until a model is assigned."
    ],
    relatedEntityId: factory.id
  });
  return next;
}

export function assignPlayerProductionLine(state: GameState, factoryId: string, modelId: string, targetMonthlyRate?: number): GameState;
export function assignPlayerProductionLine(state: GameState, modelId: string, targetMonthlyRate: number): GameState;
export function assignPlayerProductionLine(
  state: GameState,
  factoryIdOrModelId: string,
  modelIdOrTargetMonthlyRate: string | number,
  targetMonthlyRate?: number
): GameState {
  const next = structuredClone(state);
  const player = next.manufacturers[next.playerCompanyId];
  if (!player) {
    return next;
  }

  const explicitFactory = typeof modelIdOrTargetMonthlyRate === "string";
  const modelId = explicitFactory ? modelIdOrTargetMonthlyRate : factoryIdOrModelId;
  const model = player.aircraftModels.find((candidate) => candidate.id === modelId && candidate.active);
  if (!model) {
    return next;
  }

  const factory = explicitFactory
    ? player.factories.find((candidate) => candidate.id === factoryIdOrModelId)
    : player.factories.find((candidate) => getFactoryStatus(candidate) === "active" && candidate.supportedCategories.includes(model.category));

  if (!factory || getFactoryStatus(factory) !== "active" || !factory.supportedCategories.includes(model.category)) {
    return next;
  }

  const rate = explicitFactory
    ? targetMonthlyRate ?? defaultProductionRate(model)
    : typeof modelIdOrTargetMonthlyRate === "number"
      ? modelIdOrTargetMonthlyRate
      : defaultProductionRate(model);
  const capacityRate = Math.max(0, Math.floor(factory.capacity / AIRCRAFT_CATEGORIES[model.category].factoryCapacityRequired));
  const line = createProductionLine(model, Math.min(capacityRate, Math.max(0, Math.round(rate))));
  const availableWorkers = Math.max(0, player.employees.factoryWorkers.headcount - getAssignedFactoryWorkers(player, factory.id));
  line.workersAssigned = Math.min(line.workersAssigned, availableWorkers);
  line.status = line.targetMonthlyRate > 0 && line.workersAssigned > 0 ? "active" : "idle";
  factory.productionLines = line.targetMonthlyRate > 0 ? [line] : [];
  factory.idleSpace = Math.max(0, factory.capacity - line.targetMonthlyRate * AIRCRAFT_CATEGORIES[model.category].factoryCapacityRequired);
  appendGameEmail(next, {
    from: "Production Control",
    category: "operations",
    priority: line.status === "active" ? "normal" : "high",
    subject: `Production assignment: ${factory.name}`,
    preview:
      line.status === "active"
        ? `${factory.name} is assigned to build ${model.name} at ${line.targetMonthlyRate} per month.`
        : `${factory.name} could not fully staff the ${model.name} line.`,
    body: [
      `${factory.name} has been assigned to ${model.name}.`,
      `Target monthly rate: ${line.targetMonthlyRate}. Workers assigned: ${line.workersAssigned.toLocaleString()}.`,
      line.status === "active"
        ? "The line is active and will begin producing against eligible orders."
        : "The line is idle because there are not enough available factory workers."
    ],
    relatedEntityId: factory.id
  });
  return next;
}

function defaultProductionRate(model: AircraftModel): number {
  if (model.category === "wide-body") {
    return 1;
  }
  if (model.category === "narrow-body") {
    return 3;
  }
  return 4;
}

function rebalanceFactoryWorkers(manufacturer: Manufacturer): void {
  const assignedWorkers = getAssignedFactoryWorkers(manufacturer);
  const availableWorkers = manufacturer.employees.factoryWorkers.headcount;
  if (assignedWorkers <= availableWorkers) {
    return;
  }

  const ratio = availableWorkers > 0 ? availableWorkers / assignedWorkers : 0;
  for (const factory of manufacturer.factories) {
    if (getFactoryStatus(factory) !== "active") {
      continue;
    }

    for (const line of factory.productionLines) {
      if (line.status !== "active") {
        continue;
      }
      line.workersAssigned = Math.floor(line.workersAssigned * ratio);
      if (line.workersAssigned <= 0) {
        line.status = "idle";
        line.targetMonthlyRate = 0;
      }
    }
  }
}

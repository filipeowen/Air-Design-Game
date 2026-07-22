import { AIRCRAFT_CATEGORIES } from "@/data/aircraftCategories";
import { TECHNOLOGIES } from "@/data/technologies";
import { calculateAircraftDesign, createDefaultDesignInput } from "@/game/aircraft/design";
import { createAircraftProgram } from "@/game/development/process";
import { createProductionLine } from "@/game/factories/process";
import { canResearchTechnology, createResearchProject } from "@/game/research/process";
import type { AircraftCategory, Manufacturer, MarketSegment, Technology } from "@/game/types";
import type { RandomSource } from "@/game/utils/prng";

export interface CompetitorDecisionResult {
  actions: string[];
}

export function processCompetitorDecisions(
  manufacturers: Record<string, Manufacturer>,
  technologies: Record<string, Technology>,
  markets: Record<AircraftCategory, MarketSegment>,
  rng: RandomSource,
  turn: number,
  year: number
): CompetitorDecisionResult {
  const actions: string[] = [];

  for (const manufacturer of Object.values(manufacturers)) {
    if (manufacturer.isPlayer || manufacturer.bankrupt) {
      continue;
    }

    hireIfGrowing(manufacturer, rng, actions);
    chooseResearch(manufacturer, technologies, rng, year, actions);
    launchProgramIfUseful(manufacturer, markets, rng, turn, actions);
    openProductionLineIfNeeded(manufacturer, actions);
  }

  return { actions };
}

function hireIfGrowing(manufacturer: Manufacturer, rng: RandomSource, actions: string[]): void {
  const cashComfort = manufacturer.cash / 1_000_000_000;
  if (cashComfort < 0.8 || !rng.chance(0.18 + manufacturer.strategy.longTermPlanning / 500)) {
    return;
  }

  const engineerAdds = Math.round(rng.nextBetween(30, 130) * (manufacturer.strategy.innovationPreference / 60));
  const workerAdds = Math.round(rng.nextBetween(70, 260));
  manufacturer.employees.engineers.headcount += engineerAdds;
  manufacturer.employees.factoryWorkers.headcount += workerAdds;
  manufacturer.cash -= engineerAdds * 18_000 + workerAdds * 7_000;
  actions.push(`${manufacturer.name} hired engineers and factory workers for growth.`);
}

function chooseResearch(
  manufacturer: Manufacturer,
  technologies: Record<string, Technology>,
  rng: RandomSource,
  year: number,
  actions: string[]
): void {
  const active = manufacturer.researchProjects.filter((project) => project.status === "active");
  const desiredProjects = manufacturer.strategy.researchIntensity > 65 ? 2 : 1;
  if (active.length >= desiredProjects || manufacturer.cash < 350_000_000) {
    return;
  }

  const candidates = Object.values(technologies)
    .filter((technology) => canResearchTechnology(manufacturer, technology, year))
    .map((technology) => ({
      technology,
      score: technologyScore(manufacturer, technology) + rng.nextBetween(-5, 5)
    }))
    .sort((a, b) => b.score - a.score);

  const chosen = candidates[0]?.technology;
  if (!chosen) {
    return;
  }

  const scientists = Math.min(manufacturer.employees.scientists.headcount, Math.round(130 + manufacturer.strategy.researchIntensity * 3));
  const budget = Math.min(manufacturer.cash * 0.012, chosen.researchCost / 28);
  manufacturer.researchProjects.push(createResearchProject(manufacturer.id, chosen.id, scientists, Math.round(budget)));
  actions.push(`${manufacturer.name} began researching ${chosen.name}.`);
}

function technologyScore(manufacturer: Manufacturer, technology: Technology): number {
  const innovation = manufacturer.strategy.innovationPreference;
  const productionNeed = technology.benefits.production ? 12 : 0;
  const fuelNeed = technology.benefits.fuel ? 10 : 0;
  const reliabilityNeed = technology.benefits.reliability ? 8 : 0;
  const riskPenalty = technology.risks.length * (100 - manufacturer.strategy.riskTolerance) * 0.04;
  return innovation * 0.3 + productionNeed + fuelNeed + reliabilityNeed - riskPenalty;
}

function launchProgramIfUseful(
  manufacturer: Manufacturer,
  markets: Record<AircraftCategory, MarketSegment>,
  rng: RandomSource,
  turn: number,
  actions: string[]
): void {
  const activePrograms = manufacturer.aircraftPrograms.filter((program) => program.status === "active");
  if (activePrograms.length >= 2 || manufacturer.cash < 800_000_000) {
    return;
  }

  const preferred = manufacturer.strategy.preferredSegments
    .map((category) => ({
      category,
      score: markets[category].monthlyDemand + manufacturer.strategy.innovationPreference * 0.12 + rng.nextBetween(-5, 5)
    }))
    .sort((a, b) => b.score - a.score);
  const category = preferred[0]?.category ?? "narrow-body";
  const existingFreshModel = manufacturer.aircraftModels.some((model) => model.category === category && turn - model.entryIntoServiceTurn < 96);
  const launchUtility =
    markets[category].monthlyDemand * 1.2 +
    manufacturer.strategy.riskTolerance * 0.25 +
    manufacturer.strategy.longTermPlanning * 0.18 -
    activePrograms.length * 18 -
    (existingFreshModel ? 16 : 0) +
    rng.nextBetween(-5, 5);

  if (launchUtility < 42) {
    return;
  }

  const input = createDefaultDesignInput(category, aiModelName(manufacturer.id, category, turn));
  input.passengerCapacity = Math.round(input.passengerCapacity * rng.nextBetween(0.9, 1.12));
  input.rangeNm = Math.round(input.rangeNm * rng.nextBetween(0.92, 1.16));
  input.commonality = existingFreshModel ? 58 : 22;
  input.reliabilityTarget += manufacturer.strategy.productionConservatism > 55 ? 5 : 0;
  input.technologyPackage = manufacturer.unlockedTechnologyIds.slice(0, 5);
  const calculated = calculateAircraftDesign(input);
  const design = {
    id: `design-${manufacturer.id}-${turn}`,
    manufacturerId: manufacturer.id,
    createdTurn: turn,
    ...calculated
  };
  const program = createAircraftProgram(manufacturer.id, design, turn);
  manufacturer.aircraftDesigns.push(design);
  manufacturer.aircraftPrograms.push(program);
  actions.push(`${manufacturer.name} launched the ${input.name} ${AIRCRAFT_CATEGORIES[category].label.toLowerCase()} program.`);
}

function openProductionLineIfNeeded(manufacturer: Manufacturer, actions: string[]): void {
  for (const model of manufacturer.aircraftModels) {
    const hasLine = manufacturer.factories.some((factory) => factory.productionLines.some((line) => line.modelId === model.id));
    if (hasLine) {
      continue;
    }

    const factory = manufacturer.factories.find((candidate) => candidate.supportedCategories.includes(model.category));
    if (!factory) {
      continue;
    }

    const rate = model.category === "wide-body" ? 1 : model.category === "narrow-body" ? 3 : 4;
    factory.productionLines.push(createProductionLine(model, rate));
    actions.push(`${manufacturer.name} opened a production line for ${model.name}.`);
  }
}

function aiModelName(manufacturerId: string, category: AircraftCategory, turn: number): string {
  const family = manufacturerId
    .split("-")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const categoryNumber = category === "regional-jet" ? 70 : category === "narrow-body" ? 160 : 300;
  return `${family}-${categoryNumber + (turn % 40)}`;
}

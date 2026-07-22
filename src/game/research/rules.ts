import type { Manufacturer, ResearchProject, Technology } from "@/game/types";

export const MAX_NORMAL_AHEAD_OF_TIME_YEARS = 10;

export type TechnologyResearchState = "completed" | "active" | "available" | "unavailable" | "mutually-exclusive";

export function getBreakthroughAheadReduction(manufacturer: Manufacturer, technologies: Record<string, Technology>): number {
  return manufacturer.unlockedTechnologyIds.reduce((sum, technologyId) => {
    const technology = technologies[technologyId];
    return sum + (technology?.breakthroughPenaltyReduction ?? 0);
  }, 0);
}

export function getAheadOfTimeYears(
  manufacturer: Manufacturer,
  technology: Technology,
  year: number,
  technologies: Record<string, Technology>
): number {
  const reduction = getBreakthroughAheadReduction(manufacturer, technologies);
  return Math.max(0, technology.historicalYear - year - reduction);
}

export function getAheadOfTimePenaltyMultiplier(
  manufacturer: Manufacturer,
  technology: Technology,
  year: number,
  technologies: Record<string, Technology>
): number {
  const aheadYears = Math.min(MAX_NORMAL_AHEAD_OF_TIME_YEARS, getAheadOfTimeYears(manufacturer, technology, year, technologies));
  return Math.round((1 + aheadYears * 0.22) * 100) / 100;
}

export function getEffectiveResearchPointsRequired(
  manufacturer: Manufacturer,
  technology: Technology,
  year: number,
  technologies: Record<string, Technology>
): number {
  return Math.round(technology.researchPointsRequired * getAheadOfTimePenaltyMultiplier(manufacturer, technology, year, technologies));
}

export function getResearchSlotCount(manufacturer: Manufacturer): number {
  const scientists = manufacturer.employees.scientists.headcount;
  const companyScale =
    manufacturer.employees.engineers.headcount +
    manufacturer.employees.factoryWorkers.headcount * 0.35 +
    manufacturer.employees.salesStaff.headcount * 0.45;

  if (scientists >= 1_050 && companyScale >= 6_000 && manufacturer.cash > 3_500_000_000) {
    return 3;
  }

  if (scientists >= 430 && companyScale >= 2_200 && manufacturer.cash > 1_000_000_000) {
    return 2;
  }

  return 1;
}

export function getActiveResearchProjects(manufacturer: Manufacturer): ResearchProject[] {
  return manufacturer.researchProjects.filter((project) => project.status === "active");
}

export function hasResearchSlotAvailable(manufacturer: Manufacturer): boolean {
  return getActiveResearchProjects(manufacturer).length < getResearchSlotCount(manufacturer);
}

export function canResearchTechnology(
  manufacturer: Manufacturer,
  technology: Technology,
  year: number,
  technologies: Record<string, Technology>
): boolean {
  return getTechnologyResearchState(manufacturer, technology, year, technologies) === "available";
}

export function getTechnologyResearchState(
  manufacturer: Manufacturer,
  technology: Technology,
  year: number,
  technologies: Record<string, Technology>
): TechnologyResearchState {
  if (manufacturer.unlockedTechnologyIds.includes(technology.id)) {
    return "completed";
  }

  if (getActiveResearchProjects(manufacturer).some((project) => project.technologyId === technology.id)) {
    return "active";
  }

  if (technology.mutuallyExclusiveWith?.some((technologyId) => manufacturer.unlockedTechnologyIds.includes(technologyId))) {
    return "mutually-exclusive";
  }

  const prerequisitesMet = technology.prerequisites.every((technologyId) => manufacturer.unlockedTechnologyIds.includes(technologyId));
  if (!prerequisitesMet) {
    return "unavailable";
  }

  const aheadYears = getAheadOfTimeYears(manufacturer, technology, year, technologies);
  if (aheadYears > MAX_NORMAL_AHEAD_OF_TIME_YEARS) {
    return "unavailable";
  }

  return "available";
}

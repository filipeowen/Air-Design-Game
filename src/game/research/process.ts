import type { Manufacturer, ResearchProject, Technology } from "@/game/types";
import type { FinancialDraft } from "@/game/finance/calculations";

export interface ResearchProcessResult {
  completedTechnologyNames: string[];
}

export function canResearchTechnology(manufacturer: Manufacturer, technology: Technology, year: number): boolean {
  if (year < technology.availableFromYear) {
    return false;
  }
  if (technology.availableToYear && year > technology.availableToYear) {
    return false;
  }
  if (manufacturer.unlockedTechnologyIds.includes(technology.id)) {
    return false;
  }
  return technology.prerequisites.every((id) => manufacturer.unlockedTechnologyIds.includes(id));
}

export function processResearch(
  manufacturer: Manufacturer,
  technologies: Record<string, Technology>,
  financial: FinancialDraft
): ResearchProcessResult {
  const completedTechnologyNames: string[] = [];
  const scientistGroup = manufacturer.employees.scientists;
  let scientistCapacity = scientistGroup.headcount;

  for (const project of manufacturer.researchProjects) {
    if (project.status !== "active") {
      continue;
    }

    const technology = technologies[project.technologyId];
    if (!technology) {
      continue;
    }

    const assignedScientists = Math.min(project.assignedScientists, scientistCapacity);
    scientistCapacity -= assignedScientists;
    const spendingEffect = Math.pow(Math.max(0.1, project.monthlyBudget / 4_000_000), 0.36);
    const moraleEffect = scientistGroup.morale / 72;
    const skillEffect = scientistGroup.skill / 64;
    const points = assignedScientists * 0.018 * spendingEffect * moraleEffect * skillEffect;

    project.progress = Math.min(technology.researchPointsRequired, project.progress + points);
    manufacturer.cash -= project.monthlyBudget;
    financial.researchExpenses += project.monthlyBudget;

    if (project.progress >= technology.researchPointsRequired) {
      project.status = "completed";
      if (!manufacturer.unlockedTechnologyIds.includes(technology.id)) {
        manufacturer.unlockedTechnologyIds.push(technology.id);
      }
      completedTechnologyNames.push(`${manufacturer.name} completed ${technology.name}`);
    }
  }

  return { completedTechnologyNames };
}

export function createResearchProject(
  manufacturerId: string,
  technologyId: string,
  assignedScientists: number,
  monthlyBudget: number
): ResearchProject {
  return {
    id: `research-${manufacturerId}-${technologyId}`,
    manufacturerId,
    technologyId,
    assignedScientists,
    monthlyBudget,
    progress: 0,
    status: "active"
  };
}

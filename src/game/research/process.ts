import type { Manufacturer, ResearchProject, Technology } from "@/game/types";
import type { FinancialDraft } from "@/game/finance/calculations";
import {
  canResearchTechnology as canResearchWithRules,
  getEffectiveResearchPointsRequired
} from "@/game/research/rules";

export interface ResearchProcessResult {
  completedTechnologyNames: string[];
}

export function canResearchTechnology(
  manufacturer: Manufacturer,
  technology: Technology,
  year: number,
  technologies: Record<string, Technology>
): boolean {
  return canResearchWithRules(manufacturer, technology, year, technologies);
}

export function processResearch(
  manufacturer: Manufacturer,
  technologies: Record<string, Technology>,
  financial: FinancialDraft,
  year: number
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

    const effectiveRequired = getEffectiveResearchPointsRequired(manufacturer, technology, year, technologies);
    project.progress = Math.min(effectiveRequired, project.progress + points);
    manufacturer.cash -= project.monthlyBudget;
    financial.researchExpenses += project.monthlyBudget;

    if (project.progress >= effectiveRequired) {
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

import { DEVELOPMENT_STAGES, getStageLabel } from "@/game/development/stages";
import type { AircraftDesign, AircraftModel, AircraftProgram, Manufacturer } from "@/game/types";
import type { FinancialDraft } from "@/game/finance/calculations";
import type { RandomSource } from "@/game/utils/prng";

export interface DevelopmentProcessResult {
  updates: string[];
}

export function processDevelopment(
  manufacturer: Manufacturer,
  rng: RandomSource,
  financial: FinancialDraft,
  turn: number
): DevelopmentProcessResult {
  const updates: string[] = [];
  const engineerGroup = manufacturer.employees.engineers;
  let engineerCapacity = engineerGroup.headcount;

  for (const program of manufacturer.aircraftPrograms) {
    if (program.status !== "active") {
      continue;
    }

    const design = manufacturer.aircraftDesigns.find((candidate) => candidate.id === program.designId);
    if (!design) {
      continue;
    }

    const stage = DEVELOPMENT_STAGES[program.stageIndex] ?? DEVELOPMENT_STAGES[0];
    const assignedEngineers = Math.min(program.assignedEngineers, engineerCapacity);
    engineerCapacity -= assignedEngineers;
    const idealMonthlyBudget = design.metrics.developmentCost / Math.max(1, design.metrics.developmentDurationMonths);
    const fundingEffect = Math.min(1.35, Math.pow(Math.max(0.18, program.monthlyBudget / idealMonthlyBudget), 0.46));
    const peopleEffect = assignedEngineers / Math.max(180, 680 + design.metrics.complexity * 9);
    const teamEffect = (engineerGroup.skill / 66) * (engineerGroup.morale / 72);
    const stageScale = 0.8 / Math.max(0.03, stage.weight);
    const randomModifier = rng.nextBetween(0.92, 1.08);
    const progress = peopleEffect * teamEffect * fundingEffect * stageScale * randomModifier * 16;
    const riskProbability = (design.metrics.technologyRisk / 1_500 + design.metrics.certificationDifficulty / 2_800) * stage.riskMultiplier;

    program.stageProgress += progress;
    program.spentTotal += program.monthlyBudget;
    manufacturer.cash -= program.monthlyBudget;
    financial.developmentExpenses += program.monthlyBudget;

    if (rng.chance(riskProbability)) {
      const overrun = Math.round(program.monthlyBudget * rng.nextBetween(0.08, 0.28));
      manufacturer.cash -= overrun;
      program.spentTotal += overrun;
      program.costOverrun += overrun;
      financial.developmentExpenses += overrun;
      program.delayMonths += 1;
      updates.push(`${program.name} hit a ${getStageLabel(program.stage)} issue, adding one month of delay and extra cost.`);
    }

    while (program.stageProgress >= 100 && program.status === "active") {
      program.stageProgress -= 100;
      if (program.stageIndex >= DEVELOPMENT_STAGES.length - 1) {
        program.status = "certified";
        program.stageProgress = 100;
        const model = createModelFromProgram(manufacturer, program, design, turn);
        manufacturer.aircraftModels.push(model);
        updates.push(`${program.name} entered service as ${model.name}.`);
      } else {
        program.stageIndex += 1;
        program.stage = DEVELOPMENT_STAGES[program.stageIndex]?.id ?? "entry-into-service";
        updates.push(`${program.name} advanced to ${getStageLabel(program.stage)}.`);
      }
    }
  }

  return { updates };
}

export function createAircraftProgram(manufacturerId: string, design: AircraftDesign, turn: number): AircraftProgram {
  return {
    id: `program-${manufacturerId}-${design.input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${turn}`,
    manufacturerId,
    designId: design.id,
    name: `${design.input.name} Program`,
    category: design.input.category,
    stage: "concept-design",
    stageIndex: 0,
    stageProgress: 0,
    assignedEngineers: design.input.category === "wide-body" ? 2_400 : design.input.category === "narrow-body" ? 1_500 : 750,
    monthlyBudget: Math.round(design.metrics.developmentCost / Math.max(12, design.metrics.developmentDurationMonths)),
    spentTotal: 0,
    delayMonths: 0,
    costOverrun: 0,
    status: "active",
    launchTurn: turn,
    expectedCertificationTurn: turn + design.metrics.developmentDurationMonths,
    designRevision: 1
  };
}

function createModelFromProgram(
  manufacturer: Manufacturer,
  program: AircraftProgram,
  design: AircraftDesign,
  turn: number
): AircraftModel {
  return {
    id: `model-${program.id}`,
    manufacturerId: manufacturer.id,
    designId: design.id,
    programId: program.id,
    name: design.input.name,
    category: design.input.category,
    entryIntoServiceTurn: turn,
    listPrice: Math.round(design.metrics.expectedSellingPrice),
    productionCost: Math.round(design.metrics.unitProductionCost),
    reliability: Math.round((design.metrics.estimatedReliability + manufacturer.reputation.reliability) / 2),
    fuelEfficiencyScore: design.metrics.fuelEfficiencyScore,
    capacity: design.input.passengerCapacity,
    rangeNm: design.metrics.estimatedRangeNm,
    monthlySupportCost: Math.round(design.metrics.maintenanceCostPerFlightHour * 24),
    active: true
  };
}

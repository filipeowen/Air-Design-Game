import type { DevelopmentStageId } from "@/game/types";

export interface DevelopmentStageDefinition {
  id: DevelopmentStageId;
  label: string;
  weight: number;
  riskMultiplier: number;
}

export const DEVELOPMENT_STAGES: DevelopmentStageDefinition[] = [
  { id: "concept-design", label: "Concept design", weight: 0.08, riskMultiplier: 0.8 },
  { id: "preliminary-design", label: "Preliminary design", weight: 0.1, riskMultiplier: 0.9 },
  { id: "detailed-engineering", label: "Detailed engineering", weight: 0.18, riskMultiplier: 1.1 },
  { id: "prototype-construction", label: "Prototype construction", weight: 0.13, riskMultiplier: 1.1 },
  { id: "ground-testing", label: "Ground testing", weight: 0.11, riskMultiplier: 1.2 },
  { id: "flight-testing", label: "Flight testing", weight: 0.17, riskMultiplier: 1.35 },
  { id: "certification", label: "Certification", weight: 0.12, riskMultiplier: 1.45 },
  { id: "production-preparation", label: "Production preparation", weight: 0.08, riskMultiplier: 0.95 },
  { id: "entry-into-service", label: "Entry into service", weight: 0.03, riskMultiplier: 0.7 }
];

export function getStageLabel(stageId: DevelopmentStageId): string {
  return DEVELOPMENT_STAGES.find((stage) => stage.id === stageId)?.label ?? stageId;
}

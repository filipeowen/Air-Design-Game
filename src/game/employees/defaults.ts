import type { EmployeeGroup, EmployeeRole } from "@/game/types";

const SALARIES: Record<EmployeeRole, number> = {
  scientists: 8_500,
  engineers: 7_800,
  factoryWorkers: 4_200,
  salesStaff: 5_500
};

export function createEmployeeGroup(role: EmployeeRole, headcount: number, skill: number): EmployeeGroup {
  return {
    role,
    headcount,
    averageMonthlySalary: SALARIES[role],
    skill,
    morale: 72,
    productivity: 70
  };
}

export function calculateMonthlySalaries(groups: Record<EmployeeRole, EmployeeGroup>): number {
  return Object.values(groups).reduce(
    (sum, group) => sum + group.headcount * group.averageMonthlySalary,
    0
  );
}

export function adjustHeadcount(group: EmployeeGroup, delta: number): EmployeeGroup {
  const nextHeadcount = Math.max(0, group.headcount + delta);
  const moralePenalty = delta < 0 ? Math.min(8, Math.abs(delta) / Math.max(1, group.headcount) * 12) : 0;
  const moraleGain = delta > 0 ? Math.min(3, delta / Math.max(1, group.headcount) * 5) : 0;

  return {
    ...group,
    headcount: nextHeadcount,
    morale: Math.max(25, Math.min(95, group.morale + moraleGain - moralePenalty))
  };
}

import { calculateMonthlySalaries } from "@/game/employees/defaults";
import type { EmployeeRole, Manufacturer, MonthlyFinancialReport } from "@/game/types";

export interface FinancialDraft {
  manufacturerId: string;
  turn: number;
  aircraftRevenue: number;
  airlineDeposits: number;
  progressPayments: number;
  finalDeliveryPayments: number;
  salaries: number;
  researchExpenses: number;
  developmentExpenses: number;
  factoryExpenses: number;
  productionExpenses: number;
  taxes: number;
  warnings: string[];
}

export function createFinancialDraft(manufacturerId: string, turn: number): FinancialDraft {
  return {
    manufacturerId,
    turn,
    aircraftRevenue: 0,
    airlineDeposits: 0,
    progressPayments: 0,
    finalDeliveryPayments: 0,
    salaries: 0,
    researchExpenses: 0,
    developmentExpenses: 0,
    factoryExpenses: 0,
    productionExpenses: 0,
    taxes: 0,
    warnings: []
  };
}

export function calculatePayroll(manufacturer: Manufacturer): number {
  return calculateMonthlySalaries(manufacturer.employees as Record<EmployeeRole, Manufacturer["employees"][EmployeeRole]>);
}

export function finalizeFinancialDraft(draft: FinancialDraft, endingCash: number): MonthlyFinancialReport {
  const income = draft.airlineDeposits + draft.progressPayments + draft.finalDeliveryPayments;
  const expenses =
    draft.salaries +
    draft.researchExpenses +
    draft.developmentExpenses +
    draft.factoryExpenses +
    draft.productionExpenses +
    draft.taxes;

  return {
    ...draft,
    aircraftRevenue: income,
    profitOrLoss: income - expenses,
    endingCash
  };
}

export function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  }

  return `${sign}$${abs.toFixed(0)}`;
}

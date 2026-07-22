import { describe, expect, it } from "vitest";
import { calculatePayroll, createFinancialDraft, finalizeFinancialDraft } from "@/game/finance/calculations";
import { createNewGame } from "@/game/simulation/createGame";

describe("finance calculations", () => {
  it("calculates payroll and monthly profit or loss", () => {
    const state = createNewGame({ seed: 42 });
    const player = state.manufacturers[state.playerCompanyId]!;
    const payroll = calculatePayroll(player);
    const draft = createFinancialDraft(player.id, 1);

    draft.airlineDeposits = 100_000_000;
    draft.salaries = payroll;
    const report = finalizeFinancialDraft(draft, player.cash);

    expect(payroll).toBeGreaterThan(0);
    expect(report.profitOrLoss).toBe(100_000_000 - payroll);
  });
});

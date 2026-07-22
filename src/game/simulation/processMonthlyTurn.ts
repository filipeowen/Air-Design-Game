import { finalizeFinancialDraft, createFinancialDraft, calculatePayroll } from "@/game/finance/calculations";
import { processCompetitorDecisions } from "@/game/competitors/ai";
import { processDevelopment } from "@/game/development/process";
import { processFactoryExpenses, processProduction } from "@/game/factories/process";
import { processMarketAndEvents } from "@/game/market/events";
import { processAirlineOrders, processProgressPayments } from "@/game/orders/airlineDecisions";
import { processResearch } from "@/game/research/process";
import type { AircraftCategory, GameState, Manufacturer, MonthlyTurnReport, TurnResult } from "@/game/types";
import { advanceMonth, formatGameDate } from "@/game/utils/date";
import { createRandomSource } from "@/game/utils/prng";

export function processMonthlyTurn(gameState: GameState): TurnResult {
  const next = structuredClone(gameState);
  const rng = createRandomSource(next.randomState);
  const turn = next.turn + 1;
  const date = advanceMonth(next.date);
  const financials = new Map<string, ReturnType<typeof createFinancialDraft>>();

  for (const manufacturer of Object.values(next.manufacturers)) {
    financials.set(manufacturer.id, createFinancialDraft(manufacturer.id, turn));
  }

  const researchCompleted: string[] = [];
  const developmentUpdates: string[] = [];
  const deliveries: string[] = [];
  const warnings: string[] = [];

  for (const manufacturer of Object.values(next.manufacturers)) {
    if (manufacturer.bankrupt) {
      continue;
    }

    const financial = financials.get(manufacturer.id)!;
    const salaries = calculatePayroll(manufacturer);
    manufacturer.cash -= salaries;
    financial.salaries += salaries;

    const research = processResearch(manufacturer, next.technologies, financial);
    researchCompleted.push(...research.completedTechnologyNames);

    const development = processDevelopment(manufacturer, rng, financial, turn);
    developmentUpdates.push(...development.updates);

    processFactoryExpenses(manufacturer, financial);
  }

  processProgressPayments(next.manufacturers, next.orders, financials, turn);

  for (const manufacturer of Object.values(next.manufacturers)) {
    if (manufacturer.bankrupt) {
      continue;
    }

    const financial = financials.get(manufacturer.id)!;
    const production = processProduction(manufacturer, next.orders, rng, financial);
    deliveries.push(...production.deliveries);
  }

  const airlineResult = processAirlineOrders(
    next.manufacturers,
    next.airlines,
    next.marketSegments,
    next.orders,
    rng,
    financials,
    turn
  );

  const competitorResult = processCompetitorDecisions(
    next.manufacturers,
    next.technologies,
    next.marketSegments,
    rng,
    turn,
    date.year
  );

  const marketResult = processMarketAndEvents(next.marketSegments, rng, turn, date.year);
  next.eventHistory.push(...marketResult.events);
  updateMarketShare(next);

  for (const manufacturer of Object.values(next.manufacturers)) {
    const financial = financials.get(manufacturer.id)!;
    applyTaxes(manufacturer, financial.warnings);
    applyBankruptcyChecks(manufacturer, financial.warnings);
    if (manufacturer.isPlayer) {
      warnings.push(...financial.warnings);
    }
  }

  const financialReports = Object.values(next.manufacturers).map((manufacturer) =>
    finalizeFinancialDraft(financials.get(manufacturer.id)!, manufacturer.cash)
  );

  next.turn = turn;
  next.date = date;
  next.randomState = rng.state;

  const report: MonthlyTurnReport = {
    turn,
    date,
    summary: createSummary(next, airlineResult.orders, deliveries, developmentUpdates, researchCompleted),
    financialReports,
    researchCompleted,
    developmentUpdates,
    orders: airlineResult.orders,
    deliveries,
    competitorActions: competitorResult.actions,
    events: marketResult.events,
    warnings
  };

  next.monthlyHistory.push(report);
  if (next.monthlyHistory.length > 240) {
    next.monthlyHistory = next.monthlyHistory.slice(-240);
  }

  return { gameState: next, report };
}

function applyTaxes(manufacturer: Manufacturer, warnings: string[]): void {
  const roughOperatingProfit = manufacturer.cash > 0 ? 0 : 0;
  if (roughOperatingProfit > 0) {
    manufacturer.cash -= roughOperatingProfit * 0.18;
  }

  if (manufacturer.cash < 250_000_000 && !manufacturer.bankrupt) {
    warnings.push(`${manufacturer.name} has less than $250M cash remaining.`);
  }
}

function applyBankruptcyChecks(manufacturer: Manufacturer, warnings: string[]): void {
  if (manufacturer.cash < -450_000_000 || manufacturer.cash < -manufacturer.debt * 0.8) {
    manufacturer.bankrupt = true;
    warnings.push(`${manufacturer.name} entered bankruptcy protection.`);
  }
}

function updateMarketShare(state: GameState): void {
  const deliveredByCategory = new Map<AircraftCategory, Map<string, number>>();
  for (const category of Object.keys(state.marketSegments) as AircraftCategory[]) {
    deliveredByCategory.set(category, new Map());
  }

  for (const order of Object.values(state.orders)) {
    const manufacturer = state.manufacturers[order.manufacturerId];
    const model = manufacturer?.aircraftModels.find((candidate) => candidate.id === order.modelId);
    if (!manufacturer || !model) {
      continue;
    }
    const categoryMap = deliveredByCategory.get(model.category)!;
    categoryMap.set(manufacturer.id, (categoryMap.get(manufacturer.id) ?? 0) + order.delivered);
  }

  for (const category of Object.keys(state.marketSegments) as AircraftCategory[]) {
    const categoryMap = deliveredByCategory.get(category)!;
    const total = Array.from(categoryMap.values()).reduce((sum, value) => sum + value, 0);
    for (const manufacturer of Object.values(state.manufacturers)) {
      manufacturer.marketShare[category] = total > 0 ? Math.round(((categoryMap.get(manufacturer.id) ?? 0) / total) * 1000) / 10 : 0;
    }
  }
}

function createSummary(
  state: GameState,
  orders: string[],
  deliveries: string[],
  developmentUpdates: string[],
  researchCompleted: string[]
): string {
  const player = state.manufacturers[state.playerCompanyId];
  const date = formatGameDate(state.date);
  const orderText = orders.length > 0 ? `${orders.length} new order${orders.length === 1 ? "" : "s"}` : "no new orders";
  const deliveryText = deliveries.length > 0 ? `${deliveries.length} delivery event${deliveries.length === 1 ? "" : "s"}` : "no deliveries";
  const researchText = researchCompleted.length > 0 ? `${researchCompleted.length} technology completion${researchCompleted.length === 1 ? "" : "s"}` : "no completed research";
  const programText = developmentUpdates.length > 0 ? `${developmentUpdates.length} program update${developmentUpdates.length === 1 ? "" : "s"}` : "steady development work";
  return `${date}: ${player?.name ?? "The player company"} recorded ${orderText}, ${deliveryText}, ${researchText}, and ${programText}.`;
}

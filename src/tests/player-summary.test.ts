import { describe, expect, it } from "vitest";
import { createNewGame } from "@/game/simulation/createGame";
import { processMonthlyTurn } from "@/game/simulation/processMonthlyTurn";

describe("player monthly summary", () => {
  it("does not report competitor orders as player orders", () => {
    const state = createNewGame({ seed: 200047428 });
    const result = processMonthlyTurn(state);
    const playerOrders = Object.values(result.gameState.orders).filter(
      (order) => order.manufacturerId === result.gameState.playerCompanyId
    );

    expect(playerOrders).toHaveLength(0);
    expect(result.report.summary).toContain("no new orders");
  });
});

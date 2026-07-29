import { describe, expect, it } from "vitest";
import { buildGameDeepLink, emailActionToDeepLink, parseGameDeepLink } from "@/game/navigation/deepLinks";

describe("game deep links", () => {
  it("builds and parses section entity links", () => {
    expect(buildGameDeepLink({ section: "research", entityType: "research", entityId: "advanced-winglets" })).toBe(
      "/research?technology=advanced-winglets"
    );
    expect(parseGameDeepLink("/orders", "?order=order-143")).toEqual({
      section: "orders",
      entityType: "order",
      entityId: "order-143"
    });
  });

  it("converts structured email actions into navigation targets", () => {
    expect(
      emailActionToDeepLink({
        id: "review",
        label: "Review finances",
        actionType: "navigate",
        targetRoute: "/finance",
        targetEntityId: "cash-flow"
      })
    ).toEqual({
      section: "finance",
      entityType: "cashFlow",
      entityId: "cash-flow"
    });
  });
});

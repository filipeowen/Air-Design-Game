import { describe, expect, it } from "vitest";
import { getEffectiveResearchPointsRequired } from "@/game/research/rules";
import { createResearchProject } from "@/game/research/process";
import { getGameEmails } from "@/game/email/messages";
import { markAllPlayerEmailsRead, markPlayerEmailRead } from "@/game/simulation/actions";
import { createNewGame } from "@/game/simulation/createGame";
import { processMonthlyTurn } from "@/game/simulation/processMonthlyTurn";

describe("email event system", () => {
  it("starts a new campaign with company inbox messages", () => {
    const state = createNewGame({ seed: 701 });
    const emails = getGameEmails(state);

    expect(emails.length).toBeGreaterThanOrEqual(3);
    expect(emails.some((email) => email.category === "executive")).toBe(true);
    expect(emails.every((email) => email.read === false)).toBe(true);
  });

  it("creates monthly operating emails after a turn", () => {
    const state = createNewGame({ seed: 702 });
    const result = processMonthlyTurn(state);
    const emails = getGameEmails(result.gameState);

    expect(emails.length).toBeGreaterThan(getGameEmails(state).length);
    expect(emails.some((email) => email.subject.startsWith("Monthly operating brief"))).toBe(true);
  });

  it("sends research completion through email", () => {
    const state = createNewGame({ seed: 703 });
    const player = state.manufacturers[state.playerCompanyId]!;
    const technology = state.technologies["high-bypass-turbofans"]!;
    const project = createResearchProject(player.id, technology.id, 200, 6_000_000);
    project.progress = getEffectiveResearchPointsRequired(player, technology, state.date.year, state.technologies);
    player.researchProjects.push(project);

    const result = processMonthlyTurn(state);
    const emails = getGameEmails(result.gameState);

    expect(emails.some((email) => email.category === "research" && email.subject.includes(technology.name))).toBe(true);
  });

  it("persists read and clear actions in game state", () => {
    let state = createNewGame({ seed: 704 });
    const firstEmail = getGameEmails(state)[0]!;

    state = markPlayerEmailRead(state, firstEmail.id);
    expect(getGameEmails(state).find((email) => email.id === firstEmail.id)?.read).toBe(true);

    state = markAllPlayerEmailsRead(state);
    expect(getGameEmails(state).every((email) => email.read)).toBe(true);
  });
});

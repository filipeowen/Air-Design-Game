import { formatMoney } from "@/game/finance/calculations";
import type { GameEmail, GameEmailCategory, GameEmailPriority, GameState, MonthlyTurnReport } from "@/game/types";
import { formatGameDate } from "@/game/utils/date";

const MAX_EMAILS = 260;

interface EmailDraft {
  turn: number;
  date: GameEmail["date"];
  from: string;
  to: string;
  category: GameEmailCategory;
  priority: GameEmailPriority;
  subject: string;
  preview: string;
  body: string[];
  relatedEntityId?: string;
  read?: boolean;
}

export function createOpeningEmails(state: GameState): GameEmail[] {
  const player = state.manufacturers[state.playerCompanyId];
  const to = player?.name ?? "Executive Office";
  return [
    buildEmail(0, {
      turn: state.turn,
      date: state.date,
      from: "Board Office",
      to,
      category: "executive",
      priority: "high",
      subject: "Board memorandum: January 1970 operating mandate",
      preview: "The board expects a disciplined path from design work to certified aircraft and airline commitments.",
      body: [
        "The company begins January 1970 with capital, a medium final assembly facility, and a modest engineering base.",
        "Your immediate priorities are to launch a credible aircraft program, invest in research, and build airline confidence before competitors lock up the market.",
        "Major company updates, airline correspondence, market news, and technical progress will arrive here."
      ]
    }),
    buildEmail(1, {
      turn: state.turn,
      date: state.date,
      from: "Research Directorate",
      to,
      category: "research",
      priority: "normal",
      subject: "R&D briefing: technology access and research slots",
      preview: "Advanced systems will remain unavailable in aircraft designs until your teams complete the required research.",
      body: [
        "The design studio is now tied to the research tree. Locked technologies cannot be selected for new aircraft until they are completed.",
        "Research can be started before its historical year, but ahead-of-time work carries a penalty unless breakthrough projects reduce it.",
        "Your current facilities support a limited number of simultaneous research projects."
      ]
    }),
    buildEmail(2, {
      turn: state.turn,
      date: state.date,
      from: "Commercial Desk",
      to,
      category: "airline",
      priority: "normal",
      subject: "Airline relations desk opened",
      preview: "Airlines will contact us through purchase agreements, delivery updates, and market feedback.",
      body: [
        "The sales team has opened correspondence with regional and mainline carriers.",
        "New orders, deliveries, and relationship-sensitive airline communications will be routed to this inbox.",
        "Until you certify an aircraft, incoming commercial mail will be light."
      ]
    })
  ];
}

export function getGameEmails(state: GameState): GameEmail[] {
  const candidate = state as GameState & { emails?: GameEmail[] };
  return candidate.emails ?? createLegacyReportEmails(state);
}

export function ensureEmailInbox(state: GameState): GameEmail[] {
  const candidate = state as GameState & { emails?: GameEmail[] };
  candidate.emails ??= createLegacyReportEmails(state);
  return candidate.emails;
}

export function appendGameEmail(state: GameState, draft: Omit<EmailDraft, "turn" | "date" | "to"> & Partial<Pick<EmailDraft, "turn" | "date" | "to">>): GameEmail {
  const inbox = ensureEmailInbox(state);
  const player = state.manufacturers[state.playerCompanyId];
  const email = buildEmail(inbox.length, {
    turn: draft.turn ?? state.turn,
    date: draft.date ?? state.date,
    to: draft.to ?? player?.name ?? "Executive Office",
    from: draft.from,
    category: draft.category,
    priority: draft.priority,
    subject: draft.subject,
    preview: draft.preview,
    body: draft.body,
    relatedEntityId: draft.relatedEntityId,
    read: draft.read
  });
  inbox.push(email);
  trimInbox(state);
  return email;
}

export function createTurnEmails(state: GameState, report: MonthlyTurnReport): GameEmail[] {
  const inbox = ensureEmailInbox(state);
  const player = state.manufacturers[state.playerCompanyId];
  if (!player) {
    return [];
  }

  const drafts: EmailDraft[] = [];
  const to = player.name;
  const dateLabel = formatGameDate(report.date);
  const playerFinancial = report.financialReports.find((financial) => financial.manufacturerId === player.id);
  const playerOrders = Object.values(state.orders).filter((order) => order.manufacturerId === player.id && order.orderTurn === report.turn);
  const playerResearch = report.researchCompleted.filter((message) => message.startsWith(`${player.name} completed `));
  const playerDevelopment = report.developmentUpdates.filter((message) =>
    player.aircraftPrograms.some((program) => message.startsWith(program.name))
  );
  const playerFactoryUpdates = report.developmentUpdates.filter((message) => message.startsWith(`${player.name} completed `));
  const playerDeliveries = report.deliveries.filter((message) => message.startsWith(`${player.name} delivered `));

  drafts.push({
    turn: report.turn,
    date: report.date,
    from: "Executive Office",
    to,
    category: "executive",
    priority: report.warnings.length > 0 ? "high" : "normal",
    subject: `Monthly operating brief: ${dateLabel}`,
    preview: report.summary,
    body: [
      report.summary,
      playerFinancial
        ? `Monthly result: ${formatMoney(playerFinancial.profitOrLoss)}. Ending cash: ${formatMoney(playerFinancial.endingCash)}.`
        : "Finance has not closed the month yet.",
      `${playerOrders.length} new airline order${playerOrders.length === 1 ? "" : "s"}, ${playerDeliveries.length} delivery update${playerDeliveries.length === 1 ? "" : "s"}, ${playerResearch.length} research completion${playerResearch.length === 1 ? "" : "s"}.`
    ]
  });

  for (const message of playerResearch) {
    const technologyName = message.replace(`${player.name} completed `, "");
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Research Directorate",
      to,
      category: "research",
      priority: "high",
      subject: `Research complete: ${technologyName}`,
      preview: `${technologyName} has moved from laboratory work into the usable company technology base.`,
      body: [
        message,
        "The design studio and future aircraft programs can now use the unlocked capability where applicable.",
        "Review the aircraft design options and research tree before committing the next major program."
      ]
    });
  }

  for (const message of playerDevelopment) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Program Management Office",
      to,
      category: "development",
      priority: message.includes("issue") ? "high" : "normal",
      subject: message.includes("entered service") ? "Aircraft certified for service" : "Aircraft program update",
      preview: message,
      body: [
        message,
        "Engineering progress has been reflected in the development program ledger.",
        "Budget and engineer assignments can be adjusted from the Development tab."
      ]
    });
  }

  for (const message of playerFactoryUpdates) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Industrial Operations",
      to,
      category: "operations",
      priority: "normal",
      subject: "Factory construction complete",
      preview: message,
      body: [
        message,
        "The facility is now available for production assignment.",
        "Select a certified aircraft in the Factories tab to start using the new capacity."
      ]
    });
  }

  for (const order of playerOrders) {
    const airline = state.airlines[order.airlineId];
    const model = player.aircraftModels.find((candidate) => candidate.id === order.modelId);
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: airline?.name ?? "Airline Purchasing",
      to,
      category: "airline",
      priority: "high",
      subject: `Purchase agreement: ${model?.name ?? "Aircraft order"}`,
      preview: `${airline?.name ?? "An airline"} ordered ${order.quantity} aircraft with ${formatMoney(order.depositPaid)} deposited.`,
      body: [
        `${airline?.name ?? "The airline"} has signed for ${order.quantity} ${model?.name ?? "aircraft"}.`,
        `Negotiated unit price: ${formatMoney(order.pricePerAircraft)}. Deposit received: ${formatMoney(order.depositPaid)}.`,
        `Planned delivery window begins around turn ${order.deliveryStartTurn}.`
      ],
      relatedEntityId: order.id
    });
  }

  for (const message of playerDeliveries) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Delivery Center",
      to,
      category: "airline",
      priority: "normal",
      subject: "Aircraft delivery confirmation",
      preview: message,
      body: [
        message,
        "Final delivery payments have been applied to cash this month.",
        "Reliable deliveries improve customer trust and future order competitiveness."
      ]
    });
  }

  for (const event of report.events) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Industry News Desk",
      to,
      category: "market",
      priority: event.severity >= 65 ? "high" : "normal",
      subject: event.title,
      preview: event.description,
      body: [event.description, ...event.effects.map((effect) => `Effect: ${effect}`)],
      relatedEntityId: event.id
    });
  }

  if (report.competitorActions.length > 0) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Market Intelligence",
      to,
      category: "competitor",
      priority: "normal",
      subject: "Competitor activity brief",
      preview: report.competitorActions.slice(0, 2).join(" "),
      body: report.competitorActions.slice(0, 8)
    });
  }

  for (const warning of report.warnings) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Finance and Risk Office",
      to,
      category: "finance",
      priority: "urgent",
      subject: "Risk alert",
      preview: warning,
      body: [
        warning,
        "The issue has been flagged for executive review before the next month closes."
      ]
    });
  }

  return drafts.map((draft, index) => buildEmail(inbox.length + index, draft));
}

export function trimInbox(state: GameState): void {
  const inbox = ensureEmailInbox(state);
  if (inbox.length > MAX_EMAILS) {
    (state as GameState & { emails?: GameEmail[] }).emails = inbox.slice(-MAX_EMAILS);
  }
}

function createLegacyReportEmails(state: GameState): GameEmail[] {
  const player = state.manufacturers[state.playerCompanyId];
  if (!player || state.monthlyHistory.length === 0) {
    return [];
  }

  return state.monthlyHistory.flatMap((report, reportIndex) => {
    const messages = [
      report.summary,
      ...report.researchCompleted.filter((message) => message.startsWith(`${player.name} completed `)),
      ...report.developmentUpdates.filter((message) => player.aircraftPrograms.some((program) => message.startsWith(program.name))),
      ...report.orders.filter((message) => message.includes(` from ${player.name}.`)),
      ...report.deliveries.filter((message) => message.startsWith(`${player.name} delivered `)),
      ...report.events.map((event) => `${event.title}: ${event.description}`),
      ...report.warnings
    ];

    return messages.slice(0, 12).map((message, messageIndex) =>
      buildEmail(reportIndex * 12 + messageIndex, {
        turn: report.turn,
        date: report.date,
        from: messageIndex === 0 ? "Executive Office" : "Archive Import",
        to: player.name,
        category: messageIndex === 0 ? "executive" : "operations",
        priority: "normal",
        subject: messageIndex === 0 ? `Archived monthly brief: ${formatGameDate(report.date)}` : "Archived campaign update",
        preview: message,
        body: [message],
        read: true
      })
    );
  }).slice(-MAX_EMAILS);
}

function buildEmail(index: number, draft: EmailDraft): GameEmail {
  return {
    id: `email-${draft.turn}-${draft.category}-${slug(draft.subject)}-${index}`,
    turn: draft.turn,
    date: draft.date,
    from: draft.from,
    to: draft.to,
    category: draft.category,
    priority: draft.priority,
    subject: draft.subject,
    preview: draft.preview,
    body: draft.body,
    read: draft.read ?? false,
    relatedEntityId: draft.relatedEntityId
  };
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "message";
}

import { formatMoney } from "@/game/finance/calculations";
import type {
  GameEmail,
  GameEmailAction,
  GameEmailCategory,
  GameEmailPriority,
  GameEmailRelatedEntityType,
  GameEmailStatus,
  GameState,
  MonthlyTurnReport
} from "@/game/types";
import { formatGameDate } from "@/game/utils/date";

const MAX_EMAILS = 260;

interface EmailDraft {
  turn: number;
  date: GameEmail["date"];
  from: string;
  fromRole?: string;
  fromOrganization?: string;
  to: string;
  category: GameEmailCategory;
  priority: GameEmailPriority;
  subject: string;
  preview: string;
  body: string[];
  archived?: boolean;
  requiresAction?: boolean;
  deadlineTurn?: number;
  status?: GameEmailStatus;
  actions?: GameEmailAction[];
  relatedEntity?: {
    type: GameEmailRelatedEntityType;
    id: string;
  };
  fromEntityId?: string;
  toEntityId?: string;
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
      from: "Board of Directors",
      fromRole: "Board office",
      to,
      toEntityId: player?.id,
      category: "board",
      priority: "important",
      subject: `Welcome to ${to}`,
      preview: "The board expects a disciplined path from design work to certified aircraft and airline commitments.",
      body: [
        `${to} begins January 1970 with ${formatMoney(player?.cash ?? 0)} in cash, a medium final assembly facility, and a modest engineering base.`,
        "Your immediate priorities are to launch a credible aircraft program, invest in research, and build airline confidence before competitors lock up the market.",
        "Major company updates, airline correspondence, market news, and technical progress will arrive here."
      ],
      actions: [
        navigateAction("review-overview", "Review company overview", "/overview"),
        navigateAction("review-research", "Review available research", "/research"),
        navigateAction("begin-design", "Begin first aircraft design", "/development", "design-studio")
      ]
    }),
    buildEmail(1, {
      turn: state.turn,
      date: state.date,
      from: "Director of Research",
      fromOrganization: "Research Directorate",
      to,
      toEntityId: player?.id,
      category: "research",
      priority: "normal",
      subject: "Research department awaiting direction",
      preview: "Advanced systems will remain unavailable in aircraft designs until your teams complete the required research.",
      body: [
        `${(player?.employees.scientists.headcount ?? 0).toLocaleString()} scientists are on payroll and ready for assignment.`,
        "The design studio is tied to the research tree. Locked technologies cannot be selected for new aircraft until they are completed.",
        "Research can be started before its historical year, but ahead-of-time work carries a penalty unless breakthrough projects reduce it.",
        "Idle scientists still draw salaries, so the board recommends opening the research tree before ending the month."
      ],
      requiresAction: true,
      status: "open",
      actions: [navigateAction("choose-research", "Choose research project", "/research")]
    }),
    buildEmail(2, {
      turn: state.turn,
      date: state.date,
      from: "Chief Engineer",
      fromOrganization: "Engineering",
      to,
      toEntityId: player?.id,
      category: "engineering",
      priority: "normal",
      subject: "Proposal for our first commercial aircraft program",
      preview: "Engineering recommends reviewing the Design Studio before the market settles around competitor products.",
      body: [
        "The available starting work can target regional, narrow-body, or wide-body markets, with sharply different risk and capital needs.",
        "A narrow-body design is a reasonable first review because airlines already show demand and the existing factory can support that class.",
        "Open the Design Studio to inspect capacity, range, engines, materials, and projected finances before authorizing a program."
      ],
      requiresAction: true,
      status: "open",
      actions: [navigateAction("open-design-studio", "Open Design Studio", "/development", "design-studio")]
    }),
    buildEmail(3, {
      turn: state.turn,
      date: state.date,
      from: "Vice President of Manufacturing",
      fromOrganization: "Manufacturing",
      to,
      toEntityId: player?.id,
      category: "manufacturing",
      priority: "normal",
      subject: "Factory capacity and staffing report",
      preview: "Final assembly capacity is available, but no certified company aircraft are assigned to production yet.",
      body: [
        `The factory network starts with ${player?.factories.length ?? 0} active facility and ${(player?.employees.factoryWorkers.headcount ?? 0).toLocaleString()} factory workers.`,
        "The existing facility can support regional and narrow-body aircraft once a model is certified.",
        "Factory changes, worker shortages, production assignments, and delivery readiness will be routed through this inbox."
      ],
      actions: [navigateAction("review-factory", "Review factory network", "/factory")]
    }),
    buildEmail(4, {
      turn: state.turn,
      date: state.date,
      from: "Chief Financial Officer",
      fromOrganization: "Finance",
      to,
      toEntityId: player?.id,
      category: "finance",
      priority: "normal",
      subject: "Opening financial position",
      preview: "Cash is healthy for a first program, but payroll and development spending will begin immediately.",
      body: [
        `Opening cash: ${formatMoney(player?.cash ?? 0)}.`,
        "The largest near-term risks are idle payroll, unfunded development work, and factory costs before aircraft deliveries begin.",
        "Finance will email warnings when monthly losses or cash runway cross important thresholds."
      ],
      actions: [navigateAction("review-finance", "Review finances", "/finance")]
    })
  ];
}

export function getGameEmails(state: GameState): GameEmail[] {
  const candidate = state as GameState & { emails?: GameEmail[] };
  return normalizeInbox(candidate.emails ?? createLegacyReportEmails(state));
}

export function ensureEmailInbox(state: GameState): GameEmail[] {
  const candidate = state as GameState & { emails?: GameEmail[] };
  candidate.emails ??= createLegacyReportEmails(state);
  candidate.emails = normalizeInbox(candidate.emails);
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
    fromRole: draft.fromRole,
    fromOrganization: draft.fromOrganization,
    category: draft.category,
    priority: draft.priority,
    subject: draft.subject,
    preview: draft.preview,
    body: draft.body,
    archived: draft.archived,
    requiresAction: draft.requiresAction,
    deadlineTurn: draft.deadlineTurn,
    status: draft.status,
    actions: draft.actions,
    fromEntityId: draft.fromEntityId,
    toEntityId: draft.toEntityId ?? player?.id,
    relatedEntity: draft.relatedEntity,
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
    toEntityId: player.id,
    category: "board",
    priority: report.warnings.length > 0 ? "important" : "normal",
    subject: `Monthly operating brief: ${dateLabel}`,
    preview: report.summary,
    body: [
      report.summary,
      playerFinancial
        ? `Monthly result: ${formatMoney(playerFinancial.profitOrLoss)}. Ending cash: ${formatMoney(playerFinancial.endingCash)}.`
        : "Finance has not closed the month yet.",
      `${playerOrders.length} new airline order${playerOrders.length === 1 ? "" : "s"}, ${playerDeliveries.length} delivery update${playerDeliveries.length === 1 ? "" : "s"}, ${playerResearch.length} research completion${playerResearch.length === 1 ? "" : "s"}.`
    ],
    actions: [
      navigateAction("open-overview", "Open overview", "/overview"),
      navigateAction("review-finance", "Review finances", "/finance", "cash-flow")
    ]
  });

  for (const message of playerResearch) {
    const technologyName = message.replace(`${player.name} completed `, "");
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Research Directorate",
      to,
      toEntityId: player.id,
      category: "research",
      priority: "important",
      subject: `Research complete: ${technologyName}`,
      preview: `${technologyName} has moved from laboratory work into the usable company technology base.`,
      body: [
        message,
        "The design studio and future aircraft programs can now use the unlocked capability where applicable.",
        "Review the aircraft design options and research tree before committing the next major program."
      ],
      actions: [navigateAction("view-technology", "View unlocked technology", "/research", technologyName)],
      relatedEntity: {
        type: "research",
        id: technologyName
      }
    });
  }

  for (const message of playerDevelopment) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Program Management Office",
      to,
      toEntityId: player.id,
      category: "engineering",
      priority: message.includes("issue") ? "important" : "normal",
      subject: message.includes("entered service") ? "Aircraft certified for service" : "Aircraft program update",
      preview: message,
      body: [
        message,
        "Engineering progress has been reflected in the development program ledger.",
        "Budget and engineer assignments can be adjusted from the Development tab."
      ],
      actions: [navigateAction("review-programs", "Review program", "/development", "programs")]
    });
  }

  for (const message of playerFactoryUpdates) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Industrial Operations",
      to,
      toEntityId: player.id,
      category: "manufacturing",
      priority: "normal",
      subject: "Factory construction complete",
      preview: message,
      body: [
        message,
        "The facility is now available for production assignment.",
        "Select a certified aircraft in the Factories tab to start using the new capacity."
      ],
      actions: [navigateAction("review-factory", "Review factory network", "/factory")]
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
      fromEntityId: airline?.id,
      toEntityId: player.id,
      category: "orders",
      priority: "important",
      subject: `Purchase agreement: ${model?.name ?? "Aircraft order"}`,
      preview: `${airline?.name ?? "An airline"} ordered ${order.quantity} aircraft with ${formatMoney(order.depositPaid)} deposited.`,
      body: [
        `${airline?.name ?? "The airline"} has signed for ${order.quantity} ${model?.name ?? "aircraft"}.`,
        `Negotiated unit price: ${formatMoney(order.pricePerAircraft)}. Deposit received: ${formatMoney(order.depositPaid)}.`,
        `Planned delivery window begins around turn ${order.deliveryStartTurn}.`
      ],
      actions: [navigateAction("review-order", "Review proposal", "/orders", order.id)],
      relatedEntity: {
        type: "order",
        id: order.id
      },
      relatedEntityId: order.id
    });
  }

  for (const message of playerDeliveries) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Delivery Center",
      to,
      toEntityId: player.id,
      category: "orders",
      priority: "normal",
      subject: "Aircraft delivery confirmation",
      preview: message,
      body: [
        message,
        "Final delivery payments have been applied to cash this month.",
        "Reliable deliveries improve customer trust and future order competitiveness."
      ],
      actions: [navigateAction("view-delivery-schedule", "View delivery schedule", "/orders", "delivery-calendar")]
    });
  }

  for (const event of report.events) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Industry News Desk",
      to,
      toEntityId: player.id,
      category: "market-intelligence",
      priority: event.severity >= 65 ? "important" : "normal",
      subject: event.title,
      preview: event.description,
      body: [event.description, ...event.effects.map((effect) => `Effect: ${effect}`)],
      actions: [navigateAction("view-market-impact", "View market impact", "/overview", event.id)],
      relatedEntity: {
        type: "event",
        id: event.id
      },
      relatedEntityId: event.id
    });
  }

  if (report.competitorActions.length > 0) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Market Intelligence",
      to,
      toEntityId: player.id,
      category: "competitors",
      priority: "normal",
      subject: "Competitor activity brief",
      preview: report.competitorActions.slice(0, 2).join(" "),
      body: report.competitorActions.slice(0, 8),
      actions: [navigateAction("view-market-intel", "View market impact", "/overview", "competitors")]
    });
  }

  for (const warning of report.warnings) {
    drafts.push({
      turn: report.turn,
      date: report.date,
      from: "Finance and Risk Office",
      to,
      toEntityId: player.id,
      category: "finance",
      priority: "urgent",
      subject: "Risk alert",
      preview: warning,
      body: [
        warning,
        "The issue has been flagged for executive review before the next month closes."
      ],
      requiresAction: true,
      status: "open",
      actions: [navigateAction("review-finances", "Review finances", "/finance", "cash-flow")]
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
        toEntityId: player.id,
        category: messageIndex === 0 ? "board" : "general",
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
  return normalizeEmail({
    id: `email-${draft.turn}-${draft.category}-${slug(draft.subject)}-${index}`,
    turn: draft.turn,
    date: draft.date,
    from: draft.from,
    fromRole: draft.fromRole,
    fromOrganization: draft.fromOrganization,
    to: draft.to,
    category: draft.category,
    priority: draft.priority,
    subject: draft.subject,
    preview: draft.preview,
    body: draft.body,
    read: draft.read ?? false,
    archived: draft.archived ?? false,
    requiresAction: draft.requiresAction ?? false,
    deadlineTurn: draft.deadlineTurn,
    status: draft.status ?? (draft.requiresAction ? "open" : "informational"),
    actions: draft.actions ?? [],
    fromEntityId: draft.fromEntityId,
    toEntityId: draft.toEntityId,
    relatedEntity: draft.relatedEntity,
    relatedEntityId: draft.relatedEntityId
  });
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "message";
}

function navigateAction(id: string, label: string, targetRoute: string, targetEntityId?: string): GameEmailAction {
  return {
    id,
    label,
    actionType: "navigate",
    targetRoute,
    targetEntityId
  };
}

function normalizeInbox(emails: GameEmail[]): GameEmail[] {
  return emails.map((email) => normalizeEmail(email));
}

function normalizeEmail(email: GameEmail): GameEmail {
  const candidate = email as GameEmail & {
    category: GameEmailCategory | "executive" | "development" | "airline" | "operations" | "market" | "competitor";
    priority: GameEmailPriority | "low" | "high";
  };
  return {
    ...email,
    category: normalizeCategory(candidate.category),
    priority: normalizePriority(candidate.priority),
    archived: email.archived ?? false,
    requiresAction: email.requiresAction ?? false,
    status: email.status ?? (email.requiresAction ? "open" : "informational"),
    actions: email.actions ?? [],
    relatedEntity:
      email.relatedEntity ??
      (email.relatedEntityId
        ? {
            type: "event",
            id: email.relatedEntityId
          }
        : undefined)
  };
}

function normalizeCategory(
  category: GameEmailCategory | "executive" | "development" | "airline" | "operations" | "market" | "competitor"
): GameEmailCategory {
  if (category === "executive") {
    return "board";
  }
  if (category === "development") {
    return "engineering";
  }
  if (category === "airline") {
    return "airline-relations";
  }
  if (category === "operations") {
    return "manufacturing";
  }
  if (category === "market") {
    return "market-intelligence";
  }
  if (category === "competitor") {
    return "competitors";
  }
  return category;
}

function normalizePriority(priority: GameEmailPriority | "low" | "high"): GameEmailPriority {
  if (priority === "low") {
    return "informational";
  }
  if (priority === "high") {
    return "important";
  }
  return priority;
}

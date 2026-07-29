import type { GameEmailAction, GameEmailRelatedEntityType } from "@/game/types";

export type GameSection = "overview" | "email" | "research" | "development" | "factory" | "finance" | "orders";

export interface GameDeepLinkTarget {
  section: GameSection;
  entityType?: GameEmailRelatedEntityType | "designStudio" | "cashFlow" | "deliveryCalendar" | "competitors";
  entityId?: string;
}

const SECTION_PATHS: Record<GameSection, string> = {
  overview: "/overview",
  email: "/email",
  research: "/research",
  development: "/development",
  factory: "/factory",
  finance: "/finance",
  orders: "/orders"
};

const PATH_SECTIONS: Record<string, GameSection> = {
  "/": "email",
  "/overview": "overview",
  "/email": "email",
  "/research": "research",
  "/development": "development",
  "/factory": "factory",
  "/finance": "finance",
  "/orders": "orders"
};

export function buildGameDeepLink(target: GameDeepLinkTarget): string {
  const params = new URLSearchParams();
  const parameterKey = parameterForTarget(target);
  if (parameterKey && target.entityId) {
    params.set(parameterKey, target.entityId);
  }

  const query = params.toString();
  return `${SECTION_PATHS[target.section]}${query ? `?${query}` : ""}`;
}

export function parseGameDeepLink(pathname: string, search = ""): GameDeepLinkTarget {
  const section = PATH_SECTIONS[pathname] ?? "email";
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const entity = firstEntityParam(section, params);
  return {
    section,
    entityType: entity?.type,
    entityId: entity?.id
  };
}

export function emailActionToDeepLink(action: GameEmailAction): GameDeepLinkTarget | null {
  if (action.actionType !== "navigate" || !action.targetRoute) {
    return null;
  }

  const section = PATH_SECTIONS[action.targetRoute] ?? routeNameToSection(action.targetRoute);
  return {
    section,
    entityType: inferActionEntityType(section, action.targetEntityId),
    entityId: action.targetEntityId
  };
}

function parameterForTarget(target: GameDeepLinkTarget): string | null {
  if (target.section === "research") {
    return "technology";
  }
  if (target.section === "development") {
    return target.entityType === "designStudio" ? "section" : "program";
  }
  if (target.section === "factory") {
    return "factory";
  }
  if (target.section === "finance") {
    return "section";
  }
  if (target.section === "orders") {
    return target.entityType === "airline" ? "airline" : "order";
  }
  if (target.section === "email") {
    return "email";
  }
  if (target.section === "overview") {
    return "section";
  }
  return null;
}

function firstEntityParam(section: GameSection, params: URLSearchParams): { type: GameDeepLinkTarget["entityType"]; id: string } | null {
  if (section === "research" && params.get("technology")) {
    return { type: "research", id: params.get("technology")! };
  }
  if (section === "development") {
    if (params.get("program")) {
      return { type: "aircraftProgram", id: params.get("program")! };
    }
    if (params.get("section")) {
      return { type: "designStudio", id: params.get("section")! };
    }
  }
  if (section === "factory" && params.get("factory")) {
    return { type: "factory", id: params.get("factory")! };
  }
  if (section === "finance" && params.get("section")) {
    return { type: "cashFlow", id: params.get("section")! };
  }
  if (section === "orders") {
    if (params.get("order")) {
      return { type: "order", id: params.get("order")! };
    }
    if (params.get("airline")) {
      return { type: "airline", id: params.get("airline")! };
    }
  }
  if (section === "email" && params.get("email")) {
    return { type: "email", id: params.get("email")! };
  }
  if (section === "overview" && params.get("section")) {
    return { type: "competitors", id: params.get("section")! };
  }
  return null;
}

function routeNameToSection(route: string): GameSection {
  const normalized = route.replace(/^\//, "");
  if (normalized === "overview" || normalized === "research" || normalized === "development" || normalized === "factory" || normalized === "finance" || normalized === "orders") {
    return normalized;
  }
  return "email";
}

function inferActionEntityType(section: GameSection, entityId?: string): GameDeepLinkTarget["entityType"] {
  if (!entityId) {
    return undefined;
  }
  if (section === "research") {
    return "research";
  }
  if (section === "development") {
    return entityId === "design-studio" || entityId === "programs" ? "designStudio" : "aircraftProgram";
  }
  if (section === "factory") {
    return "factory";
  }
  if (section === "finance") {
    return "cashFlow";
  }
  if (section === "orders") {
    return entityId === "delivery-calendar" ? "deliveryCalendar" : "order";
  }
  if (section === "overview") {
    return "competitors";
  }
  return "email";
}

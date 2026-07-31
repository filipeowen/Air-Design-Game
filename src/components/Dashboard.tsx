"use client";

import {
  AlertTriangle,
  Archive,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock3,
  Factory,
  FileText,
  FlaskConical,
  Gauge,
  Lock,
  Mail,
  MailCheck,
  MailOpen,
  PackageCheck,
  Plane,
  Play,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AIRCRAFT_CATEGORIES } from "@/data/aircraftCategories";
import { GAME_CONTENT_SETTINGS } from "@/data/contentSettings";
import { FACTORY_COUNTRIES } from "@/data/factoryCountries";
import { getAircraftNameSelection, getManufacturerIdentities } from "@/data/identities";
import { RESEARCH_ERAS, TECHNOLOGY_BRANCHES } from "@/data/technologies";
import {
  buildAircraftDesignInputFromStudio,
  calculateAircraftPerformance,
  calculateCabinGeometry,
  createDefaultAircraftStudioDesign,
  getAvailableEngineOptions,
  sanitizeAircraftStudioDesign
} from "@/game/aircraft/advancedDesign";
import {
  CABIN_CLASS_DEFAULTS,
  DESIGN_CATEGORY_LIMITS,
  HIGH_LIFT_FACTORS,
  MATERIAL_FACTORS,
  SYSTEM_FACTORS,
  WINGTIP_FACTORS
} from "@/game/aircraft/designConfig";
import { getGameEmails } from "@/game/email/messages";
import { getAssignedFactoryWorkers, getFactoryAssignedWorkers, getFactoryStatus } from "@/game/factories/process";
import { canResearchTechnology } from "@/game/research/process";
import {
  getAheadOfTimePenaltyMultiplier,
  getAheadOfTimeYears,
  getEffectiveResearchPointsRequired,
  getResearchSlotCount,
  getTechnologyResearchState,
  hasResearchSlotAvailable
} from "@/game/research/rules";
import {
  assignPlayerProductionLine,
  acknowledgePlayerEmail,
  archivePlayerEmail,
  buildPlayerFactory,
  changeEmployeeHeadcount,
  closePlayerFactory,
  idlePlayerFactoryProduction,
  launchPlayerAircraftProgram,
  markAllPlayerEmailsRead,
  markPlayerEmailRead,
  startPlayerResearch,
  updatePlayerProgram
} from "@/game/simulation/actions";
import { createNewGame } from "@/game/simulation/createGame";
import { processMonthlyTurn } from "@/game/simulation/processMonthlyTurn";
import {
  buildGameDeepLink,
  emailActionToDeepLink,
  parseGameDeepLink,
  type GameDeepLinkTarget,
  type GameSection
} from "@/game/navigation/deepLinks";
import type {
  AircraftCategory,
  AircraftCalculatedPerformance,
  AircraftDesignStageId,
  AircraftStudioDesign,
  AvionicsGeneration,
  CabinClass,
  EngineModelId,
  EnginePosition,
  FlightControlSystem,
  Factory as FactoryRecord,
  FactoryStatus,
  GameEmail,
  GameEmailCategory,
  GameEmailPriority,
  GameState,
  ManufacturerIdentity,
  MonthlyFinancialReport,
  MissionProfile,
  StructuralMaterialChoice,
  Technology,
  TechnologyBranch
} from "@/game/types";
import { formatGameDate } from "@/game/utils/date";
import { formatMoney } from "@/game/finance/calculations";
import {
  deleteSaveSlot,
  listLocalSaves,
  loadGameFromSlot,
  saveGameToSlot,
  type SaveSlotSummary
} from "@/features/saves/saveRepository";

type Tab =
  | "overview"
  | "email"
  | "development"
  | "research"
  | "factory"
  | "finance"
  | "orders";

const TABS: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "email", label: "Email", icon: Mail },
  { id: "research", label: "Research", icon: FlaskConical },
  { id: "development", label: "Development", icon: BriefcaseBusiness },
  { id: "factory", label: "Factory", icon: Factory },
  { id: "finance", label: "Finance", icon: Banknote },
  { id: "orders", label: "Orders", icon: PackageCheck },
];

type EmailFolder =
  | "inbox"
  | "action-required"
  | "unread"
  | "board"
  | "airline-relations"
  | "engineering"
  | "research"
  | "manufacturing"
  | "finance"
  | "market-intelligence"
  | "archived";

const EMAIL_FOLDERS: { id: EmailFolder; label: string; category?: GameEmailCategory }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "action-required", label: "Action required" },
  { id: "unread", label: "Unread" },
  { id: "board", label: "Board", category: "board" },
  { id: "airline-relations", label: "Airlines", category: "airline-relations" },
  { id: "engineering", label: "Engineering", category: "engineering" },
  { id: "research", label: "Research", category: "research" },
  { id: "manufacturing", label: "Factory", category: "manufacturing" },
  { id: "finance", label: "Finance", category: "finance" },
  { id: "market-intelligence", label: "Market intelligence", category: "market-intelligence" },
  { id: "archived", label: "Archived" }
];

const DEFAULT_DESIGN_CATEGORY: AircraftCategory = "narrow-body";

const DESIGN_STAGES: { id: AircraftDesignStageId; label: string; description: string }[] = [
  { id: "brief", label: "Brief", description: "Program identity, category, mission, and timing." },
  { id: "fuselage", label: "Fuselage", description: "Pressure vessel size, doors, exits, decks, and cargo bay." },
  { id: "cabin", label: "Cabin", description: "Cabin zones, seat geometry, aisles, and service spaces." },
  { id: "wing", label: "Wing", description: "Span, area, sweep, high-lift equipment, tips, and wing tanks." },
  { id: "propulsion", label: "Propulsion", description: "Engine model, count, mounting position, and derate." },
  { id: "fuel", label: "Fuel & Weight", description: "Tank layout, reserve policy, payload priority, and MTOW target." },
  { id: "structure", label: "Structure", description: "Materials, interiors, and landing gear construction." },
  { id: "systems", label: "Systems", description: "Avionics, controls, redundancy, diagnostics, and testing." },
  { id: "performance", label: "Performance", description: "Calculated range, field performance, weights, and fuel burn." },
  { id: "commercial", label: "Commercial", description: "Costs, price, break-even volume, appeal, and factory needs." },
  { id: "final", label: "Review", description: "Validation warnings, blockers, and launch readiness." }
];

const MISSION_OPTIONS: { value: MissionProfile; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "short-haul", label: "Short-haul" },
  { value: "medium-haul", label: "Medium-haul" },
  { value: "long-haul", label: "Long-haul" },
  { value: "high-capacity", label: "High-capacity" },
  { value: "low-operating-cost", label: "Low operating cost" },
  { value: "premium-comfort", label: "Premium comfort" },
  { value: "small-airport-operations", label: "Small airports" }
];

const CABIN_LABELS: Record<CabinClass, string> = {
  economy: "Economy",
  "premium-economy": "Premium economy",
  business: "Business",
  first: "First"
};

const MATERIAL_LABELS: Record<StructuralMaterialChoice, string> = {
  "classic-aluminum": "Classic aluminum",
  "improved-aluminum": "Improved aluminum",
  "aluminum-lithium": "Aluminum-lithium",
  "early-composite": "Early composite",
  "composite-secondary": "Composite secondary",
  "primary-composite": "Primary composite"
};

const AVIONICS_LABELS: Record<AvionicsGeneration, string> = {
  analog: "Analog",
  "improved-analog": "Improved analog",
  "digital-i": "Digital I",
  "integrated-modular": "Integrated modular"
};

const FLIGHT_CONTROL_LABELS: Record<FlightControlSystem, string> = {
  mechanical: "Mechanical",
  "hydraulic-boosted": "Hydraulic boosted",
  "digital-fly-by-wire": "Digital fly-by-wire"
};

const ENGINE_POSITION_LABELS: Record<EnginePosition, string> = {
  "under-wing": "Under-wing",
  "rear-fuselage": "Rear fuselage",
  "tail-mounted": "Tail mounted"
};

type CabinMix = "economy-heavy" | "standard" | "premium-heavy" | "executive";
type ComfortStandard = "dense" | "standard" | "comfortable";
type WingPlan = "compact" | "balanced" | "efficient" | "long-range";
type RangePackage = "short" | "balanced" | "long" | "maximum";
type SafetyStandard = "basic" | "airline-standard" | "high-reliability" | "flagship";

const CABIN_MIX_OPTIONS: { value: CabinMix; label: string }[] = [
  { value: "economy-heavy", label: "Economy-heavy" },
  { value: "standard", label: "Standard airline" },
  { value: "premium-heavy", label: "Premium-heavy" },
  { value: "executive", label: "Executive-heavy" }
];

const COMFORT_STANDARD_OPTIONS: { value: ComfortStandard; label: string }[] = [
  { value: "dense", label: "Dense" },
  { value: "standard", label: "Standard" },
  { value: "comfortable", label: "Comfortable" }
];

const WING_PLAN_OPTIONS: { value: WingPlan; label: string }[] = [
  { value: "compact", label: "Compact airport-friendly" },
  { value: "balanced", label: "Balanced" },
  { value: "efficient", label: "Efficient cruise wing" },
  { value: "long-range", label: "Long-range wing" }
];

const RANGE_PACKAGE_OPTIONS: { value: RangePackage; label: string }[] = [
  { value: "short", label: "Short-haul" },
  { value: "balanced", label: "Balanced" },
  { value: "long", label: "Long-range" },
  { value: "maximum", label: "Maximum range" }
];

const SAFETY_STANDARD_OPTIONS: { value: SafetyStandard; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "airline-standard", label: "Airline standard" },
  { value: "high-reliability", label: "High reliability" },
  { value: "flagship", label: "Flagship" }
];

export function Dashboard() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [autosaveState, setAutosaveState] = useState<GameState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("email");
  const [focusedTarget, setFocusedTarget] = useState<GameDeepLinkTarget>({ section: "email" });
  const [saveSlots, setSaveSlots] = useState<SaveSlotSummary[]>([]);
  const [designInput, setDesignInput] = useState<AircraftStudioDesign>(() =>
    createDefaultAircraftStudioDesign(
      DEFAULT_DESIGN_CATEGORY,
      getDefaultPlayerAircraftName(DEFAULT_DESIGN_CATEGORY, 1970, GAME_CONTENT_SETTINGS.namingMode),
      1974
    )
  );
  const [statusMessage, setStatusMessage] = useState("Ready");

  useEffect(() => {
    function syncFromLocation() {
      const target = parseGameDeepLink(window.location.pathname, window.location.search);
      setActiveTab(target.section);
      setFocusedTarget(target);
    }

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadGameFromSlot("autosave")
      .then((loaded) => {
        if (!mounted) {
          return;
        }
        setAutosaveState(loaded);
        setSaveSlots(listLocalSaves());
        setBootstrapped(true);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setAutosaveState(null);
        setSaveSlots(listLocalSaves());
        setBootstrapped(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!gameState) {
      return;
    }
    const currentPlayer = gameState.manufacturers[gameState.playerCompanyId];
    if (!currentPlayer) {
      return;
    }
    setDesignInput((current) => sanitizeAircraftStudioDesign(current, currentPlayer.unlockedTechnologyIds, gameState.date.year + 4));
  }, [gameState?.playerCompanyId, gameState ? gameState.manufacturers[gameState.playerCompanyId]?.unlockedTechnologyIds.join("|") : ""]);

  const player = gameState ? gameState.manufacturers[gameState.playerCompanyId] : null;
  const lastReport = gameState?.monthlyHistory.at(-1);
  const playerFinancial = lastReport?.financialReports.find((report) => report.manufacturerId === gameState?.playerCompanyId);
  const designPreview = useMemo(() => calculateAircraftPerformance(designInput), [designInput]);
  const playerOrders = useMemo(
    () => (gameState && player ? Object.values(gameState.orders).filter((order) => order.manufacturerId === player.id) : []),
    [gameState, player]
  );
  const backlog = playerOrders.reduce((sum, order) => sum + Math.max(0, order.quantity - order.delivered), 0);
  const playerDeliveryEvents = lastReport && player ? lastReport.deliveries.filter((delivery) => delivery.startsWith(`${player.name} delivered`)).length : 0;
  const emails = gameState ? getGameEmails(gameState) : [];
  const unreadEmailCount = emails.filter((email) => !email.read).length;
  const actionRequiredEmailCount = emails.filter((email) => email.requiresAction && email.status === "open" && !email.archived).length;

  if (!bootstrapped) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#d7deea]">Loading campaign...</div>;
  }

  if (!gameState) {
    return (
      <StartScreen
        manufacturers={getManufacturerIdentities(GAME_CONTENT_SETTINGS.namingMode)}
        autosaveState={autosaveState}
        saveSlots={saveSlots}
        continueCampaign={() => {
          if (autosaveState) {
            activateCampaign(autosaveState, "Campaign loaded.");
          }
        }}
        loadSlot={loadSlot}
        startCampaign={startCampaign}
      />
    );
  }

  if (!gameState || !player) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#d7deea]">Loading campaign...</div>;
  }

  function navigate(target: GameDeepLinkTarget) {
    const href = buildGameDeepLink(target);
    window.history.pushState({}, "", href);
    setActiveTab(target.section);
    setFocusedTarget(target);
  }

  async function endTurn() {
    if (!gameState) {
      return;
    }
    const warnings = getEndTurnWarnings(gameState);
    if (warnings.length > 0 && !window.confirm(`Before ending the month:\n\n${warnings.map((warning) => `- ${warning}`).join("\n")}\n\nContinue anyway?`)) {
      return;
    }
    const result = processMonthlyTurn(gameState);
    const newEmailCount = Math.max(0, getGameEmails(result.gameState).length - getGameEmails(gameState).length);
    setGameState(result.gameState);
    navigate({ section: "email" });
    setStatusMessage(`Inbox received ${newEmailCount} new message${newEmailCount === 1 ? "" : "s"}.`);
    if (result.gameState.settings.autosave) {
      await saveGameToSlot("autosave", result.gameState);
      setSaveSlots(listLocalSaves());
    }
  }

  async function manualSave() {
    if (!gameState) {
      return;
    }
    const slotId = `manual-${Date.now()}`;
    await saveGameToSlot(slotId, gameState);
    setSaveSlots(listLocalSaves());
    setStatusMessage("Campaign saved.");
  }

  async function loadSlot(slotId: string) {
    const loaded = await loadGameFromSlot(slotId);
    if (loaded) {
      activateCampaign(loaded, "Campaign loaded.");
    }
  }

  async function deleteSlot(slotId: string) {
    await deleteSaveSlot(slotId);
    setSaveSlots(listLocalSaves());
    setStatusMessage("Save deleted.");
  }

  function newCampaign() {
    setGameState(null);
    setStatusMessage("Choose a manufacturer.");
  }

  function startCampaign(manufacturerIdentityId: string) {
    const identity = getManufacturerIdentities(GAME_CONTENT_SETTINGS.namingMode).find((candidate) => candidate.id === manufacturerIdentityId);
    const next = createNewGame({
      companyName: identity?.displayName,
      playerManufacturerId: manufacturerIdentityId
    });
    activateCampaign(next, `${next.manufacturers[next.playerCompanyId]?.name ?? "New"} campaign started.`);
  }

  function activateCampaign(next: GameState, message: string) {
    setGameState(next);
    setDesignInput(createOpeningDesignInput(next));
    navigate({ section: "email" });
    setStatusMessage(message);
  }

  function mutateGame(mutator: (state: GameState) => GameState, message: string) {
    setGameState((current) => (current ? mutator(current) : current));
    setStatusMessage(message);
  }

  return (
    <main className="min-h-screen bg-[#080b11] text-[#e8eef8]">
      <header className="border-b border-[#2a3445] bg-[#111827]">
        <div className="mx-auto grid max-w-[1720px] gap-4 px-4 py-4 xl:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.55fr)_auto] xl:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <AircraftPlanform />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-normal">{player.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[#a8b3c4]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={16} /> {formatGameDate(gameState.date)}
                </span>
                <span>Seed {gameState.originalSeed}</span>
                <span>{statusMessage}</span>
              </div>
            </div>
          </div>
          <HeaderStats
            cash={player.cash}
            monthlyResult={playerFinancial?.profitOrLoss ?? 0}
            unreadEmails={unreadEmailCount}
            actionRequired={actionRequiredEmailCount}
            activeResearch={player.researchProjects.filter((project) => project.status === "active").length}
            activePrograms={player.aircraftPrograms.filter((program) => program.status === "active").length}
          />
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <SaveMenu saveSlots={saveSlots} loadSlot={loadSlot} deleteSlot={deleteSlot} manualSave={manualSave} newCampaign={newCampaign} />
            <IconButton title="Settings" onClick={() => setStatusMessage("Settings will move here in a later pass.")} icon={Settings} label="Settings" />
            <IconButton title="End month" onClick={endTurn} icon={Play} label="End Turn" primary />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1720px] gap-4 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto rounded-lg border border-[#2a3445] bg-[#111827] p-2 lg:block lg:overflow-visible">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate({ section: tab.id })}
                className={`focus-ring flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-sm transition lg:w-full ${
                  active ? "bg-[#f2b84b] text-[#16110a]" : "text-[#d7deea] hover:bg-[#202b3d]"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-4">
          <KpiStrip
            cash={player.cash}
            financial={playerFinancial}
            activePrograms={player.aircraftPrograms.filter((program) => program.status === "active").length}
            backlog={backlog}
            deliveries={playerDeliveryEvents}
            unreadEmails={unreadEmailCount}
          />

          {activeTab === "overview" && (
            <OverviewTab gameState={gameState} playerId={player.id} playerFinancial={playerFinancial} navigate={navigate} />
          )}
          {activeTab === "development" && (
            <DevelopmentTab
              gameState={gameState}
              mutateGame={mutateGame}
              designInput={designInput}
              setDesignInput={setDesignInput}
              designPreview={designPreview}
              focusedTarget={focusedTarget}
              launch={() =>
                mutateGame(
                  (state) => launchPlayerAircraftProgram(state, buildAircraftDesignInputFromStudio(designInput, player.unlockedTechnologyIds)),
                  designPreview.validation.status === "invalid"
                    ? `${designInput.programName} needs engineering fixes.`
                    : `${designInput.programName} program launched.`
                )
              }
            />
          )}
          {activeTab === "research" && (
            <ResearchTab
              gameState={gameState}
              mutateGame={mutateGame}
              focusedTarget={focusedTarget}
            />
          )}
          {activeTab === "factory" && (
            <FactoriesTab
              gameState={gameState}
              mutateGame={mutateGame}
              focusedTarget={focusedTarget}
            />
          )}
          {activeTab === "orders" && <OrdersTab gameState={gameState} focusedTarget={focusedTarget} navigate={navigate} />}
          {activeTab === "finance" && <FinancesTab gameState={gameState} />}
          {activeTab === "email" && <InboxTab key={gameState.turn} gameState={gameState} mutateGame={mutateGame} navigate={navigate} focusedTarget={focusedTarget} />}
        </div>
      </div>
    </main>
  );
}

function HeaderStats({
  cash,
  monthlyResult,
  unreadEmails,
  actionRequired,
  activeResearch,
  activePrograms
}: {
  cash: number;
  monthlyResult: number;
  unreadEmails: number;
  actionRequired: number;
  activeResearch: number;
  activePrograms: number;
}) {
  const stats = [
    { label: "Cash", value: formatMoney(cash) },
    { label: "Month", value: formatMoney(monthlyResult) },
    { label: "Unread", value: unreadEmails.toString() },
    { label: "Actions", value: actionRequired.toString() },
    { label: "Research", value: activeResearch.toString() },
    { label: "Programs", value: activePrograms.toString() }
  ];

  return (
    <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-2">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 rounded-md border border-[#2a3445] bg-[#182233] px-3 py-2">
          <div className="text-[11px] font-semibold uppercase text-[#8896aa]">{stat.label}</div>
          <div className="mt-0.5 break-words text-sm font-semibold leading-5">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

function StartScreen({
  manufacturers,
  autosaveState,
  saveSlots,
  continueCampaign,
  loadSlot,
  startCampaign
}: {
  manufacturers: ManufacturerIdentity[];
  autosaveState: GameState | null;
  saveSlots: SaveSlotSummary[];
  continueCampaign: () => void;
  loadSlot: (slotId: string) => void;
  startCampaign: (manufacturerIdentityId: string) => void;
}) {
  const visibleSlots = saveSlots.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#080b11] text-[#e8eef8]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2a3445] pb-5">
          <div className="flex min-w-0 items-center gap-4">
            <AircraftPlanform />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-normal">Aircraft Producer</h1>
              <p className="mt-1 text-sm text-[#a8b3c4]">January 1970</p>
            </div>
          </div>
          {autosaveState ? <IconButton title="Continue autosave" icon={Play} label="Continue" onClick={continueCampaign} primary /> : null}
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-[#a8b3c4]">Campaign</h2>
                <CalendarDays size={17} className="text-[#f2b84b]" />
              </div>
              {autosaveState ? (
                <button
                  onClick={continueCampaign}
                  className="focus-ring mt-4 w-full rounded-md border border-[#f2b84b] bg-[#f2b84b] px-3 py-2 text-left text-sm font-semibold text-[#16110a] transition hover:bg-[#d99a2b]"
                >
                  Continue {autosaveState.settings.playerCompanyName}
                  <span className="mt-1 block text-xs font-medium text-[#2a1b08]">{formatGameDate(autosaveState.date)}</span>
                </button>
              ) : (
                <p className="mt-4 text-sm text-[#a8b3c4]">No autosave found.</p>
              )}
            </section>

            <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-[#a8b3c4]">Saves</h2>
                <Save size={17} className="text-[#f2b84b]" />
              </div>
              <div className="mt-3 space-y-2">
                {visibleSlots.length === 0 ? (
                  <p className="text-sm text-[#a8b3c4]">No manual saves yet.</p>
                ) : (
                  visibleSlots.map((slot) => (
                    <button
                      key={slot.slotId}
                      onClick={() => loadSlot(slot.slotId)}
                      className="focus-ring w-full rounded-md border border-[#2a3445] bg-[#182233] px-3 py-2 text-left transition hover:border-[#f2b84b] hover:bg-[#1d2f46]"
                    >
                      <span className="block truncate text-sm font-semibold">{slot.companyName}</span>
                      <span className="mt-1 block truncate text-xs text-[#a8b3c4]">{slot.slotId} · {slot.dateLabel}</span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </aside>

          <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Select Manufacturer</h2>
                <p className="mt-1 text-sm text-[#a8b3c4]">Temporary real-world naming mode</p>
              </div>
              <span className="rounded-md border border-[#2a3445] bg-[#182233] px-3 py-1.5 text-xs font-semibold uppercase text-[#a8b3c4]">
                {manufacturers.length} choices
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {manufacturers.map((manufacturer) => (
                <button
                  key={manufacturer.id}
                  onClick={() => startCampaign(manufacturer.id)}
                  className="focus-ring group min-h-40 rounded-lg border border-[#2a3445] bg-[#182233] p-4 text-left transition hover:border-[#f2b84b] hover:bg-[#1d2f46]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-[#0b111c] text-sm font-semibold text-[#e8eef8]">
                      {manufacturer.shortName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="rounded-md border border-[#2a3445] bg-[#111827] px-2 py-1 text-xs font-semibold text-[#a8b3c4]">
                      {manufacturer.country}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{manufacturer.displayName}</h3>
                  <p className="mt-1 text-sm text-[#a8b3c4]">{manufacturer.shortName}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#f2b84b]">
                    Start campaign
                    <Play size={15} className="transition group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function SaveMenu({
  saveSlots,
  loadSlot,
  deleteSlot,
  manualSave,
  newCampaign
}: {
  saveSlots: SaveSlotSummary[];
  loadSlot: (slotId: string) => void;
  deleteSlot: (slotId: string) => void;
  manualSave: () => void;
  newCampaign: () => void;
}) {
  return (
    <details className="relative">
      <summary className="focus-ring inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-[#2a3445] bg-[#111827] px-3 text-sm font-medium text-[#d7deea] transition hover:bg-[#202b3d]">
        <Save size={16} />
        Save
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-[#2a3445] bg-[#111827] p-3 shadow-xl">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={manualSave} className="focus-ring rounded-md border border-[#2a3445] px-3 py-2 text-sm font-medium hover:bg-[#202b3d]">
            Manual save
          </button>
          <button onClick={newCampaign} className="focus-ring rounded-md border border-[#2a3445] px-3 py-2 text-sm font-medium hover:bg-[#202b3d]">
            New campaign
          </button>
        </div>
        <div className="mt-3 max-h-72 overflow-y-auto">
          {saveSlots.length === 0 ? (
            <p className="px-1 py-2 text-sm text-[#a8b3c4]">No saves yet.</p>
          ) : (
            saveSlots.map((slot) => (
              <div key={slot.slotId} className="border-t border-[#222c3b] py-2 first:border-t-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{slot.slotId}</div>
                    <div className="truncate text-xs text-[#a8b3c4]">{slot.companyName} · {slot.dateLabel}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => loadSlot(slot.slotId)} className="focus-ring rounded px-2 py-1 text-xs font-semibold text-[#f2b84b] hover:bg-[#202b3d]">
                      Load
                    </button>
                    <button onClick={() => deleteSlot(slot.slotId)} className="focus-ring rounded px-2 py-1 text-xs font-semibold text-[#fca5a5] hover:bg-[#3b1518]">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </details>
  );
}

function getEndTurnWarnings(state: GameState): string[] {
  const player = state.manufacturers[state.playerCompanyId];
  if (!player) {
    return ["Player company data is missing."];
  }

  const warnings: string[] = [];
  const emails = getGameEmails(state);
  if (emails.some((email) => email.requiresAction && email.status === "open" && !email.archived)) {
    warnings.push("Important emails still require a decision.");
  }
  if (!player.researchProjects.some((project) => project.status === "active")) {
    warnings.push("No research project is active.");
  }
  if (player.aircraftPrograms.some((program) => program.status === "active" && program.assignedEngineers <= 0)) {
    warnings.push("An aircraft program has no engineers assigned.");
  }
  const assignedWorkers = getAssignedFactoryWorkers(player);
  if (assignedWorkers > player.employees.factoryWorkers.headcount * 0.95) {
    warnings.push("Factory workforce is critically tight.");
  }
  if (player.cash < 250_000_000) {
    warnings.push("Cash reserves are dangerously low.");
  }
  const dueSoon = Object.values(state.orders).some(
    (order) => order.manufacturerId === player.id && order.status !== "completed" && order.deliveryStartTurn - state.turn <= 2
  );
  if (dueSoon) {
    warnings.push("An order delivery window is approaching.");
  }

  return warnings;
}

function KpiStrip({
  cash,
  financial,
  activePrograms,
  backlog,
  deliveries,
  unreadEmails
}: {
  cash: number;
  financial?: MonthlyFinancialReport;
  activePrograms: number;
  backlog: number;
  deliveries: number;
  unreadEmails: number;
}) {
  const items = [
    { label: "Cash", value: formatMoney(cash), icon: Banknote },
    { label: "Monthly result", value: financial ? formatMoney(financial.profitOrLoss) : "$0", icon: TrendingUp },
    { label: "Programs", value: String(activePrograms), icon: BriefcaseBusiness },
    { label: "Backlog", value: `${backlog}`, icon: PackageCheck },
    { label: "Deliveries", value: `${deliveries}`, icon: Plane },
    { label: "Unread inbox", value: `${unreadEmails}`, icon: MailOpen }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-lg border border-[#2a3445] bg-[#111827] p-4">
            <div className="flex items-center justify-between gap-3 text-sm text-[#a8b3c4]">
              <span>{item.label}</span>
              <Icon size={17} className="text-[#f2b84b]" />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-normal">{item.value}</div>
          </div>
        );
      })}
    </section>
  );
}

function OverviewTab({
  gameState,
  playerId,
  playerFinancial,
  navigate
}: {
  gameState: GameState;
  playerId: string;
  playerFinancial?: MonthlyFinancialReport;
  navigate: (target: GameDeepLinkTarget) => void;
}) {
  const player = gameState.manufacturers[playerId]!;
  const lastReport = gameState.monthlyHistory.at(-1);
  const activeResearch = player.researchProjects.filter((project) => project.status === "active");
  const warnings = [...(playerFinancial?.warnings ?? []), ...(lastReport?.warnings ?? [])];
  const emails = sortEmails(getGameEmails(gameState));
  const latestEmails = emails.filter((email) => !email.archived).slice(0, 4);
  const actionRequired = emails.filter((email) => email.requiresAction && email.status === "open" && !email.archived).length;
  const activeFactories = player.factories.filter((factory) => getFactoryStatus(factory) === "active");
  const activePrograms = player.aircraftPrograms.filter((program) => program.status === "active");
  const orders = Object.values(gameState.orders).filter((order) => order.manufacturerId === player.id);
  const backlog = orders.reduce((sum, order) => sum + Math.max(0, order.quantity - order.delivered), 0);
  const competitors = Object.values(gameState.manufacturers).filter((manufacturer) => !manufacturer.isPlayer);
  const strongestCompetitor = competitors
    .slice()
    .sort((a, b) => b.marketShare["narrow-body"] + b.marketShare["wide-body"] - (a.marketShare["narrow-body"] + a.marketShare["wide-body"]))[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Executive Dashboard</h2>
          <span className="text-sm text-[#a8b3c4]">{formatGameDate(gameState.date)}</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Metric label="Cash" value={formatMoney(player.cash)} />
          <Metric label="Monthly result" value={playerFinancial ? formatMoney(playerFinancial.profitOrLoss) : "$0"} />
          <Metric label="Backlog" value={backlog.toString()} />
          <Metric label="Health" value={warnings.length > 0 ? "Review" : "Stable"} />
          <Metric label="Certified models" value={player.aircraftModels.length.toString()} />
          <Metric label="Active factories" value={activeFactories.length.toString()} />
          <Metric label="Research projects" value={activeResearch.length.toString()} />
          <Metric label="Action emails" value={actionRequired.toString()} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <OverviewTile title="Email" lines={[`${emails.filter((email) => !email.read).length} unread`, `${actionRequired} action-required`, `${emails.filter((email) => email.priority === "urgent").length} urgent`]} button="Open inbox" onClick={() => navigate({ section: "email" })} />
          <OverviewTile title="Research" lines={[`${activeResearch.length} active projects`, `${player.employees.scientists.headcount.toLocaleString()} scientists`, `${activeResearch.length === 0 ? "Scientists idle" : "Research underway"}`]} button="Open research" onClick={() => navigate({ section: "research" })} />
          <OverviewTile title="Development" lines={[`${activePrograms.length} active programs`, `${player.employees.engineers.headcount.toLocaleString()} engineers`, activePrograms[0]?.stage.replaceAll("-", " ") ?? "No active program"]} button="Open development" onClick={() => navigate({ section: "development" })} />
          <OverviewTile title="Factory" lines={[`${activeFactories.length} active factories`, `${player.employees.factoryWorkers.headcount.toLocaleString()} workers`, `${player.factories.reduce((sum, factory) => sum + factory.productionLines.length, 0)} production lines`]} button="Open factory" onClick={() => navigate({ section: "factory" })} />
          <OverviewTile title="Finance" lines={[`Cash ${formatMoney(player.cash)}`, `Development ${playerFinancial ? formatMoney(playerFinancial.developmentExpenses) : "$0"}`, `Factory ${playerFinancial ? formatMoney(playerFinancial.factoryExpenses) : "$0"}`]} button="Open finance" onClick={() => navigate({ section: "finance" })} />
          <OverviewTile title="Orders" lines={[`${orders.length} contracts`, `${backlog} aircraft backlog`, `${Object.values(gameState.airlines).length} tracked airlines`]} button="Open orders" onClick={() => navigate({ section: "orders" })} />
        </div>
        <div className="mt-5 rounded-lg border border-[#2a3445] bg-[#182233] p-4">
          <h3 className="text-sm font-semibold text-[#d7deea]">Market Intelligence</h3>
          <p className="mt-2 text-sm text-[#a8b3c4]">
            {strongestCompetitor
              ? `${strongestCompetitor.name} is the most visible competitor in current share summaries. Major competitor moves will continue to arrive by email.`
              : "Competitor activity will arrive through email and appear in contextual summaries."}
          </p>
        </div>
      </section>
      <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-5">
        <h2 className="text-lg font-semibold">Warnings</h2>
        <div className="mt-4 space-y-3">
          {warnings.length === 0 ? (
            <p className="text-sm text-[#a8b3c4]">No major warnings.</p>
          ) : (
            warnings.map((warning) => (
              <div key={warning} className="flex gap-3 rounded-lg border border-[#7c5a1e] bg-[#2a1d0b] p-3 text-sm text-[#ffd48a]">
                <AlertTriangle size={18} />
                <span>{warning}</span>
              </div>
            ))
          )}
        </div>
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-[#d7deea]">Latest Messages</h3>
          <div className="mt-2 space-y-2">
            {latestEmails.map((email) => (
              <button
                key={email.id}
                onClick={() => navigate({ section: "email", entityType: "email", entityId: email.id })}
                className="focus-ring w-full rounded-md border border-[#2a3445] bg-[#182233] px-3 py-2 text-left"
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{email.subject}</span>
                  <span className="text-xs text-[#8896aa]">{formatGameDate(email.date)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-[#a8b3c4]">{email.preview}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function OverviewTile({
  title,
  lines,
  button,
  onClick
}: {
  title: string;
  lines: string[];
  button: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#2a3445] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button onClick={onClick} className="focus-ring rounded-md px-2 py-1 text-xs font-semibold text-[#f2b84b] hover:bg-[#202b3d]">
          {button}
        </button>
      </div>
      <div className="mt-3 space-y-1 text-sm text-[#a8b3c4]">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function AircraftTab({
  designInput,
  setDesignInput,
  designPreview,
  unlockedTechnologyIds,
  technologies,
  launch
}: {
  designInput: AircraftStudioDesign;
  setDesignInput: (value: AircraftStudioDesign) => void;
  designPreview: AircraftCalculatedPerformance;
  unlockedTechnologyIds: string[];
  technologies: GameState["technologies"];
  launch: () => void;
}) {
  const [stage, setStage] = useState<AircraftDesignStageId>("brief");
  const cabinGeometry = useMemo(() => calculateCabinGeometry(designInput), [designInput]);
  const categoryDefinition = AIRCRAFT_CATEGORIES[designInput.category];
  const cabinMix = inferCabinMix(designInput);
  const comfortStandard = inferComfortStandard(designInput);
  const wingPlan = inferWingPlan(designInput);
  const rangePackage = inferRangePackage(designInput);
  const safetyStandard = inferSafetyStandard(designInput);
  const engineOptions = getAvailableEngineOptions(
    designInput.category,
    designInput.propulsion.position,
    unlockedTechnologyIds,
    designInput.intendedEntryIntoServiceYear
  );
  const selectedEngine = engineOptions.find((engine) => engine.id === designInput.propulsion.engineModelId);
  const materialOptions = (Object.keys(MATERIAL_LABELS) as StructuralMaterialChoice[]).filter(
    (material) => !MATERIAL_FACTORS[material].requiredTechnologyId || unlockedTechnologyIds.includes(MATERIAL_FACTORS[material].requiredTechnologyId)
  );
  const highLiftOptions = (Object.keys(HIGH_LIFT_FACTORS) as AircraftStudioDesign["wing"]["highLiftSystem"][]).filter(
    (system) => !HIGH_LIFT_FACTORS[system].requiredTechnologyId || unlockedTechnologyIds.includes(HIGH_LIFT_FACTORS[system].requiredTechnologyId)
  );
  const wingtipOptions = (Object.keys(WINGTIP_FACTORS) as AircraftStudioDesign["wing"]["wingtipDevice"][]).filter(
    (device) => !WINGTIP_FACTORS[device].requiredTechnologyId || unlockedTechnologyIds.includes(WINGTIP_FACTORS[device].requiredTechnologyId)
  );
  const avionicsOptions = (Object.keys(AVIONICS_LABELS) as AvionicsGeneration[]).filter(
    (avionics) => !SYSTEM_FACTORS.avionics[avionics].requiredTechnologyId || unlockedTechnologyIds.includes(SYSTEM_FACTORS.avionics[avionics].requiredTechnologyId)
  );
  const unlockedDesignTechnologies = unlockedTechnologyIds
    .map((technologyId) => technologies[technologyId])
    .filter((technology): technology is NonNullable<typeof technology> => Boolean(technology))
    .filter((technology) => ["propulsion", "aerodynamics", "structures", "avionics", "manufacturing", "safety", "cabin-operations"].includes(technology.branch));
  const invalid = designPreview.validation.status === "invalid";

  function commit(next: AircraftStudioDesign) {
    setDesignInput(sanitizeAircraftStudioDesign(next, unlockedTechnologyIds, next.intendedEntryIntoServiceYear));
  }

  function update<K extends keyof AircraftStudioDesign>(key: K, value: AircraftStudioDesign[K]) {
    commit({ ...designInput, [key]: value });
  }

  function updateFuselage<K extends keyof AircraftStudioDesign["fuselage"]>(key: K, value: AircraftStudioDesign["fuselage"][K]) {
    commit({ ...designInput, fuselage: { ...designInput.fuselage, [key]: value } });
  }

  function updateWing<K extends keyof AircraftStudioDesign["wing"]>(key: K, value: AircraftStudioDesign["wing"][K]) {
    commit({ ...designInput, wing: { ...designInput.wing, [key]: value } });
  }

  function updatePropulsion<K extends keyof AircraftStudioDesign["propulsion"]>(key: K, value: AircraftStudioDesign["propulsion"][K]) {
    commit({ ...designInput, propulsion: { ...designInput.propulsion, [key]: value } });
  }

  function updateFuel<K extends keyof AircraftStudioDesign["fuelSystem"]>(key: K, value: AircraftStudioDesign["fuelSystem"][K]) {
    commit({ ...designInput, fuelSystem: { ...designInput.fuelSystem, [key]: value } });
  }

  function updateStructure<K extends keyof AircraftStudioDesign["structure"]>(key: K, value: AircraftStudioDesign["structure"][K]) {
    commit({ ...designInput, structure: { ...designInput.structure, [key]: value } });
  }

  function updateSystems<K extends keyof AircraftStudioDesign["systems"]>(key: K, value: AircraftStudioDesign["systems"][K]) {
    commit({ ...designInput, systems: { ...designInput.systems, [key]: value } });
  }

  function toggleTechnology(technologyId: string) {
    const nextPackage = designInput.technologyPackage.includes(technologyId)
      ? designInput.technologyPackage.filter((id) => id !== technologyId)
      : [...designInput.technologyPackage, technologyId];
    update("technologyPackage", nextPackage);
  }

  function renderStage() {
    if (stage === "brief") {
      return (
        <div className="space-y-4">
          <TextInput label="Program name" value={designInput.programName} onChange={(value) => update("programName", value)} />
          <div className="grid gap-3 md:grid-cols-2">
            <TextInput label="Family name" value={designInput.familyName} onChange={(value) => update("familyName", value)} />
            <TextInput label="Designation" value={designInput.designation} onChange={(value) => update("designation", value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SelectControl
              label="Aircraft category"
              value={designInput.category}
              options={Object.values(AIRCRAFT_CATEGORIES).map((category) => ({ value: category.id, label: category.label }))}
              onChange={(value) => {
                const category = value as AircraftCategory;
                commit(createDefaultAircraftStudioDesign(category, getDefaultPlayerAircraftName(category, designInput.intendedEntryIntoServiceYear, GAME_CONTENT_SETTINGS.namingMode), designInput.intendedEntryIntoServiceYear));
              }}
            />
            <SelectControl label="Mission" value={designInput.missionProfile} options={MISSION_OPTIONS} onChange={(value) => update("missionProfile", value as MissionProfile)} />
            <NumberControl
              label="Entry-into-service year"
              value={designInput.intendedEntryIntoServiceYear}
              min={1970}
              max={2040}
              step={1}
              onChange={(value) => update("intendedEntryIntoServiceYear", value)}
            />
          </div>
          <StudioNote
            title="Design rule"
            lines={[
              "Capacity, comfort, range, fuel burn, weight, reliability, cost, and airline appeal are calculated from the physical choices below.",
              `Normal ${categoryDefinition.label.toLowerCase()} market range: ${categoryDefinition.capacityRange[0]}-${categoryDefinition.capacityRange[1]} seats and ${categoryDefinition.rangeRangeNm[0].toLocaleString()}-${categoryDefinition.rangeRangeNm[1].toLocaleString()} nm.`
            ]}
          />
        </div>
      );
    }

    if (stage === "fuselage") {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Cabin length" value={`${designInput.fuselage.usableCabinLengthM.toFixed(1)} m`} />
            <Metric label="Cabin width" value={`${designInput.fuselage.internalCabinWidthM.toFixed(2)} m`} />
            <Metric label="Cargo" value={`${designInput.fuselage.cargoVolumeM3.toLocaleString()} m3`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <NumberControl label="Fuselage length m" value={designInput.fuselage.totalLengthM} min={21} max={78} step={0.1} onChange={(value) => commit(updateSimplifiedFuselage(designInput, { totalLengthM: value }))} />
            <NumberControl label="Cabin width m" value={designInput.fuselage.internalCabinWidthM} min={2.2} max={6.65} step={0.05} onChange={(value) => commit(updateSimplifiedFuselage(designInput, { internalCabinWidthM: value }))} />
            <NumberControl label="Cargo volume m3" value={designInput.fuselage.cargoVolumeM3} min={3} max={180} step={1} onChange={(value) => updateFuselage("cargoVolumeM3", value)} />
            <SelectControl
              label="Cargo deck"
              value={designInput.fuselage.cargoDeckConfiguration}
              options={[
                { value: "bulk", label: "Bulk hold" },
                { value: "standard-containers", label: "Standard containers" },
                { value: "widebody-containers", label: "Wide-body containers" },
                { value: "none", label: "None" }
              ]}
              onChange={(value) => updateFuselage("cargoDeckConfiguration", value as AircraftStudioDesign["fuselage"]["cargoDeckConfiguration"])}
            />
          </div>
          <StudioNote
            title="Automatically handled"
            lines={[
              "Nose length, tail length, doors, and emergency exits are sized from aircraft category and cabin capacity.",
              "Use this stage for the big physical tradeoff: longer and wider aircraft carry more, but cost and weigh more."
            ]}
          />
        </div>
      );
    }

    if (stage === "cabin") {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Physical seats" value={cabinGeometry.physicalPassengerCapacity.toLocaleString()} />
            <Metric label="Certified seats" value={cabinGeometry.maximumCertifiedCapacity.toLocaleString()} />
            <Metric label="Cabin width used" value={`${cabinGeometry.widestRequiredCabinM} m`} />
            <Metric label="Cabin density" value={`${cabinGeometry.density}/m`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <NumberControl
              label="Target certified seats"
              value={cabinGeometry.maximumCertifiedCapacity || categoryDefinition.capacityRange[0]}
              min={categoryDefinition.capacityRange[0]}
              max={categoryDefinition.capacityRange[1]}
              step={1}
              onChange={(value) => commit(applyCabinPlan(designInput, value, cabinMix, comfortStandard))}
            />
            <SelectControl
              label="Cabin mix"
              value={cabinMix}
              options={CABIN_MIX_OPTIONS}
              onChange={(value) => commit(applyCabinPlan(designInput, cabinGeometry.maximumCertifiedCapacity || categoryDefinition.capacityRange[0], value as CabinMix, comfortStandard))}
            />
            <SelectControl
              label="Comfort standard"
              value={comfortStandard}
              options={COMFORT_STANDARD_OPTIONS}
              onChange={(value) => commit(applyCabinPlan(designInput, cabinGeometry.maximumCertifiedCapacity || categoryDefinition.capacityRange[0], cabinMix, value as ComfortStandard))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {designInput.cabin.zones.map((zone) => (
              <Metric key={zone.cabinClass} label={CABIN_LABELS[zone.cabinClass]} value={`${cabinGeometry.zoneCapacities[zone.cabinClass] ?? 0} seats`} />
            ))}
          </div>
          <StudioNote
            title="Automatically handled"
            lines={[
              "Aisles, service areas, seat pitch, seat width, lavatories, galleys, and exits are generated from target seats, cabin mix, and comfort standard.",
              "If the cabin does not fit, reduce seats or pick a larger fuselage in the previous stage."
            ]}
          />
        </div>
      );
    }

    if (stage === "wing") {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Wingspan" value={`${designInput.wing.wingspanM.toFixed(1)} m`} />
            <Metric label="Wing area" value={`${designInput.wing.wingAreaM2.toLocaleString()} m2`} />
            <Metric label="Sweep" value={`${designInput.wing.sweepDeg} deg`} />
            <Metric label="Wing fuel" value={`${designInput.wing.wingFuelVolumeM3.toLocaleString()} m3`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <SelectControl
              label="Wing emphasis"
              value={wingPlan}
              options={WING_PLAN_OPTIONS}
              onChange={(value) => commit(applyWingPlan(designInput, value as WingPlan))}
            />
            <SelectControl
              label="High-lift system"
              value={designInput.wing.highLiftSystem}
              options={highLiftOptions.map((value) => ({ value, label: value.replaceAll("-", " ") }))}
              onChange={(value) => updateWing("highLiftSystem", value as AircraftStudioDesign["wing"]["highLiftSystem"])}
            />
            <SelectControl
              label="Wingtip device"
              value={designInput.wing.wingtipDevice}
              options={wingtipOptions.map((value) => ({ value, label: value === "none" ? "None" : value.replaceAll("-", " ") }))}
              onChange={(value) => updateWing("wingtipDevice", value as AircraftStudioDesign["wing"]["wingtipDevice"])}
            />
          </div>
          <StudioNote
            title="Automatically handled"
            lines={[
              "Wing area, span, sweep, thickness, mounting, and wing tank volume move together from the selected wing emphasis.",
              "Compact wings help airports. Efficient and long-range wings improve cruise economics but add size and cost."
            ]}
          />
        </div>
      );
    }

    if (stage === "propulsion") {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectControl
              label="Engine position"
              value={designInput.propulsion.position}
              options={(Object.keys(ENGINE_POSITION_LABELS) as EnginePosition[]).map((value) => ({ value, label: ENGINE_POSITION_LABELS[value] }))}
              onChange={(value) => updatePropulsion("position", value as EnginePosition)}
            />
            <SelectControl
              label="Engine model"
              value={designInput.propulsion.engineModelId}
              options={engineOptions.map((engine) => ({
                value: engine.id,
                label: `${engine.manufacturer} ${engine.family} · ${engine.maxThrustKn} kN · ${engine.availableYear}`
              }))}
              onChange={(value) => updatePropulsion("engineModelId", value as EngineModelId)}
            />
            <NumberControl label="Engine count" value={designInput.propulsion.engineCount} min={2} max={4} step={1} onChange={(value) => updatePropulsion("engineCount", value)} />
            <SelectControl
              label="Maintenance priority"
              value={designInput.propulsion.maintenancePriority}
              options={[
                { value: "cost", label: "Cost" },
                { value: "balanced", label: "Balanced" },
                { value: "reliability", label: "Reliability" }
              ]}
              onChange={(value) => updatePropulsion("maintenancePriority", value as AircraftStudioDesign["propulsion"]["maintenancePriority"])}
            />
          </div>
          {selectedEngine && (
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Thrust" value={`${selectedEngine.maxThrustKn} kN`} />
              <Metric label="Available" value={selectedEngine.availableYear.toString()} />
              <Metric label="Reliability" value={selectedEngine.reliability.toString()} />
              <Metric label="Noise" value={selectedEngine.noise.toString()} />
            </div>
          )}
          <StudioNote
            title="Unlocked engines only"
            lines={[
              engineOptions.length > 0
                ? `${engineOptions.length} compatible engine option${engineOptions.length === 1 ? "" : "s"} available for this category, position, year, and research state.`
                : "No compatible engine is unlocked for this configuration. Change the category, position, or research propulsion technology."
            ]}
          />
        </div>
      );
    }

    if (stage === "fuel") {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Total fuel volume" value={`${(designInput.wing.wingFuelVolumeM3 + designInput.fuelSystem.centerTankVolumeM3 + designInput.fuelSystem.auxiliaryTankVolumeM3).toLocaleString()} m3`} />
            <Metric label="MTOW target" value={`${designInput.fuelSystem.mtowTargetKg.toLocaleString()} kg`} />
            <Metric label="Reserve" value={`${designInput.fuelSystem.reservePolicyPercent}%`} />
            <Metric label="Estimated range" value={`${designPreview.typicalRangeNm.toLocaleString()} nm`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <SelectControl
              label="Range package"
              value={rangePackage}
              options={RANGE_PACKAGE_OPTIONS}
              onChange={(value) => commit(applyRangePackage(designInput, value as RangePackage))}
            />
            <SelectControl
              label="Payload priority"
              value={designInput.fuelSystem.payloadPriority}
              options={[
                { value: "payload", label: "Payload" },
                { value: "balanced", label: "Balanced" },
                { value: "range", label: "Range" }
              ]}
              onChange={(value) => updateFuel("payloadPriority", value as AircraftStudioDesign["fuelSystem"]["payloadPriority"])}
            />
            <RangeControl label="Reserve policy" value={designInput.fuelSystem.reservePolicyPercent} min={8} max={28} step={1} onChange={(value) => updateFuel("reservePolicyPercent", value)} />
          </div>
          <StudioNote
            title="Automatically handled"
            lines={[
              "Wing tank volume, center tank volume, auxiliary tanks, MTOW target, and fuel reinforcement are generated from the range package.",
              "Longer range gives airlines more route flexibility, but it adds weight and can squeeze payload economics."
            ]}
          />
        </div>
      );
    }

    if (stage === "structure") {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Primary material" value={MATERIAL_LABELS[designInput.structure.fuselageMaterial]} />
            <Metric label="Interior" value={designInput.structure.interiorMaterial.replaceAll("-", " ")} />
            <Metric label="Landing gear" value={designInput.structure.landingGearMaterial.replaceAll("-", " ")} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <SelectControl label="Primary structure" value={designInput.structure.fuselageMaterial} options={materialOptions.map((value) => ({ value, label: MATERIAL_LABELS[value] }))} onChange={(value) => commit(applyPrimaryMaterial(designInput, value as StructuralMaterialChoice))} />
            <SelectControl
              label="Interior"
              value={designInput.structure.interiorMaterial}
              options={[
                { value: "standard", label: "Standard" },
                { value: "lightweight", label: "Lightweight" },
                { value: "premium", label: "Premium" }
              ]}
              onChange={(value) => updateStructure("interiorMaterial", value as AircraftStudioDesign["structure"]["interiorMaterial"])}
            />
            <SelectControl
              label="Landing gear"
              value={designInput.structure.landingGearMaterial}
              options={[
                { value: "standard-steel", label: "Standard steel" },
                { value: "reinforced-steel", label: "Reinforced steel" },
                { value: "advanced-alloy", label: "Advanced alloy" }
              ]}
              onChange={(value) => updateStructure("landingGearMaterial", value as AircraftStudioDesign["structure"]["landingGearMaterial"])}
            />
          </div>
          <StudioNote
            title="Automatically handled"
            lines={[
              "Primary structure applies one material philosophy across fuselage, wing, tail, and control surfaces.",
              "Advanced materials reduce weight, but they raise tooling, certification, and supplier risk."
            ]}
          />
        </div>
      );
    }

    if (stage === "systems") {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectControl label="Avionics" value={designInput.systems.avionics} options={avionicsOptions.map((value) => ({ value, label: AVIONICS_LABELS[value] }))} onChange={(value) => updateSystems("avionics", value as AvionicsGeneration)} />
            <SelectControl
              label="Flight controls"
              value={designInput.systems.flightControls}
              options={(Object.keys(FLIGHT_CONTROL_LABELS) as FlightControlSystem[]).map((value) => ({ value, label: FLIGHT_CONTROL_LABELS[value] }))}
              onChange={(value) => updateSystems("flightControls", value as FlightControlSystem)}
            />
            <SelectControl
              label="Safety standard"
              value={safetyStandard}
              options={SAFETY_STANDARD_OPTIONS}
              onChange={(value) => commit(applySafetyStandard(designInput, value as SafetyStandard))}
            />
            <RangeControl label="Family commonality" value={designInput.commonality} min={0} max={100} step={1} onChange={(value) => update("commonality", value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Reliability goal" value={designInput.systems.reliabilityGoal.toString()} />
            <Metric label="Redundancy" value={designInput.systems.redundancy.replaceAll("-", " ")} />
            <Metric label="Diagnostics" value={designInput.systems.diagnostics.replaceAll("-", " ")} />
            <Metric label="Testing" value={designInput.systems.reliabilityTesting.replaceAll("-", " ")} />
          </div>
          <UnlockedTechnologyPicker technologies={unlockedDesignTechnologies} selectedIds={designInput.technologyPackage} toggleTechnology={toggleTechnology} />
        </div>
      );
    }

    if (stage === "performance") {
      return (
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Passengers" value={designPreview.typicalPassengerCapacity.toLocaleString()} />
          <Metric label="Range" value={`${designPreview.typicalRangeNm.toLocaleString()} nm`} />
          <Metric label="Ferry range" value={`${designPreview.ferryRangeNm.toLocaleString()} nm`} />
          <Metric label="OEW" value={`${designPreview.operatingEmptyWeightKg.toLocaleString()} kg`} />
          <Metric label="MTOW" value={`${designPreview.maximumTakeoffWeightKg.toLocaleString()} kg`} />
          <Metric label="Fuel capacity" value={`${designPreview.fuelCapacityKg.toLocaleString()} kg`} />
          <Metric label="Takeoff" value={`${designPreview.takeoffDistanceM.toLocaleString()} m`} />
          <Metric label="Landing" value={`${designPreview.landingDistanceM.toLocaleString()} m`} />
          <Metric label="Fuel/seat" value={`${designPreview.fuelBurnPerSeatKg.toLocaleString()} kg`} />
        </div>
      );
    }

    if (stage === "commercial") {
      return (
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Development cost" value={formatMoney(designPreview.developmentCost)} />
          <Metric label="Development time" value={`${designPreview.developmentMonths} mo`} />
          <Metric label="Unit cost" value={formatMoney(designPreview.unitProductionCost)} />
          <Metric label="List price" value={formatMoney(designPreview.estimatedSellingPrice)} />
          <Metric label="Break-even" value={`${designPreview.breakEvenUnits.toLocaleString()} units`} />
          <Metric label="Factory size" value={designPreview.requiredFactorySize} />
          <Metric label="Airline appeal" value={designPreview.airlineAppeal.toString()} />
          <Metric label="Reliability" value={designPreview.predictedReliability.toString()} />
          <Metric label="Technical risk" value={designPreview.technicalRisk.toString()} />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className={`rounded-lg border p-4 ${invalid ? "border-[#7f1d1d] bg-[#2a1014]" : designPreview.validation.status === "warning" ? "border-[#7c5a1e] bg-[#2a1d0b]" : "border-[#2a3445] bg-[#0b111c]"}`}>
          <h3 className="font-semibold">{invalid ? "Engineering blockers" : designPreview.validation.status === "warning" ? "Launchable with warnings" : "Ready for authorization"}</h3>
          <p className="mt-1 text-sm text-[#a8b3c4]">
            {invalid ? "Resolve invalid items before the program can be launched." : `${designInput.programName} can enter concept design.`}
          </p>
        </div>
        <ValidationList items={designPreview.validation.items} />
        <button
          onClick={launch}
          disabled={invalid}
          className={`focus-ring inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
            invalid ? "cursor-not-allowed border border-[#2a3445] bg-[#182233] text-[#748095]" : "bg-[#f2b84b] text-[#16110a] hover:bg-[#d99a2b]"
          }`}
        >
          <Play size={16} />
          Authorize Program
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)]">
      <section className="min-w-0 rounded-lg border border-[#2a3445] bg-[#0b111c] p-3">
        <div className="px-2 pb-3">
          <h2 className="text-sm font-semibold uppercase text-[#a8b3c4]">Design Studio</h2>
          <p className="mt-1 text-xs leading-5 text-[#748095]">Stage-based aircraft development</p>
        </div>
        <div className="space-y-1">
          {DESIGN_STAGES.map((candidate) => {
            const active = stage === candidate.id;
            const stageIssues = designPreview.validation.items.filter((item) => item.stage === candidate.id);
            return (
              <button
                key={candidate.id}
                onClick={() => setStage(candidate.id)}
                title={candidate.description}
                className={`focus-ring flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                  active ? "bg-[#f2b84b] text-[#16110a]" : "text-[#d7deea] hover:bg-[#182233]"
                }`}
              >
                <span className="truncate">{candidate.label}</span>
                {stageIssues.length > 0 && (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${stageIssues.some((item) => item.level === "invalid") ? "bg-[#f87171]" : "bg-[#f2b84b]"}`} />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="min-w-0 rounded-lg border border-[#2a3445] bg-[#111827] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{DESIGN_STAGES.find((candidate) => candidate.id === stage)?.label}</h2>
            <p className="mt-1 text-sm text-[#a8b3c4]">{DESIGN_STAGES.find((candidate) => candidate.id === stage)?.description}</p>
          </div>
          <span
            className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase ${
              invalid ? "bg-[#3b1518] text-[#fecaca]" : designPreview.validation.status === "warning" ? "bg-[#3a2a10] text-[#ffd48a]" : "bg-[#0f2c3d] text-[#7dd3fc]"
            }`}
          >
            {designPreview.validation.status}
          </span>
        </div>
        <div className="mt-5">{renderStage()}</div>
      </section>

      <section className="min-w-0 space-y-4 xl:col-start-2">
        <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{designInput.programName}</h2>
              <p className="mt-1 text-sm text-[#a8b3c4]">
                {AIRCRAFT_CATEGORIES[designInput.category].label} · {designInput.designation}
              </p>
            </div>
            <Plane size={18} className="text-[#f2b84b]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Metric label="Seats" value={designPreview.typicalPassengerCapacity.toLocaleString()} />
            <Metric label="Range" value={`${designPreview.typicalRangeNm.toLocaleString()} nm`} />
            <Metric label="Comfort" value={designPreview.comfortRating} />
            <Metric label="Fuel/seat" value={`${designPreview.fuelBurnPerSeatKg} kg`} />
            <Metric label="Risk" value={designPreview.technicalRisk.toString()} />
            <Metric label="Appeal" value={designPreview.airlineAppeal.toString()} />
          </div>
          <ValidationList items={designPreview.validation.items.slice(0, 4)} compact />
        </section>
      </section>
    </div>
  );
}

function UnlockedTechnologyPicker({
  technologies,
  selectedIds,
  toggleTechnology
}: {
  technologies: Technology[];
  selectedIds: string[];
  toggleTechnology: (technologyId: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#d7deea]">Unlocked technology package</h3>
      <div className="mt-2 max-h-52 space-y-2 overflow-y-auto rounded-md border border-[#2a3445] bg-[#0b111c] p-2">
        {technologies.length === 0 ? (
          <p className="px-2 py-1 text-sm text-[#a8b3c4]">No unlocked design technologies.</p>
        ) : (
          technologies.map((technology) => (
            <label key={technology.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#182233]">
              <input
                type="checkbox"
                checked={selectedIds.includes(technology.id)}
                onChange={() => toggleTechnology(technology.id)}
                className="mt-1 accent-[#f2b84b]"
              />
              <span>
                <span className="block font-medium">{technology.name}</span>
                <span className="block text-xs text-[#a8b3c4]">{technology.effects[0]}</span>
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function StudioNote({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-[#2a3445] bg-[#0b111c] p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2 space-y-1 text-sm leading-6 text-[#a8b3c4]">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function ValidationList({ items, compact = false }: { items: AircraftCalculatedPerformance["validation"]["items"]; compact?: boolean }) {
  if (items.length === 0) {
    return compact ? null : <p className="text-sm text-[#a8b3c4]">No validation warnings.</p>;
  }

  return (
    <div className={`${compact ? "mt-4" : ""} space-y-2`}>
      {items.map((item) => (
        <div
          key={`${item.stage}-${item.title}`}
          className={`min-w-0 rounded-md border px-3 py-2 text-sm ${
            item.level === "invalid" ? "border-[#7f1d1d] bg-[#2a1014] text-[#fecaca]" : "border-[#7c5a1e] bg-[#2a1d0b] text-[#ffd48a]"
          }`}
        >
          <div className="text-wrap font-semibold leading-5">{item.title}</div>
          {!compact && <p className="mt-1 text-wrap leading-5 text-[#d7deea]">{item.message}</p>}
          <p className={`${compact ? "mt-1" : "mt-2"} text-wrap text-xs leading-5 text-[#a8b3c4]`}>{item.fix}</p>
        </div>
      ))}
    </div>
  );
}

function DevelopmentTab({
  gameState,
  mutateGame,
  designInput,
  setDesignInput,
  designPreview,
  focusedTarget,
  launch
}: {
  gameState: GameState;
  mutateGame: (mutator: (state: GameState) => GameState, message: string) => void;
  designInput: AircraftStudioDesign;
  setDesignInput: (value: AircraftStudioDesign) => void;
  designPreview: AircraftCalculatedPerformance;
  focusedTarget: GameDeepLinkTarget;
  launch: () => void;
}) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  const [section, setSection] = useState<"programs" | "design" | "portfolio" | "engineers">(
    focusedTarget.entityId === "design-studio" ? "design" : "programs"
  );

  useEffect(() => {
    if (focusedTarget.section !== "development") {
      return;
    }
    if (focusedTarget.entityId === "design-studio") {
      setSection("design");
    } else if (focusedTarget.entityType === "aircraftProgram") {
      setSection("programs");
    }
  }, [focusedTarget]);

  return (
    <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Development</h2>
          <p className="mt-1 text-sm text-[#a8b3c4]">Programs, aircraft design, certified portfolio, and engineering workforce.</p>
        </div>
        <SubtabBar
          tabs={[
            { id: "programs", label: "Programs" },
            { id: "design", label: "Design Studio" },
            { id: "portfolio", label: "Aircraft Portfolio" },
            { id: "engineers", label: "Engineers" }
          ]}
          active={section}
          setActive={(value) => setSection(value as typeof section)}
        />
      </div>

      {section === "programs" && (
        <div className="mt-4 grid gap-3">
          {player.aircraftPrograms.length === 0 ? (
            <p className="text-sm text-[#a8b3c4]">No aircraft programs.</p>
          ) : (
            player.aircraftPrograms.map((program) => (
              <div
                key={program.id}
                className={`rounded-lg border p-4 ${
                  focusedTarget.entityId === program.id ? "border-[#f2b84b] bg-[#1d2f46]" : "border-[#2a3445]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{program.name}</h3>
                    <p className="mt-1 text-sm text-[#a8b3c4]">
                      {program.stage.replaceAll("-", " ")} · {program.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <IconButton title="Increase funding" icon={Plus} label="Fund" onClick={() => mutateGame((state) => updatePlayerProgram(state, program.id, { monthlyBudget: program.monthlyBudget * 1.15 }), "Program funding increased.")} />
                    <IconButton title={program.status === "paused" ? "Resume" : "Pause"} icon={Play} label={program.status === "paused" ? "Resume" : "Pause"} onClick={() => mutateGame((state) => updatePlayerProgram(state, program.id, { paused: program.status !== "paused" }), "Program status updated.")} />
                    <IconButton title="Cancel" icon={Trash2} label="Cancel" danger onClick={() => mutateGame((state) => updatePlayerProgram(state, program.id, { cancelled: true }), "Program cancelled.")} />
                  </div>
                </div>
                <ProgressBar value={program.stageProgress} />
                <div className="mt-3 grid gap-3 md:grid-cols-5">
                  <Metric label="Engineers" value={program.assignedEngineers.toLocaleString()} />
                  <Metric label="Monthly budget" value={formatMoney(program.monthlyBudget)} />
                  <Metric label="Spent" value={formatMoney(program.spentTotal)} />
                  <Metric label="Expected" value={`Turn ${program.expectedCertificationTurn}`} />
                  <Metric label="Delays" value={`${program.delayMonths} mo`} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {section === "design" && (
        <div className="mt-4">
          <AircraftTab
            designInput={designInput}
            setDesignInput={setDesignInput}
            designPreview={designPreview}
            unlockedTechnologyIds={player.unlockedTechnologyIds}
            technologies={gameState.technologies}
            launch={launch}
          />
        </div>
      )}

      {section === "portfolio" && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="border-b border-[#2a3445] text-left text-[#a8b3c4]">
              <tr>
                <th className="py-2 pr-4">Aircraft</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Capacity</th>
                <th className="py-2 pr-4">Range</th>
                <th className="py-2 pr-4">Reliability</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {player.aircraftModels.map((model) => (
                <tr key={model.id} className="border-b border-[#222c3b]">
                  <td className="py-3 pr-4 font-semibold">{model.name}</td>
                  <td className="py-3 pr-4">{AIRCRAFT_CATEGORIES[model.category].label}</td>
                  <td className="py-3 pr-4">{model.capacity}</td>
                  <td className="py-3 pr-4">{model.rangeNm.toLocaleString()} nm</td>
                  <td className="py-3 pr-4">{model.reliability}</td>
                  <td className="py-3 pr-4">{model.active ? "Certified" : "Retired"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {player.aircraftModels.length === 0 && <p className="mt-4 text-sm text-[#a8b3c4]">No certified aircraft yet.</p>}
        </div>
      )}

      {section === "engineers" && (
        <WorkforcePanel
          title="Engineering Workforce"
          group={player.employees.engineers}
          assigned={player.aircraftPrograms.reduce((sum, program) => sum + (program.status === "active" ? program.assignedEngineers : 0), 0)}
          mutateGame={mutateGame}
          role="engineers"
        />
      )}
    </section>
  );
}

function ResearchTab({
  gameState,
  mutateGame,
  focusedTarget
}: {
  gameState: GameState;
  mutateGame: (mutator: (state: GameState) => GameState, message: string) => void;
  focusedTarget: GameDeepLinkTarget;
}) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  const activeProjects = player.researchProjects.filter((project) => project.status === "active");
  const researchSlots = getResearchSlotCount(player);
  const slotsAvailable = hasResearchSlotAvailable(player);
  const assignedScientists = activeProjects.reduce((sum, project) => sum + project.assignedScientists, 0);
  return (
    <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Technology Tree</h2>
          <p className="mt-1 text-sm text-[#a8b3c4]">
            {activeProjects.length}/{researchSlots} research slots active · {formatGameDate(gameState.date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeProjects.map((project) => {
            const technology = gameState.technologies[project.technologyId]!;
            const effectiveRequired = getEffectiveResearchPointsRequired(player, technology, gameState.date.year, gameState.technologies);
            return (
              <div key={project.id} className="min-w-52 rounded-md border border-[#2a3445] bg-[#182233] px-3 py-2">
                <div className="text-xs font-semibold text-[#d7deea]">{technology.name}</div>
                <ProgressBar value={(project.progress / effectiveRequired) * 100} compact />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <WorkforcePanel
          title="Scientist Workforce"
          group={player.employees.scientists}
          assigned={assignedScientists}
          mutateGame={mutateGame}
          role="scientists"
        />
        <div className="rounded-lg border border-[#2a3445] p-4">
          <h3 className="text-sm font-semibold">Research Operations</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Metric label="Slots" value={`${activeProjects.length}/${researchSlots}`} />
            <Metric label="Idle scientists" value={Math.max(0, player.employees.scientists.headcount - assignedScientists).toLocaleString()} />
            <Metric label="Monthly payroll" value={formatMoney(player.employees.scientists.headcount * player.employees.scientists.averageMonthlySalary)} />
          </div>
        </div>
      </div>
      <ResearchTree
        gameState={gameState}
        slotsAvailable={slotsAvailable}
        focusedTechnologyId={focusedTarget.section === "research" ? focusedTarget.entityId : undefined}
        startTechnology={(technologyId) =>
          mutateGame(
            (state) => startPlayerResearch(state, technologyId, 170, Math.round(state.technologies[technologyId]!.researchCost / 30)),
            `${gameState.technologies[technologyId]!.name} research started.`
          )
        }
      />
    </section>
  );
}

const TREE_START_YEAR = 1970;
const TREE_END_YEAR = 2030;
const TREE_YEAR_WIDTH = 58;
const TREE_BRANCH_LABEL_WIDTH = 230;
const TREE_HEADER_HEIGHT = 84;
const TREE_ROW_HEIGHT = 126;
const TREE_NODE_WIDTH = 184;
const TREE_NODE_HEIGHT = 76;

function ResearchTree({
  gameState,
  slotsAvailable,
  focusedTechnologyId,
  startTechnology
}: {
  gameState: GameState;
  slotsAvailable: boolean;
  focusedTechnologyId?: string;
  startTechnology: (technologyId: string) => void;
}) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  const technologies = Object.values(gameState.technologies);
  const technologyById = gameState.technologies;
  const treeWidth = TREE_BRANCH_LABEL_WIDTH + (TREE_END_YEAR - TREE_START_YEAR + 1) * TREE_YEAR_WIDTH + TREE_NODE_WIDTH;
  const treeHeight = TREE_HEADER_HEIGHT + TECHNOLOGY_BRANCHES.length * TREE_ROW_HEIGHT;

  function nodePosition(technology: Technology) {
    const branchIndex = TECHNOLOGY_BRANCHES.findIndex((branch) => branch.id === technology.branch);
    const sameYearIndex = technologies
      .filter((candidate) => candidate.branch === technology.branch && candidate.historicalYear === technology.historicalYear)
      .sort((a, b) => a.name.localeCompare(b.name))
      .findIndex((candidate) => candidate.id === technology.id);
    const x = TREE_BRANCH_LABEL_WIDTH + (technology.historicalYear - TREE_START_YEAR) * TREE_YEAR_WIDTH;
    const y = TREE_HEADER_HEIGHT + branchIndex * TREE_ROW_HEIGHT + 22 + Math.max(0, sameYearIndex) * 22;
    return { x, y };
  }

  const connectionLines = technologies.flatMap((technology) => {
    const target = nodePosition(technology);
    return technology.prerequisites
      .map((prerequisiteId) => {
        const prerequisite = technologyById[prerequisiteId];
        if (!prerequisite) {
          return null;
        }
        const source = nodePosition(prerequisite);
        return {
          id: `${prerequisiteId}-${technology.id}`,
          x1: source.x + TREE_NODE_WIDTH,
          y1: source.y + TREE_NODE_HEIGHT / 2,
          x2: target.x,
          y2: target.y + TREE_NODE_HEIGHT / 2,
          active: player.unlockedTechnologyIds.includes(prerequisiteId)
        };
      })
      .filter((line): line is NonNullable<typeof line> => Boolean(line));
  });

  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-[#26332f] bg-[#17211f] shadow-inner">
      <div className="relative" style={{ width: treeWidth, height: treeHeight }}>
        <div className="absolute left-0 top-0 z-20 h-full w-[230px] border-r border-[#34443f] bg-[#101716]" />
        {RESEARCH_ERAS.map((era) => {
          const startX = TREE_BRANCH_LABEL_WIDTH + (era.startYear - TREE_START_YEAR) * TREE_YEAR_WIDTH;
          const endYear = era.endYear ?? TREE_END_YEAR;
          const width = Math.max(240, (endYear - era.startYear + 1) * TREE_YEAR_WIDTH);
          return (
            <div
              key={era.id}
              className="absolute top-0 z-10 border-r border-[#34443f] bg-[#202b28] px-3 py-3 text-xs font-semibold uppercase text-[#e7ede6]"
              style={{ left: startX, width, height: TREE_HEADER_HEIGHT }}
            >
              <div>{era.label}</div>
              <div className="mt-1 text-[#aebbb4]">{era.startYear}-{era.endYear ?? "onward"}</div>
            </div>
          );
        })}
        {TECHNOLOGY_BRANCHES.map((branch, index) => (
          <div key={branch.id}>
            <div
              className="absolute left-0 z-30 flex items-center border-b border-[#34443f] px-4 text-sm font-semibold text-[#e7ede6]"
              style={{ top: TREE_HEADER_HEIGHT + index * TREE_ROW_HEIGHT, width: TREE_BRANCH_LABEL_WIDTH, height: TREE_ROW_HEIGHT }}
            >
              <span className="mr-3 h-9 w-1.5 rounded-full" style={{ background: branch.accent }} />
              {branch.label}
            </div>
            <div
              className="absolute left-[230px] border-b border-[#2b3935]"
              style={{ top: TREE_HEADER_HEIGHT + index * TREE_ROW_HEIGHT, width: treeWidth - TREE_BRANCH_LABEL_WIDTH, height: TREE_ROW_HEIGHT }}
            />
          </div>
        ))}
        <svg className="pointer-events-none absolute left-0 top-0 z-0" width={treeWidth} height={treeHeight} aria-hidden="true">
          {connectionLines.map((line) => (
            <path
              key={line.id}
              d={`M ${line.x1} ${line.y1} C ${line.x1 + 38} ${line.y1}, ${line.x2 - 38} ${line.y2}, ${line.x2} ${line.y2}`}
              fill="none"
              stroke={line.active ? "#d8b75c" : "#596762"}
              strokeWidth={line.active ? 3 : 2}
              strokeDasharray={line.active ? undefined : "5 7"}
            />
          ))}
        </svg>
        {technologies
          .sort((a, b) => a.historicalYear - b.historicalYear || a.branch.localeCompare(b.branch))
          .map((technology) => (
            <TechnologyNode
              key={technology.id}
              technology={technology}
              gameState={gameState}
              slotsAvailable={slotsAvailable}
              focused={focusedTechnologyId === technology.id || focusedTechnologyId === technology.name}
              position={nodePosition(technology)}
              startTechnology={startTechnology}
            />
          ))}
      </div>
    </div>
  );
}

function TechnologyNode({
  technology,
  gameState,
  slotsAvailable,
  focused,
  position,
  startTechnology
}: {
  technology: Technology;
  gameState: GameState;
  slotsAvailable: boolean;
  focused: boolean;
  position: { x: number; y: number };
  startTechnology: (technologyId: string) => void;
}) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  const state = getTechnologyResearchState(player, technology, gameState.date.year, gameState.technologies);
  const activeProject = player.researchProjects.find((project) => project.technologyId === technology.id && project.status === "active");
  const aheadYears = getAheadOfTimeYears(player, technology, gameState.date.year, gameState.technologies);
  const penalty = getAheadOfTimePenaltyMultiplier(player, technology, gameState.date.year, gameState.technologies);
  const effectiveRequired = getEffectiveResearchPointsRequired(player, technology, gameState.date.year, gameState.technologies);
  const canStart = canResearchTechnology(player, technology, gameState.date.year, gameState.technologies) && slotsAvailable;
  const branch = TECHNOLOGY_BRANCHES.find((candidate) => candidate.id === technology.branch);
  const progress = activeProject ? (activeProject.progress / effectiveRequired) * 100 : 0;
  const stateIcon =
    state === "completed" ? Check : state === "active" ? Clock3 : state === "available" ? Plus : Lock;
  const StateIcon = stateIcon;
  const className =
    state === "completed"
      ? "border-[#f2b84b] bg-[#3a2a10] text-[#ffe2a1] shadow-[0_0_0_2px_rgba(242,184,75,0.22)]"
      : state === "active"
        ? "border-[#38bdf8] bg-[#0f2c3d] text-[#dff3ff] shadow-[0_0_0_2px_rgba(56,189,248,0.16)]"
        : state === "available"
          ? "border-[#a78bfa] bg-[#211a3a] text-[#eadfff] hover:bg-[#2d2352]"
          : "border-[#303b4f] bg-[#111827] text-[#748095]";

  return (
    <div className="group absolute z-10" style={{ left: position.x, top: position.y, width: TREE_NODE_WIDTH }}>
      <button
        title={buildTechnologyTooltip(technology, gameState)}
        disabled={!canStart}
        onClick={() => startTechnology(technology.id)}
        className={`focus-ring relative flex h-[76px] w-full flex-col justify-between rounded-md border p-2 text-left text-xs transition ${className} ${
          focused ? "ring-4 ring-[#d8b75c]/60" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-semibold leading-4">{technology.name}</span>
          <StateIcon size={15} className="shrink-0" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className="font-semibold">{technology.historicalYear}</span>
          <span>{formatMoney(technology.researchCost)}</span>
        </div>
        {activeProject && (
          <div className="absolute bottom-0 left-0 h-1 rounded-b bg-[#f2b84b]" style={{ width: `${Math.max(3, Math.min(100, progress))}%` }} />
        )}
        <span className="absolute left-0 top-0 h-full w-1 rounded-l" style={{ background: branch?.accent ?? "#8896aa" }} />
      </button>
      <div className="pointer-events-none absolute left-0 top-[84px] z-40 hidden w-80 rounded-md border border-[#2a3445] bg-[#0b111c] p-3 text-xs leading-5 text-[#e8eef8] shadow-xl group-hover:block">
        <div className="font-semibold">{technology.name}</div>
        <div className="mt-1 text-[#a8b3c4]">
          {technology.historicalYear} · {technology.era.replaceAll("-", " ")} · {technology.researchPointsRequired} RP
        </div>
        {aheadYears > 0 && (
          <div className="mt-2 rounded bg-[#473b1e] px-2 py-1 text-[#ffe4a6]">
            {aheadYears.toFixed(1)} years ahead of time · {penalty.toFixed(2)}x research requirement
          </div>
        )}
        {technology.prerequisites.length > 0 && (
          <div className="mt-2">
            <span className="font-semibold">Prerequisites: </span>
            {technology.prerequisites.map((id) => gameState.technologies[id]?.name ?? id).join(", ")}
          </div>
        )}
        <div className="mt-2">
          <span className="font-semibold">Effects: </span>
          {technology.effects.join("; ")}
        </div>
        {technology.risks.length > 0 && (
          <div className="mt-2 text-[#f0c6bd]">
            <span className="font-semibold">Risks: </span>
            {technology.risks.join("; ")}
          </div>
        )}
        {!slotsAvailable && state === "available" && <div className="mt-2 text-[#ffe4a6]">All research slots are in use.</div>}
      </div>
    </div>
  );
}

function buildTechnologyTooltip(technology: Technology, gameState: GameState): string {
  const prerequisites =
    technology.prerequisites.length > 0
      ? technology.prerequisites.map((id) => gameState.technologies[id]?.name ?? id).join(", ")
      : "None";
  return `${technology.name}
Year: ${technology.historicalYear}
Cost: ${formatMoney(technology.researchCost)}
Research points: ${technology.researchPointsRequired}
Prerequisites: ${prerequisites}
Effects: ${technology.effects.join("; ")}`;
}

function FactoriesTab({
  gameState,
  mutateGame,
  focusedTarget
}: {
  gameState: GameState;
  mutateGame: (mutator: (state: GameState) => GameState, message: string) => void;
  focusedTarget: GameDeepLinkTarget;
}) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  const certifiedModels = player.aircraftModels.filter((model) => model.active);
  const defaultFactoryCountry = FACTORY_COUNTRIES.some((country) => country.name === player.factories[0]?.country)
    ? player.factories[0]!.country!
    : "United States";
  const [selectedCountry, setSelectedCountry] = useState(defaultFactoryCountry);
  const [section, setSection] = useState<"network" | "production" | "workforce" | "deliveries">("network");
  const assignedWorkers = getAssignedFactoryWorkers(player);
  const totalFactoryWorkers = player.employees.factoryWorkers.headcount;
  const availableWorkers = Math.max(0, totalFactoryWorkers - assignedWorkers);

  useEffect(() => {
    setSelectedCountry(defaultFactoryCountry);
  }, [defaultFactoryCountry, player.identityId]);

  return (
    <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Factories</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SubtabBar
            tabs={[
              { id: "network", label: "Factory Network" },
              { id: "production", label: "Production Lines" },
              { id: "workforce", label: "Workforce" },
              { id: "deliveries", label: "Delivery Schedule" }
            ]}
            active={section}
            setActive={(value) => setSection(value as typeof section)}
          />
          <label className="text-sm font-medium">
            Country
            <select
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
              className="focus-ring ml-2 rounded-md border border-[#2a3445] bg-[#111827] px-3 py-2"
            >
              {FACTORY_COUNTRIES.map((country) => (
                <option key={country.name} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>
          <IconButton title="Build regional or narrow-body factory" icon={Plus} label="Build Medium" onClick={() => mutateGame((state) => buildPlayerFactory(state, "narrow-body", selectedCountry), "Factory construction started.")} />
          <IconButton title="Build wide-body factory" icon={Plus} label="Build Large" onClick={() => mutateGame((state) => buildPlayerFactory(state, "wide-body", selectedCountry), "Wide-body factory construction started.")} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="Factory workers" value={totalFactoryWorkers.toLocaleString()} />
        <Metric label="Assigned to lines" value={assignedWorkers.toLocaleString()} />
        <Metric label="Available workers" value={availableWorkers.toLocaleString()} />
      </div>
      {(section === "network" || section === "production") && <div className="mt-4 grid gap-3">
        {player.factories.map((factory) => {
          const status = getFactoryStatus(factory);
          const activeLine = factory.productionLines.find((line) => line.status === "active") ?? factory.productionLines[0];
          const supportedModels = certifiedModels.filter((model) => factory.supportedCategories.includes(model.category));
          const factoryAssignedWorkers = getFactoryAssignedWorkers(factory);
          const canConfigure = status === "active" && supportedModels.length > 0;

          return (
            <div
              key={factory.id}
              className={`rounded-lg border p-4 ${
                focusedTarget.entityId === factory.id
                  ? "border-[#f2b84b] bg-[#1d2f46]"
                  : status === "closed"
                    ? "border-[#2a3445] bg-[#182233]"
                    : "border-[#2a3445]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{factory.name}</h3>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${factoryStatusClass(status)}`}>{factoryStatusLabel(status)}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#a8b3c4]">
                    {formatFactoryLocation(factory)} · {factory.size} · {factorySupportedCategories(factory)}
                  </p>
                </div>
                {status !== "closed" && (
                  <IconButton
                    title="Close factory"
                    icon={Trash2}
                    label="Close"
                    danger
                    onClick={() => mutateGame((state) => closePlayerFactory(state, factory.id), `${factory.name} closed.`)}
                  />
                )}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Metric label="Capacity" value={status === "active" ? factory.capacity.toString() : "0"} />
                <Metric label="Idle capacity" value={status === "active" ? factory.idleSpace.toFixed(1) : "0"} />
                <Metric label="Workers assigned" value={factoryAssignedWorkers.toLocaleString()} />
                <Metric label="Operating cost" value={status === "active" ? formatMoney(factory.monthlyCost) : "$0"} />
              </div>
              {status === "building" && (
                <div className="mt-4 rounded-md border border-[#7c5a1e] bg-[#2a1d0b] px-3 py-2 text-sm text-[#ffd48a]">
                  Construction has {factory.constructionTurnsRemaining ?? 0} months remaining.
                </div>
              )}
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <label className="block text-sm font-medium">
                  Aircraft built here
                  <select
                    value={activeLine?.modelId ?? ""}
                    disabled={!canConfigure}
                    onChange={(event) => {
                      const modelId = event.target.value;
                      mutateGame(
                        (state) => (modelId ? assignPlayerProductionLine(state, factory.id, modelId) : idlePlayerFactoryProduction(state, factory.id)),
                        modelId ? "Factory production updated." : "Factory production idled."
                      );
                    }}
                    className="focus-ring mt-1 w-full rounded-md border border-[#2a3445] bg-[#111827] px-3 py-2"
                  >
                    <option value="">Idle / no aircraft</option>
                    {supportedModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} · {AIRCRAFT_CATEGORIES[model.category].label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-md bg-[#080b11] px-3 py-2 text-sm">
                  <span className="block text-xs font-medium uppercase text-[#8896aa]">Target rate</span>
                  <span className="mt-1 block font-semibold">{activeLine ? `${activeLine.targetMonthlyRate}/mo` : "Idle"}</span>
                </div>
              </div>
              {status === "active" && supportedModels.length === 0 && (
                <p className="mt-3 text-sm text-[#a8b3c4]">No certified aircraft fit this factory yet.</p>
              )}
            </div>
          );
        })}
      </div>}
      {section === "workforce" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <WorkforcePanel
            title="Factory Workforce"
            group={player.employees.factoryWorkers}
            assigned={assignedWorkers}
            mutateGame={mutateGame}
            role="factoryWorkers"
          />
          <div className="overflow-x-auto rounded-lg border border-[#2a3445]">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead className="border-b border-[#2a3445] bg-[#182233] text-left text-[#a8b3c4]">
                <tr>
                  <th className="px-3 py-2">Factory</th>
                  <th className="px-3 py-2">Country</th>
                  <th className="px-3 py-2">Workers</th>
                  <th className="px-3 py-2">Required</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {player.factories.map((factory) => {
                  const required = getFactoryAssignedWorkers(factory);
                  return (
                    <tr key={factory.id} className="border-b border-[#222c3b]">
                      <td className="px-3 py-3 font-semibold">{factory.name}</td>
                      <td className="px-3 py-3">{formatFactoryLocation(factory)}</td>
                      <td className="px-3 py-3">{factory.workerCount.toLocaleString()}</td>
                      <td className="px-3 py-3">{required.toLocaleString()}</td>
                      <td className="px-3 py-3">{factory.workerCount >= required ? "Covered" : "Shortage"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {section === "deliveries" && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#2a3445]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="border-b border-[#2a3445] bg-[#182233] text-left text-[#a8b3c4]">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Airline</th>
                <th className="px-3 py-2">Aircraft</th>
                <th className="px-3 py-2">Remaining</th>
                <th className="px-3 py-2">Delivery starts</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(gameState.orders)
                .filter((order) => order.manufacturerId === player.id)
                .map((order) => {
                  const model = player.aircraftModels.find((candidate) => candidate.id === order.modelId);
                  return (
                    <tr key={order.id} className="border-b border-[#222c3b]">
                      <td className="px-3 py-3 font-semibold">{order.id}</td>
                      <td className="px-3 py-3">{gameState.airlines[order.airlineId]?.name}</td>
                      <td className="px-3 py-3">{model?.name}</td>
                      <td className="px-3 py-3">{Math.max(0, order.quantity - order.delivered)}</td>
                      <td className="px-3 py-3">Turn {order.deliveryStartTurn}</td>
                      <td className="px-3 py-3">{order.status}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function factoryStatusLabel(status: FactoryStatus): string {
  if (status === "building") {
    return "Building";
  }
  if (status === "closed") {
    return "Closed";
  }
  return "Active";
}

function factoryStatusClass(status: FactoryStatus): string {
  if (status === "building") {
    return "bg-[#3a2a10] text-[#ffd48a]";
  }
  if (status === "closed") {
    return "bg-[#283348] text-[#d7deea]";
  }
  return "bg-[#0f2c3d] text-[#7dd3fc]";
}

function formatFactoryLocation(factory: FactoryRecord): string {
  return factory.country ?? factory.location.replaceAll("-", " ");
}

function factorySupportedCategories(factory: FactoryRecord): string {
  return factory.supportedCategories.map((category) => AIRCRAFT_CATEGORIES[category].label).join(", ");
}

function OrdersTab({
  gameState,
  focusedTarget,
  navigate
}: {
  gameState: GameState;
  focusedTarget: GameDeepLinkTarget;
  navigate: (target: GameDeepLinkTarget) => void;
}) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  const [section, setSection] = useState<"book" | "calendar" | "airlines" | "relationships">(
    focusedTarget.entityType === "deliveryCalendar" ? "calendar" : focusedTarget.entityType === "airline" ? "airlines" : "book"
  );
  const orders = Object.values(gameState.orders).filter((order) => order.manufacturerId === player.id);
  useEffect(() => {
    if (focusedTarget.section !== "orders") {
      return;
    }
    if (focusedTarget.entityType === "deliveryCalendar") {
      setSection("calendar");
    } else if (focusedTarget.entityType === "airline") {
      setSection("airlines");
    } else if (focusedTarget.entityType === "order") {
      setSection("book");
    }
  }, [focusedTarget]);

  return (
    <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Orders</h2>
          <p className="mt-1 text-sm text-[#a8b3c4]">Order book, delivery schedule, airlines, and relationship scores.</p>
        </div>
        <SubtabBar
          tabs={[
            { id: "book", label: "Order Book" },
            { id: "calendar", label: "Delivery Calendar" },
            { id: "airlines", label: "Airlines" },
            { id: "relationships", label: "Relationship Overview" }
          ]}
          active={section}
          setActive={(value) => setSection(value as typeof section)}
        />
      </div>
      {section === "book" && <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="border-b border-[#2a3445] text-left text-[#a8b3c4]">
            <tr>
              <th className="py-2 pr-4">Airline</th>
              <th className="py-2 pr-4">Model</th>
              <th className="py-2 pr-4">Quantity</th>
              <th className="py-2 pr-4">Delivered</th>
              <th className="py-2 pr-4">Remaining</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Total value</th>
              <th className="py-2 pr-4">Next delivery</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const model = player.aircraftModels.find((candidate) => candidate.id === order.modelId);
              return (
                <tr key={order.id} className={`border-b border-[#222c3b] ${focusedTarget.entityId === order.id ? "bg-[#1d2f46]" : ""}`}>
                  <td className="py-3 pr-4">{gameState.airlines[order.airlineId]?.name}</td>
                  <td className="py-3 pr-4">{model?.name}</td>
                  <td className="py-3 pr-4">{order.quantity}</td>
                  <td className="py-3 pr-4">{order.delivered}</td>
                  <td className="py-3 pr-4">{Math.max(0, order.quantity - order.delivered)}</td>
                  <td className="py-3 pr-4">{formatMoney(order.pricePerAircraft)}</td>
                  <td className="py-3 pr-4">{formatMoney(order.pricePerAircraft * order.quantity)}</td>
                  <td className="py-3 pr-4">Turn {order.deliveryStartTurn}</td>
                  <td className="py-3 pr-4">{order.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && <p className="mt-4 text-sm text-[#a8b3c4]">No orders yet.</p>}
      </div>}
      {section === "calendar" && (
        <div className="mt-4 grid gap-3">
          {orders.length === 0 ? (
            <p className="text-sm text-[#a8b3c4]">No deliveries scheduled.</p>
          ) : (
            orders
              .slice()
              .sort((a, b) => a.deliveryStartTurn - b.deliveryStartTurn)
              .map((order) => {
                const model = player.aircraftModels.find((candidate) => candidate.id === order.modelId);
                return (
                  <button
                    key={order.id}
                    onClick={() => navigate({ section: "orders", entityType: "order", entityId: order.id })}
                    className="focus-ring rounded-lg border border-[#2a3445] p-4 text-left hover:bg-[#182233]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-semibold">Turn {order.deliveryStartTurn}: {model?.name ?? "Aircraft"} for {gameState.airlines[order.airlineId]?.name}</span>
                      <span className="text-sm text-[#a8b3c4]">{Math.max(0, order.quantity - order.delivered)} remaining</span>
                    </div>
                  </button>
                );
              })
          )}
        </div>
      )}
      {section === "airlines" && (
        <div className="mt-4 grid gap-3">
          {Object.values(gameState.airlines).map((airline) => {
            const relationship = player.relationships[airline.id]?.score ?? airline.relationshipScore[player.id] ?? 50;
            const airlineOrders = orders.filter((order) => order.airlineId === airline.id);
            return (
              <button
                key={airline.id}
                onClick={() => navigate({ section: "orders", entityType: "airline", entityId: airline.id })}
                className={`focus-ring rounded-lg border p-4 text-left ${
                  focusedTarget.entityId === airline.id ? "border-[#f2b84b] bg-[#1d2f46]" : "border-[#2a3445] hover:bg-[#182233]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{airline.name}</h3>
                    <p className="mt-1 text-sm text-[#a8b3c4]">
                      {airline.country ?? airline.region.replaceAll("-", " ")} · {AIRCRAFT_CATEGORIES[airline.preferredCategory].label}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">Relationship {relationship}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-5">
                  <Metric label="Fleet" value={airline.fleetSize.toLocaleString()} />
                  <Metric label="Financial" value={airline.financialStrength.toString()} />
                  <Metric label="Price sensitivity" value={airline.priceSensitivity.toString()} />
                  <Metric label="Orders" value={airlineOrders.length.toString()} />
                  <Metric label="Delivered" value={airlineOrders.reduce((sum, order) => sum + order.delivered, 0).toString()} />
                </div>
              </button>
            );
          })}
        </div>
      )}
      {section === "relationships" && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#2a3445]">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="border-b border-[#2a3445] bg-[#182233] text-left text-[#a8b3c4]">
              <tr>
                <th className="px-3 py-2">Airline</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Order potential</th>
                <th className="px-3 py-2">Exposure</th>
                <th className="px-3 py-2">Last interaction</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(gameState.airlines)
                .slice()
                .sort((a, b) => (player.relationships[b.id]?.score ?? 50) - (player.relationships[a.id]?.score ?? 50))
                .map((airline) => {
                  const score = player.relationships[airline.id]?.score ?? airline.relationshipScore[player.id] ?? 50;
                  const airlineOrders = orders.filter((order) => order.airlineId === airline.id);
                  return (
                    <tr key={airline.id} className="border-b border-[#222c3b]">
                      <td className="px-3 py-3 font-semibold">{airline.name}</td>
                      <td className="px-3 py-3">{airline.region.replaceAll("-", " ")}</td>
                      <td className="px-3 py-3">{score}</td>
                      <td className="px-3 py-3">{airline.preferredCategory.replaceAll("-", " ")}</td>
                      <td className="px-3 py-3">{airlineOrders.reduce((sum, order) => sum + Math.max(0, order.quantity - order.delivered), 0)}</td>
                      <td className="px-3 py-3">Turn {airline.lastOrderTurn}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FinancesTab({ gameState }: { gameState: GameState }) {
  const reports = gameState.monthlyHistory
    .map((report) => report.financialReports.find((financial) => financial.manufacturerId === gameState.playerCompanyId))
    .filter((report): report is MonthlyFinancialReport => Boolean(report))
    .slice(-18)
    .reverse();
  return (
    <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-5">
      <h2 className="text-lg font-semibold">Finances</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="border-b border-[#2a3445] text-left text-[#a8b3c4]">
            <tr>
              <th className="py-2 pr-4">Turn</th>
              <th className="py-2 pr-4">Revenue</th>
              <th className="py-2 pr-4">Salaries</th>
              <th className="py-2 pr-4">Research</th>
              <th className="py-2 pr-4">Development</th>
              <th className="py-2 pr-4">Production</th>
              <th className="py-2 pr-4">Result</th>
              <th className="py-2 pr-4">Cash</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.turn} className="border-b border-[#222c3b]">
                <td className="py-3 pr-4">{report.turn}</td>
                <td className="py-3 pr-4">{formatMoney(report.aircraftRevenue)}</td>
                <td className="py-3 pr-4">{formatMoney(report.salaries)}</td>
                <td className="py-3 pr-4">{formatMoney(report.researchExpenses)}</td>
                <td className="py-3 pr-4">{formatMoney(report.developmentExpenses)}</td>
                <td className="py-3 pr-4">{formatMoney(report.productionExpenses)}</td>
                <td className="py-3 pr-4">{formatMoney(report.profitOrLoss)}</td>
                <td className="py-3 pr-4">{formatMoney(report.endingCash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {reports.length === 0 && <p className="mt-4 text-sm text-[#a8b3c4]">No monthly reports yet.</p>}
      </div>
    </section>
  );
}

function InboxTab({
  gameState,
  mutateGame,
  navigate,
  focusedTarget
}: {
  gameState: GameState;
  mutateGame: (mutator: (state: GameState) => GameState, message: string) => void;
  navigate: (target: GameDeepLinkTarget) => void;
  focusedTarget: GameDeepLinkTarget;
}) {
  const emails = getGameEmails(gameState);
  const [folder, setFolder] = useState<EmailFolder>("inbox");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<"newest" | "priority" | "deadline" | "sender" | "category">("newest");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(focusedTarget.entityType === "email" ? focusedTarget.entityId ?? null : null);
  const visibleEmails = sortEmails(filterEmails(emails, folder, searchTerm), sortMode);
  const selectedEmail = visibleEmails.find((email) => email.id === selectedEmailId) ?? visibleEmails[0] ?? null;
  const unreadCount = emails.filter((email) => !email.read && !email.archived).length;
  const actionCount = emails.filter((email) => email.requiresAction && email.status === "open" && !email.archived).length;

  useEffect(() => {
    if (focusedTarget.section === "email" && focusedTarget.entityType === "email" && focusedTarget.entityId) {
      setSelectedEmailId(focusedTarget.entityId);
    }
  }, [focusedTarget]);

  function openEmail(email: GameEmail) {
    setSelectedEmailId(email.id);
    if (!email.read) {
      mutateGame((state) => markPlayerEmailRead(state, email.id), "Email opened.");
    }
  }

  function runAction(email: GameEmail, actionId: string) {
    const action = email.actions.find((candidate) => candidate.id === actionId);
    if (!action || action.disabled) {
      return;
    }
    if (action.actionType === "navigate") {
      const target = emailActionToDeepLink(action);
      if (target) {
        navigate(target);
      }
      return;
    }
    mutateGame((state) => acknowledgePlayerEmail(state, email.id), "Email action resolved.");
  }

  return (
    <section className="rounded-lg border border-[#2a3445] bg-[#111827] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Company Email</h2>
          <p className="mt-1 text-sm text-[#a8b3c4]">{unreadCount} unread · {actionCount} action-required · {emails.length} total messages</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <IconButton
            title="Mark all emails read"
            icon={MailCheck}
            label="Mark Read"
            onClick={() => mutateGame(markAllPlayerEmailsRead, "Inbox cleared.")}
          />
          {selectedEmail && (
            <IconButton
              title="Archive email"
              icon={Archive}
              label="Archive"
              onClick={() => mutateGame((state) => archivePlayerEmail(state, selectedEmail.id), "Email archived.")}
            />
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[230px_380px_1fr]">
        <aside className="rounded-lg border border-[#2a3445] p-3">
          <label className="block text-sm font-medium">
            Search
            <span className="mt-1 flex items-center gap-2 rounded-md border border-[#2a3445] px-2">
              <Search size={15} className="text-[#8896aa]" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="focus-ring w-full border-0 bg-transparent py-2 text-sm outline-none"
                placeholder="Sender, subject, preview"
              />
            </span>
          </label>
          <label className="mt-3 block text-sm font-medium">
            Sort
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as typeof sortMode)}
              className="focus-ring mt-1 w-full rounded-md border border-[#2a3445] bg-[#111827] px-2 py-2"
            >
              <option value="newest">Newest</option>
              <option value="priority">Priority</option>
              <option value="deadline">Deadline</option>
              <option value="sender">Sender</option>
              <option value="category">Category</option>
            </select>
          </label>
          <div className="mt-4 space-y-1">
            {EMAIL_FOLDERS.map((item) => {
              const active = folder === item.id;
              const count = countFolderEmails(emails, item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setFolder(item.id);
                    setSelectedEmailId(null);
                  }}
                  className={`focus-ring flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                    active ? "bg-[#f2b84b] text-[#16110a]" : "text-[#d7deea] hover:bg-[#202b3d]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={active ? "text-[#3b2a0e]" : "text-[#8896aa]"}>{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="max-h-[680px] overflow-y-auto rounded-lg border border-[#2a3445]">
          {visibleEmails.length === 0 ? (
            <div className="p-4 text-sm text-[#a8b3c4]">No messages in this folder.</div>
          ) : (
            visibleEmails.map((email) => {
              const selected = selectedEmail?.id === email.id;
              const Icon = email.read ? MailOpen : Mail;
              return (
                <button
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className={`focus-ring block w-full border-b border-[#222c3b] px-4 py-3 text-left transition last:border-b-0 ${
                    selected ? "bg-[#1d2f46]" : email.read ? "bg-[#111827] hover:bg-[#182233]" : "bg-[#211a0e] hover:bg-[#2a210f]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon size={18} className={email.read ? "mt-0.5 text-[#8896aa]" : "mt-0.5 text-[#f2b84b]"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold">{email.from}</span>
                        <span className="shrink-0 text-xs text-[#8896aa]">{formatGameDate(email.date)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${emailCategoryDot(email.category)}`} />
                        <span className={`truncate text-sm ${email.read ? "font-medium text-[#d7deea]" : "font-semibold text-[#e8eef8]"}`}>
                          {email.subject}
                        </span>
                        {email.requiresAction && email.status === "open" && <AlertTriangle size={14} className="text-[#f2b84b]" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[#a8b3c4]">{email.preview}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="min-h-[460px] rounded-lg border border-[#2a3445] bg-[#182233] p-5">
          {!selectedEmail ? (
            <div className="flex h-full items-center justify-center text-sm text-[#a8b3c4]">No email selected.</div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2a3445] pb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${emailPriorityClass(selectedEmail.priority)}`}>
                      {emailPriorityLabel(selectedEmail.priority)}
                    </span>
                    <span className="rounded-full bg-[#111827] px-2 py-1 text-xs font-semibold text-[#a8b3c4]">
                      {emailCategoryLabel(selectedEmail.category)}
                    </span>
                    <span className="rounded-full bg-[#111827] px-2 py-1 text-xs font-semibold text-[#a8b3c4]">
                      {selectedEmail.status}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold tracking-normal">{selectedEmail.subject}</h3>
                  <p className="mt-2 text-sm text-[#a8b3c4]">
                    From {selectedEmail.from} to {selectedEmail.to} · {formatGameDate(selectedEmail.date)}
                  </p>
                </div>
                {!selectedEmail.read && (
                  <IconButton
                    title="Mark email read"
                    icon={MailCheck}
                    label="Read"
                    onClick={() => mutateGame((state) => markPlayerEmailRead(state, selectedEmail.id), "Email opened.")}
                  />
                )}
              </div>
              <div className="mt-5 space-y-4 text-sm leading-6 text-[#e8eef8]">
                {selectedEmail.body.map((paragraph, index) => (
                  <p key={`${selectedEmail.id}-${index}`}>{paragraph}</p>
                ))}
              </div>
              {selectedEmail.actions.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-[#2a3445] pt-4">
                  {selectedEmail.actions.map((action) => (
                    <button
                      key={action.id}
                      disabled={action.disabled}
                      onClick={() => runAction(selectedEmail, action.id)}
                      className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-[#f2b84b] px-3 text-sm font-medium text-[#16110a] transition hover:bg-[#d99a2b] disabled:cursor-not-allowed disabled:bg-[#384252]"
                      title={action.consequencePreview}
                    >
                      <FileText size={16} />
                      {action.label}
                    </button>
                  ))}
                  {selectedEmail.requiresAction && selectedEmail.status === "open" && (
                    <button
                      onClick={() => mutateGame((state) => acknowledgePlayerEmail(state, selectedEmail.id), "Email acknowledged.")}
                      className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-[#2a3445] bg-[#111827] px-3 text-sm font-medium text-[#d7deea] transition hover:bg-[#202b3d]"
                    >
                      <Check size={16} />
                      Acknowledge
                    </button>
                  )}
                </div>
              )}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Metric label="Turn" value={selectedEmail.turn.toString()} />
                <Metric label="Priority" value={emailPriorityLabel(selectedEmail.priority)} />
                <Metric label="Status" value={selectedEmail.read ? selectedEmail.status : "Unread"} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function filterEmails(emails: GameEmail[], folder: EmailFolder, searchTerm: string): GameEmail[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  return emails
    .filter((email) => {
      if (folder === "archived") {
        return email.archived;
      }
      if (email.archived) {
        return false;
      }
      if (folder === "action-required") {
        return email.requiresAction && email.status === "open";
      }
      if (folder === "unread") {
        return !email.read;
      }
      const folderDefinition = EMAIL_FOLDERS.find((candidate) => candidate.id === folder);
      return folder === "inbox" || !folderDefinition?.category || email.category === folderDefinition.category;
    })
    .filter((email) => {
      if (!normalizedSearch) {
        return true;
      }
      return `${email.from} ${email.subject} ${email.preview} ${email.body.join(" ")}`.toLowerCase().includes(normalizedSearch);
    });
}

function countFolderEmails(emails: GameEmail[], folder: EmailFolder): number {
  return filterEmails(emails, folder, "").length;
}

function sortEmails(emails: GameEmail[], mode: "newest" | "priority" | "deadline" | "sender" | "category" = "newest"): GameEmail[] {
  const priorityRank: Record<GameEmailPriority, number> = {
    urgent: 4,
    important: 3,
    normal: 2,
    informational: 1
  };
  return [...emails].sort((a, b) => {
    if (mode === "priority") {
      return priorityRank[b.priority] - priorityRank[a.priority] || b.turn - a.turn;
    }
    if (mode === "deadline") {
      return (a.deadlineTurn ?? Number.MAX_SAFE_INTEGER) - (b.deadlineTurn ?? Number.MAX_SAFE_INTEGER) || b.turn - a.turn;
    }
    if (mode === "sender") {
      return a.from.localeCompare(b.from) || b.turn - a.turn;
    }
    if (mode === "category") {
      return emailCategoryLabel(a.category).localeCompare(emailCategoryLabel(b.category)) || b.turn - a.turn;
    }
    return b.turn - a.turn || priorityRank[b.priority] - priorityRank[a.priority] || b.id.localeCompare(a.id);
  });
}

function emailCategoryLabel(category: GameEmailCategory): string {
  if (category === "airline-relations") {
    return "Airline Relations";
  }
  if (category === "competitors") {
    return "Competitors";
  }
  if (category === "market-intelligence") {
    return "Market Intel";
  }
  if (category === "board") {
    return "Board";
  }
  if (category === "engineering") {
    return "Engineering";
  }
  if (category === "manufacturing") {
    return "Manufacturing";
  }
  return `${category[0]?.toUpperCase() ?? ""}${category.slice(1).replaceAll("-", " ")}`;
}

function emailCategoryDot(category: GameEmailCategory): string {
  if (category === "research") {
    return "bg-sky-500";
  }
  if (category === "engineering") {
    return "bg-violet-500";
  }
  if (category === "airline-relations" || category === "orders") {
    return "bg-cyan-400";
  }
  if (category === "market-intelligence") {
    return "bg-amber-500";
  }
  if (category === "finance") {
    return "bg-red-500";
  }
  if (category === "competitors") {
    return "bg-stone-500";
  }
  return "bg-[#f2b84b]";
}

function emailPriorityLabel(priority: GameEmailPriority): string {
  if (priority === "urgent") {
    return "Urgent";
  }
  if (priority === "important") {
    return "Important";
  }
  if (priority === "informational") {
    return "Informational";
  }
  return "Normal";
}

function emailPriorityClass(priority: GameEmailPriority): string {
  if (priority === "urgent") {
    return "bg-[#3b1518] text-[#fecaca]";
  }
  if (priority === "important") {
    return "bg-[#3a2a10] text-[#ffd48a]";
  }
  if (priority === "informational") {
    return "bg-[#283348] text-[#d7deea]";
  }
  return "bg-[#0f2c3d] text-[#7dd3fc]";
}

function SubtabBar({
  tabs,
  active,
  setActive
}: {
  tabs: { id: string; label: string }[];
  active: string;
  setActive: (value: string) => void;
}) {
  return (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-md border border-[#2a3445] bg-[#182233] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={`focus-ring min-w-fit rounded px-3 py-1.5 text-sm font-medium transition ${
            active === tab.id ? "bg-[#f2b84b] text-[#16110a]" : "text-[#d7deea] hover:bg-[#111827]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function WorkforcePanel({
  title,
  group,
  assigned,
  mutateGame,
  role
}: {
  title: string;
  group: GameState["manufacturers"][string]["employees"][keyof GameState["manufacturers"][string]["employees"]];
  assigned: number;
  mutateGame: (mutator: (state: GameState) => GameState, message: string) => void;
  role: keyof GameState["manufacturers"][string]["employees"];
}) {
  const idle = Math.max(0, group.headcount - assigned);
  return (
    <div className="rounded-lg border border-[#2a3445] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-[#a8b3c4]">{group.headcount.toLocaleString()} employed · {idle.toLocaleString()} idle</p>
        </div>
        <div className="flex gap-2">
          <IconButton title="Hire 25" icon={Plus} label="25" onClick={() => mutateGame((state) => changeEmployeeHeadcount(state, role, 25), "Hiring complete.")} />
          <IconButton title="Release 25" icon={Trash2} label="25" danger onClick={() => mutateGame((state) => changeEmployeeHeadcount(state, role, -25), "Headcount reduced.")} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <Metric label="Assigned" value={assigned.toLocaleString()} />
        <Metric label="Skill" value={group.skill.toString()} />
        <Metric label="Morale" value={group.morale.toString()} />
        <Metric label="Payroll" value={formatMoney(group.headcount * group.averageMonthlySalary)} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-[#080b11] px-3 py-2">
      <div className="text-wrap text-xs font-medium uppercase leading-4 text-[#8896aa]">{label}</div>
      <div className="mt-1 break-words text-base font-semibold leading-5">{value}</div>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring mt-1 w-full rounded-md border border-[#2a3445] bg-[#080b11] px-3 py-2 text-[#e8eef8]"
      />
    </label>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring mt-1 w-full rounded-md border border-[#2a3445] bg-[#080b11] px-3 py-2 text-[#e8eef8]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const displayValue = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0);
  return (
    <label className="block min-w-0 text-sm font-medium">
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className="min-w-0 text-wrap leading-5">{label}</span>
        <span className="shrink-0 text-right text-xs leading-5 text-[#a8b3c4]">{displayValue}</span>
      </span>
      <div className="mt-2 space-y-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className="focus-ring h-9 w-full min-w-0 rounded-md border border-[#2a3445] bg-[#080b11] px-2 py-1 text-right text-sm text-[#e8eef8]"
        />
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className="block w-full accent-[#f2b84b]"
        />
      </div>
    </label>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="text-[#a8b3c4]">{value}</span>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-[#f2b84b]"
      />
    </label>
  );
}

function ProgressBar({ value, compact = false }: { value: number; compact?: boolean }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div className={`${compact ? "mt-2 h-1.5" : "mt-3 h-2"} overflow-hidden rounded bg-[#263247]`}>
      <div className="h-full bg-[#f2b84b]" style={{ width: `${normalized}%` }} />
    </div>
  );
}

function TextList({ title, items, empty, warning = false }: { title: string; items: string[]; empty: string; warning?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#d7deea]">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-[#a8b3c4]">{empty}</p>
        ) : (
          items.map((item) => (
            <p key={item} className={`rounded-md border px-3 py-2 text-sm ${warning ? "border-[#7c5a1e] bg-[#2a1d0b] text-[#ffd48a]" : "border-[#2a3445] bg-[#182233] text-[#d7deea]"}`}>
              {item}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function IconButton({
  title,
  icon: Icon,
  label,
  onClick,
  primary = false,
  danger = false
}: {
  title: string;
  icon: typeof Gauge;
  label: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  const className = primary
    ? "bg-[#f2b84b] text-[#16110a] hover:bg-[#d99a2b]"
    : danger
      ? "border border-[#7f1d1d] bg-[#111827] text-[#fca5a5] hover:bg-[#3b1518]"
      : "border border-[#2a3445] bg-[#111827] text-[#d7deea] hover:bg-[#202b3d]";

  return (
    <button title={title} onClick={onClick} className={`focus-ring inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${className}`}>
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}

function AircraftPlanform() {
  return (
    <svg viewBox="0 0 96 64" className="h-14 w-20 shrink-0" role="img" aria-label="Aircraft silhouette">
      <rect x="8" y="26" width="76" height="10" rx="5" fill="#38bdf8" />
      <path d="M43 12h8l13 18H30z" fill="#f2b84b" />
      <path d="M44 52h8l9-18H35z" fill="#b9c7bd" />
      <path d="M74 22l14-10v14z" fill="#f2b84b" />
      <circle cx="24" cy="31" r="2" fill="#e8eef8" />
      <circle cx="34" cy="31" r="2" fill="#e8eef8" />
      <circle cx="44" cy="31" r="2" fill="#e8eef8" />
      <circle cx="54" cy="31" r="2" fill="#e8eef8" />
      <circle cx="64" cy="31" r="2" fill="#e8eef8" />
    </svg>
  );
}

function updateSimplifiedFuselage(
  design: AircraftStudioDesign,
  changes: Partial<Pick<AircraftStudioDesign["fuselage"], "totalLengthM" | "internalCabinWidthM">>
): AircraftStudioDesign {
  const limits = DESIGN_CATEGORY_LIMITS[design.category];
  const totalLengthM = changes.totalLengthM ?? design.fuselage.totalLengthM;
  const internalCabinWidthM = changes.internalCabinWidthM ?? design.fuselage.internalCabinWidthM;
  const usableCabinLengthM = totalLengthM - design.fuselage.noseLengthM - design.fuselage.tailLengthM;

  return {
    ...design,
    fuselage: {
      ...design.fuselage,
      totalLengthM,
      usableCabinLengthM: clampToStep(usableCabinLengthM, limits.usableCabinLengthM[0], limits.usableCabinLengthM[1], 0.1),
      internalCabinWidthM,
      externalDiameterM: clampToStep(Math.max(internalCabinWidthM + 0.42, design.fuselage.externalDiameterM), limits.externalDiameterM[0], limits.externalDiameterM[1], 0.05)
    }
  };
}

function applyCabinPlan(
  design: AircraftStudioDesign,
  rawSeatTarget: number,
  mix: CabinMix,
  comfort: ComfortStandard
): AircraftStudioDesign {
  const category = AIRCRAFT_CATEGORIES[design.category];
  const limits = DESIGN_CATEGORY_LIMITS[design.category];
  const seatTarget = Math.round(clamp(rawSeatTarget, category.capacityRange[0], category.capacityRange[1]));
  const seatCounts = allocateCabinSeats(seatTarget, cabinMixShares(design.category, mix));
  const aisleCount = design.category === "wide-body" ? 2 : 1;
  const aisleWidthM = comfort === "comfortable" ? (design.category === "wide-body" ? 0.56 : 0.5) : comfort === "dense" ? 0.42 : design.category === "wide-body" ? 0.51 : 0.46;

  const zones = (["economy", "premium-economy", "business", "first"] as CabinClass[]).map((cabinClass) => {
    const seats = seatCounts[cabinClass];
    const seatsAcross = seatsAcrossForZone(design.category, cabinClass, comfort);
    const seat = cabinSeatStandard(cabinClass, comfort);
    const rows = seats > 0 ? Math.max(1, Math.ceil(seats / seatsAcross)) : 0;
    return {
      cabinClass,
      zoneLengthM: roundToStep(rows * seat.pitchM, 0.1),
      seatsAcross,
      seatWidthM: seat.widthM,
      seatPitchM: seat.pitchM,
      layoutPattern: cabinLayoutPattern(design.category, cabinClass, seatsAcross)
    };
  });

  const lavatoryCount = Math.max(1, Math.ceil(seatTarget / (design.category === "wide-body" ? 58 : design.category === "narrow-body" ? 52 : 46)));
  const galleyCount = Math.max(1, design.category === "wide-body" ? Math.ceil(seatTarget / 95) : design.category === "narrow-body" ? Math.ceil(seatTarget / 78) : 1);
  const galleySizeM2 = roundToStep(galleyCount * (design.category === "wide-body" ? 2.2 : design.category === "narrow-body" ? 1.8 : 1.5), 0.1);
  const crewRestAreaM2 = design.category === "wide-body" && seatTarget > 260 ? (comfort === "dense" ? 1.5 : 3) : 0;
  const storageAreaM2 = roundToStep(seatTarget * (comfort === "comfortable" ? 0.026 : 0.019), 0.1);
  const serviceLengthM = cabinServiceLength(lavatoryCount, galleyCount, galleySizeM2, storageAreaM2, crewRestAreaM2);
  const passengerLengthM = zones.reduce((sum, zone) => sum + zone.zoneLengthM, 0);
  const usableCabinLengthM = clampToStep(passengerLengthM + serviceLengthM + 0.8, limits.usableCabinLengthM[0], limits.usableCabinLengthM[1], 0.1);
  const totalLengthM = clampToStep(usableCabinLengthM + design.fuselage.noseLengthM + design.fuselage.tailLengthM, limits.fuselageLengthM[0], limits.fuselageLengthM[1], 0.1);
  const requiredCabinWidthM = zones.reduce((maxWidth, zone) => Math.max(maxWidth, requiredSimplifiedCabinWidth(design.category, zone, aisleCount, aisleWidthM)), 0);
  const internalCabinWidthM = clampToStep(Math.max(design.fuselage.internalCabinWidthM, requiredCabinWidthM + 0.04), limits.cabinWidthM[0], limits.cabinWidthM[1], 0.05);
  const doorCount = Math.max(design.category === "wide-body" ? 6 : 2, Math.ceil(seatTarget / (design.category === "wide-body" ? 75 : 70)) * 2);
  const exitCount = Math.max(design.category === "wide-body" ? 6 : 2, Math.ceil(seatTarget / 45));

  return {
    ...design,
    fuselage: {
      ...design.fuselage,
      totalLengthM,
      usableCabinLengthM,
      internalCabinWidthM,
      externalDiameterM: clampToStep(Math.max(internalCabinWidthM + 0.42, design.fuselage.externalDiameterM), limits.externalDiameterM[0], limits.externalDiameterM[1], 0.05),
      doorCount,
      exitCount
    },
    cabin: {
      ...design.cabin,
      zones,
      aisleCount,
      aisleWidthM,
      lavatoryCount,
      galleyCount,
      galleySizeM2,
      crewRestAreaM2,
      storageAreaM2
    }
  };
}

function applyWingPlan(design: AircraftStudioDesign, plan: WingPlan): AircraftStudioDesign {
  const limits = DESIGN_CATEGORY_LIMITS[design.category];
  const profile: Record<WingPlan, { span: number; area: number; sweep: number; thickness: number; fuel: number }> = {
    compact: { span: 0.18, area: 0.22, sweep: 24, thickness: 0.125, fuel: 0.32 },
    balanced: { span: 0.45, area: 0.45, sweep: 27, thickness: 0.115, fuel: 0.5 },
    efficient: { span: 0.68, area: 0.62, sweep: 30, thickness: 0.11, fuel: 0.64 },
    "long-range": { span: 0.86, area: 0.78, sweep: 31, thickness: 0.105, fuel: 0.78 }
  };
  const selected = profile[plan];

  return {
    ...design,
    wing: {
      ...design.wing,
      wingspanM: roundToStep(interpolate(limits.wingSpanM[0], limits.wingSpanM[1], selected.span), 0.1),
      wingAreaM2: Math.round(interpolate(limits.wingAreaM2[0], limits.wingAreaM2[1], selected.area)),
      sweepDeg: selected.sweep,
      thicknessRatio: selected.thickness,
      wingFuelVolumeM3: roundToStep(interpolate(limits.fuelVolumeM3[0], limits.fuelVolumeM3[1], selected.fuel), 0.5),
      mountingPosition: "low"
    }
  };
}

function applyRangePackage(design: AircraftStudioDesign, rangePackage: RangePackage): AircraftStudioDesign {
  const limits = DESIGN_CATEGORY_LIMITS[design.category];
  const factor: Record<RangePackage, number> = {
    short: 0.34,
    balanced: 0.52,
    long: 0.73,
    maximum: 0.9
  };
  const selected = factor[rangePackage];
  const wingFuelVolumeM3 = roundToStep(interpolate(limits.fuelVolumeM3[0], limits.fuelVolumeM3[1], Math.min(0.82, selected + 0.08)), 0.5);
  const extraFuelVolumeM3 = Math.max(0, interpolate(limits.fuelVolumeM3[0] * 0.25, limits.fuelVolumeM3[1] * 0.42, selected) - limits.fuelVolumeM3[0] * 0.25);
  const mtow = mtowRange(design.category);

  return {
    ...design,
    wing: {
      ...design.wing,
      wingFuelVolumeM3
    },
    fuelSystem: {
      ...design.fuelSystem,
      centerTankVolumeM3: roundToStep(extraFuelVolumeM3 * 0.72, 0.5),
      auxiliaryTankVolumeM3: roundToStep(extraFuelVolumeM3 * 0.28, 0.5),
      reservePolicyPercent: rangePackage === "maximum" ? 20 : rangePackage === "long" ? 18 : rangePackage === "short" ? 14 : 16,
      payloadPriority: rangePackage === "short" ? "payload" : rangePackage === "balanced" ? "balanced" : "range",
      mtowTargetKg: Math.round(interpolate(mtow[0], mtow[1], selected) / 500) * 500,
      structuralFuelReinforcement: rangePackage === "maximum" ? 17 : rangePackage === "long" ? 12 : rangePackage === "short" ? 4 : 7
    }
  };
}

function applyPrimaryMaterial(design: AircraftStudioDesign, material: StructuralMaterialChoice): AircraftStudioDesign {
  return {
    ...design,
    structure: {
      ...design.structure,
      fuselageMaterial: material,
      wingMaterial: material,
      tailMaterial: material,
      controlSurfaceMaterial: material
    }
  };
}

function applySafetyStandard(design: AircraftStudioDesign, standard: SafetyStandard): AircraftStudioDesign {
  const config = {
    basic: {
      redundancy: "basic",
      diagnostics: "manual",
      reliabilityTesting: "lean",
      reliabilityGoal: 62,
      hydraulics: "conventional",
      electrical: "conventional",
      fireProtection: "standard",
      iceProtection: "standard",
      environmentalControl: "standard",
      cockpit: "three-crew"
    },
    "airline-standard": {
      redundancy: "standard",
      diagnostics: "manual",
      reliabilityTesting: "standard",
      reliabilityGoal: 72,
      hydraulics: "dual",
      electrical: "expanded",
      fireProtection: "standard",
      iceProtection: "standard",
      environmentalControl: "improved",
      cockpit: "two-crew-analog"
    },
    "high-reliability": {
      redundancy: "enhanced",
      diagnostics: "fault-isolation",
      reliabilityTesting: "expanded",
      reliabilityGoal: 82,
      hydraulics: "triple",
      electrical: "expanded",
      fireProtection: "improved",
      iceProtection: "enhanced",
      environmentalControl: "improved",
      cockpit: "two-crew-analog"
    },
    flagship: {
      redundancy: "triple-redundant",
      diagnostics: "predictive",
      reliabilityTesting: "airline-proving",
      reliabilityGoal: 90,
      hydraulics: "triple",
      electrical: "advanced",
      fireProtection: "advanced",
      iceProtection: "enhanced",
      environmentalControl: "advanced",
      cockpit: "glass-cockpit"
    }
  } as const;

  return {
    ...design,
    systems: {
      ...design.systems,
      ...config[standard]
    }
  };
}

function inferCabinMix(design: AircraftStudioDesign): CabinMix {
  const cabin = calculateCabinGeometry(design);
  const total = Math.max(1, cabin.physicalPassengerCapacity);
  const premiumSeats =
    (cabin.zoneCapacities["premium-economy"] ?? 0) +
    (cabin.zoneCapacities.business ?? 0) +
    (cabin.zoneCapacities.first ?? 0);
  const executiveSeats = (cabin.zoneCapacities.business ?? 0) + (cabin.zoneCapacities.first ?? 0);
  if (executiveSeats / total > 0.34) {
    return "executive";
  }
  if (premiumSeats / total > 0.24) {
    return "premium-heavy";
  }
  if (premiumSeats / total < 0.08) {
    return "economy-heavy";
  }
  return "standard";
}

function inferComfortStandard(design: AircraftStudioDesign): ComfortStandard {
  const activeZones = design.cabin.zones.filter((zone) => zone.zoneLengthM > 0);
  const averagePitch =
    activeZones.reduce((sum, zone) => sum + zone.seatPitchM, 0) / Math.max(1, activeZones.length);
  if (averagePitch > 1.02) {
    return "comfortable";
  }
  if (averagePitch < 0.84) {
    return "dense";
  }
  return "standard";
}

function inferWingPlan(design: AircraftStudioDesign): WingPlan {
  const limits = DESIGN_CATEGORY_LIMITS[design.category];
  const spanRatio = normalizeBetween(design.wing.wingspanM, limits.wingSpanM[0], limits.wingSpanM[1]);
  if (spanRatio > 0.78) {
    return "long-range";
  }
  if (spanRatio > 0.58) {
    return "efficient";
  }
  if (spanRatio < 0.3) {
    return "compact";
  }
  return "balanced";
}

function inferRangePackage(design: AircraftStudioDesign): RangePackage {
  const limits = DESIGN_CATEGORY_LIMITS[design.category];
  const totalFuel = design.wing.wingFuelVolumeM3 + design.fuelSystem.centerTankVolumeM3 + design.fuelSystem.auxiliaryTankVolumeM3;
  const ratio = totalFuel / Math.max(1, limits.fuelVolumeM3[1] * 1.28);
  if (ratio > 0.78) {
    return "maximum";
  }
  if (ratio > 0.58) {
    return "long";
  }
  if (ratio < 0.34) {
    return "short";
  }
  return "balanced";
}

function inferSafetyStandard(design: AircraftStudioDesign): SafetyStandard {
  if (design.systems.reliabilityGoal >= 88 || design.systems.redundancy === "triple-redundant") {
    return "flagship";
  }
  if (design.systems.reliabilityGoal >= 80 || design.systems.redundancy === "enhanced") {
    return "high-reliability";
  }
  if (design.systems.reliabilityGoal >= 68 || design.systems.redundancy === "standard") {
    return "airline-standard";
  }
  return "basic";
}

function cabinMixShares(category: AircraftCategory, mix: CabinMix): Record<CabinClass, number> {
  if (category === "regional-jet") {
    return {
      economy: mix === "executive" ? 0.58 : mix === "premium-heavy" ? 0.72 : mix === "standard" ? 0.86 : 1,
      "premium-economy": mix === "executive" ? 0.05 : mix === "premium-heavy" ? 0.1 : mix === "standard" ? 0.08 : 0,
      business: mix === "executive" ? 0.37 : mix === "premium-heavy" ? 0.18 : mix === "standard" ? 0.06 : 0,
      first: 0
    };
  }
  if (category === "wide-body") {
    return {
      economy: mix === "executive" ? 0.45 : mix === "premium-heavy" ? 0.62 : mix === "standard" ? 0.78 : 0.9,
      "premium-economy": mix === "executive" ? 0.1 : mix === "premium-heavy" ? 0.12 : mix === "standard" ? 0.08 : 0.06,
      business: mix === "executive" ? 0.32 : mix === "premium-heavy" ? 0.2 : mix === "standard" ? 0.11 : 0.035,
      first: mix === "executive" ? 0.13 : mix === "premium-heavy" ? 0.06 : mix === "standard" ? 0.03 : 0.005
    };
  }
  return {
    economy: mix === "executive" ? 0.5 : mix === "premium-heavy" ? 0.68 : mix === "standard" ? 0.82 : 0.94,
    "premium-economy": mix === "executive" ? 0.1 : mix === "premium-heavy" ? 0.12 : mix === "standard" ? 0.08 : 0.04,
    business: mix === "executive" ? 0.3 : mix === "premium-heavy" ? 0.16 : mix === "standard" ? 0.08 : 0.02,
    first: mix === "executive" ? 0.1 : mix === "premium-heavy" ? 0.04 : mix === "standard" ? 0.02 : 0
  };
}

function allocateCabinSeats(targetSeats: number, shares: Record<CabinClass, number>): Record<CabinClass, number> {
  const seats: Record<CabinClass, number> = {
    economy: 0,
    "premium-economy": 0,
    business: 0,
    first: 0
  };
  let assigned = 0;
  for (const cabinClass of ["premium-economy", "business", "first"] as CabinClass[]) {
    seats[cabinClass] = Math.max(0, Math.round(targetSeats * shares[cabinClass]));
    assigned += seats[cabinClass];
  }
  seats.economy = Math.max(0, targetSeats - assigned);
  return seats;
}

function cabinSeatStandard(cabinClass: CabinClass, comfort: ComfortStandard): { widthM: number; pitchM: number } {
  const defaults = CABIN_CLASS_DEFAULTS[cabinClass];
  const widthShift = comfort === "comfortable" ? 0.03 : comfort === "dense" ? -0.01 : 0;
  const pitchShift = comfort === "comfortable" ? 0.09 : comfort === "dense" ? -0.04 : 0;
  return {
    widthM: roundToStep(defaults.seatWidthM + widthShift, 0.01),
    pitchM: roundToStep(defaults.seatPitchM + pitchShift, 0.01)
  };
}

function seatsAcrossForZone(category: AircraftCategory, cabinClass: CabinClass, comfort: ComfortStandard): number {
  if (category === "wide-body") {
    if (cabinClass === "economy") {
      return comfort === "comfortable" ? 8 : 9;
    }
    if (cabinClass === "premium-economy") {
      return 8;
    }
    return cabinClass === "business" ? 6 : 4;
  }
  if (category === "narrow-body") {
    if (cabinClass === "economy" || cabinClass === "premium-economy") {
      return comfort === "comfortable" ? 5 : 6;
    }
    return 4;
  }
  if (cabinClass === "business") {
    return 3;
  }
  if (cabinClass === "first") {
    return 2;
  }
  return 4;
}

function cabinLayoutPattern(category: AircraftCategory, cabinClass: CabinClass, seatsAcross: number): string {
  if (category === "wide-body") {
    if (seatsAcross === 9) {
      return "3-3-3";
    }
    if (seatsAcross === 8) {
      return cabinClass === "economy" ? "2-4-2" : "2-4-2";
    }
    if (seatsAcross === 6) {
      return "2-2-2";
    }
    return "1-2-1";
  }
  if (category === "narrow-body") {
    if (seatsAcross === 6) {
      return "3-3";
    }
    if (seatsAcross === 5) {
      return "2-3";
    }
    return "2-2";
  }
  if (seatsAcross === 4) {
    return "2-2";
  }
  if (seatsAcross === 3) {
    return "1-2";
  }
  return "1-1";
}

function requiredSimplifiedCabinWidth(
  category: AircraftCategory,
  zone: AircraftStudioDesign["cabin"]["zones"][number],
  aisleCount: number,
  aisleWidthM: number
): number {
  if (zone.zoneLengthM <= 0 || zone.seatsAcross <= 0) {
    return 0;
  }
  const sideClearance = category === "wide-body" ? 0.32 : category === "narrow-body" ? 0.27 : 0.22;
  return zone.seatsAcross * zone.seatWidthM + aisleCount * aisleWidthM + sideClearance;
}

function cabinServiceLength(
  lavatoryCount: number,
  galleyCount: number,
  galleySizeM2: number,
  storageAreaM2: number,
  crewRestAreaM2: number
): number {
  return lavatoryCount * 0.48 + galleyCount * 0.55 + galleySizeM2 * 0.08 + storageAreaM2 * 0.08 + crewRestAreaM2 * 0.16;
}

function mtowRange(category: AircraftCategory): [number, number] {
  if (category === "regional-jet") {
    return [28_000, 52_000];
  }
  if (category === "wide-body") {
    return [155_000, 360_000];
  }
  return [52_000, 115_000];
}

function interpolate(min: number, max: number, factor: number): number {
  return min + (max - min) * clamp(factor, 0, 1);
}

function normalizeBetween(value: number, min: number, max: number): number {
  return clamp((value - min) / Math.max(1, max - min), 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampToStep(value: number, min: number, max: number, step: number): number {
  return roundToStep(clamp(value, min, max), step);
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function createOpeningDesignInput(state: GameState): AircraftStudioDesign {
  const player = state.manufacturers[state.playerCompanyId];
  const manufacturerIdentityId = player?.identityId ?? state.settings.playerManufacturerIdentityId ?? "player";
  return sanitizeAircraftStudioDesign(
    createDefaultAircraftStudioDesign(
      DEFAULT_DESIGN_CATEGORY,
      getDefaultPlayerAircraftName(DEFAULT_DESIGN_CATEGORY, state.date.year, state.contentSettings.namingMode, manufacturerIdentityId),
      state.date.year + 4
    ),
    player?.unlockedTechnologyIds ?? ["improved-aluminum-alloys"],
    state.date.year + 4
  );
}

function getDefaultPlayerAircraftName(
  category: AircraftCategory,
  year: number,
  mode: GameState["contentSettings"]["namingMode"],
  manufacturerIdentityId = "player"
): string {
  return getAircraftNameSelection(manufacturerIdentityId, category, year, mode).displayName;
}

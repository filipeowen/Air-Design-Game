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
import { calculateAircraftDesign, createDefaultDesignInput } from "@/game/aircraft/design";
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
  sanitizeAircraftDesignInput,
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
  AircraftDesignInput,
  Factory as FactoryRecord,
  FactoryStatus,
  GameEmail,
  GameEmailCategory,
  GameEmailPriority,
  GameState,
  ManufacturerIdentity,
  MonthlyFinancialReport,
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

export function Dashboard() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [autosaveState, setAutosaveState] = useState<GameState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("email");
  const [focusedTarget, setFocusedTarget] = useState<GameDeepLinkTarget>({ section: "email" });
  const [saveSlots, setSaveSlots] = useState<SaveSlotSummary[]>([]);
  const [designInput, setDesignInput] = useState<AircraftDesignInput>(() =>
    createDefaultDesignInputForUnlocked(
      DEFAULT_DESIGN_CATEGORY,
      getDefaultPlayerAircraftName(DEFAULT_DESIGN_CATEGORY, 1970, GAME_CONTENT_SETTINGS.namingMode),
      ["improved-aluminum-alloys"]
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
    setDesignInput((current) => sanitizeAircraftDesignInput(current, currentPlayer.unlockedTechnologyIds));
  }, [gameState?.playerCompanyId, gameState ? gameState.manufacturers[gameState.playerCompanyId]?.unlockedTechnologyIds.join("|") : ""]);

  const player = gameState ? gameState.manufacturers[gameState.playerCompanyId] : null;
  const lastReport = gameState?.monthlyHistory.at(-1);
  const playerFinancial = lastReport?.financialReports.find((report) => report.manufacturerId === gameState?.playerCompanyId);
  const designPreview = useMemo(() => calculateAircraftDesign(designInput), [designInput]);
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
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-700">Loading campaign...</div>;
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
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-700">Loading campaign...</div>;
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
    <main className="min-h-screen bg-[#f4f5f1] text-[#17211c]">
      <header className="border-b border-[#d8ddd2] bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 xl:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.55fr)_auto] xl:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <AircraftPlanform />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-normal">{player.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
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

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto rounded-lg border border-[#d8ddd2] bg-white p-2 lg:block lg:overflow-visible">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate({ section: tab.id })}
                className={`focus-ring flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-sm transition lg:w-full ${
                  active ? "bg-[#0f766e] text-white" : "text-neutral-700 hover:bg-[#eef3ee]"
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
                  (state) => launchPlayerAircraftProgram(state, designInput),
                  `${designInput.name} program launched.`
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
        <div key={stat.label} className="min-w-0 rounded-md border border-[#d8ddd2] bg-[#f8faf6] px-3 py-2">
          <div className="text-[11px] font-semibold uppercase text-neutral-500">{stat.label}</div>
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
    <main className="min-h-screen bg-[#f4f5f1] text-[#17211c]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8ddd2] pb-5">
          <div className="flex min-w-0 items-center gap-4">
            <AircraftPlanform />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-normal">Aircraft Producer</h1>
              <p className="mt-1 text-sm text-neutral-600">January 1970</p>
            </div>
          </div>
          {autosaveState ? <IconButton title="Continue autosave" icon={Play} label="Continue" onClick={continueCampaign} primary /> : null}
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-lg border border-[#d8ddd2] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-neutral-600">Campaign</h2>
                <CalendarDays size={17} className="text-[#0f766e]" />
              </div>
              {autosaveState ? (
                <button
                  onClick={continueCampaign}
                  className="focus-ring mt-4 w-full rounded-md border border-[#0f766e] bg-[#0f766e] px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-[#115e59]"
                >
                  Continue {autosaveState.settings.playerCompanyName}
                  <span className="mt-1 block text-xs font-medium text-teal-50">{formatGameDate(autosaveState.date)}</span>
                </button>
              ) : (
                <p className="mt-4 text-sm text-neutral-600">No autosave found.</p>
              )}
            </section>

            <section className="rounded-lg border border-[#d8ddd2] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-neutral-600">Saves</h2>
                <Save size={17} className="text-[#0f766e]" />
              </div>
              <div className="mt-3 space-y-2">
                {visibleSlots.length === 0 ? (
                  <p className="text-sm text-neutral-600">No manual saves yet.</p>
                ) : (
                  visibleSlots.map((slot) => (
                    <button
                      key={slot.slotId}
                      onClick={() => loadSlot(slot.slotId)}
                      className="focus-ring w-full rounded-md border border-[#d8ddd2] bg-[#f8faf6] px-3 py-2 text-left transition hover:border-[#0f766e] hover:bg-[#eef8f5]"
                    >
                      <span className="block truncate text-sm font-semibold">{slot.companyName}</span>
                      <span className="mt-1 block truncate text-xs text-neutral-600">{slot.slotId} · {slot.dateLabel}</span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </aside>

          <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Select Manufacturer</h2>
                <p className="mt-1 text-sm text-neutral-600">Temporary real-world naming mode</p>
              </div>
              <span className="rounded-md border border-[#d8ddd2] bg-[#f8faf6] px-3 py-1.5 text-xs font-semibold uppercase text-neutral-600">
                {manufacturers.length} choices
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {manufacturers.map((manufacturer) => (
                <button
                  key={manufacturer.id}
                  onClick={() => startCampaign(manufacturer.id)}
                  className="focus-ring group min-h-40 rounded-lg border border-[#d8ddd2] bg-[#f8faf6] p-4 text-left transition hover:border-[#0f766e] hover:bg-[#eef8f5]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-[#17211c] text-sm font-semibold text-white">
                      {manufacturer.shortName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="rounded-md border border-[#d8ddd2] bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
                      {manufacturer.country}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{manufacturer.displayName}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{manufacturer.shortName}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e]">
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
      <summary className="focus-ring inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-[#d8ddd2] bg-white px-3 text-sm font-medium text-neutral-700 transition hover:bg-[#eef3ee]">
        <Save size={16} />
        Save
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-[#d8ddd2] bg-white p-3 shadow-xl">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={manualSave} className="focus-ring rounded-md border border-[#d8ddd2] px-3 py-2 text-sm font-medium hover:bg-[#eef3ee]">
            Manual save
          </button>
          <button onClick={newCampaign} className="focus-ring rounded-md border border-[#d8ddd2] px-3 py-2 text-sm font-medium hover:bg-[#eef3ee]">
            New campaign
          </button>
        </div>
        <div className="mt-3 max-h-72 overflow-y-auto">
          {saveSlots.length === 0 ? (
            <p className="px-1 py-2 text-sm text-neutral-600">No saves yet.</p>
          ) : (
            saveSlots.map((slot) => (
              <div key={slot.slotId} className="border-t border-[#edf0ea] py-2 first:border-t-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{slot.slotId}</div>
                    <div className="truncate text-xs text-neutral-600">{slot.companyName} · {slot.dateLabel}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => loadSlot(slot.slotId)} className="focus-ring rounded px-2 py-1 text-xs font-semibold text-[#0f766e] hover:bg-[#eef3ee]">
                      Load
                    </button>
                    <button onClick={() => deleteSlot(slot.slotId)} className="focus-ring rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
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
          <div key={item.label} className="rounded-lg border border-[#d8ddd2] bg-white p-4">
            <div className="flex items-center justify-between gap-3 text-sm text-neutral-600">
              <span>{item.label}</span>
              <Icon size={17} className="text-[#0f766e]" />
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
      <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Executive Dashboard</h2>
          <span className="text-sm text-neutral-600">{formatGameDate(gameState.date)}</span>
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
        <div className="mt-5 rounded-lg border border-[#d8ddd2] bg-[#f8faf6] p-4">
          <h3 className="text-sm font-semibold text-neutral-700">Market Intelligence</h3>
          <p className="mt-2 text-sm text-neutral-600">
            {strongestCompetitor
              ? `${strongestCompetitor.name} is the most visible competitor in current share summaries. Major competitor moves will continue to arrive by email.`
              : "Competitor activity will arrive through email and appear in contextual summaries."}
          </p>
        </div>
      </section>
      <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
        <h2 className="text-lg font-semibold">Warnings</h2>
        <div className="mt-4 space-y-3">
          {warnings.length === 0 ? (
            <p className="text-sm text-neutral-600">No major warnings.</p>
          ) : (
            warnings.map((warning) => (
              <div key={warning} className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle size={18} />
                <span>{warning}</span>
              </div>
            ))
          )}
        </div>
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-neutral-700">Latest Messages</h3>
          <div className="mt-2 space-y-2">
            {latestEmails.map((email) => (
              <button
                key={email.id}
                onClick={() => navigate({ section: "email", entityType: "email", entityId: email.id })}
                className="focus-ring w-full rounded-md border border-[#d8ddd2] bg-[#f8faf6] px-3 py-2 text-left"
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{email.subject}</span>
                  <span className="text-xs text-neutral-500">{formatGameDate(email.date)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{email.preview}</p>
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
    <div className="rounded-lg border border-[#d8ddd2] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button onClick={onClick} className="focus-ring rounded-md px-2 py-1 text-xs font-semibold text-[#0f766e] hover:bg-[#eef3ee]">
          {button}
        </button>
      </div>
      <div className="mt-3 space-y-1 text-sm text-neutral-600">
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
  designInput: AircraftDesignInput;
  setDesignInput: (value: AircraftDesignInput) => void;
  designPreview: ReturnType<typeof calculateAircraftDesign>;
  unlockedTechnologyIds: string[];
  technologies: GameState["technologies"];
  launch: () => void;
}) {
  const unlocked = new Set(unlockedTechnologyIds);
  const categoryDefinition = AIRCRAFT_CATEGORIES[designInput.category];
  const engineOptions = [
    { value: "low-bypass-turbofan", label: "Early turbofan", requiredTechnologyId: undefined },
    { value: "high-bypass-turbofan", label: "High-bypass turbofan", requiredTechnologyId: "high-bypass-turbofans" },
    { value: "advanced-turbofan", label: "Advanced turbofan", requiredTechnologyId: "advanced-turbofans" }
  ].filter((option) => option.requiredTechnologyId === undefined || unlocked.has(option.requiredTechnologyId));
  const materialOptions = [
    { value: "classic-aluminum", label: "Classic aluminum", requiredTechnologyId: undefined },
    { value: "improved-aluminum", label: "Improved aluminum", requiredTechnologyId: "improved-aluminum-alloys" },
    { value: "early-composite", label: "Composite structures", requiredTechnologyId: "early-composite-secondary-structures" }
  ].filter((option) => option.requiredTechnologyId === undefined || unlocked.has(option.requiredTechnologyId));
  const avionicsOptions = [
    { value: "analog", label: "Analog avionics", requiredTechnologyId: undefined },
    { value: "improved-analog", label: "Improved analog", requiredTechnologyId: "improved-avionics" },
    { value: "digital", label: "Digital avionics", requiredTechnologyId: "digital-avionics-i" }
  ].filter((option) => option.requiredTechnologyId === undefined || unlocked.has(option.requiredTechnologyId));
  const landingGearOptions = [
    { value: "standard", label: "Standard", requiredTechnologyId: undefined },
    { value: "reinforced", label: "Reinforced", requiredTechnologyId: "damage-tolerant-structural-design" },
    { value: "short-field", label: "Short-field", requiredTechnologyId: "advanced-high-lift-devices" }
  ].filter((option) => option.requiredTechnologyId === undefined || unlocked.has(option.requiredTechnologyId));
  const unlockedDesignTechnologies = unlockedTechnologyIds
    .map((technologyId) => technologies[technologyId])
    .filter((technology): technology is NonNullable<typeof technology> => Boolean(technology))
    .filter((technology) => ["propulsion", "aerodynamics", "structures", "avionics", "manufacturing", "safety", "cabin-operations"].includes(technology.branch));

  function update<K extends keyof AircraftDesignInput>(key: K, value: AircraftDesignInput[K]) {
    setDesignInput(sanitizeAircraftDesignInput({ ...designInput, [key]: value }, unlockedTechnologyIds));
  }

  function updateCapacity(passengerCapacity: number) {
    setDesignInput(sanitizeAircraftDesignInput(withAirframeScaledToCapacity({ ...designInput, passengerCapacity }), unlockedTechnologyIds));
  }

  function toggleTechnology(technologyId: string) {
    const nextPackage = designInput.technologyPackage.includes(technologyId)
      ? designInput.technologyPackage.filter((id) => id !== technologyId)
      : [...designInput.technologyPackage, technologyId];
    update("technologyPackage", nextPackage);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Design Studio</h2>
          <IconButton title="Launch program" onClick={launch} icon={Play} label="Launch" primary />
        </div>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            Model name
            <input
              value={designInput.name}
              onChange={(event) => update("name", event.target.value)}
              className="focus-ring mt-1 w-full rounded-md border border-[#d8ddd2] px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Category
            <select
              value={designInput.category}
              onChange={(event) => {
                const category = event.target.value as AircraftCategory;
                setDesignInput(createDefaultDesignInputForUnlocked(category, designInput.name, unlockedTechnologyIds));
              }}
              className="focus-ring mt-1 w-full rounded-md border border-[#d8ddd2] px-3 py-2"
            >
              {Object.values(AIRCRAFT_CATEGORIES).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <RangeControl
            label="Passengers"
            value={designInput.passengerCapacity}
            min={categoryDefinition.capacityRange[0]}
            max={categoryDefinition.capacityRange[1]}
            step={1}
            onChange={updateCapacity}
          />
          <RangeControl
            label="Range nm"
            value={designInput.rangeNm}
            min={categoryDefinition.rangeRangeNm[0]}
            max={categoryDefinition.rangeRangeNm[1]}
            step={50}
            onChange={(value) => update("rangeNm", value)}
          />
          <RangeControl label="Cruise Mach" value={designInput.cruiseSpeedMach} min={0.68} max={0.88} step={0.01} onChange={(value) => update("cruiseSpeedMach", value)} />
          <RangeControl label="Wing sweep" value={designInput.wingSweepDeg} min={10} max={38} step={1} onChange={(value) => update("wingSweepDeg", value)} />
          <RangeControl label="Wing area m2" value={designInput.wingAreaM2} min={55} max={380} step={5} onChange={(value) => update("wingAreaM2", value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Engine
              <select
                value={designInput.engineType}
                onChange={(event) => update("engineType", event.target.value as AircraftDesignInput["engineType"])}
                className="focus-ring mt-1 w-full rounded-md border border-[#d8ddd2] px-3 py-2"
              >
                {engineOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Material
              <select
                value={designInput.structuralMaterial}
                onChange={(event) => update("structuralMaterial", event.target.value as AircraftDesignInput["structuralMaterial"])}
                className="focus-ring mt-1 w-full rounded-md border border-[#d8ddd2] px-3 py-2"
              >
                {materialOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Avionics
              <select
                value={designInput.avionicsPackage}
                onChange={(event) => update("avionicsPackage", event.target.value as AircraftDesignInput["avionicsPackage"])}
                className="focus-ring mt-1 w-full rounded-md border border-[#d8ddd2] px-3 py-2"
              >
                {avionicsOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Landing gear
              <select
                value={designInput.landingGear}
                onChange={(event) => update("landingGear", event.target.value as AircraftDesignInput["landingGear"])}
                className="focus-ring mt-1 w-full rounded-md border border-[#d8ddd2] px-3 py-2"
              >
                {landingGearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <RangeControl label="Reliability target" value={designInput.reliabilityTarget} min={50} max={92} step={1} onChange={(value) => update("reliabilityTarget", value)} />
          <RangeControl label="Cabin comfort" value={designInput.cabinComfort} min={30} max={90} step={1} onChange={(value) => update("cabinComfort", value)} />
          <RangeControl label="Commonality" value={designInput.commonality} min={0} max={90} step={1} onChange={(value) => update("commonality", value)} />
          <div>
            <h3 className="text-sm font-semibold text-neutral-700">Technology package</h3>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-[#d8ddd2] p-2">
              {unlockedDesignTechnologies.length === 0 ? (
                <p className="px-2 py-1 text-sm text-neutral-600">No unlocked design technologies.</p>
              ) : (
                unlockedDesignTechnologies.map((technology) => (
                  <label key={technology.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#eef3ee]">
                    <input
                      type="checkbox"
                      checked={designInput.technologyPackage.includes(technology.id)}
                      onChange={() => toggleTechnology(technology.id)}
                      className="mt-1 accent-[#0f766e]"
                    />
                    <span>
                      <span className="block font-medium">{technology.name}</span>
                      <span className="block text-xs text-neutral-600">{technology.effects[0]}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{designInput.name}</h2>
            <p className="mt-1 text-sm text-neutral-600">{AIRCRAFT_CATEGORIES[designInput.category].label}</p>
          </div>
          <AircraftSpecimen input={designInput} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="Range" value={`${designPreview.metrics.estimatedRangeNm.toLocaleString()} nm`} />
          <Metric label="Fuel score" value={designPreview.metrics.fuelEfficiencyScore.toString()} />
          <Metric label="Reliability" value={designPreview.metrics.estimatedReliability.toString()} />
          <Metric label="Unit cost" value={formatMoney(designPreview.metrics.unitProductionCost)} />
          <Metric label="List price" value={formatMoney(designPreview.metrics.expectedSellingPrice)} />
          <Metric label="Dev duration" value={`${designPreview.metrics.developmentDurationMonths} mo`} />
          <Metric label="Dev cost" value={formatMoney(designPreview.metrics.developmentCost)} />
          <Metric label="Airline appeal" value={designPreview.metrics.airlineAppeal.toString()} />
          <Metric label="Tech risk" value={designPreview.metrics.technologyRisk.toString()} />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <TextList title="Tradeoffs" items={designPreview.tradeoffs} empty="Balanced configuration." />
          <TextList title="Warnings" items={designPreview.warnings} empty="No design warnings." warning />
        </div>
      </section>
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
  designInput: AircraftDesignInput;
  setDesignInput: (value: AircraftDesignInput) => void;
  designPreview: ReturnType<typeof calculateAircraftDesign>;
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
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Development</h2>
          <p className="mt-1 text-sm text-neutral-600">Programs, aircraft design, certified portfolio, and engineering workforce.</p>
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
            <p className="text-sm text-neutral-600">No aircraft programs.</p>
          ) : (
            player.aircraftPrograms.map((program) => (
              <div
                key={program.id}
                className={`rounded-lg border p-4 ${
                  focusedTarget.entityId === program.id ? "border-[#0f766e] bg-[#eef8f5]" : "border-[#d8ddd2]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{program.name}</h3>
                    <p className="mt-1 text-sm text-neutral-600">
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
            <thead className="border-b border-[#d8ddd2] text-left text-neutral-600">
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
                <tr key={model.id} className="border-b border-[#edf0ea]">
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
          {player.aircraftModels.length === 0 && <p className="mt-4 text-sm text-neutral-600">No certified aircraft yet.</p>}
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
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Technology Tree</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {activeProjects.length}/{researchSlots} research slots active · {formatGameDate(gameState.date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeProjects.map((project) => {
            const technology = gameState.technologies[project.technologyId]!;
            const effectiveRequired = getEffectiveResearchPointsRequired(player, technology, gameState.date.year, gameState.technologies);
            return (
              <div key={project.id} className="min-w-52 rounded-md border border-[#d8ddd2] bg-[#f8faf6] px-3 py-2">
                <div className="text-xs font-semibold text-neutral-700">{technology.name}</div>
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
        <div className="rounded-lg border border-[#d8ddd2] p-4">
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
      ? "border-[#e4c967] bg-[#f2d36d] text-[#201b0b] shadow-[0_0_0_2px_rgba(242,211,109,0.2)]"
      : state === "active"
        ? "border-[#8db7e4] bg-[#d9ebfb] text-[#112235] shadow-[0_0_0_2px_rgba(141,183,228,0.16)]"
        : state === "available"
          ? "border-[#76b39d] bg-[#e2f0e6] text-[#10261d] hover:bg-[#ecf7ef]"
          : "border-[#465650] bg-[#26312e] text-[#b4c0ba]";

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
          <div className="absolute bottom-0 left-0 h-1 rounded-b bg-[#2f7d73]" style={{ width: `${Math.max(3, Math.min(100, progress))}%` }} />
        )}
        <span className="absolute left-0 top-0 h-full w-1 rounded-l" style={{ background: branch?.accent ?? "#87948e" }} />
      </button>
      <div className="pointer-events-none absolute left-0 top-[84px] z-40 hidden w-80 rounded-md border border-[#3a4945] bg-[#111816] p-3 text-xs leading-5 text-[#e7ede6] shadow-xl group-hover:block">
        <div className="font-semibold">{technology.name}</div>
        <div className="mt-1 text-[#b8c5bf]">
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
  const [selectedCountry, setSelectedCountry] = useState("United States");
  const [section, setSection] = useState<"network" | "production" | "workforce" | "deliveries">("network");
  const assignedWorkers = getAssignedFactoryWorkers(player);
  const totalFactoryWorkers = player.employees.factoryWorkers.headcount;
  const availableWorkers = Math.max(0, totalFactoryWorkers - assignedWorkers);

  return (
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
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
              className="focus-ring ml-2 rounded-md border border-[#d8ddd2] bg-white px-3 py-2"
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
                  ? "border-[#0f766e] bg-[#eef8f5]"
                  : status === "closed"
                    ? "border-[#d8ddd2] bg-[#f8faf6]"
                    : "border-[#d8ddd2]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{factory.name}</h3>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${factoryStatusClass(status)}`}>{factoryStatusLabel(status)}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
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
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
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
                    className="focus-ring mt-1 w-full rounded-md border border-[#d8ddd2] bg-white px-3 py-2"
                  >
                    <option value="">Idle / no aircraft</option>
                    {supportedModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} · {AIRCRAFT_CATEGORIES[model.category].label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-md bg-[#f4f5f1] px-3 py-2 text-sm">
                  <span className="block text-xs font-medium uppercase text-neutral-500">Target rate</span>
                  <span className="mt-1 block font-semibold">{activeLine ? `${activeLine.targetMonthlyRate}/mo` : "Idle"}</span>
                </div>
              </div>
              {status === "active" && supportedModels.length === 0 && (
                <p className="mt-3 text-sm text-neutral-600">No certified aircraft fit this factory yet.</p>
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
          <div className="overflow-x-auto rounded-lg border border-[#d8ddd2]">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead className="border-b border-[#d8ddd2] bg-[#f8faf6] text-left text-neutral-600">
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
                    <tr key={factory.id} className="border-b border-[#edf0ea]">
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
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#d8ddd2]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="border-b border-[#d8ddd2] bg-[#f8faf6] text-left text-neutral-600">
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
                    <tr key={order.id} className="border-b border-[#edf0ea]">
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
    return "bg-amber-100 text-amber-900";
  }
  if (status === "closed") {
    return "bg-neutral-200 text-neutral-700";
  }
  return "bg-emerald-100 text-emerald-800";
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
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Orders</h2>
          <p className="mt-1 text-sm text-neutral-600">Order book, delivery schedule, airlines, and relationship scores.</p>
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
          <thead className="border-b border-[#d8ddd2] text-left text-neutral-600">
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
                <tr key={order.id} className={`border-b border-[#edf0ea] ${focusedTarget.entityId === order.id ? "bg-[#eef8f5]" : ""}`}>
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
        {orders.length === 0 && <p className="mt-4 text-sm text-neutral-600">No orders yet.</p>}
      </div>}
      {section === "calendar" && (
        <div className="mt-4 grid gap-3">
          {orders.length === 0 ? (
            <p className="text-sm text-neutral-600">No deliveries scheduled.</p>
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
                    className="focus-ring rounded-lg border border-[#d8ddd2] p-4 text-left hover:bg-[#f8faf6]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-semibold">Turn {order.deliveryStartTurn}: {model?.name ?? "Aircraft"} for {gameState.airlines[order.airlineId]?.name}</span>
                      <span className="text-sm text-neutral-600">{Math.max(0, order.quantity - order.delivered)} remaining</span>
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
                  focusedTarget.entityId === airline.id ? "border-[#0f766e] bg-[#eef8f5]" : "border-[#d8ddd2] hover:bg-[#f8faf6]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{airline.name}</h3>
                    <p className="mt-1 text-sm text-neutral-600">
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
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#d8ddd2]">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="border-b border-[#d8ddd2] bg-[#f8faf6] text-left text-neutral-600">
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
                    <tr key={airline.id} className="border-b border-[#edf0ea]">
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
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <h2 className="text-lg font-semibold">Finances</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="border-b border-[#d8ddd2] text-left text-neutral-600">
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
              <tr key={report.turn} className="border-b border-[#edf0ea]">
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
        {reports.length === 0 && <p className="mt-4 text-sm text-neutral-600">No monthly reports yet.</p>}
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
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Company Email</h2>
          <p className="mt-1 text-sm text-neutral-600">{unreadCount} unread · {actionCount} action-required · {emails.length} total messages</p>
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
        <aside className="rounded-lg border border-[#d8ddd2] p-3">
          <label className="block text-sm font-medium">
            Search
            <span className="mt-1 flex items-center gap-2 rounded-md border border-[#d8ddd2] px-2">
              <Search size={15} className="text-neutral-500" />
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
              className="focus-ring mt-1 w-full rounded-md border border-[#d8ddd2] bg-white px-2 py-2"
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
                    active ? "bg-[#0f766e] text-white" : "text-neutral-700 hover:bg-[#eef3ee]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={active ? "text-white/80" : "text-neutral-500"}>{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="max-h-[680px] overflow-y-auto rounded-lg border border-[#d8ddd2]">
          {visibleEmails.length === 0 ? (
            <div className="p-4 text-sm text-neutral-600">No messages in this folder.</div>
          ) : (
            visibleEmails.map((email) => {
              const selected = selectedEmail?.id === email.id;
              const Icon = email.read ? MailOpen : Mail;
              return (
                <button
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className={`focus-ring block w-full border-b border-[#edf0ea] px-4 py-3 text-left transition last:border-b-0 ${
                    selected ? "bg-[#e8f2ef]" : email.read ? "bg-white hover:bg-[#f8faf6]" : "bg-[#fffaf0] hover:bg-[#fff6df]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon size={18} className={email.read ? "mt-0.5 text-neutral-500" : "mt-0.5 text-[#b7791f]"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold">{email.from}</span>
                        <span className="shrink-0 text-xs text-neutral-500">{formatGameDate(email.date)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${emailCategoryDot(email.category)}`} />
                        <span className={`truncate text-sm ${email.read ? "font-medium text-neutral-700" : "font-semibold text-[#17211c]"}`}>
                          {email.subject}
                        </span>
                        {email.requiresAction && email.status === "open" && <AlertTriangle size={14} className="text-amber-600" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{email.preview}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="min-h-[460px] rounded-lg border border-[#d8ddd2] bg-[#f8faf6] p-5">
          {!selectedEmail ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-600">No email selected.</div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#d8ddd2] pb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${emailPriorityClass(selectedEmail.priority)}`}>
                      {emailPriorityLabel(selectedEmail.priority)}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
                      {emailCategoryLabel(selectedEmail.category)}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
                      {selectedEmail.status}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold tracking-normal">{selectedEmail.subject}</h3>
                  <p className="mt-2 text-sm text-neutral-600">
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
              <div className="mt-5 space-y-4 text-sm leading-6 text-neutral-800">
                {selectedEmail.body.map((paragraph, index) => (
                  <p key={`${selectedEmail.id}-${index}`}>{paragraph}</p>
                ))}
              </div>
              {selectedEmail.actions.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-[#d8ddd2] pt-4">
                  {selectedEmail.actions.map((action) => (
                    <button
                      key={action.id}
                      disabled={action.disabled}
                      onClick={() => runAction(selectedEmail, action.id)}
                      className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-[#0f766e] px-3 text-sm font-medium text-white transition hover:bg-[#0b5f59] disabled:cursor-not-allowed disabled:bg-neutral-300"
                      title={action.consequencePreview}
                    >
                      <FileText size={16} />
                      {action.label}
                    </button>
                  ))}
                  {selectedEmail.requiresAction && selectedEmail.status === "open" && (
                    <button
                      onClick={() => mutateGame((state) => acknowledgePlayerEmail(state, selectedEmail.id), "Email acknowledged.")}
                      className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-[#d8ddd2] bg-white px-3 text-sm font-medium text-neutral-700 transition hover:bg-[#eef3ee]"
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
    return "bg-emerald-500";
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
  return "bg-[#0f766e]";
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
    return "bg-red-100 text-red-800";
  }
  if (priority === "important") {
    return "bg-amber-100 text-amber-900";
  }
  if (priority === "informational") {
    return "bg-neutral-200 text-neutral-700";
  }
  return "bg-emerald-100 text-emerald-800";
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
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-md border border-[#d8ddd2] bg-[#f8faf6] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={`focus-ring min-w-fit rounded px-3 py-1.5 text-sm font-medium transition ${
            active === tab.id ? "bg-[#0f766e] text-white" : "text-neutral-700 hover:bg-white"
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
    <div className="rounded-lg border border-[#d8ddd2] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-neutral-600">{group.headcount.toLocaleString()} employed · {idle.toLocaleString()} idle</p>
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
    <div className="rounded-md bg-[#f4f5f1] px-3 py-2">
      <div className="text-xs font-medium uppercase text-neutral-500">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
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
        <span className="text-neutral-600">{value}</span>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-[#0f766e]"
      />
    </label>
  );
}

function ProgressBar({ value, compact = false }: { value: number; compact?: boolean }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div className={`${compact ? "mt-2 h-1.5" : "mt-3 h-2"} overflow-hidden rounded bg-[#e8ece4]`}>
      <div className="h-full bg-[#0f766e]" style={{ width: `${normalized}%` }} />
    </div>
  );
}

function TextList({ title, items, empty, warning = false }: { title: string; items: string[]; empty: string; warning?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-700">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-neutral-600">{empty}</p>
        ) : (
          items.map((item) => (
            <p key={item} className={`rounded-md border px-3 py-2 text-sm ${warning ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[#d8ddd2] bg-[#f8faf6] text-neutral-700"}`}>
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
    ? "bg-[#0f766e] text-white hover:bg-[#0b5f59]"
    : danger
      ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
      : "border border-[#d8ddd2] bg-white text-neutral-700 hover:bg-[#eef3ee]";

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
      <rect x="8" y="26" width="76" height="10" rx="5" fill="#0f766e" />
      <path d="M43 12h8l13 18H30z" fill="#f2b84b" />
      <path d="M44 52h8l9-18H35z" fill="#b9c7bd" />
      <path d="M74 22l14-10v14z" fill="#0b5f59" />
      <circle cx="24" cy="31" r="2" fill="#eef8f6" />
      <circle cx="34" cy="31" r="2" fill="#eef8f6" />
      <circle cx="44" cy="31" r="2" fill="#eef8f6" />
      <circle cx="54" cy="31" r="2" fill="#eef8f6" />
      <circle cx="64" cy="31" r="2" fill="#eef8f6" />
    </svg>
  );
}

function AircraftSpecimen({ input }: { input: AircraftDesignInput }) {
  const length = Math.max(250, Math.min(430, input.fuselageLengthM * 6));
  const fuselageHeight = Math.max(22, Math.min(42, input.fuselageWidthM * 6.2));
  const wingAreaScale = Math.max(95, Math.min(245, input.wingAreaM2 * 0.82));
  const sweep = Math.max(8, Math.min(42, input.wingSweepDeg));
  const engineCount = Math.max(2, Math.min(4, input.engineCount));
  const noseX = 58;
  const tailX = noseX + length;
  const centerY = 128;
  const topY = centerY - fuselageHeight / 2;
  const bottomY = centerY + fuselageHeight / 2;
  const wingRootX = noseX + length * (input.category === "wide-body" ? 0.42 : 0.45);
  const wingTipX = Math.min(520, wingRootX + wingAreaScale);
  const wingDrop = input.category === "wide-body" ? 82 : input.category === "narrow-body" ? 70 : 58;
  const windowCount = Math.max(5, Math.min(28, Math.round(input.passengerCapacity / (input.category === "wide-body" ? 15 : 9))));
  const hasWinglets = input.technologyPackage.some((technologyId) =>
    ["early-wingtip-devices", "advanced-winglets", "raked-wingtips"].includes(technologyId)
  );
  const enginePositions = sideEnginePositions(input.category, engineCount, wingRootX, wingTipX, tailX, centerY);

  return (
    <div className="flex min-h-72 w-full min-w-64 items-center justify-center rounded-lg border border-[#d8ddd2] bg-[#eef3f0] p-3">
      <svg width="560" height="280" viewBox="0 0 560 280" role="img" aria-label={`${input.name} aircraft drawing`}>
        <defs>
          <linearGradient id="previewSky" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f8fbf8" />
            <stop offset="100%" stopColor="#e5ece8" />
          </linearGradient>
          <linearGradient id="fuselagePaint" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#e9f0ec" />
            <stop offset="100%" stopColor="#c6d2cc" />
          </linearGradient>
          <linearGradient id="wingPaint" x1="0" x2="1">
            <stop offset="0%" stopColor="#82998f" />
            <stop offset="58%" stopColor="#d6b45d" />
            <stop offset="100%" stopColor="#f1d988" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#25312d" floodOpacity="0.18" />
          </filter>
        </defs>
        <rect x="0" y="0" width="560" height="280" rx="14" fill="url(#previewSky)" />
        {Array.from({ length: 11 }, (_, index) => (
          <path key={`grid-h-${index}`} d={`M 26 ${36 + index * 21} H 534`} stroke="#d8e0dc" strokeWidth="1" opacity={index % 2 === 0 ? 0.72 : 0.34} />
        ))}
        {Array.from({ length: 13 }, (_, index) => (
          <path key={`grid-v-${index}`} d={`M ${44 + index * 39} 24 V 246`} stroke="#d8e0dc" strokeWidth="1" opacity={0.28} />
        ))}
        <ellipse cx="285" cy="218" rx={Math.max(145, length * 0.38)} ry="18" fill="#26312e" opacity="0.09" />
        <g filter="url(#softShadow)">
          <path
            d={`M ${wingRootX - 24} ${centerY + 9} L ${wingRootX + 38 - sweep} ${centerY + 2} L ${wingTipX} ${centerY + wingDrop} L ${wingTipX - 62} ${centerY + wingDrop + 15} L ${wingRootX - 42} ${centerY + 19} Z`}
            fill="url(#wingPaint)"
            stroke="#6c8177"
            strokeWidth="2"
          />
          {hasWinglets && (
            <>
              <path d={`M ${wingTipX - 4} ${centerY + wingDrop + 1} l 14 -30`} stroke="#0f766e" strokeWidth="6" strokeLinecap="round" />
              <path d={`M ${wingTipX - 54} ${centerY + wingDrop + 13} l 12 -20`} stroke="#2f7d73" strokeWidth="4" strokeLinecap="round" opacity="0.72" />
            </>
          )}
          <path
            d={`M ${noseX} ${centerY}
              C ${noseX + 18} ${topY - 17}, ${noseX + 72} ${topY - 18}, ${tailX - 62} ${topY - 7}
              C ${tailX - 20} ${topY - 3}, ${tailX + 23} ${centerY - 4}, ${tailX + 42} ${centerY}
              C ${tailX + 19} ${centerY + 18}, ${tailX - 31} ${bottomY + 8}, ${noseX + 30} ${bottomY + 6}
              C ${noseX + 5} ${bottomY + 5}, ${noseX - 10} ${centerY + 13}, ${noseX} ${centerY} Z`}
            fill="url(#fuselagePaint)"
            stroke="#52655e"
            strokeWidth="2.5"
          />
          <path d={`M ${noseX + 18} ${centerY - 3} C ${noseX + 24} ${topY - 7}, ${noseX + 48} ${topY - 8}, ${noseX + 68} ${topY - 4}`} fill="none" stroke="#26312e" strokeWidth="2" opacity="0.5" />
          <path d={`M ${tailX - 56} ${topY + 6} L ${tailX - 18} ${topY - 76} L ${tailX + 5} ${topY + 4} Z`} fill="#0f766e" stroke="#0b5f59" strokeWidth="2" />
          <path d={`M ${tailX - 62} ${centerY + 5} L ${tailX + 8} ${centerY - 16} L ${tailX - 16} ${centerY + 13} Z`} fill="#9fb4aa" stroke="#6c8177" strokeWidth="1.5" />
          <path d={`M ${noseX + 78} ${centerY + 5} H ${tailX - 70}`} stroke="#d6b45d" strokeWidth="6" strokeLinecap="round" />
          <path d={`M ${noseX + 80} ${centerY + 1} H ${tailX - 72}`} stroke="#fff6ce" strokeWidth="2" strokeLinecap="round" opacity="0.72" />
          {Array.from({ length: windowCount }, (_, index) => {
            const spacing = (length - 132) / Math.max(1, windowCount - 1);
            return (
              <rect
                key={index}
                x={noseX + 78 + index * spacing}
                y={topY + 9}
                width="7"
                height="5"
                rx="1.5"
                fill="#2f7d73"
                opacity="0.88"
              />
            );
          })}
          <rect x={noseX + 56} y={topY + 13} width="10" height={fuselageHeight - 11} rx="2" fill="none" stroke="#52655e" strokeWidth="1.2" opacity="0.7" />
          <rect x={tailX - 92} y={topY + 13} width="10" height={fuselageHeight - 13} rx="2" fill="none" stroke="#52655e" strokeWidth="1.2" opacity="0.62" />
          {enginePositions.map((engine, index) => (
            <g key={index}>
              <path d={`M ${engine.x - 4} ${engine.y - 22} L ${engine.x - 8} ${engine.y - 8}`} stroke="#52655e" strokeWidth="3" strokeLinecap="round" />
              <ellipse cx={engine.x} cy={engine.y} rx={engine.rx} ry={engine.ry} fill="#e7eee9" stroke="#d6b45d" strokeWidth="4" />
              <ellipse cx={engine.x} cy={engine.y} rx={engine.rx - 7} ry={engine.ry - 5} fill="#26312e" />
              <ellipse cx={engine.x - 3} cy={engine.y - 2} rx={Math.max(3, engine.rx - 13)} ry={Math.max(2, engine.ry - 9)} fill="#64746e" opacity="0.62" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function sideEnginePositions(
  category: AircraftCategory,
  engineCount: number,
  wingRootX: number,
  wingTipX: number,
  tailX: number,
  centerY: number
): { x: number; y: number; rx: number; ry: number }[] {
  if (category === "regional-jet" && engineCount === 2) {
    return [
      { x: tailX - 72, y: centerY + 26, rx: 15, ry: 11 }
    ];
  }

  const wingSpan = wingTipX - wingRootX;
  if (engineCount >= 4) {
    return [
      { x: wingRootX + wingSpan * 0.22, y: centerY + 42, rx: 18, ry: 13 },
      { x: wingRootX + wingSpan * 0.38, y: centerY + 50, rx: 18, ry: 13 },
      { x: wingRootX + wingSpan * 0.58, y: centerY + 50, rx: 18, ry: 13 },
      { x: wingRootX + wingSpan * 0.74, y: centerY + 42, rx: 18, ry: 13 }
    ];
  }

  if (engineCount === 3) {
    return [
      { x: wingRootX + wingSpan * 0.34, y: centerY + 46, rx: 19, ry: 14 },
      { x: wingRootX + wingSpan * 0.62, y: centerY + 46, rx: 19, ry: 14 },
      { x: tailX - 58, y: centerY + 8, rx: 14, ry: 10 }
    ];
  }

  return [
    { x: wingRootX + wingSpan * 0.36, y: centerY + 46, rx: 19, ry: 14 },
    { x: wingRootX + wingSpan * 0.64, y: centerY + 46, rx: 19, ry: 14 }
  ];
}

function withAirframeScaledToCapacity(input: AircraftDesignInput): AircraftDesignInput {
  const category = AIRCRAFT_CATEGORIES[input.category];
  const ratio = (input.passengerCapacity - category.capacityRange[0]) / (category.capacityRange[1] - category.capacityRange[0]);
  const envelope = visualAirframeEnvelope(input.category);
  return {
    ...input,
    fuselageLengthM: roundOne(lerp(envelope.fuselageLength[0], envelope.fuselageLength[1], ratio)),
    fuselageWidthM: roundOne(lerp(envelope.fuselageWidth[0], envelope.fuselageWidth[1], ratio)),
    wingAreaM2: Math.round(lerp(envelope.wingArea[0], envelope.wingArea[1], ratio))
  };
}

function visualAirframeEnvelope(category: AircraftCategory): {
  fuselageLength: [number, number];
  fuselageWidth: [number, number];
  wingArea: [number, number];
} {
  if (category === "regional-jet") {
    return {
      fuselageLength: [21, 33],
      fuselageWidth: [2.5, 3.4],
      wingArea: [52, 92]
    };
  }

  if (category === "narrow-body") {
    return {
      fuselageLength: [31, 47],
      fuselageWidth: [3.3, 4.2],
      wingArea: [95, 165]
    };
  }

  return {
    fuselageLength: [48, 76],
    fuselageWidth: [5, 6.8],
    wingArea: [245, 390]
  };
}

function lerp(min: number, max: number, ratio: number): number {
  return min + (max - min) * Math.max(0, Math.min(1, ratio));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function createDefaultDesignInputForUnlocked(
  category: AircraftCategory,
  name: string,
  unlockedTechnologyIds: string[]
): AircraftDesignInput {
  const base = createDefaultDesignInput(category, name);
  return sanitizeAircraftDesignInput(
    {
      ...base,
      structuralMaterial: unlockedTechnologyIds.includes("improved-aluminum-alloys") ? "improved-aluminum" : "classic-aluminum",
      engineType: unlockedTechnologyIds.includes("high-bypass-turbofans") ? "high-bypass-turbofan" : "low-bypass-turbofan",
      avionicsPackage: unlockedTechnologyIds.includes("improved-avionics") ? "improved-analog" : "analog",
      technologyPackage: unlockedTechnologyIds.filter((technologyId) =>
        ["improved-aluminum-alloys", "high-bypass-turbofans", "improved-aerodynamics", "reliability-growth-testing"].includes(technologyId)
      )
    },
    unlockedTechnologyIds
  );
}

function createOpeningDesignInput(state: GameState): AircraftDesignInput {
  const player = state.manufacturers[state.playerCompanyId];
  const manufacturerIdentityId = player?.identityId ?? state.settings.playerManufacturerIdentityId ?? "player";
  return createDefaultDesignInputForUnlocked(
    DEFAULT_DESIGN_CATEGORY,
    getDefaultPlayerAircraftName(DEFAULT_DESIGN_CATEGORY, state.date.year, state.contentSettings.namingMode, manufacturerIdentityId),
    player?.unlockedTechnologyIds ?? ["improved-aluminum-alloys"]
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

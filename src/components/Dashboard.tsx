"use client";

import {
  AlertTriangle,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Factory,
  FlaskConical,
  Gauge,
  Lock,
  PackageCheck,
  Plane,
  Play,
  Plus,
  RadioTower,
  Save,
  Trash2,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AIRCRAFT_CATEGORIES } from "@/data/aircraftCategories";
import { RESEARCH_ERAS, TECHNOLOGY_BRANCHES } from "@/data/technologies";
import { calculateAircraftDesign, createDefaultDesignInput } from "@/game/aircraft/design";
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
  buildPlayerFactory,
  changeEmployeeHeadcount,
  launchPlayerAircraftProgram,
  sanitizeAircraftDesignInput,
  startPlayerResearch,
  updatePlayerProgram
} from "@/game/simulation/actions";
import { createNewGame } from "@/game/simulation/createGame";
import { processMonthlyTurn } from "@/game/simulation/processMonthlyTurn";
import type { AircraftCategory, AircraftDesignInput, GameState, MonthlyFinancialReport, Technology, TechnologyBranch } from "@/game/types";
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
  | "aircraft"
  | "development"
  | "research"
  | "employees"
  | "factories"
  | "orders"
  | "competitors"
  | "finances"
  | "news"
  | "saves";

const TABS: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "aircraft", label: "Aircraft", icon: Plane },
  { id: "development", label: "Development", icon: BriefcaseBusiness },
  { id: "research", label: "Research", icon: FlaskConical },
  { id: "employees", label: "Employees", icon: Users },
  { id: "factories", label: "Factories", icon: Factory },
  { id: "orders", label: "Orders", icon: PackageCheck },
  { id: "competitors", label: "Competitors", icon: Building2 },
  { id: "finances", label: "Finances", icon: Banknote },
  { id: "news", label: "News", icon: RadioTower },
  { id: "saves", label: "Saves", icon: Save }
];

export function Dashboard() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [saveSlots, setSaveSlots] = useState<SaveSlotSummary[]>([]);
  const [designInput, setDesignInput] = useState<AircraftDesignInput>(() =>
    createDefaultDesignInputForUnlocked("regional-jet", "Pioneer RJ-70", ["improved-aluminum-alloys"])
  );
  const [statusMessage, setStatusMessage] = useState("Ready");

  useEffect(() => {
    let mounted = true;
    loadGameFromSlot("autosave").then((loaded) => {
      if (!mounted) {
        return;
      }
      setGameState(loaded ?? createNewGame());
      setSaveSlots(listLocalSaves());
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

  if (!gameState || !player) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-700">Loading campaign...</div>;
  }

  async function endTurn() {
    if (!gameState) {
      return;
    }
    const result = processMonthlyTurn(gameState);
    setGameState(result.gameState);
    setStatusMessage(result.report.summary);
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
      setGameState(loaded);
      setStatusMessage("Campaign loaded.");
    }
  }

  async function deleteSlot(slotId: string) {
    await deleteSaveSlot(slotId);
    setSaveSlots(listLocalSaves());
    setStatusMessage("Save deleted.");
  }

  function newCampaign() {
    const companyName = window.prompt("Company name", "Pioneer Commercial Aircraft")?.trim();
    const next = createNewGame({ companyName: companyName || "Pioneer Commercial Aircraft" });
    setGameState(next);
    setDesignInput(createDefaultDesignInputForUnlocked("regional-jet", "Pioneer RJ-70", next.manufacturers[next.playerCompanyId]!.unlockedTechnologyIds));
    setStatusMessage("New campaign started.");
  }

  function mutateGame(mutator: (state: GameState) => GameState, message: string) {
    setGameState((current) => (current ? mutator(current) : current));
    setStatusMessage(message);
  }

  return (
    <main className="min-h-screen bg-[#f4f5f1] text-[#17211c]">
      <header className="border-b border-[#d8ddd2] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
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
          <div className="flex flex-wrap gap-2">
            <IconButton title="New campaign" onClick={newCampaign} icon={Plus} label="New" />
            <IconButton title="Manual save" onClick={manualSave} icon={Save} label="Save" />
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
                onClick={() => setActiveTab(tab.id)}
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
            marketShare={player.marketShare["narrow-body"]}
          />

          {activeTab === "overview" && (
            <OverviewTab gameState={gameState} playerId={player.id} playerFinancial={playerFinancial} />
          )}
          {activeTab === "aircraft" && (
            <AircraftTab
              designInput={designInput}
              setDesignInput={setDesignInput}
              designPreview={designPreview}
              unlockedTechnologyIds={player.unlockedTechnologyIds}
              technologies={gameState.technologies}
              launch={() =>
                mutateGame(
                  (state) => launchPlayerAircraftProgram(state, designInput),
                  `${designInput.name} program launched.`
                )
              }
            />
          )}
          {activeTab === "development" && (
            <DevelopmentTab
              gameState={gameState}
              mutateGame={mutateGame}
            />
          )}
          {activeTab === "research" && (
            <ResearchTab
              gameState={gameState}
              mutateGame={mutateGame}
            />
          )}
          {activeTab === "employees" && (
            <EmployeesTab
              gameState={gameState}
              mutateGame={mutateGame}
            />
          )}
          {activeTab === "factories" && (
            <FactoriesTab
              gameState={gameState}
              mutateGame={mutateGame}
            />
          )}
          {activeTab === "orders" && <OrdersTab gameState={gameState} />}
          {activeTab === "competitors" && <CompetitorsTab gameState={gameState} />}
          {activeTab === "finances" && <FinancesTab gameState={gameState} />}
          {activeTab === "news" && <NewsTab gameState={gameState} />}
          {activeTab === "saves" && (
            <SavesTab saveSlots={saveSlots} loadSlot={loadSlot} deleteSlot={deleteSlot} manualSave={manualSave} />
          )}
        </div>
      </div>
    </main>
  );
}

function KpiStrip({
  cash,
  financial,
  activePrograms,
  backlog,
  deliveries,
  marketShare
}: {
  cash: number;
  financial?: MonthlyFinancialReport;
  activePrograms: number;
  backlog: number;
  deliveries: number;
  marketShare: number;
}) {
  const items = [
    { label: "Cash", value: formatMoney(cash), icon: Banknote },
    { label: "Monthly result", value: financial ? formatMoney(financial.profitOrLoss) : "$0", icon: TrendingUp },
    { label: "Programs", value: String(activePrograms), icon: BriefcaseBusiness },
    { label: "Backlog", value: `${backlog}`, icon: PackageCheck },
    { label: "Deliveries", value: `${deliveries}`, icon: Plane },
    { label: "Narrow-body share", value: `${marketShare.toFixed(1)}%`, icon: Gauge }
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
  playerFinancial
}: {
  gameState: GameState;
  playerId: string;
  playerFinancial?: MonthlyFinancialReport;
}) {
  const player = gameState.manufacturers[playerId]!;
  const lastReport = gameState.monthlyHistory.at(-1);
  const activeResearch = player.researchProjects.filter((project) => project.status === "active");
  const warnings = [...(playerFinancial?.warnings ?? []), ...(lastReport?.warnings ?? [])];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Operations</h2>
          <span className="text-sm text-neutral-600">{formatGameDate(gameState.date)}</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="Certified models" value={player.aircraftModels.length.toString()} />
          <Metric label="Active factories" value={player.factories.length.toString()} />
          <Metric label="Research projects" value={activeResearch.length.toString()} />
        </div>
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-neutral-700">Monthly report</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-700">{lastReport?.summary ?? "January 1970: the board is waiting for the first plan."}</p>
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
      </section>
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

function DevelopmentTab({ gameState, mutateGame }: { gameState: GameState; mutateGame: (mutator: (state: GameState) => GameState, message: string) => void }) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  return (
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <h2 className="text-lg font-semibold">Aircraft Programs</h2>
      <div className="mt-4 grid gap-3">
        {player.aircraftPrograms.length === 0 ? (
          <p className="text-sm text-neutral-600">No aircraft programs.</p>
        ) : (
          player.aircraftPrograms.map((program) => (
            <div key={program.id} className="rounded-lg border border-[#d8ddd2] p-4">
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
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Metric label="Engineers" value={program.assignedEngineers.toLocaleString()} />
                <Metric label="Monthly budget" value={formatMoney(program.monthlyBudget)} />
                <Metric label="Spent" value={formatMoney(program.spentTotal)} />
                <Metric label="Delays" value={`${program.delayMonths} mo`} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ResearchTab({ gameState, mutateGame }: { gameState: GameState; mutateGame: (mutator: (state: GameState) => GameState, message: string) => void }) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  const activeProjects = player.researchProjects.filter((project) => project.status === "active");
  const researchSlots = getResearchSlotCount(player);
  const slotsAvailable = hasResearchSlotAvailable(player);
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
      <ResearchTree
        gameState={gameState}
        slotsAvailable={slotsAvailable}
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
  startTechnology
}: {
  gameState: GameState;
  slotsAvailable: boolean;
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
  position,
  startTechnology
}: {
  technology: Technology;
  gameState: GameState;
  slotsAvailable: boolean;
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
        className={`focus-ring relative flex h-[76px] w-full flex-col justify-between rounded-md border p-2 text-left text-xs transition ${className}`}
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

function EmployeesTab({ gameState, mutateGame }: { gameState: GameState; mutateGame: (mutator: (state: GameState) => GameState, message: string) => void }) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  return (
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <h2 className="text-lg font-semibold">Employees</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {Object.values(player.employees).map((group) => (
          <div key={group.role} className="rounded-lg border border-[#d8ddd2] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{labelRole(group.role)}</h3>
                <p className="mt-1 text-sm text-neutral-600">{group.headcount.toLocaleString()} people</p>
              </div>
              <div className="flex gap-2">
                <IconButton title="Hire 25" icon={Plus} label="25" onClick={() => mutateGame((state) => changeEmployeeHeadcount(state, group.role, 25), "Hiring complete.")} />
                <IconButton title="Release 25" icon={Trash2} label="25" danger onClick={() => mutateGame((state) => changeEmployeeHeadcount(state, group.role, -25), "Headcount reduced.")} />
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Metric label="Skill" value={group.skill.toString()} />
              <Metric label="Morale" value={group.morale.toString()} />
              <Metric label="Productivity" value={group.productivity.toString()} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FactoriesTab({ gameState, mutateGame }: { gameState: GameState; mutateGame: (mutator: (state: GameState) => GameState, message: string) => void }) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  const certifiedModels = player.aircraftModels.filter((model) => model.active);
  return (
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Factories</h2>
        <div className="flex flex-wrap gap-2">
          <IconButton title="Build regional or narrow-body factory" icon={Plus} label="Medium" onClick={() => mutateGame((state) => buildPlayerFactory(state, "narrow-body"), "Factory expansion approved.")} />
          <IconButton title="Build wide-body factory" icon={Plus} label="Large" onClick={() => mutateGame((state) => buildPlayerFactory(state, "wide-body"), "Wide-body factory approved.")} />
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {player.factories.map((factory) => (
          <div key={factory.id} className="rounded-lg border border-[#d8ddd2] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{factory.name}</h3>
                <p className="mt-1 text-sm text-neutral-600">{factory.location.replaceAll("-", " ")} · {factory.size}</p>
              </div>
              <span className="text-sm text-neutral-600">{factory.idleSpace.toFixed(1)} idle capacity</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <Metric label="Capacity" value={factory.capacity.toString()} />
              <Metric label="Workers" value={factory.workerCount.toLocaleString()} />
              <Metric label="Monthly cost" value={formatMoney(factory.monthlyCost)} />
              <Metric label="Lines" value={factory.productionLines.length.toString()} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {certifiedModels
                .filter((model) => factory.supportedCategories.includes(model.category))
                .map((model) => (
                  <IconButton
                    key={model.id}
                    title={`Assign ${model.name}`}
                    icon={Plane}
                    label={model.name}
                    onClick={() => mutateGame((state) => assignPlayerProductionLine(state, model.id, model.category === "wide-body" ? 1 : 3), "Production line assigned.")}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OrdersTab({ gameState }: { gameState: GameState }) {
  const player = gameState.manufacturers[gameState.playerCompanyId]!;
  const orders = Object.values(gameState.orders).filter((order) => order.manufacturerId === player.id);
  return (
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <h2 className="text-lg font-semibold">Orders</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="border-b border-[#d8ddd2] text-left text-neutral-600">
            <tr>
              <th className="py-2 pr-4">Airline</th>
              <th className="py-2 pr-4">Model</th>
              <th className="py-2 pr-4">Quantity</th>
              <th className="py-2 pr-4">Delivered</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const model = player.aircraftModels.find((candidate) => candidate.id === order.modelId);
              return (
                <tr key={order.id} className="border-b border-[#edf0ea]">
                  <td className="py-3 pr-4">{gameState.airlines[order.airlineId]?.name}</td>
                  <td className="py-3 pr-4">{model?.name}</td>
                  <td className="py-3 pr-4">{order.quantity}</td>
                  <td className="py-3 pr-4">{order.delivered}</td>
                  <td className="py-3 pr-4">{formatMoney(order.pricePerAircraft)}</td>
                  <td className="py-3 pr-4">{order.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && <p className="mt-4 text-sm text-neutral-600">No orders yet.</p>}
      </div>
    </section>
  );
}

function CompetitorsTab({ gameState }: { gameState: GameState }) {
  const competitors = Object.values(gameState.manufacturers).filter((manufacturer) => !manufacturer.isPlayer);
  return (
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <h2 className="text-lg font-semibold">Competitors</h2>
      <div className="mt-4 grid gap-3">
        {competitors.map((manufacturer) => (
          <div key={manufacturer.id} className="rounded-lg border border-[#d8ddd2] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{manufacturer.name}</h3>
                <p className="mt-1 text-sm text-neutral-600">{manufacturer.strategy.preferredSegments.join(", ").replaceAll("-", " ")}</p>
              </div>
              <span className={manufacturer.bankrupt ? "text-sm font-semibold text-red-700" : "text-sm text-neutral-600"}>
                {manufacturer.bankrupt ? "Bankrupt" : formatMoney(manufacturer.cash)}
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-5">
              <Metric label="Models" value={manufacturer.aircraftModels.length.toString()} />
              <Metric label="Programs" value={manufacturer.aircraftPrograms.filter((program) => program.status === "active").length.toString()} />
              <Metric label="Research" value={manufacturer.researchProjects.filter((project) => project.status === "active").length.toString()} />
              <Metric label="Narrow share" value={`${manufacturer.marketShare["narrow-body"].toFixed(1)}%`} />
              <Metric label="Reputation" value={manufacturer.reputation.reliability.toString()} />
            </div>
          </div>
        ))}
      </div>
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

function NewsTab({ gameState }: { gameState: GameState }) {
  const reports = gameState.monthlyHistory.slice(-12).reverse();
  return (
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <h2 className="text-lg font-semibold">News</h2>
      <div className="mt-4 space-y-3">
        {reports.length === 0 ? (
          <p className="text-sm text-neutral-600">No reports yet.</p>
        ) : (
          reports.map((report) => (
            <div key={report.turn} className="rounded-lg border border-[#d8ddd2] p-4">
              <h3 className="font-semibold">{formatGameDate(report.date)}</h3>
              <p className="mt-1 text-sm text-neutral-700">{report.summary}</p>
              {[...report.researchCompleted, ...report.developmentUpdates, ...report.orders, ...report.deliveries, ...report.competitorActions]
                .slice(0, 5)
                .map((item) => (
                  <p key={item} className="mt-2 text-sm text-neutral-600">{item}</p>
                ))}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SavesTab({
  saveSlots,
  loadSlot,
  deleteSlot,
  manualSave
}: {
  saveSlots: SaveSlotSummary[];
  loadSlot: (slotId: string) => void;
  deleteSlot: (slotId: string) => void;
  manualSave: () => void;
}) {
  return (
    <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Saves</h2>
        <IconButton title="Manual save" icon={Save} label="Save" onClick={manualSave} primary />
      </div>
      <div className="mt-4 grid gap-3">
        {saveSlots.length === 0 ? (
          <p className="text-sm text-neutral-600">No saves yet.</p>
        ) : (
          saveSlots.map((slot) => (
            <div key={slot.slotId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d8ddd2] p-4">
              <div>
                <h3 className="font-semibold">{slot.slotId}</h3>
                <p className="mt-1 text-sm text-neutral-600">{slot.companyName} · {slot.dateLabel}</p>
              </div>
              <div className="flex gap-2">
                <IconButton title="Load save" icon={Play} label="Load" onClick={() => loadSlot(slot.slotId)} />
                <IconButton title="Delete save" icon={Trash2} label="Delete" danger onClick={() => deleteSlot(slot.slotId)} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
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

function labelRole(role: string): string {
  if (role === "factoryWorkers") {
    return "Factory workers";
  }
  if (role === "salesStaff") {
    return "Sales staff";
  }
  return `${role[0]?.toUpperCase() ?? ""}${role.slice(1)}`;
}

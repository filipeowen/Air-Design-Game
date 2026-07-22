"use client";

import {
  AlertTriangle,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Factory,
  FlaskConical,
  Gauge,
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
import { calculateAircraftDesign, createDefaultDesignInput } from "@/game/aircraft/design";
import { canResearchTechnology } from "@/game/research/process";
import {
  assignPlayerProductionLine,
  buildPlayerFactory,
  changeEmployeeHeadcount,
  launchPlayerAircraftProgram,
  startPlayerResearch,
  updatePlayerProgram
} from "@/game/simulation/actions";
import { createNewGame } from "@/game/simulation/createGame";
import { processMonthlyTurn } from "@/game/simulation/processMonthlyTurn";
import type { AircraftCategory, AircraftDesignInput, GameState, MonthlyFinancialReport } from "@/game/types";
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
    createDefaultDesignInput("regional-jet", "Pioneer RJ-70")
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

  const player = gameState ? gameState.manufacturers[gameState.playerCompanyId] : null;
  const lastReport = gameState?.monthlyHistory.at(-1);
  const playerFinancial = lastReport?.financialReports.find((report) => report.manufacturerId === gameState?.playerCompanyId);
  const designPreview = useMemo(() => calculateAircraftDesign(designInput), [designInput]);
  const playerOrders = useMemo(
    () => (gameState && player ? Object.values(gameState.orders).filter((order) => order.manufacturerId === player.id) : []),
    [gameState, player]
  );
  const backlog = playerOrders.reduce((sum, order) => sum + Math.max(0, order.quantity - order.delivered), 0);

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
    setDesignInput(createDefaultDesignInput("regional-jet", "Pioneer RJ-70"));
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
            deliveries={lastReport?.deliveries.length ?? 0}
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
  launch
}: {
  designInput: AircraftDesignInput;
  setDesignInput: (value: AircraftDesignInput) => void;
  designPreview: ReturnType<typeof calculateAircraftDesign>;
  launch: () => void;
}) {
  function update<K extends keyof AircraftDesignInput>(key: K, value: AircraftDesignInput[K]) {
    setDesignInput({ ...designInput, [key]: value });
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
                setDesignInput({ ...createDefaultDesignInput(category, designInput.name), category });
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
          <RangeControl label="Passengers" value={designInput.passengerCapacity} min={40} max={430} step={5} onChange={(value) => update("passengerCapacity", value)} />
          <RangeControl label="Range nm" value={designInput.rangeNm} min={650} max={9000} step={50} onChange={(value) => update("rangeNm", value)} />
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
                <option value="low-bypass-turbofan">Low-bypass turbofan</option>
                <option value="high-bypass-turbofan">High-bypass turbofan</option>
                <option value="advanced-turbofan">Advanced turbofan</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Material
              <select
                value={designInput.structuralMaterial}
                onChange={(event) => update("structuralMaterial", event.target.value as AircraftDesignInput["structuralMaterial"])}
                className="focus-ring mt-1 w-full rounded-md border border-[#d8ddd2] px-3 py-2"
              >
                <option value="classic-aluminum">Classic aluminum</option>
                <option value="improved-aluminum">Improved aluminum</option>
                <option value="early-composite">Early composite</option>
              </select>
            </label>
          </div>
          <RangeControl label="Reliability target" value={designInput.reliabilityTarget} min={50} max={92} step={1} onChange={(value) => update("reliabilityTarget", value)} />
          <RangeControl label="Cabin comfort" value={designInput.cabinComfort} min={30} max={90} step={1} onChange={(value) => update("cabinComfort", value)} />
          <RangeControl label="Commonality" value={designInput.commonality} min={0} max={90} step={1} onChange={(value) => update("commonality", value)} />
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
  const available = Object.values(gameState.technologies).filter((technology) =>
    canResearchTechnology(player, technology, gameState.date.year)
  );
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
        <h2 className="text-lg font-semibold">Active Research</h2>
        <div className="mt-4 space-y-3">
          {player.researchProjects.filter((project) => project.status === "active").length === 0 ? (
            <p className="text-sm text-neutral-600">No active research.</p>
          ) : (
            player.researchProjects
              .filter((project) => project.status === "active")
              .map((project) => {
                const technology = gameState.technologies[project.technologyId]!;
                return (
                  <div key={project.id} className="rounded-lg border border-[#d8ddd2] p-4">
                    <h3 className="font-semibold">{technology.name}</h3>
                    <ProgressBar value={(project.progress / technology.researchPointsRequired) * 100} />
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Metric label="Scientists" value={project.assignedScientists.toLocaleString()} />
                      <Metric label="Budget" value={formatMoney(project.monthlyBudget)} />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </section>
      <section className="rounded-lg border border-[#d8ddd2] bg-white p-5">
        <h2 className="text-lg font-semibold">Technology Tree</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {available.map((technology) => (
            <div key={technology.id} className="rounded-lg border border-[#d8ddd2] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{technology.name}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{technology.area}</p>
                </div>
                <IconButton
                  title="Start research"
                  icon={Plus}
                  label="Start"
                  onClick={() =>
                    mutateGame(
                      (state) => startPlayerResearch(state, technology.id, 160, Math.round(technology.researchCost / 30)),
                      `${technology.name} research started.`
                    )
                  }
                />
              </div>
              <p className="mt-3 text-sm text-neutral-700">{formatMoney(technology.researchCost)} total · {technology.researchPointsRequired} RP</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
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

function ProgressBar({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-3 h-2 overflow-hidden rounded bg-[#e8ece4]">
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
  const length = Math.max(140, Math.min(260, input.fuselageLengthM * 4.2));
  const wing = Math.max(80, Math.min(220, input.wingAreaM2 * 0.65));
  return (
    <div className="flex min-h-28 min-w-64 items-center justify-center rounded-lg border border-[#d8ddd2] bg-[#f8faf6] p-3">
      <svg width="280" height="110" viewBox="0 0 280 110" role="img" aria-label={`${input.name} profile`}>
        <path d={`M${140 - wing / 2} 52 L140 20 L${140 + wing / 2} 52 Z`} fill="#d9b45c" opacity="0.86" />
        <path d={`M${140 - wing / 2 + 16} 62 L140 90 L${140 + wing / 2 - 16} 62 Z`} fill="#9fb4aa" opacity="0.8" />
        <rect x={140 - length / 2} y="48" width={length} height="14" rx="7" fill="#0f766e" />
        <path d={`M${140 + length / 2 - 10} 46 L${140 + length / 2 + 24} 34 L${140 + length / 2 + 14} 56 Z`} fill="#0b5f59" />
        {Array.from({ length: Math.max(4, Math.floor(input.passengerCapacity / 32)) }, (_, index) => (
          <circle key={index} cx={140 - length / 2 + 26 + index * 16} cy="55" r="2" fill="#f6fbfa" />
        ))}
      </svg>
    </div>
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

import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { useColorTheme } from "@/colorThemeProvider";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "@/components/launchMachineProvider";
import { catchError, useApi } from "@/hooks/useApi";
import { useEnvironmentKey } from "@/hooks/useEnvironmentKey";
import { useSessionName } from "@/hooks/useSessionName";
import { DEVICES, type FsCommandMessage } from "@/lib/serverSchemas";
import {
  effectiveServer,
  isLocalServer,
  SIM_SERVER,
  startSimulator,
} from "@/lib/simMode";
import { getLinkStatus, useTelemetryStore } from "@/stores/telemetryStore";
import { useViewPrefsStore } from "@/stores/viewPrefsStore";

import { FiringStationHealth } from "./FiringStationHealth";

/**
 * CSI logo as a one-color stencil (public/csi-logo-mono.png, made from the
 * color favicon): painted with the text color, so it's black in light mode
 * and white in dark mode. The crown is cut out and shows the background.
 */
const LOGO_URL = `${import.meta.env.BASE_URL}csi-logo-mono.png`;
const LOGO_STYLE = {
  backgroundColor: "currentColor",
  WebkitMaskImage: `url("${LOGO_URL}")`,
  maskImage: `url("${LOGO_URL}")`,
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
} as const;

/** navigator.keyboard (Keyboard Lock API) is not in the TS DOM lib yet. */
type NavigatorWithKeyboard = Navigator & {
  keyboard?: {
    lock?: (keys: string[]) => Promise<void>;
    unlock?: () => void;
  };
};

/** Modifier shown in tab shortcut hints: ⌥ on macOS, "Alt+" elsewhere. */
const SHORTCUT_MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌥"
    : "Alt+";

interface Props {
  currentPath: string;
}

const RECALIBRATE_MESSAGES = [
  {
    label: "Recalibrate transducers",
    device: DEVICES.firingStation,
    data: { command: "RECALIBRATE_TRANSDUCERS" } satisfies FsCommandMessage,
  },
  {
    label: "Recalibrate load cell 1",
    device: DEVICES.loadCell1,
    data: "calibrate",
  },
  {
    label: "Recalibrate load cell 2",
    device: DEVICES.loadCell2,
    data: "calibrate",
  },
];

/**
 * In-app confirmation before leaving simulation for live hardware.
 * "Stay in simulation" has focus, so Enter or Esc never goes live by accident.
 */
const ConfirmLiveDialog = memo(function ConfirmLiveDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const stayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    stayRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[60] bg-black/50"
      onMouseDown={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-live-title"
        aria-describedby="confirm-live-body"
        onMouseDown={stopPropagation}
        className="w-full max-w-md p-6 rounded-lg ui-section"
      >
        <h2 id="confirm-live-title" className="mb-2 ui-section-title">
          Switch to live hardware?
        </h2>
        <p id="confirm-live-body" className="mb-5 text-sm text-gray-text-dim">
          The UI will connect to the real firing station (
          <span className="font-mono text-gray-text">
            {effectiveServer(null)}
          </span>
          ). Any command you send after this goes to hardware.
        </p>
        <div className="flex justify-end gap-2">
          <button
            ref={stayRef}
            onClick={onCancel}
            className="h-10 px-4 text-sm font-semibold rounded-lg ui-selected"
          >
            Stay in simulation
          </button>
          <button
            onClick={onConfirm}
            className="h-10 px-4 text-sm font-semibold text-white rounded-lg bg-red-solid hover:bg-red-solid-hover"
          >
            Connect to live hardware
          </button>
        </div>
      </div>
    </div>
  );
});

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const ModeNav = memo(function ModeNav({ currentPath }: Props) {
  const location = useLocation();
  const { isDark, toggleDark } = useColorTheme();
  const oldView = useViewPrefsStore((s) => s.oldView);
  const toggleOldView = useViewPrefsStore((s) => s.toggleOldView);
  const [searchParams] = useSearchParams();
  const serverParam = searchParams.get("server");
  const simOn = isLocalServer(serverParam);
  const [simBusy, setSimBusy] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const lastServerOkMs = useTelemetryStore((state) => state.lastServerOkMs);
  const lastFreshDataMs = useTelemetryStore((state) => state.lastFreshDataMs);
  // re-evaluate once a second so the badge drops when updates stop arriving
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const linkStatus = getLinkStatus(lastServerOkMs, lastFreshDataMs, now);
  const { environmentKey } = useParams<{ environmentKey: string }>();
  const launchActorRef = useLaunchMachineActorRef();
  const api = useApi();
  const envKey = useEnvironmentKey();
  const sessionName = useSessionName();

  const [healthOpen, setHealthOpen] = useState(false);
  const [utilsOpen, setUtilsOpen] = useState(false);

  const openHealth = useCallback(() => {
    setUtilsOpen(false);
    setHealthOpen(true);
  }, []);
  const closeHealth = useCallback(() => setHealthOpen(false), []);
  const toggleUtils = useCallback(() => setUtilsOpen((prev) => !prev), []);
  const closeUtils = useCallback(() => setUtilsOpen(false), []);

  const msSinceBoot = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data.ms_since_boot ?? null,
  );
  const uptimeSeconds =
    msSinceBoot !== null ? Math.floor(msSinceBoot / 1000) : null;

  const pilotPressure = useTelemetryStore(
    (state) => state.buffers.get("pilot_pres_psi")?.getLatest()?.value ?? null,
  );

  const copv1Pressure = useTelemetryStore(
    (state) => state.buffers.get("copv_1_psi")?.getLatest()?.value ?? null,
  );

  const copv2Pressure = useTelemetryStore(
    (state) => state.buffers.get("copv_2_psi")?.getLatest()?.value ?? null,
  );

  const pilotHigh = pilotPressure !== null && pilotPressure > 460;
  const copv1High = copv1Pressure !== null && copv1Pressure > 4400;
  const copv2High = copv2Pressure !== null && copv2Pressure > 4400;
  const anyWarning = pilotHigh || copv1High || copv2High;

  const canSend = useLaunchMachineSelector((state) =>
    state.can({ type: "SEND_MANUAL_MESSAGES", messages: [] }),
  );

  const usingCustomSession = sessionName != null;

  const handleRecalibrateAll = useCallback(() => {
    if (!canSend) return;
    launchActorRef.send({
      type: "SEND_MANUAL_MESSAGES",
      messages: RECALIBRATE_MESSAGES.map((m) => ({
        device: m.device,
        data: m.data,
      })),
    });
    setUtilsOpen(false);
  }, [launchActorRef, canSend]);

  const handleRestart = useCallback(() => {
    if (!canSend) return;
    launchActorRef.send({
      type: "SEND_MANUAL_MESSAGES",
      messages: [
        { device: DEVICES.firingStation, data: { command: "RESTART" } },
      ],
    });
    setUtilsOpen(false);
  }, [launchActorRef, canSend]);

  const handleNewSession = useCallback(() => {
    if (usingCustomSession) return;
    catchError(api.sessions.create.post({ environmentKey: envKey }));
    setUtilsOpen(false);
  }, [api, envKey, usingCustomSession]);

  // Switching servers reloads the page so no state from the old server
  // (launch machine, telemetry buffers) leaks into the new one.
  const goToServer = useCallback((server: string | null) => {
    const url = new URL(window.location.href);
    if (server) url.searchParams.set("server", server);
    else url.searchParams.delete("server");
    window.location.assign(url.toString());
  }, []);

  const [confirmLiveOpen, setConfirmLiveOpen] = useState(false);
  const cancelLive = useCallback(() => setConfirmLiveOpen(false), []);
  const confirmLive = useCallback(() => {
    setConfirmLiveOpen(false);
    goToServer(null);
  }, [goToServer]);

  const toggleSim = useCallback(async () => {
    setSimError(null);
    if (simOn) {
      // ask in-app before connecting to live hardware
      setConfirmLiveOpen(true);
      setUtilsOpen(false);
      return;
    }
    setSimBusy(true);
    const error = await startSimulator();
    setSimBusy(false);
    if (error) {
      setSimError(error);
      return;
    }
    goToServer(SIM_SERVER);
  }, [simOn, goToServer]);

  const isControl = currentPath.includes("/control");
  const isData = currentPath.includes("/data");
  const isPid = currentPath.endsWith("/pid");

  // Option/Alt + 1/2/3 switches tabs. Match e.code (physical key): on macOS
  // Option+1 types "¡", so e.key isn't "1".
  // Full screen (browser Fullscreen API). Synced with the browser so Esc,
  // or exiting another way, flips the switch back.
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== "undefined" && !!document.fullscreenElement,
  );
  useEffect(() => {
    const onChange = () => {
      const on = !!document.fullscreenElement;
      setIsFullscreen(on);
      // Keyboard Lock (Chrome/Edge): in full screen, a short Esc press goes
      // to the page instead of exiting, so in-app dialogs can use it first.
      // Holding Esc still exits. No-op where unsupported (Safari, Firefox).
      const kb = (navigator as NavigatorWithKeyboard).keyboard;
      if (on) void kb?.lock?.(["Escape"]).catch(() => undefined);
      else kb?.unlock?.();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => {
        // blocked (e.g. not triggered by a user action); nothing to do
      });
    }
  }, []);
  // Esc in full screen (with Keyboard Lock the page receives it): close the
  // live-hardware warning first (its own handler does that), let text fields
  // use Esc, otherwise exit full screen as the browser normally would.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !document.fullscreenElement) return;
      if (confirmLiveOpen) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      ) {
        return;
      }
      void document.exitFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmLiveOpen]);

  // Gear-menu shortcuts (Option/Alt + key). Matched by e.code, since on
  // macOS Option+letter types a symbol (Option+F = "ƒ"). Each action keeps
  // its own guards: Restart only when commands can be sent, turning
  // Simulation off still asks before connecting to live hardware.
  useEffect(() => {
    const actions: Record<string, () => void> = {
      KeyF: toggleFullscreen,
      KeyS: () => void toggleSim(),
      KeyR: handleRestart,
      KeyN: handleNewSession,
      KeyD: toggleDark,
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const action = actions[e.code];
      if (!action) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      ) {
        return;
      }
      e.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    toggleFullscreen,
    toggleSim,
    handleRestart,
    handleNewSession,
    toggleDark,
  ]);

  const navigate = useNavigate();
  useEffect(() => {
    const tabs: Record<string, string> = {
      Digit1: "control",
      Digit2: "pid",
      Digit3: "data",
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const tab = tabs[e.code];
      if (!tab) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      e.preventDefault();
      navigate(`/${environmentKey}/${tab}${location.search}`);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, environmentKey, location.search]);

  return (
    <nav className="bg-gray-bg-1">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Link
            to={`/${environmentKey}/control${location.search}`}
            className="inline-flex items-center font-normal gap-3 text-[32px] leading-[37px] tracking-[-0.64px] text-gray-text hover:opacity-80"
          >
            {/* 40px tile, same height and rounding as the header pills; black/white
                (inverted in dark mode) with the logo in the opposite color */}
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-md shrink-0 ui-selected">
              <span aria-hidden className="w-8 h-8" style={LOGO_STYLE} />
            </span>
            Rocket Control Center
          </Link>

          {/* Connection status: server reachable AND firing station sending new data */}
          <div
            title={
              linkStatus === "noData"
                ? "Server is reachable but no new data from the firing station in the last 3 s"
                : linkStatus === "disconnected"
                  ? "No successful response from the data server in the last 3 s"
                  : "Server reachable, firing station data is fresh"
            }
            className={`ml-4 flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium whitespace-nowrap ${
              linkStatus === "connected"
                ? "bg-green-bg text-green-text"
                : linkStatus === "noData"
                  ? "bg-yellow-bg text-yellow-text"
                  : "bg-red-bg text-red-text"
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                linkStatus === "connected"
                  ? "bg-green-solid animate-pulse"
                  : linkStatus === "noData"
                    ? "bg-yellow-solid"
                    : "bg-red-solid"
              }`}
            />
            {linkStatus === "connected"
              ? "CONNECTED"
              : linkStatus === "noData"
                ? "NO DATA"
                : "DISCONNECTED"}
          </div>

          {/* Which server we're driving: simulator or real hardware */}
          <div
            title={effectiveServer(serverParam)}
            className={`inline-flex items-center h-10 px-4 text-sm font-semibold rounded-md whitespace-nowrap ${
              simOn ? "bg-blue-bg text-blue-text" : "bg-red-bg text-red-text"
            }`}
          >
            {simOn ? "SIMULATION" : "LIVE HARDWARE"}
          </div>

          <div className="inline-flex items-center h-10 px-4 text-sm font-medium rounded-md bg-gray-el-bg text-gray-text-dim tabular-nums whitespace-nowrap">
            FS UPTIME: {uptimeSeconds !== null ? `${uptimeSeconds}s` : "—"}
          </div>

          {/* Pressure warnings */}
          {anyWarning && (
            <div className="flex items-center h-10 px-4 text-sm border-2 rounded-md bg-yellow-bg text-yellow-text border-yellow-solid gap-2">
              <span>⚠</span>
              <span className="font-semibold">
                PRESSURE{" "}
                {[
                  pilotHigh && "PILOT",
                  copv1High && "COPV1",
                  copv2High && "COPV2",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/${environmentKey}/control${location.search}`}
            className={`inline-flex items-center px-6 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              isControl
                ? "ui-selected "
                : "bg-gray-el-bg text-gray-text hover:bg-gray-el-bg-hover"
            }`}
            title={`Shortcut: ${SHORTCUT_MOD}1`}
          >
            CONTROL
            <kbd className="ml-2 font-sans text-xs font-medium leading-none opacity-60">
              {SHORTCUT_MOD}1
            </kbd>
          </Link>
          <Link
            to={`/${environmentKey}/pid${location.search}`}
            className={`inline-flex items-center px-6 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              isPid
                ? "ui-selected "
                : "bg-gray-el-bg text-gray-text hover:bg-gray-el-bg-hover"
            }`}
            title={`Shortcut: ${SHORTCUT_MOD}2`}
          >
            P&amp;ID
            <kbd className="ml-2 font-sans text-xs font-medium leading-none opacity-60">
              {SHORTCUT_MOD}2
            </kbd>
          </Link>
          <Link
            to={`/${environmentKey}/data${location.search}`}
            className={`inline-flex items-center px-6 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              isData
                ? "ui-selected "
                : "bg-gray-el-bg text-gray-text hover:bg-gray-el-bg-hover"
            }`}
            title={`Shortcut: ${SHORTCUT_MOD}3`}
          >
            DATA DISPLAY
            <kbd className="ml-2 font-sans text-xs font-medium leading-none opacity-60">
              {SHORTCUT_MOD}3
            </kbd>
          </Link>

          {/* Utilities Dropdown */}
          <div className="relative">
            <button
              onClick={toggleUtils}
              aria-label="Settings"
              aria-expanded={utilsOpen}
              // keeps the hover color while the menu is open
              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-text hover:bg-gray-el-bg-hover ${
                utilsOpen ? "bg-gray-el-bg-hover" : "bg-gray-el-bg"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            {utilsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeUtils} />
                <div className="absolute right-0 z-50 w-64 p-3 mt-2 rounded-lg ui-section">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={openHealth}
                      className="px-3 py-2 text-sm font-medium text-left rounded-lg ui-selected hover:opacity-90"
                    >
                      FS health
                    </button>
                    <button
                      onClick={handleRecalibrateAll}
                      disabled={!canSend}
                      className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                        canSend
                          ? "ui-selected hover:opacity-90"
                          : "bg-gray-el-bg text-gray-text-dim cursor-not-allowed"
                      }`}
                    >
                      Recalibrate all
                    </button>
                    <button
                      onClick={handleRestart}
                      disabled={!canSend}
                      className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                        canSend
                          ? "bg-red-solid hover:bg-red-solid-hover text-white"
                          : "bg-gray-el-bg text-gray-text-dim cursor-not-allowed"
                      }`}
                    >
                      Restart
                      <kbd className="ml-2 font-sans text-xs leading-none opacity-70">
                        {SHORTCUT_MOD}R
                      </kbd>
                    </button>
                    <button
                      onClick={handleNewSession}
                      disabled={usingCustomSession}
                      className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                        !usingCustomSession
                          ? "bg-green-solid hover:bg-green-solid-hover text-white"
                          : "bg-gray-el-bg text-gray-text-dim cursor-not-allowed"
                      }`}
                    >
                      New session
                      <kbd className="ml-2 font-sans text-xs leading-none opacity-70">
                        {SHORTCUT_MOD}N
                      </kbd>
                    </button>
                    <button
                      onClick={toggleSim}
                      disabled={simBusy}
                      role="switch"
                      aria-checked={simOn}
                      className="flex items-center justify-between px-3 py-2 text-sm font-medium text-left rounded-lg bg-gray-bg-2 hover:bg-gray-el-bg-hover text-gray-text transition-all disabled:opacity-60"
                    >
                      <span className="flex items-center gap-2">
                        {simBusy ? "Starting simulator…" : "Simulation mode"}
                        <kbd className="font-sans text-xs leading-none text-gray-text-dim">
                          {SHORTCUT_MOD}S
                        </kbd>
                      </span>
                      <span
                        className={`relative w-9 h-5 rounded-md ${
                          simOn ? "ui-dot-on" : "bg-gray-border-hover"
                        }`}
                      >
                        <span
                          className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded bg-white ${
                            simOn ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                    </button>
                    {simError && (
                      <p className="px-1 text-xs text-red-text">{simError}</p>
                    )}
                    <button
                      onClick={toggleOldView}
                      role="switch"
                      aria-checked={oldView}
                      title="Show Electronics regulator, Solenoid timers and Command center on the Control page"
                      className="flex items-center justify-between px-3 py-2 text-sm font-medium text-left rounded-lg bg-gray-bg-2 hover:bg-gray-el-bg-hover text-gray-text transition-all"
                    >
                      Old view
                      <span
                        className={`relative w-9 h-5 rounded-md ${
                          oldView ? "ui-dot-on" : "bg-gray-border-hover"
                        }`}
                      >
                        <span
                          className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded bg-white ${
                            oldView ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                    </button>
                    <button
                      onClick={toggleDark}
                      role="switch"
                      aria-checked={isDark}
                      className="flex items-center justify-between px-3 py-2 text-sm font-medium text-left rounded-lg bg-gray-bg-2 hover:bg-gray-el-bg-hover text-gray-text transition-all"
                    >
                      <span className="flex items-center gap-2">
                        Dark mode
                        <kbd className="font-sans text-xs leading-none text-gray-text-dim">
                          {SHORTCUT_MOD}D
                        </kbd>
                      </span>
                      <span
                        className={`relative w-9 h-5 rounded-md ${
                          isDark ? "ui-dot-on" : "bg-gray-border-hover"
                        }`}
                      >
                        <span
                          className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded bg-white ${
                            isDark ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      role="switch"
                      aria-checked={isFullscreen}
                      title={`Shortcut: ${SHORTCUT_MOD}F · Esc to exit`}
                      className="flex items-center justify-between px-3 py-2 text-sm font-medium text-left rounded-lg bg-gray-bg-2 hover:bg-gray-el-bg-hover text-gray-text"
                    >
                      <span className="flex items-center gap-2">
                        Full screen
                        <kbd className="font-sans text-xs leading-none text-gray-text-dim">
                          {SHORTCUT_MOD}F
                        </kbd>
                      </span>
                      <span
                        className={`relative w-9 h-5 rounded-md ${
                          isFullscreen ? "ui-dot-on" : "bg-gray-border-hover"
                        }`}
                      >
                        <span
                          className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded bg-white ${
                            isFullscreen ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {healthOpen && <FiringStationHealth onClose={closeHealth} />}
      {confirmLiveOpen && (
        <ConfirmLiveDialog onCancel={cancelLive} onConfirm={confirmLive} />
      )}
    </nav>
  );
});

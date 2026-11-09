/* eslint-disable react-perf/jsx-no-new-function-as-prop */
import { memo, useCallback, useState } from "react";

import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "@/components/launchMachineProvider";
import { DEVICES } from "@/lib/serverSchemas";
import { fsStateToCommand } from "@/lib/serverSchemaUtils";
import { useViewPrefsStore } from "@/stores/viewPrefsStore";

const FIRING_CHECKS = [
  { key: "calibration", label: "Calibration" },
  { key: "operation", label: "Operation" },
  { key: "fire", label: "Fire" },
] as const;

type FiringCheckKey = (typeof FIRING_CHECKS)[number]["key"];

const RELAYS = [
  { key: "gn2_drain", label: "GN2 Drain" },
  { key: "gn2_fill", label: "GN2 Fill" },
  { key: "lox_fill", label: "LOX Fill" },
  { key: "lox_disconnect", label: "LOX Disconnect" },
  { key: "depress", label: "Depress" },
] as const;

const FIRING_RELAYS = [
  { key: "press_pilot", label: "Press Pilot" },
  { key: "run", label: "Run" },
  { key: "igniter", label: "Igniter" },
  { key: "igniter_backup", label: "Igniter Backup" },
] as const;

type RelayKey =
  | (typeof RELAYS)[number]["key"]
  | (typeof FIRING_RELAYS)[number]["key"];

/** Station state commands (moved here from Command center for the new view). */
const STATE_BUTTONS = [
  { command: "STATE_STANDBY", label: "Idle Standby" },
  { command: "STATE_GN2_STANDBY", label: "GN2 Standby" },
  { command: "STATE_GN2_FILL", label: "GN2 Fill" },
] as const;

const StateButton = memo(function StateButton({
  command,
  label,
}: (typeof STATE_BUTTONS)[number]) {
  const actorRef = useLaunchMachineActorRef();
  const isActive = useLaunchMachineSelector((state) => {
    const fsState = state.context.deviceStates.fsState?.data.state;
    return !!fsState && fsStateToCommand(fsState) === command;
  });
  const canSend = useLaunchMachineSelector((state) =>
    state.can({ type: "SEND_FS_COMMAND", value: { command } }),
  );

  return (
    <button
      onClick={() =>
        actorRef.send({ type: "SEND_FS_COMMAND", value: { command } })
      }
      disabled={!canSend}
      className={[
        "rounded-card border-2 transition-all flex flex-col items-center justify-center p-2",
        isActive
          ? "ui-active"
          : "bg-gray-bg-2 border-transparent text-gray-text",
        !canSend && !isActive
          ? "cursor-not-allowed opacity-50"
          : isActive
            ? "cursor-default"
            : "cursor-pointer hover:bg-gray-el-bg-hover",
      ].join(" ")}
    >
      <div className="text-sm font-semibold leading-tight text-center">
        {label}
      </div>
    </button>
  );
});

export const RelayControlPanel = memo(function RelayControlPanel() {
  const actorRef = useLaunchMachineActorRef();

  const relayStates = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data,
  );

  const fsState = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data.state,
  );

  const isEnginePrime = fsState === "ENGINE_PRIME";
  const isFire = fsState === "FIRE";

  const handleToggle = useCallback(
    (relayKey: RelayKey) => {
      if (!relayStates) return;

      const command = {
        command: "STATE_CUSTOM" as const,
        gn2_drain:
          relayKey === "gn2_drain"
            ? !relayStates.gn2_drain
            : relayStates.gn2_drain,
        gn2_fill:
          relayKey === "gn2_fill"
            ? !relayStates.gn2_fill
            : relayStates.gn2_fill,
        lox_fill:
          relayKey === "lox_fill"
            ? !relayStates.lox_fill
            : relayStates.lox_fill,
        lox_disconnect:
          relayKey === "lox_disconnect"
            ? !relayStates.lox_disconnect
            : relayStates.lox_disconnect,
        depress:
          relayKey === "depress" ? !relayStates.depress : relayStates.depress,
        press_pilot:
          relayKey === "press_pilot"
            ? !relayStates.press_pilot
            : relayStates.press_pilot,
        run: relayKey === "run" ? !relayStates.run : relayStates.run,
        igniter:
          relayKey === "igniter" ? !relayStates.igniter : relayStates.igniter,
        igniter_backup:
          relayKey === "igniter_backup"
            ? !relayStates.igniter_backup
            : relayStates.igniter_backup,
      };

      actorRef.send({
        type: "SEND_MANUAL_MESSAGES",
        messages: [
          {
            device: DEVICES.firingStation,
            data: command,
          },
        ],
      });
    },
    [actorRef, relayStates],
  );

  const handleFsCommand = useCallback(
    (command: "STATE_ENGINE_PRIME" | "STATE_FIRE" | "STATE_ABORT") => {
      actorRef.send({
        type: "SEND_FS_COMMAND",
        value: { command },
      });
    },
    [actorRef],
  );

  const canSend = useLaunchMachineSelector((state) =>
    state.can({ type: "SEND_MANUAL_MESSAGES", messages: [] }),
  );

  const canSendFsCommand = useLaunchMachineSelector((state) =>
    state.can({
      type: "SEND_FS_COMMAND",
      value: { command: "STATE_FIRE" },
    }),
  );

  const [checks, setChecks] = useState<Record<FiringCheckKey, boolean>>({
    calibration: false,
    operation: false,
    fire: false,
  });

  const allChecked = Object.values(checks).every(Boolean);
  const oldView = useViewPrefsStore((s) => s.oldView);

  const handleCheck = useCallback((key: FiringCheckKey) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const renderRelayButton = (relay: { key: RelayKey; label: string }) => {
    const isOn = relayStates?.[relay.key] ?? false;
    const canToggle = canSend && relayStates !== undefined;

    return (
      <button
        key={relay.key}
        onClick={() => handleToggle(relay.key)}
        disabled={!canToggle}
        className={[
          "rounded-card border-2 transition-all flex flex-col items-center justify-center p-1.5",
          isOn ? "ui-active" : "bg-gray-bg-2 border-transparent text-gray-text",
          !canToggle
            ? // keep open valves at full color so their state stays readable
              `cursor-not-allowed ${isOn ? "" : "opacity-50"}`
            : isOn
              ? "cursor-pointer"
              : "cursor-pointer hover:bg-gray-el-bg-hover",
        ].join(" ")}
      >
        <div
          className={`w-3 h-3 rounded-full mb-1 ${
            isOn ? "ui-dot-on" : "bg-red-solid"
          }`}
        />
        <div className="font-semibold leading-tight text-center text-[13px]">
          {relay.label}
        </div>
        <div className="font-medium text-[13px] opacity-70">
          {isOn ? "OPEN" : "CLOSED"}
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-row h-full gap-2">
      <div
        className="flex flex-col p-4 ui-section"
        style={{ flexBasis: "40%", flexShrink: 0 }}
      >
        <h2 className="mb-3 ui-section-title">Manual relay control</h2>
        <div className="flex-1 grid grid-cols-5 grid-rows-1 gap-2">
          {RELAYS.map((relay) => renderRelayButton(relay))}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-4 ui-section">
        <h2 className="mb-3 ui-section-title">Firing control</h2>

        <div className="flex flex-col flex-1 gap-2">
          {/* same columns as the action row below, so edges line up:
              arming = 2 of 6 columns, relays = 4 of 6 (old view: 1 / 2 of 3) */}
          <div
            className={`grid flex-1 gap-2 min-h-[150px] ${oldView ? "grid-cols-3" : "grid-cols-6"}`}
          >
            {/* Arming: all three on = ARMED, which unlocks the firing relays */}
            <div
              className={`flex flex-col justify-between p-1.5 bg-gray-bg-2 rounded-card ${oldView ? "col-span-1" : "col-span-2"}`}
            >
              <div className="flex items-center px-2 pt-1 gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    allChecked ? "ui-dot-on" : "bg-red-solid"
                  }`}
                />
                <span
                  className={`text-xs font-bold tracking-widest ${
                    allChecked ? "text-gray-text" : "text-gray-text-dim"
                  }`}
                >
                  {allChecked ? "ARMED" : "SAFE"}
                </span>
              </div>
              {FIRING_CHECKS.map((check) => {
                const on = checks[check.key];
                return (
                  <button
                    key={check.key}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => handleCheck(check.key)}
                    className="flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md text-gray-text hover:bg-gray-el-bg-hover"
                  >
                    {check.label}
                    <span
                      className={`relative w-9 h-5 rounded-md ${
                        on ? "ui-dot-on" : "bg-gray-border-hover"
                      }`}
                    >
                      <span
                        className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded bg-white ${
                          on ? "translate-x-4" : ""
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              className={`grid grid-cols-2 grid-rows-2 gap-2 ${oldView ? "col-span-2" : "col-span-4"}`}
            >
              {FIRING_RELAYS.map((relay) => {
                const isOn = relayStates?.[relay.key] ?? false;
                const canToggle =
                  canSend && relayStates !== undefined && allChecked;

                return (
                  <button
                    key={relay.key}
                    onClick={() => handleToggle(relay.key)}
                    disabled={!canToggle}
                    className={[
                      "rounded-card border-2 transition-all flex flex-col items-center justify-center p-1.5",
                      isOn
                        ? "ui-active"
                        : "bg-gray-bg-2 border-transparent text-gray-text",
                      !canToggle
                        ? `cursor-not-allowed ${isOn ? "" : "opacity-50"}`
                        : isOn
                          ? "cursor-pointer"
                          : "cursor-pointer hover:bg-gray-el-bg-hover",
                    ].join(" ")}
                  >
                    <div
                      className={`w-3 h-3 rounded-full mb-1 ${
                        isOn ? "ui-dot-on" : "bg-red-solid"
                      }`}
                    />
                    <div className="font-semibold leading-tight text-center text-[13px]">
                      {relay.label}
                    </div>
                    <div className="font-medium text-[13px] opacity-70">
                      {isOn ? "OPEN" : "CLOSED"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`grid gap-2 auto-rows-[44px] ${oldView ? "grid-cols-3" : "grid-cols-6"}`}
          >
            {/* In the old view these live in Command center instead */}
            {!oldView &&
              STATE_BUTTONS.map((b) => <StateButton key={b.command} {...b} />)}
            <button
              onClick={() => handleFsCommand("STATE_ENGINE_PRIME")}
              disabled={!canSendFsCommand || !allChecked}
              className={[
                "rounded-card border-2 transition-all flex flex-col items-center justify-center p-2",
                "bg-gray-bg-2 border-transparent text-gray-text",
                !canSendFsCommand || !allChecked
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-gray-el-bg-hover",
              ].join(" ")}
            >
              <div className="text-sm font-semibold leading-tight text-center">
                Engine Prime
              </div>
            </button>

            <button
              onClick={() => handleFsCommand("STATE_FIRE")}
              disabled={!isEnginePrime && (!canSendFsCommand || !allChecked)}
              className={[
                "rounded-card border-2 transition-all flex flex-col items-center justify-center p-2",
                "bg-gray-bg-2 border-transparent text-gray-text",
                !isEnginePrime && (!canSendFsCommand || !allChecked)
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-gray-el-bg-hover",
              ].join(" ")}
            >
              <div className="text-sm font-semibold leading-tight text-center">
                Fire
              </div>
            </button>

            <button
              onClick={() => handleFsCommand("STATE_ABORT")}
              disabled={!canSendFsCommand && !isEnginePrime && !isFire}
              className={[
                "rounded-card border-2 transition-all flex flex-col items-center justify-center p-2",
                "bg-gray-bg-2 border-transparent text-gray-text",
                !canSendFsCommand && !isEnginePrime && !isFire
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-gray-el-bg-hover",
              ].join(" ")}
            >
              <div className="text-sm font-semibold leading-tight text-center">
                Abort
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

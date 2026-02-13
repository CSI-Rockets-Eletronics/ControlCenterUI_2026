import { memo, useCallback } from "react";

import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "@/components/launchMachineProvider";

type EregCommand = "EREG_CLOSED" | "EREG_STAGE_1" | "EREG_STAGE_2";

interface StageConfig {
  command: EregCommand;
  activeField: "ereg_closed" | "ereg_stage_1" | "ereg_stage_2";
  name: string;
  description: string;
  color: "blue" | "green" | "red";
}

const STAGE_CONFIGS: StageConfig[] = [
  {
    command: "EREG_STAGE_1",
    activeField: "ereg_stage_1",
    name: "STAGE 1",
    description: "Slow fill to 450 PSI, run valve closed",
    color: "blue",
  },
  {
    command: "EREG_STAGE_2",
    activeField: "ereg_stage_2",
    name: "STAGE 2",
    description: "PID-controlled operation for launch",
    color: "green",
  },
  {
    command: "EREG_CLOSED",
    activeField: "ereg_closed",
    name: "CLOSE",
    description: "Close I-port valve",
    color: "red",
  },
];

const COLORS = {
  blue: {
    active: "bg-blue-solid text-white shadow-lg ring-2 ring-blue-border",
    inactive: "bg-gray-el-bg hover:bg-gray-el-bg-hover text-gray-text",
    dot: "bg-blue-solid",
    text: "#228be6",
  },
  green: {
    active: "bg-green-solid text-white shadow-lg ring-2 ring-green-border",
    inactive: "bg-gray-el-bg hover:bg-gray-el-bg-hover text-gray-text",
    dot: "bg-green-solid",
    text: "#37b24d",
  },
  red: {
    active: "bg-red-solid text-white shadow-lg ring-2 ring-red-border",
    inactive: "bg-gray-el-bg hover:bg-gray-el-bg-hover text-gray-text",
    dot: "bg-red-solid",
    text: "#f03e3e",
  },
};

interface StageButtonProps {
  stage: StageConfig;
  isActive: boolean;
  canSend: boolean;
  onCommand: (command: EregCommand) => void;
}

const StageButton = memo(function StageButton({
  stage,
  isActive,
  canSend,
  onCommand,
}: StageButtonProps) {
  const handleClick = useCallback(() => {
    onCommand(stage.command);
  }, [stage.command, onCommand]);

  const colors = COLORS[stage.color];

  return (
    <button
      onClick={handleClick}
      disabled={!canSend || isActive}
      className={`p-6 rounded-xl transition-all text-left ${
        isActive ? colors.active : colors.inactive
      } ${!canSend || isActive ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <div className="flex items-center mb-2 gap-2">
        <div
          className={`w-3 h-3 rounded-full ${isActive ? "bg-white animate-pulse" : "bg-gray-solid"}`}
        />
        <div className="text-lg font-bold">{stage.name}</div>
      </div>
      <div className="text-sm opacity-80">{stage.description}</div>
    </button>
  );
});

export const ElectronicsRegulator = memo(function ElectronicsRegulator() {
  const launchActorRef = useLaunchMachineActorRef();
  const eregData = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsLoxGn2Transducers?.data ?? null,
  );

  const eregPowerOn = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data.ereg_power ?? false,
  );

  const eregPowerMa = useLaunchMachineSelector(
    (state) =>
      state.context.deviceStates.relayCurrentMonitor?.data.ereg_power_ma ??
      null,
  );

  const canSendStage1 = useLaunchMachineSelector((state) =>
    state.can({ type: "SEND_FS_COMMAND", value: { command: "EREG_STAGE_1" } }),
  );
  const canSendStage2 = useLaunchMachineSelector((state) =>
    state.can({ type: "SEND_FS_COMMAND", value: { command: "EREG_STAGE_2" } }),
  );
  const canSendClosed = useLaunchMachineSelector((state) =>
    state.can({ type: "SEND_FS_COMMAND", value: { command: "EREG_CLOSED" } }),
  );

  const canSendMap: Record<EregCommand, boolean> = {
    EREG_STAGE_1: canSendStage1,
    EREG_STAGE_2: canSendStage2,
    EREG_CLOSED: canSendClosed,
  };

  const sendCommand = useCallback(
    (command: EregCommand) => {
      launchActorRef.send({ type: "SEND_FS_COMMAND", value: { command } });
    },
    [launchActorRef],
  );

  const activeStage = STAGE_CONFIGS.find(
    (s) => eregData?.[s.activeField] ?? false,
  );

  return (
    <div className="flex flex-col h-full p-6 border bg-gray-bg-1 rounded-xl border-gray-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-text">
          ELECTRONICS REGULATOR
        </h2>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-text-dim">PWR</span>
          <div
            className={`w-2.5 h-2.5 rounded-full ${eregPowerOn ? "bg-green-solid" : "bg-gray-solid"}`}
          />
          {eregPowerMa !== null && (
            <span className="text-xs text-gray-text-dim tabular-nums">
              {(eregPowerMa / 1000).toFixed(2)}A
            </span>
          )}
        </div>
      </div>

      <div className="p-4 mb-6 border rounded-lg bg-gray-el-bg border-gray-border">
        <div className="mb-2 text-xs text-gray-text-dim">CURRENT STATE</div>
        {eregData ? (
          <div
            className="text-2xl font-bold"
            style={{
              color: activeStage ? COLORS[activeStage.color].text : undefined,
            }}
          >
            {activeStage?.name ?? "UNKNOWN"}
          </div>
        ) : (
          <div className="text-sm text-yellow-text animate-pulse">
            Waiting for data...
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-rows-3 gap-4">
        {STAGE_CONFIGS.map((stage) => {
          const isActive = eregData?.[stage.activeField] ?? false;
          const canSend = canSendMap[stage.command];

          return (
            <StageButton
              key={stage.command}
              stage={stage}
              isActive={isActive}
              canSend={canSend}
              onCommand={sendCommand}
            />
          );
        })}
      </div>

      {!canSendStage1 && !canSendStage2 && !canSendClosed && (
        <div className="p-3 mt-4 text-xs border rounded-lg bg-red-bg border-red-border text-red-text">
          ⚠ Cannot send commands — check system state
        </div>
      )}
    </div>
  );
});

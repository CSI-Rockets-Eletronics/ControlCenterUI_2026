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
    name: "Stage 1",
    description: "Slow fill to 450 PSI",
    color: "blue",
  },
  {
    command: "EREG_STAGE_2",
    activeField: "ereg_stage_2",
    name: "Stage 2",
    description: "PID-controlled, launch",
    color: "green",
  },
  {
    command: "EREG_CLOSED",
    activeField: "ereg_closed",
    name: "Close",
    description: "Close I-port valve",
    color: "red",
  },
];

const COLORS = {
  blue: {
    active: "bg-blue-solid text-white ring-2 ring-blue-border",
    inactive: "bg-gray-el-bg hover:bg-gray-el-bg-hover text-gray-text",
    dot: "bg-blue-solid",
    text: "#228be6",
  },
  green: {
    active: "bg-green-solid text-white ring-2 ring-green-border",
    inactive: "bg-gray-el-bg hover:bg-gray-el-bg-hover text-gray-text",
    dot: "bg-green-solid",
    text: "#37b24d",
  },
  red: {
    active: "bg-red-solid text-white ring-2 ring-red-border",
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
      className={`px-3 py-2 rounded-lg transition-all text-left flex items-center gap-3 ${
        isActive ? colors.active : colors.inactive
      } ${!canSend || isActive ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <div
        className={`shrink-0 w-2 h-2 rounded-full ${isActive ? "bg-gray-bg-1 animate-pulse" : "bg-gray-solid"}`}
      />
      <div className="flex flex-col">
        <span className="text-sm font-semibold leading-tight">
          {stage.name}
        </span>
        <span className="text-xs leading-tight opacity-70">
          {stage.description}
        </span>
      </div>
    </button>
  );
});

export const ElectronicsRegulator = memo(function ElectronicsRegulator() {
  const launchActorRef = useLaunchMachineActorRef();

  const eregData = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsLoxGn2Transducers?.data ?? null,
  );

  const canSendStage1 = useLaunchMachineSelector((state) =>
    state.can({ type: "SEND_FS_COMMAND", value: { command: "EREG_STAGE_1" } }),
  );
  const canSendStage2 = useLaunchMachineSelector((state) =>
    state.can({ type: "SEND_FS_COMMAND", value: { command: "EREG_STAGE_2" } }),
  );

  const fsStateExists = useLaunchMachineSelector(
    (state) => !!state.context.deviceStates.fsState,
  );

  const isEregClosed = eregData?.ereg_closed ?? false;
  const canWrite = canSendStage1 || canSendStage2;
  const canSendClosed = canWrite && fsStateExists && !isEregClosed;

  const canSendMap: Record<EregCommand, boolean> = {
    EREG_STAGE_1: canSendStage1,
    EREG_STAGE_2: canSendStage2,
    EREG_CLOSED: canSendClosed,
  };

  const sendCommand = useCallback(
    (command: EregCommand) => {
      launchActorRef.send({ type: "SEND_FS_COMMAND", value: { command } });
      if (command === "EREG_CLOSED") {
        setTimeout(() => {
          launchActorRef.send({ type: "SEND_FS_COMMAND", value: { command } });
        }, 200);
      }
    },
    [launchActorRef],
  );

  const activeStage = STAGE_CONFIGS.find(
    (s) => eregData?.[s.activeField] ?? false,
  );

  return (
    <div className="flex flex-col p-4 ui-section gap-3">
      <p className="ui-section-title">Electronics regulator</p>

      <div className="flex items-center justify-between px-3 py-2 ui-tile">
        <span className="text-xs text-gray-text-dim">Current state</span>
        {eregData ? (
          <span
            className="text-sm font-bold"
            style={{
              color: activeStage ? COLORS[activeStage.color].text : undefined,
            }}
          >
            {activeStage?.name ?? "Unknown"}
          </span>
        ) : (
          <span className="text-xs text-yellow-text animate-pulse">
            Waiting...
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {STAGE_CONFIGS.map((stage) => (
          <StageButton
            key={stage.command}
            stage={stage}
            isActive={eregData?.[stage.activeField] ?? false}
            canSend={canSendMap[stage.command]}
            onCommand={sendCommand}
          />
        ))}
      </div>

      {!canSendStage1 && !canSendStage2 && !fsStateExists && (
        <div className="px-3 py-2 text-xs border rounded-lg bg-red-bg border-red-border text-red-text">
          ⚠ Cannot send commands — check system state
        </div>
      )}
    </div>
  );
});

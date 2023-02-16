import { memo, useCallback } from "react";
import { twMerge } from "tailwind-merge";

import { type Command } from "@/lib/command";

import { useCommandSender } from "./commandSenderProvider";
import { StatusButton } from "./design/statusButton";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export type LaunchControlEntryState =
  | "not-ready"
  | "not-started"
  | "executing"
  | "stopped";

interface Props {
  label: string;
  state: LaunchControlEntryState;
  executeCommand: Command;
  stopCommand: Command;
}

export const LaunchControlEntry = memo(function LaunchControlEntry({
  label,
  state,
  executeCommand,
  stopCommand,
}: Props) {
  const { sendCommand } = useCommandSender();

  const canExecute = useLaunchMachineSelector((state) =>
    state.can(executeCommand)
  );
  const canStop = useLaunchMachineSelector((state) => state.can(stopCommand));

  const handleExecute = useCallback(() => {
    sendCommand(executeCommand);
  }, [executeCommand, sendCommand]);

  const handleStop = useCallback(() => {
    sendCommand(stopCommand);
  }, [stopCommand, sendCommand]);

  if (state === "not-ready") {
    return null;
  }

  return (
    <div className="flex items-center p-4 border rounded-lg gap-4 bg-gray-el-bg border-gray-border">
      <div
        className={twMerge(
          "shrink-0 w-8 h-8 mr-2 rounded-full appearance-none",
          state === "not-started" && "bg-gray-solid",
          state === "executing" && "bg-green-solid",
          state === "stopped" && "bg-red-solid"
        )}
      />
      <p className="flex-1 text-gray-text">{label}</p>
      <StatusButton
        color="green"
        disabled={!canExecute}
        onClick={handleExecute}
      >
        EXECUTE
      </StatusButton>
      <StatusButton color="red" disabled={!canStop} onClick={handleStop}>
        STOP
      </StatusButton>
    </div>
  );
});

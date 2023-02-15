import { memo, useCallback } from "react";
import { twMerge } from "tailwind-merge";

import { type Command } from "@/lib/command";

import { useCommandSender } from "./commandSenderProvider";
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
    <div>
      <p
        className={twMerge(
          state === "not-started" && "text-gray",
          state === "executing" && "text-green",
          state === "stopped" && "text-red"
        )}
      >
        {label}
      </p>
      <button className="block" disabled={!canExecute} onClick={handleExecute}>
        EXECUTE
      </button>
      <button className="block" disabled={!canStop} onClick={handleStop}>
        STOP
      </button>
    </div>
  );
});

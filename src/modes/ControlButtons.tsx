import { memo, useCallback, useState } from "react";

import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "@/components/launchMachineProvider";
import { type FsCommand } from "@/lib/serverSchemas";
import { fsStateToCommand } from "@/lib/serverSchemaUtils";

interface CommandButtonProps {
  label: string;
  command: Exclude<FsCommand, "STATE_CUSTOM">;
  color?: "primary" | "danger" | "warning";
}

const CommandButton = memo(function CommandButton({
  label,
  command,
  color = "primary",
}: CommandButtonProps) {
  const launchActorRef = useLaunchMachineActorRef();
  const [pending, setPending] = useState(false);

  const fsState = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data.state,
  );

  const isActive = fsState && fsStateToCommand(fsState) === command;

  const canExecute = useLaunchMachineSelector((state) =>
    state.can({ type: "SEND_FS_COMMAND", value: { command } }),
  );

  const handleClick = useCallback(() => {
    if (!canExecute || pending) return;
    setPending(true);
    launchActorRef.send({ type: "SEND_FS_COMMAND", value: { command } });
    setTimeout(() => setPending(false), 2000);
  }, [canExecute, pending, command, launchActorRef]);

  const colors = {
    primary: {
      base: "bg-blue-solid hover:bg-blue-solid-hover text-white shadow-lg",
      disabled: "bg-gray-el-bg text-gray-text-dim cursor-not-allowed",
      active: "bg-green-solid text-white shadow-lg ring-2 ring-green-border",
      pending: "bg-blue-solid-hover text-white animate-pulse",
    },
    danger: {
      base: "bg-red-solid hover:bg-red-solid-hover text-white shadow-lg",
      disabled: "bg-gray-el-bg text-gray-text-dim cursor-not-allowed",
      active: "bg-red-solid text-white shadow-lg ring-2 ring-red-border",
      pending: "bg-red-solid-hover text-white animate-pulse",
    },
    warning: {
      base: "bg-yellow-solid hover:bg-yellow-solid-hover text-white shadow-lg",
      disabled: "bg-gray-el-bg text-gray-text-dim cursor-not-allowed",
      active: "bg-yellow-solid text-white shadow-lg ring-2 ring-yellow-border",
      pending: "bg-yellow-solid-hover text-white animate-pulse",
    },
  };

  const buttonColor = pending
    ? colors[color].pending
    : isActive
      ? colors[color].active
      : canExecute
        ? colors[color].base
        : colors[color].disabled;

  return (
    <button
      onClick={handleClick}
      disabled={!canExecute || pending}
      className={`px-8 py-6 rounded-xl font-bold text-lg transition-all ${buttonColor}`}
    >
      <div>{pending ? "EXECUTING..." : isActive ? `✓ ${label}` : label}</div>
    </button>
  );
});

export const ControlButtons = memo(function ControlButtons() {
  return (
    <div className="flex flex-col h-full p-6 border bg-gray-el-bg rounded-xl border-gray-border">
      <p className="mb-6 text-lg font-bold text-gray-text">Command center</p>

      <div className="content-start flex-1 grid grid-cols-2 gap-4">
        <CommandButton label="GN2 standby" command="STATE_GN2_STANDBY" />
        <CommandButton
          label="GN2 fill"
          command="STATE_GN2_FILL"
          color="warning"
        />
        <CommandButton label="Abort" command="STATE_ABORT" color="danger" />
        <CommandButton label="Fire" command="STATE_FIRE" color="warning" />
        <CommandButton label="Idle standby" command="STATE_STANDBY" />
      </div>
    </div>
  );
});

/* eslint-disable react-perf/jsx-no-new-function-as-prop */

import { memo, useCallback, useState } from "react";

import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "@/components/launchMachineProvider";
import { type FsCommand } from "@/lib/serverSchemas";
import { fsStateToCommand } from "@/lib/serverSchemaUtils";

import { FiringStationHealth } from "./FiringStationHealth";

interface CommandButtonProps {
  label: string;
  command: FsCommand;
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

  const getDotColor = () => {
    if (pending) return "bg-blue-solid animate-pulse";
    if (isActive) return "bg-green-solid animate-pulse";
    if (!canExecute) return "bg-gray-solid";

    if (color === "danger") return "bg-red-solid";
    if (color === "warning") return "bg-yellow-solid";
    return "bg-blue-solid";
  };

  const getBackgroundColor = () => {
    if (isActive) return "bg-green-bg border-green-solid text-green-text";
    if (!canExecute)
      return "bg-gray-bg-2 border-gray-border text-gray-text-dim";
    return "bg-gray-bg-2 border-gray-border text-gray-text hover:bg-gray-el-bg-hover";
  };

  return (
    <button
      onClick={handleClick}
      disabled={!canExecute || pending}
      className={`rounded-xl border-2 transition-all flex flex-col items-center justify-center p-1 ${getBackgroundColor()} ${
        !canExecute || pending ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <div className={`w-2.5 h-2.5 rounded-full mb-1 ${getDotColor()}`} />

      <div className="text-xs font-bold leading-tight text-center">{label}</div>

      {isActive && (
        <div className="text-xs font-semibold opacity-70 mt-0.5">ACTIVE</div>
      )}
    </button>
  );
});

export const ControlButtons = memo(function ControlButtons() {
  const [healthOpen, setHealthOpen] = useState(false);

  return (
    <div className="flex flex-col h-full p-2 border bg-gray-el-bg rounded-xl border-gray-border">
      <h2 className="mb-2 text-xs font-bold tracking-widest uppercase text-gray-text">
        COMMAND CENTER
      </h2>

      <div className="flex-1 grid grid-cols-2 gap-2">
        <CommandButton label="GN2 STANDBY" command="STATE_GN2_STANDBY" />
        <CommandButton
          label="GN2 FILL"
          command="STATE_GN2_FILL"
          color="warning"
        />
        <CommandButton label="IDLE STANDBY" command="STATE_STANDBY" />
        <CommandButton label="ABORT" command="STATE_ABORT" color="danger" />
        <CommandButton label="FIRE" command="STATE_FIRE" color="warning" />

        <button
          onClick={() => setHealthOpen(true)}
          className="flex flex-col items-center justify-center p-1 border-2 cursor-pointer rounded-xl bg-gray-bg-2 border-gray-border text-gray-text hover:bg-gray-el-bg-hover transition-all"
        >
          <div className="mb-1 rounded-full w-2.5 h-2.5 bg-blue-solid" />
          <div className="text-xs font-bold leading-tight text-center">
            FS HEALTH
          </div>
        </button>
      </div>

      {healthOpen && (
        <FiringStationHealth onClose={() => setHealthOpen(false)} />
      )}
    </div>
  );
});

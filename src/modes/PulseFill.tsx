/* eslint-disable react-perf/jsx-no-new-function-as-prop */
import { memo, useCallback, useState } from "react";

import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "@/components/launchMachineProvider";
import { type FsCommand } from "@/lib/serverSchemas";

const PULSE_COMMANDS = [
  {
    label: "1/4s",
    command: "STATE_GN2_PULSE_FILL_A" as Exclude<
      FsCommand,
      "STATE_CUSTOM" | "EREG_SET_GAINS"
    >,
    state: "GN2_PULSE_FILL_A",
  },
  {
    label: "1s",
    command: "STATE_GN2_PULSE_FILL_B" as Exclude<
      FsCommand,
      "STATE_CUSTOM" | "EREG_SET_GAINS"
    >,
    state: "GN2_PULSE_FILL_B",
  },
  {
    label: "5s",
    command: "STATE_GN2_PULSE_FILL_C" as Exclude<
      FsCommand,
      "STATE_CUSTOM" | "EREG_SET_GAINS"
    >,
    state: "GN2_PULSE_FILL_C",
  },
] as const;

// ─── extracted button ────────────────────────────────────────────────────────

interface PulseButtonProps {
  label: string;
  command: Exclude<FsCommand, "STATE_CUSTOM" | "EREG_SET_GAINS">;
  isActive: boolean;
  isPending: boolean;
  onClick: (
    command: Exclude<FsCommand, "STATE_CUSTOM" | "EREG_SET_GAINS">,
  ) => void;
}

const PulseButton = memo(function PulseButton({
  label,
  command,
  isActive,
  isPending,
  onClick,
}: PulseButtonProps) {
  const handleClick = useCallback(() => {
    onClick(command);
  }, [onClick, command]);

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={[
        "flex-1 px-3 py-2 rounded-lg border-2 transition-all text-xs font-bold",
        isActive
          ? "bg-green-bg border-green-solid text-green-text"
          : isPending
            ? "bg-blue-bg border-blue-solid text-blue-text animate-pulse"
            : "bg-gray-bg-2 border-gray-border text-gray-text hover:bg-gray-el-bg-hover",
        isPending ? "cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      {label}
    </button>
  );
});

export const PulseFill = memo(function PulseFill() {
  const launchActorRef = useLaunchMachineActorRef();
  const [pending, setPending] = useState<Exclude<
    FsCommand,
    "STATE_CUSTOM" | "EREG_SET_GAINS"
  > | null>(null);

  const fsState = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data.state,
  );

  const handleClick = useCallback(
    (command: Exclude<FsCommand, "STATE_CUSTOM" | "EREG_SET_GAINS">) => {
      const snapshot = launchActorRef.getSnapshot();
      if (!snapshot) return;

      const canExecute = snapshot.can({
        type: "SEND_FS_COMMAND",
        value: { command },
      });

      if (!canExecute || pending) return;

      setPending(command);
      launchActorRef.send({ type: "SEND_FS_COMMAND", value: { command } });
      setTimeout(() => setPending(null), 2000);
    },
    [launchActorRef, pending],
  );

  return (
    <div className="p-2">
      <div className="mb-2 text-xs font-semibold text-gray-text">
        Pulse Fill
      </div>
      <div className="flex gap-2">
        {PULSE_COMMANDS.map((pulse) => (
          <PulseButton
            key={pulse.command}
            label={pulse.label}
            command={pulse.command}
            isActive={fsState === pulse.state}
            isPending={pending === pulse.command}
            onClick={handleClick}
          />
        ))}
      </div>
    </div>
  );
});

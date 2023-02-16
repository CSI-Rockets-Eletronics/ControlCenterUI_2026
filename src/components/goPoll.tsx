import { memo, useCallback } from "react";
import { twMerge } from "tailwind-merge";

import { type Command } from "@/lib/command";

import { useCommandSender } from "./commandSenderProvider";
import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";

const Entry = memo(function Entry({
  label,
  yes,
  toggleCommand,
}: {
  label: string;
  yes: boolean;
  toggleCommand: Command;
}) {
  const { sendCommand } = useCommandSender();

  const handleChange = useCallback(() => {
    sendCommand(toggleCommand);
  }, [sendCommand, toggleCommand]);

  return (
    <label className="flex items-center p-4 border rounded-lg cursor-pointer text-gray-text gap-6 bg-gray-el-bg border-gray-border hover:bg-gray-el-bg-hover active:bg-gray-el-bg-active">
      <input
        type="checkbox"
        className="w-8 h-8 rounded-full appearance-none checked:bg-green-solid bg-red-solid shrink-0"
        checked={yes}
        onChange={handleChange}
      />
      {label}
    </label>
  );
});

const ProgressBar = memo(function ProgressBar({
  progress,
}: {
  progress: number;
}) {
  const isComplete = progress >= 1;

  return (
    <div className="h-8 overflow-hidden rounded-lg bg-gray-fallback-7">
      <div
        style={{ width: `${progress * 100}%` }}
        className={twMerge(
          "h-full",
          isComplete ? "bg-green-solid" : "bg-red-solid"
        )}
      />
    </div>
  );
});

export const GoPoll = memo(function GoPoll() {
  const safetyOfficer1Yes = useLaunchMachineSelector((state) =>
    state.matches("preFire.goPoll.safetyOfficer1.yes")
  );
  const safetyOfficer2Yes = useLaunchMachineSelector((state) =>
    state.matches("preFire.goPoll.safetyOfficer2.yes")
  );
  const adviserYes = useLaunchMachineSelector((state) =>
    state.matches("preFire.goPoll.adviser.yes")
  );
  const propLeadYes = useLaunchMachineSelector((state) =>
    state.matches("preFire.goPoll.propLead.yes")
  );
  const elecLeadYes = useLaunchMachineSelector((state) =>
    state.matches("preFire.goPoll.elecLead.yes")
  );

  const yesArray = [
    safetyOfficer1Yes,
    safetyOfficer2Yes,
    adviserYes,
    propLeadYes,
    elecLeadYes,
  ];
  const count = yesArray.filter((yes) => yes).length;
  const total = yesArray.length;

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Go/No Go Poll</p>
      <Entry
        label="SAFETY OFFICER 1"
        yes={safetyOfficer1Yes}
        toggleCommand="GO_POLL_TOGGLE_SAFETY_OFFICER_1"
      />
      <Entry
        label="SAFETY OFFICER 2"
        yes={safetyOfficer2Yes}
        toggleCommand="GO_POLL_TOGGLE_SAFETY_OFFICER_2"
      />
      <Entry
        label="ADVISER"
        yes={adviserYes}
        toggleCommand="GO_POLL_TOGGLE_ADVISER"
      />
      <Entry
        label="PROP LEAD"
        yes={propLeadYes}
        toggleCommand="GO_POLL_TOGGLE_PROP_LEAD"
      />
      <Entry
        label="ELEC LEAD"
        yes={elecLeadYes}
        toggleCommand="GO_POLL_TOGGLE_ELEC_LEAD"
      />
      <div className="flex-1" />
      <p className="text-gray-text">
        {count}/{total} Go
      </p>
      <ProgressBar progress={count / total} />
    </Panel>
  );
});

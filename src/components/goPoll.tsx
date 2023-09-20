import { memo, useCallback } from "react";

import { type LaunchState } from "@/lib/launchState";

import { CheckboxEntry } from "./design/checkboxEntry";
import { Panel } from "./design/panel";
import { ProgressBar } from "./design/progressBar";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

const Entry = memo(function Entry({
  label,
  field,
}: {
  label: string;
  field: keyof LaunchState["goPoll"];
}) {
  const launchActorRef = useLaunchMachineActorRef();

  const checked = useLaunchMachineSelector(
    (state) => state.context.launchState.goPoll[field],
  );

  const disabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "UPDATE_GO_POLL",
        data: { [field]: !checked },
      }),
  );

  const handleChange = useCallback(() => {
    launchActorRef.send({
      type: "UPDATE_GO_POLL",
      data: { [field]: !checked },
    });
  }, [checked, field, launchActorRef]);

  return (
    <CheckboxEntry
      size="lg"
      label={label}
      checked={checked}
      disabled={disabled}
      onChange={handleChange}
    />
  );
});

export const GoPoll = memo(function GoPoll() {
  const count = useLaunchMachineSelector(
    (state) =>
      Object.values(state.context.launchState.goPoll).filter(Boolean).length,
  );
  const total = useLaunchMachineSelector(
    (state) => Object.keys(state.context.launchState.goPoll).length,
  );

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Go/No Go Poll</p>
      <Entry label="SAFETY OFFICER 1" field="safetyOfficer1" />
      <Entry label="SAFETY OFFICER 2" field="safetyOfficer2" />
      <Entry label="ADVISER" field="adviser" />
      <Entry label="PROP LEAD" field="propLead" />
      <Entry label="ELEC LEAD" field="elecLead" />
      <div className="flex-1 -mt-4" />
      <p className="text-gray-text">
        {count}/{total} Go
      </p>
      <ProgressBar progress={count / total} />
    </Panel>
  );
});

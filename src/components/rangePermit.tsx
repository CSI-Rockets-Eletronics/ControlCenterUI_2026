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
  field: keyof LaunchState["rangePermit"];
}) {
  const launchActorRef = useLaunchMachineActorRef();

  const checked = useLaunchMachineSelector(
    (state) => state.context.launchState.rangePermit[field],
  );

  const disabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "UPDATE_RANGE_PERMIT",
        data: { [field]: !checked },
      }),
  );

  const handleChange = useCallback(() => {
    launchActorRef.send({
      type: "UPDATE_RANGE_PERMIT",
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

export const RangePermit = memo(function RangePermit() {
  const count = useLaunchMachineSelector(
    (state) =>
      Object.values(state.context.launchState.rangePermit).filter(Boolean)
        .length,
  );
  const total = useLaunchMachineSelector(
    (state) => Object.keys(state.context.launchState.rangePermit).length,
  );

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Range Permit</p>
      <Entry label="SAFETY OFFICER 1" field="safetyOfficer1" />
      <Entry label="SAFETY OFFICER 2" field="safetyOfficer2" />
      <Entry label="ADVISER" field="adviser" />
      <div className="flex-1 -mt-4" />
      <p className="text-gray-text">
        {count}/{total} Clear
      </p>
      <ProgressBar progress={count / total} />
    </Panel>
  );
});

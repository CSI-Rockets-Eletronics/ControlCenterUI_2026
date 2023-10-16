import { memo, useCallback } from "react";

import { type LaunchState } from "@/lib/launchState";

import { CheckboxEntry } from "./design/checkboxEntry";
import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

const Entry = memo(function Entry({
  label,
  field,
}: {
  label: string;
  field: keyof LaunchState["preFillChecklist"];
}) {
  const launchActorRef = useLaunchMachineActorRef();

  const checked = useLaunchMachineSelector(
    (state) => state.context.launchState.preFillChecklist[field],
  );

  const disabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "UPDATE_PRE_FILL_CHECKLIST",
        data: { [field]: !checked },
      }),
  );

  const handleChange = useCallback(() => {
    launchActorRef.send({
      type: "UPDATE_PRE_FILL_CHECKLIST",
      data: { [field]: !checked },
    });
  }, [checked, field, launchActorRef]);

  return (
    <CheckboxEntry
      size="sm"
      label={label}
      checked={checked}
      disabled={disabled}
      onChange={handleChange}
    />
  );
});

export const PreFillChecklist = memo(function PreFillChecklist() {
  return (
    <Panel className="h-full">
      <p className="text-lg text-gray-text">Pre-Fill Checklist</p>
      <div className="flex flex-col mt-4 gap-3">
        <Entry label="FILL RELAY" field="fillRelay" />
        <Entry label="ABORT RELAY" field="abortRelay" />
        <Entry label="FIRE RELAY" field="fireRelay" />
        <Entry label="FILL SOLENOID" field="fillSolenoid" />
        <Entry label="ABORT SOLENOID" field="abortSolenoid" />
        <Entry label="WET GROUND" field="wetGround" />
        <Entry label="OPEN TANK" field="openTank" />
      </div>
    </Panel>
  );
});

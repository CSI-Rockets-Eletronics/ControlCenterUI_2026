import { memo, useCallback } from "react";

import { type StationOpState } from "@/lib/stationState";

import { Panel } from "./design/panel";
import { StatusButton } from "./design/statusButton";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

const Entry = memo(function Entry({
  label,
  opState,
}: {
  label: string;
  opState: StationOpState;
}) {
  const launchActorRef = useLaunchMachineActorRef();

  const curOpState = useLaunchMachineSelector(
    (state) => state.context.stationState?.opState
  );

  const active = curOpState === opState;

  const disabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "MUTATE_STATION_OP_STATE",
        value: opState,
      })
  );

  const handleClick = useCallback(() => {
    launchActorRef.send({
      type: "MUTATE_STATION_OP_STATE",
      value: opState,
    });
  }, [launchActorRef, opState]);

  return (
    <StatusButton
      color={active ? "green" : "none"}
      disabled={disabled}
      onClick={handleClick}
    >
      {label}
    </StatusButton>
  );
});

export const StandbyStateSelection = memo(function StandbyStateSelection() {
  return (
    <Panel className="flex flex-col h-full gap-4">
      <p className="text-lg text-gray-text">State Selection</p>
      <Entry label="STANDBY" opState="standby" />
      <Entry label="KEEP" opState="keep" />
      <Entry label="FILL" opState="fill" />
      <Entry label="PURGE" opState="purge" />
      <Entry label="PULSE (.5s)" opState="pulse-A" />
      <Entry label="PULSE (1s)" opState="pulse-B" />
      <Entry label="PULSE (2s)" opState="pulse-C" />
    </Panel>
  );
});

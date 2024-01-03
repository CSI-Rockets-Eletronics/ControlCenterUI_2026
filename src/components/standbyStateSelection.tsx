import { memo, type ReactNode, useCallback } from "react";
import { twMerge } from "tailwind-merge";

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
  inRow = false,
  onlyIfActive = false,
}: {
  label: string;
  opState: StationOpState;
  inRow?: boolean;
  onlyIfActive?: boolean;
}) {
  const launchActorRef = useLaunchMachineActorRef();

  const curOpState = useLaunchMachineSelector(
    (state) => state.context.deviceStates.firingStation?.data.opState,
  );

  const active = curOpState === opState;

  const disabled = useLaunchMachineSelector(
    (state) =>
      opState === "custom" ||
      !state.can({
        type: "MUTATE_STATION_OP_STATE",
        value: opState,
      }),
  );

  const handleClick = useCallback(() => {
    if (opState === "custom") return;

    launchActorRef.send({
      type: "MUTATE_STATION_OP_STATE",
      value: opState,
    });
  }, [launchActorRef, opState]);

  if (onlyIfActive && !active) {
    return null;
  }

  return (
    <div className={twMerge("flex flex-col", inRow && "flex-1")}>
      <StatusButton
        color={active ? "green" : "none"}
        disabled={disabled}
        onClick={handleClick}
      >
        {label}
      </StatusButton>
    </div>
  );
});

const EntryGroup = memo(function EntryGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Panel className="flex flex-col p-3 gap-2">
      <p className="text-gray-text">{title}</p>
      <div className="flex gap-3">{children}</div>
    </Panel>
  );
});

export const StandbyStateSelection = memo(function StandbyStateSelection() {
  return (
    <Panel className="flex flex-col h-full gap-4 md:scrollable md:min-w-min">
      <p className="text-lg text-gray-text">State Selection</p>

      <Entry label="STANDBY" opState="standby" />
      <Entry label="KEEP" opState="keep" />
      <Entry label="FILL" opState="fill" />
      <Entry label="PURGE" opState="purge" />

      <Entry onlyIfActive label="FIRE" opState="fire" />
      <Entry onlyIfActive label="FIRE IGNITER" opState="fire-manual-igniter" />
      <Entry onlyIfActive label="FIRE VALVE" opState="fire-manual-valve" />
      <Entry onlyIfActive label="ABORT" opState="abort" />
      <Entry onlyIfActive label="CUSTOM" opState="custom" />

      <EntryGroup title="Pulse Fill">
        <Entry inRow label="1s" opState="pulse-fill-A" />
        <Entry inRow label="5s" opState="pulse-fill-B" />
        <Entry inRow label="10s" opState="pulse-fill-C" />
      </EntryGroup>

      <EntryGroup title="Pulse Vent">
        <Entry inRow label="1s" opState="pulse-vent-A" />
        <Entry inRow label="2s" opState="pulse-vent-B" />
        <Entry inRow label="5s" opState="pulse-vent-C" />
      </EntryGroup>

      <EntryGroup title="Pulse Purge">
        <Entry inRow label="1s" opState="pulse-purge-A" />
        <Entry inRow label="2s" opState="pulse-purge-B" />
        <Entry inRow label="5s" opState="pulse-purge-C" />
      </EntryGroup>
    </Panel>
  );
});

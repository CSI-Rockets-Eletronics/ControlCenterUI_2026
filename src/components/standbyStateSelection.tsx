import { memo, type ReactNode, useCallback } from "react";
import { twMerge } from "tailwind-merge";

import { type FsCommand } from "@/lib/serverSchemas";
import { fsStateToCommand } from "@/lib/serverSchemaUtils";

import { Panel } from "./design/panel";
import { StatusButton } from "./design/statusButton";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

const Entry = memo(function Entry({
  label,
  command,
  inRow = false,
  onlyIfActive = false,
}: {
  label: string;
  command: FsCommand;
  inRow?: boolean;
  onlyIfActive?: boolean;
}) {
  const launchActorRef = useLaunchMachineActorRef();

  const curState = useLaunchMachineSelector(
    (state) => state.context.deviceStates.fsState?.data.state,
  );

  const active = !!curState && fsStateToCommand(curState) === command;

  const disabled = useLaunchMachineSelector(
    (state) =>
      command === "STATE_CUSTOM" ||
      !state.can({ type: "SEND_FS_COMMAND", value: { command } }),
  );

  const handleClick = useCallback(() => {
    if (command === "STATE_CUSTOM") return;

    launchActorRef.send({ type: "SEND_FS_COMMAND", value: { command } });
  }, [command, launchActorRef]);

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

      <Entry label="IDLE STANDBY" command="STATE_STANDBY" />
      <Entry label="GN2 STANDBY" command="STATE_GN2_STANDBY" />
      <Entry label="GN2 FILL" command="STATE_GN2_FILL" />

      <Entry onlyIfActive label="FIRE" command="STATE_FIRE" />
      <Entry
        onlyIfActive
        label="FIRE DOME PILOT OPEN"
        command="STATE_FIRE_MANUAL_DOME_PILOT_OPEN"
      />
      <Entry
        onlyIfActive
        label="FIRE DOME PILOT CLOSE"
        command="STATE_FIRE_MANUAL_DOME_PILOT_CLOSE"
      />
      <Entry
        onlyIfActive
        label="FIRE IGNITER"
        command="STATE_FIRE_MANUAL_IGNITER"
      />
      <Entry onlyIfActive label="FIRE RUN" command="STATE_FIRE_MANUAL_RUN" />

      <Entry onlyIfActive label="ABORT" command="STATE_ABORT" />
      <Entry onlyIfActive label="CUSTOM" command="STATE_CUSTOM" />

      <EntryGroup title="Pulse Fill">
        <Entry inRow label="1s" command="STATE_GN2_PULSE_FILL_A" />
        <Entry inRow label="5s" command="STATE_GN2_PULSE_FILL_B" />
        <Entry inRow label="10s" command="STATE_GN2_PULSE_FILL_C" />
      </EntryGroup>
    </Panel>
  );
});

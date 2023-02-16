import { memo, useCallback } from "react";

import { type Command } from "@/lib/command";

import { useCommandSender } from "./commandSenderProvider";
import { Panel } from "./design/panel";
import { StatusButton } from "./design/statusButton";
import { useLaunchMachineSelector } from "./launchMachineProvider";

const Entry = memo(function Entry({
  label,
  active,
  activateCommand,
}: {
  label: string;
  active: boolean;
  activateCommand: Command;
}) {
  const { sendCommand } = useCommandSender();

  const disabled = useLaunchMachineSelector(
    (state) => !state.can(activateCommand)
  );

  const handleClick = useCallback(() => {
    sendCommand(activateCommand);
  }, [activateCommand, sendCommand]);

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
  const standbyActive = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.standby.standby")
  );
  const keepActive = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.standby.keep")
  );
  const fillActive = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.standby.fill")
  );
  const purgeActive = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.standby.purge")
  );
  const pulseActive = useLaunchMachineSelector((state) =>
    state.matches("preFire.operationState.standby.pulse")
  );

  return (
    <Panel className="flex flex-col h-full gap-4">
      <p className="text-lg text-gray-text">State Selection</p>
      <Entry
        label="STANDBY"
        active={standbyActive}
        activateCommand="STANDBY_STATE_ACTIVATE_STANDBY"
      />
      <Entry
        label="KEEP"
        active={keepActive}
        activateCommand="STANDBY_STATE_ACTIVATE_KEEP"
      />
      <Entry
        label="FILL"
        active={fillActive}
        activateCommand="STANDBY_STATE_ACTIVATE_FILL"
      />
      <Entry
        label="PURGE"
        active={purgeActive}
        activateCommand="STANDBY_STATE_ACTIVATE_PURGE"
      />
      <Entry
        label="PULSE"
        active={pulseActive}
        activateCommand="STANDBY_STATE_ACTIVATE_PULSE"
      />
    </Panel>
  );
});

import { memo, useCallback } from "react";

import { type Command } from "@/lib/command";

import { useCommandSender } from "./commandSenderProvider";
import { Panel } from "./design/panel";
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

  const canSend = useLaunchMachineSelector((state) =>
    state.can(activateCommand)
  );

  const disabled = !active && !canSend;

  const handleChange = useCallback(() => {
    sendCommand(activateCommand);
    console.log(activateCommand);
  }, [activateCommand, sendCommand]);

  return (
    <div>
      <label>
        {label}:{" "}
        <input
          type="radio"
          checked={active}
          disabled={disabled}
          onChange={handleChange}
        />
      </label>
    </div>
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

  // show a radio button for each state
  return (
    <Panel>
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

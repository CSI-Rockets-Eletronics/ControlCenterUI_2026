import { shallowEqual } from "@xstate/react";
import { memo } from "react";

import { Panel } from "./design/panel";
import { StatusDisplay } from "./design/statusDisplay";
import { useLaunchMachineSelector } from "./launchMachineProvider";

export const StatusPanel = memo(function StatusPanel() {
  const status = useLaunchMachineSelector((state) => {
    const status = state.context.stationState?.status;
    return {
      batteryConnected: !!status?.batteryConnected,
      fillTankOpen: !!status?.fillTankOpen,
      ignitersConnected: !!status?.ignitersConnected,
      mechPowerOn: !!status?.mechPowerOn,
    };
  }, shallowEqual);

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Status</p>
      <StatusDisplay
        label="Battery"
        color={status.batteryConnected ? "yellow" : "green"}
        value={status.batteryConnected ? "Connected" : "Disconnected"}
      />
      <StatusDisplay
        label="Fill Tank"
        color={status.fillTankOpen ? "yellow" : "green"}
        value={status.fillTankOpen ? "Open" : "Closed"}
      />
      <StatusDisplay
        label="Igniters"
        color={status.ignitersConnected ? "yellow" : "green"}
        value={status.ignitersConnected ? "Connected" : "Disconnected"}
      />
      <StatusDisplay
        label="Mech Power"
        color={status.mechPowerOn ? "yellow" : "green"}
        value={status.mechPowerOn ? "On" : "Off"}
      />
    </Panel>
  );
});

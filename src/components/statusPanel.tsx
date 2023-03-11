import { shallowEqual } from "@xstate/react";
import { memo } from "react";

import { Panel } from "./design/panel";
import { StatusDisplay } from "./design/statusDisplay";
import { useLaunchMachineSelector } from "./launchMachineProvider";

const CombustionPressureDisplay = memo(function TankPressureDisplay() {
  const combustionPressure = useLaunchMachineSelector((state) =>
    Math.round(state.context.stationState?.status.combustionPressure ?? 0)
  );

  return (
    <StatusDisplay
      label="Combustion Chamber Pressure (PSI)"
      color="green"
      value={String(combustionPressure)}
    />
  );
});

const OxidizerTankTempDisplay = memo(function OxidizerTankTempDisplay() {
  const oxidizerTankTemp = useLaunchMachineSelector((state) =>
    Math.round(state.context.stationState?.status.oxidizerTankTemp ?? 0)
  );

  return (
    <StatusDisplay
      label="Oxidizer Tank Temp (F)"
      color="green"
      value={String(oxidizerTankTemp)}
    />
  );
});

const AltitudeDisplay = memo(function OxidizerTankTempDisplay() {
  const altitude = useLaunchMachineSelector((state) =>
    Math.round(state.context.stationState?.gps.alt ?? 0)
  );

  return (
    <StatusDisplay
      label="Altitude (ft)"
      color="green"
      value={String(altitude)}
    />
  );
});

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

  const isRecovery = useLaunchMachineSelector(
    (state) => state.context.launchState.activePanel === "recovery"
  );

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

      {isRecovery ? (
        <AltitudeDisplay />
      ) : (
        <>
          <CombustionPressureDisplay />
          <OxidizerTankTempDisplay />
        </>
      )}
    </Panel>
  );
});

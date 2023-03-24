import { shallowEqual } from "@xstate/react";
import { memo, useCallback } from "react";

import { type LaunchState } from "@/lib/launchState";

import { Panel } from "./design/panel";
import { StatusDisplay } from "./design/statusDisplay";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

const ClickableDisplay = memo(function ClickableDisplay({
  label,
  field,
  trueValue,
  falseValue,
}: {
  field: keyof LaunchState["mainStatus"];
  label: string;
  trueValue: string;
  falseValue: string;
}) {
  const launchActorRef = useLaunchMachineActorRef();

  const isTrue = useLaunchMachineSelector(
    (state) => state.context.launchState.mainStatus[field]
  );

  const disabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "UPDATE_MAIN_STATUS",
        data: { [field]: !isTrue },
      })
  );

  const handleChange = useCallback(() => {
    launchActorRef.send({
      type: "UPDATE_MAIN_STATUS",
      data: { [field]: !isTrue },
    });
  }, [field, isTrue, launchActorRef]);

  return (
    <StatusDisplay
      label={label}
      color={isTrue ? "yellow" : "green"}
      value={isTrue ? trueValue : falseValue}
      disabled={disabled}
      onClick={handleChange}
    />
  );
});

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
    Math.round(state.context.stationState?.gps?.alt ?? 0)
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
  const status = useLaunchMachineSelector(
    (state) => state.context.launchState.mainStatus,
    shallowEqual
  );

  const isRecovery = useLaunchMachineSelector(
    (state) => state.context.launchState.activePanel === "recovery"
  );

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Status</p>
      <ClickableDisplay
        field="batteryConnected"
        label="Battery"
        trueValue="Connected"
        falseValue="Disconnected"
      />
      <ClickableDisplay
        field="fillTankOpen"
        label="Fill Tank"
        trueValue="Open"
        falseValue="Closed"
      />
      <ClickableDisplay
        field="ignitersConnected"
        label="Igniters"
        trueValue="Connected"
        falseValue="Disconnected"
      />
      <ClickableDisplay
        field="mechPowerOn"
        label="Mech Power"
        trueValue="On"
        falseValue="Off"
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

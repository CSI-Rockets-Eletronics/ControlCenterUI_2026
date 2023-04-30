import { memo, useCallback, useMemo, useState } from "react";

import { type LaunchState } from "@/lib/launchState";

import { Panel } from "./design/panel";
import { StatusDisplay } from "./design/statusDisplay";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";
import { StationChart } from "./stationChart";

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

const CombustionPressureDisplay = memo(function CombustionPressureDisplay() {
  const value = useLaunchMachineSelector((state) =>
    (state.context.stationState?.status.combustionPressure ?? 0).toFixed(1)
  );

  const chartElement = useMemo(() => {
    return (
      <StationChart
        // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
        valueSelector={(state) => state.status.combustionPressure}
        minY={0}
      />
    );
  }, []);

  const [showChart, setShowChart] = useState(false);

  const handleClick = useCallback(() => {
    setShowChart(!showChart);
  }, [showChart]);

  return (
    <StatusDisplay
      label="CC Pressure (PSI)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

const OxidizerTankPressureDisplay = memo(
  function OxidizerTankPressureDisplay() {
    const value = useLaunchMachineSelector((state) =>
      (state.context.stationState?.status.oxidizerTankPressure ?? 0).toFixed(1)
    );

    const chartElement = useMemo(() => {
      return (
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          valueSelector={(state) => state.status.oxidizerTankPressure}
          minY={0}
        />
      );
    }, []);

    const [showChart, setShowChart] = useState(false);

    const handleClick = useCallback(() => {
      setShowChart(!showChart);
    }, [showChart]);

    return (
      <StatusDisplay
        label="Ox Tank Pressure (PSI)"
        color="green"
        value={value}
        overflowElement={showChart ? chartElement : undefined}
        disabled={false}
        onClick={handleClick}
      />
    );
  }
);

const AltitudeDisplay = memo(function AltitudeDisplay() {
  const value = useLaunchMachineSelector((state) =>
    (state.context.stationState?.gps?.alt ?? 0).toFixed(1)
  );

  return <StatusDisplay label="Altitude (ft)" color="green" value={value} />;
});

export const StatusPanel = memo(function StatusPanel() {
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
          <OxidizerTankPressureDisplay />
        </>
      )}
    </Panel>
  );
});

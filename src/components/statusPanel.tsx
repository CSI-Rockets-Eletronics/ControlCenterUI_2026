import {
  lazy,
  memo,
  type ReactNode,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react";

import { computeNitrousMass } from "@/lib/coolprop";
import { type LaunchState } from "@/lib/launchState";
import { type RocketScientificState } from "@/lib/stationState";
import { type DeviceRecord } from "@/machines/launchMachine";

import { Panel } from "./design/panel";
import { StatusDisplay } from "./design/statusDisplay";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

const StationChart = lazy(() =>
  import("./stationChart").then((res) => ({ default: res.StationChart })),
);

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
    (state) => state.context.launchState.mainStatus[field],
  );

  const disabled = useLaunchMachineSelector(
    (state) =>
      !state.can({
        type: "UPDATE_MAIN_STATUS",
        data: { [field]: !isTrue },
      }),
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

const ChartLoadingFallback = memo(function ChartLoadingFallback({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <Suspense fallback={<p className="text-gray-text">Loading chart...</p>}>
      {children}
    </Suspense>
  );
});

const FillLineDisplay = memo(function FillLineDisplay() {
  const isConnected = useLaunchMachineSelector(
    (state) =>
      state.context.deviceStates.firingStation?.data.status.fillLineConnected ??
      false,
  );

  return (
    <StatusDisplay
      label="Fill Line"
      color={isConnected ? "yellow" : "green"}
      value={isConnected ? "Connected" : "Cut"}
    />
  );
});

const OxTank1Display = memo(function OxTank1Display() {
  const value = useLaunchMachineSelector((state) =>
    (
      state.context.deviceStates.firingStation?.data.status.transd1Pressure ?? 0
    ).toFixed(1),
  );

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ firingStation }) =>
            firingStation
              ? {
                  ts: firingStation.ts,
                  value: firingStation.data.status.transd1Pressure,
                }
              : null
          }
          valuePrecision={1}
          minY={0}
          maxY="dataMax + 10"
        />
      </ChartLoadingFallback>
    );
  }, []);

  const [showChart, setShowChart] = useState(false);

  const handleClick = useCallback(() => {
    setShowChart(!showChart);
  }, [showChart]);

  return (
    <StatusDisplay
      label="Ox Tank 1 (PSI)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

const OxTank2Display = memo(function OxTank2Display() {
  // convert pressures to mPSI to PSI
  const psiSelector = (state: DeviceRecord<RocketScientificState> | null) =>
    (state?.data.t1 ?? 0) / 1000;

  const value = useLaunchMachineSelector((state) =>
    psiSelector(state.context.deviceStates.rocketScientific).toFixed(1),
  );

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ rocketScientific }) =>
            rocketScientific
              ? {
                  ts: rocketScientific.ts,
                  value: psiSelector(rocketScientific),
                }
              : null
          }
          valuePrecision={1}
          minY={0}
          maxY="dataMax + 10"
        />
      </ChartLoadingFallback>
    );
  }, []);

  const [showChart, setShowChart] = useState(false);

  const handleClick = useCallback(() => {
    setShowChart(!showChart);
  }, [showChart]);

  return (
    <StatusDisplay
      label="Ox Tank 2 (PSI)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

const CC1Display = memo(function CC1Display() {
  // convert pressures to mPSI to PSI
  const psiSelector = (state: DeviceRecord<RocketScientificState> | null) =>
    (state?.data.t3 ?? 0) / 1000;

  const value = useLaunchMachineSelector((state) =>
    psiSelector(state.context.deviceStates.rocketScientific).toFixed(1),
  );

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ rocketScientific }) =>
            rocketScientific
              ? {
                  ts: rocketScientific.ts,
                  value: psiSelector(rocketScientific),
                }
              : null
          }
          valuePrecision={1}
          minY={0}
          maxY="dataMax + 10"
        />
      </ChartLoadingFallback>
    );
  }, []);

  const [showChart, setShowChart] = useState(false);

  const handleClick = useCallback(() => {
    setShowChart(!showChart);
  }, [showChart]);

  return (
    <StatusDisplay
      label="CC 1 (PSI)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

const LoadCellDisplay = memo(function LoadCell1Display() {
  const value = useLaunchMachineSelector((state) =>
    (
      state.context.deviceStates.firingStation?.data.status.transd2LBS ?? 0
    ).toFixed(2),
  );

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ firingStation }) =>
            firingStation
              ? {
                  ts: firingStation.ts,
                  value: firingStation.data.status.transd2LBS,
                }
              : null
          }
          valuePrecision={3}
          minY="dataMin - 2"
          maxY="dataMax + 2"
        />
      </ChartLoadingFallback>
    );
  }, []);

  const [showChart, setShowChart] = useState(false);

  const handleClick = useCallback(() => {
    setShowChart(!showChart);
  }, [showChart]);

  return (
    <StatusDisplay
      label="Load Cell (lbs)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

const TotalNitrousDisplay = memo(function TotalNitrousDisplay() {
  const totalMassLbs = useLaunchMachineSelector(
    (state) => state.context.deviceStates.loadCell?.data ?? 0,
  );

  const vaporPressurePsi = useLaunchMachineSelector(
    (state) =>
      state.context.deviceStates.firingStation?.data.status.transd1Pressure ??
      0,
  );

  const { liquidMassLbs, vaporMassLbs } = useMemo(
    () => computeNitrousMass(totalMassLbs, vaporPressurePsi),
    [totalMassLbs, vaporPressurePsi],
  );

  return (
    <>
      <StatusDisplay
        label="Liquid Nitrous (lbs)"
        color="green"
        value={liquidMassLbs.toFixed(2)}
      />
      <StatusDisplay
        label="Vapor Nitrous (lbs)"
        color="green"
        value={vaporMassLbs.toFixed(2)}
      />
    </>
  );
});

const AltitudeDisplay = memo(function AltitudeDisplay() {
  const value = useLaunchMachineSelector((state) =>
    (state.context.deviceStates.radioGround?.data.gps.altitude ?? 0).toFixed(1),
  );

  return <StatusDisplay label="Altitude (ft)" color="green" value={value} />;
});

export const StatusPanel = memo(function StatusPanel() {
  const isRecovery = useLaunchMachineSelector(
    (state) => state.context.launchState.activePanel === "recovery",
  );

  return (
    <Panel className="flex flex-col gap-4 md:scrollable md:min-w-min">
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
      <ClickableDisplay
        field="manualFire"
        label="Manual Fire"
        trueValue="Enabled"
        falseValue="Disabled"
      />

      {isRecovery ? (
        <AltitudeDisplay />
      ) : (
        <>
          <FillLineDisplay />
          <OxTank1Display />
          <OxTank2Display />
          <CC1Display />
          <LoadCellDisplay />
          <TotalNitrousDisplay />
        </>
      )}
    </Panel>
  );
});

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

const LoxTankUpperDisplay = memo(function LoxTankUpperDisplay() {
  const value = useLaunchMachineSelector((state) =>
    (
      state.context.deviceStates.fsLoxGn2Transducers?.data.lox_upper ?? 0
    ).toFixed(1),
  );

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ fsLoxGn2Transducers }) =>
            fsLoxGn2Transducers
              ? {
                  ts: fsLoxGn2Transducers.ts,
                  value: fsLoxGn2Transducers.data.lox_upper,
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
      label="Lox Upper (PSI)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

const LoxTankLowerDisplay = memo(function LoxTankLowerDisplay() {
  const value = useLaunchMachineSelector((state) =>
    (
      state.context.deviceStates.fsLoxGn2Transducers?.data.lox_lower ?? 0
    ).toFixed(1),
  );

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ fsLoxGn2Transducers }) =>
            fsLoxGn2Transducers
              ? {
                  ts: fsLoxGn2Transducers.ts,
                  value: fsLoxGn2Transducers.data.lox_lower,
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
      label="Lox Lower (PSI)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

const LoadCell1Display = memo(function LoadCell1Display() {
  const value = useLaunchMachineSelector((state) =>
    (state.context.deviceStates.loadCell1?.data ?? 0).toFixed(2),
  );

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ loadCell1 }) =>
            loadCell1
              ? {
                  ts: loadCell1.ts,
                  value: loadCell1.data,
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
      label="Load Cell 1 (lbs)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

const LoadCell2Display = memo(function LoadCell2Display() {
  const value = useLaunchMachineSelector((state) =>
    (state.context.deviceStates.loadCell2?.data ?? 0).toFixed(2),
  );

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ loadCell2 }) =>
            loadCell2
              ? {
                  ts: loadCell2.ts,
                  value: loadCell2.data,
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
      label="Load Cell 2 (lbs)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

function useTotalLoadCellValue() {
  const value = useLaunchMachineSelector((state) => {
    const { loadCell1, loadCell2 } = state.context.deviceStates;
    return loadCell1 && loadCell2 ? loadCell1.data + loadCell2.data : 0;
  });
  return { value, valueStr: value.toFixed(2) };
}

const TotalLoadCellDisplay = memo(function TotalLoadCellDisplay() {
  const { valueStr } = useTotalLoadCellValue();

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ loadCell1, loadCell2 }) =>
            loadCell1 && loadCell2
              ? {
                  ts: (loadCell1.ts + loadCell2.ts) / 2,
                  value: loadCell1.data + loadCell2.data,
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
      label="Total Load Cell (lbs)"
      color="green"
      value={valueStr}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

const TotalNitrousDisplay = memo(function TotalNitrousDisplay() {
  const { value: totalMassLbs } = useTotalLoadCellValue();

  const vaporPressurePsi = useLaunchMachineSelector(
    (state) =>
      state.context.deviceStates.fsLoxGn2Transducers?.data.lox_upper ?? 0,
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
    (state.context.deviceStates.radioGround?.data.gps_altitude ?? 0).toFixed(1),
  );

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ radioGround }) =>
            radioGround?.data.gps_altitude != null
              ? {
                  ts: radioGround.ts,
                  value: radioGround.data.gps_altitude,
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
      label="Altitude (ft)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
});

const AccelerationDisplay = memo(function AccelerationDisplay() {
  // calibrated to 1g on the ground
  const G_PER_RAW = 1 / 2140;

  const raw_value = useLaunchMachineSelector(
    (state) => state.context.deviceStates.radioGround?.data.imu_az ?? 0,
  );
  const value = (raw_value * G_PER_RAW).toFixed(3);

  const chartElement = useMemo(() => {
    return (
      <ChartLoadingFallback>
        <StationChart
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          selector={({ radioGround }) =>
            radioGround
              ? {
                  ts: radioGround.ts,
                  value: radioGround.data.imu_az * G_PER_RAW,
                }
              : null
          }
          valuePrecision={3}
          minY="dataMin - 0.2"
          maxY="dataMax + 0.2"
        />
      </ChartLoadingFallback>
    );
  }, [G_PER_RAW]);

  const [showChart, setShowChart] = useState(false);

  const handleClick = useCallback(() => {
    setShowChart(!showChart);
  }, [showChart]);

  return (
    <StatusDisplay
      label="Z Acceleration (Gs)"
      color="green"
      value={value}
      overflowElement={showChart ? chartElement : undefined}
      disabled={false}
      onClick={handleClick}
    />
  );
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
        <>
          <AltitudeDisplay />
          <AccelerationDisplay />
        </>
      ) : (
        <>
          <LoxTankUpperDisplay />
          <LoxTankLowerDisplay />
          <LoadCell1Display />
          <LoadCell2Display />
          <TotalLoadCellDisplay />
          <TotalNitrousDisplay />
        </>
      )}
    </Panel>
  );
});

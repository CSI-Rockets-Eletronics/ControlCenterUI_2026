/* eslint-disable react-perf/jsx-no-new-object-as-prop */
/* eslint-disable react-perf/jsx-no-new-array-as-prop */
import { shallowEqual } from "@xstate/react";
import { memo, useCallback, useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type AxisDomainItem } from "recharts/types/util/types";

import { type DeviceStates } from "@/machines/launchMachine";

import { useLaunchMachineSelector } from "./launchMachineProvider";

interface Props {
  selector: (state: DeviceStates) => { ts: number; value: number } | null;
  valuePrecision: number;
  retentionSeconds?: number;
  minY?: AxisDomainItem;
  maxY?: AxisDomainItem;
  viewMode?: "live" | "historical";
  historicalStartTime?: number; // timestamp in ms
  historicalEndTime?: number;
}

export const StationChart = memo(function StationChart({
  selector,
  valuePrecision,
  retentionSeconds = 20 * 60, // changed default to 20 mins
  minY = "auto",
  maxY = "auto",
  viewMode = "live",
  historicalStartTime,
  historicalEndTime,
}: Props) {
  const [data, setData] = useState<
    { seconds: number; value: number; timestamp: number }[]
  >([]);

  const startTimeMicros = useLaunchMachineSelector(
    (state) => state.context.startTimeMicros,
  );

  const curEntry = useLaunchMachineSelector((state) => {
    const result = selector(state.context.deviceStates);

    if (!result) {
      return null;
    }

    return {
      seconds: result.ts / 1e6,
      value: result.value,
      timestamp: result.ts,
    };
  }, shallowEqual);

  useEffect(() => {
    if (curEntry) {
      setData((data) => {
        const newData = [...data, curEntry];

        if (viewMode === "live") {
          return newData.filter(
            (entry) => entry.seconds > curEntry.seconds - retentionSeconds,
          );
        } else {
          return newData;
        }
      });
    }
  }, [curEntry, retentionSeconds, viewMode]);

  const getDisplayData = () => {
    if (data.length === 0) return [];

    if (viewMode === "live") {
      const curEntry = data[data.length - 1];
      const sessionStartSeconds = startTimeMicros / 1e6;
      const effectiveRetention = Math.min(
        retentionSeconds,
        curEntry.seconds - sessionStartSeconds,
      );

      return data
        .filter(
          (entry) => entry.seconds > curEntry.seconds - effectiveRetention,
        )
        .map((entry) => ({
          ...entry,
          displaySeconds: entry.seconds - curEntry.seconds,
        }));
    } else {
      if (!historicalStartTime || !historicalEndTime) return [];

      const startSeconds = historicalStartTime / 1e6;
      const endSeconds = historicalEndTime / 1e6;

      return data
        .filter(
          (entry) =>
            entry.timestamp >= historicalStartTime &&
            entry.timestamp <= historicalEndTime,
        )
        .map((entry) => ({
          ...entry,
          displaySeconds: entry.seconds - startSeconds,
        }));
    }
  };

  const getXAxisDomain = () => {
    if (viewMode === "live") {
      const displayData = getDisplayData();
      if (displayData.length === 0) return [-retentionSeconds, 0];

      const minSeconds = Math.min(...displayData.map((d) => d.displaySeconds));
      return [minSeconds, 0];
    } else {
      if (!historicalStartTime || !historicalEndTime)
        return [0, retentionSeconds];

      const duration = (historicalEndTime - historicalStartTime) / 1e6;
      return [0, duration];
    }
  };

  const getXAxisTicks = () => {
    const [min, max] = getXAxisDomain();
    const range = max - min;

    if (range <= 60) {
      return [min, (min + max) / 2, max];
    } else if (range <= 300) {
      return [min, min + 60, min + 120, min + 180, min + 240, max];
    } else {
      return [
        min,
        min + range / 4,
        min + range / 2,
        min + (3 * range) / 4,
        max,
      ];
    }
  };

  const tickFormatter = useCallback(
    (val: number) => {
      if (viewMode === "live") {
        return `${val}s`;
      } else {
        const minutes = Math.floor(Math.abs(val) / 60);
        const seconds = Math.floor(Math.abs(val) % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }
    },
    [viewMode],
  );

  const labelFormatter = useCallback(
    (val: number) => {
      if (viewMode === "live") {
        return val.toFixed(2);
      } else {
        const minutes = Math.floor(Math.abs(val) / 60);
        const seconds = Math.floor(Math.abs(val) % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }
    },
    [viewMode],
  );

  const valueFormatter = useCallback(
    (val: unknown) => Number(val).toFixed(valuePrecision),
    [valuePrecision],
  );

  const displayData = getDisplayData();

  return (
    <ResponsiveContainer width="100%" height={180} className="overflow-hidden">
      <LineChart data={displayData} margin={{ bottom: -4 }}>
        <XAxis
          type="number"
          scale="linear"
          domain={getXAxisDomain()}
          ticks={getXAxisTicks()}
          axisLine={{ className: "!stroke-gray-solid" }}
          tick={{ fontSize: 18 }}
          dataKey="displaySeconds"
          tickFormatter={tickFormatter}
        />
        <YAxis
          scale="linear"
          domain={[minY, maxY]}
          axisLine={{ className: "!stroke-gray-solid" }}
          tick={{ fontSize: 18 }}
        />
        <Tooltip
          isAnimationActive={false}
          wrapperClassName="!bg-gray-el-bg-hover !rounded !border !border-gray-border-hover !text-sm !text-green-solid"
          labelClassName="!text-gray-text"
          labelFormatter={labelFormatter}
          formatter={valueFormatter}
        />
        <Line
          type="monotone"
          isAnimationActive={false}
          dot={false}
          dataKey="value"
          stroke="#"
          className="!stroke-green-solid"
          strokeWidth={1.5}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

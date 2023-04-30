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

import { type MergedStationState } from "@/machines/launchMachine";

import { useLaunchMachineSelector } from "./launchMachineProvider";

interface Props {
  valueSelector: (state: MergedStationState) => number | null;
  valuePrecision: number;
  retentionSeconds?: number;
  minY?: AxisDomainItem;
  maxY?: AxisDomainItem;
}

export const StationChart = memo(function StationChart({
  valueSelector,
  valuePrecision,
  retentionSeconds = 2 * 60,
  minY = "auto",
  maxY = "auto",
}: Props) {
  const [data, setData] = useState<{ seconds: number; value: number }[]>([]);

  const curEntry = useLaunchMachineSelector((state) => {
    if (!state.context.stationState) {
      return null;
    }

    const seconds = state.context.stationState.timestamp / 1e6;
    const value = valueSelector(state.context.stationState);

    if (value === null) return null;

    return { seconds, value };
  }, shallowEqual);

  useEffect(() => {
    if (curEntry) {
      setData((data) =>
        [...data, curEntry].filter(
          (entry) => entry.seconds > curEntry.seconds - retentionSeconds
        )
      );
    }
  }, [curEntry, retentionSeconds]);

  const getShiftedData = () => {
    if (data.length === 0) return [];

    const curEntry = data[data.length - 1];

    return data.map((entry) => ({
      ...entry,
      seconds: entry.seconds - curEntry.seconds,
    }));
  };

  const tickFormatter = useCallback((val: string) => `${val}s`, []);

  const labelFormatter = useCallback((val: number) => val.toFixed(2), []);
  const valueFormatter = useCallback(
    (val: unknown) => Number(val).toFixed(valuePrecision),
    [valuePrecision]
  );

  return (
    <ResponsiveContainer width="100%" height={180} className="overflow-hidden">
      <LineChart data={getShiftedData()} margin={{ bottom: -4 }}>
        <XAxis
          type="number"
          scale="linear"
          domain={[-retentionSeconds, 0]}
          ticks={[-retentionSeconds, -retentionSeconds / 2, 0]}
          axisLine={{ className: "!stroke-gray-solid" }}
          tick={{ fontSize: 18 }}
          dataKey="seconds"
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
          stroke="#" // hack to use tailwind color
          className="!stroke-green-solid"
          strokeWidth={1.5}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

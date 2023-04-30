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
  valueSelector: (state: MergedStationState) => number;
  retentionSeconds?: number;
  minY?: AxisDomainItem;
  maxY?: AxisDomainItem;
}

export const StationChart = memo(function StationChart({
  valueSelector,
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

  return (
    <ResponsiveContainer width="100%" aspect={2} className="overflow-hidden">
      <LineChart data={getShiftedData()}>
        <XAxis
          type="number"
          scale="linear"
          // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
          domain={[-retentionSeconds, 0]}
          // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
          ticks={[-retentionSeconds, -retentionSeconds / 2, 0]}
          dataKey="seconds"
          tickFormatter={tickFormatter}
        />
        <YAxis
          scale="linear"
          // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
          domain={[minY, maxY]}
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          padding={{ bottom: 15 }}
        />
        <Tooltip
          isAnimationActive={false}
          wrapperClassName="!bg-gray-el-bg-hover !rounded !border !border-gray-border-hover !text-sm"
          labelClassName="!text-gray-text"
          labelFormatter={labelFormatter}
        />
        <Line
          type="monotone"
          isAnimationActive={false}
          dot={false}
          dataKey="value"
          stroke="#46a758" // Radix grass 9
          strokeWidth={1.5}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

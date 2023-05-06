import { memo, useEffect, useState } from "react";

import { useReplayFromSeconds } from "@/hooks/useReplayFromSeconds";
import { type Record } from "@/lib/api";

import { useApi } from "./apiProvider";
import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";

const SOURCES = ["FiringStation", "scientific", "IDA100"];

const FETCH_INTERVAL = 1000;

export interface RecordWithSource extends Record {
  source: string;
}

interface Props {
  visible: boolean;
}

export const MonitorRecordsPanel = memo(function MonitorRecordsPanel({
  visible,
}: Props) {
  const api = useApi();
  const replayFromSeconds = useReplayFromSeconds();

  const [records, setRecords] = useState<RecordWithSource[]>([]);
  const [hasError, setHasError] = useState(false);

  const startTimeMicros = useLaunchMachineSelector(
    (state) => state.context.startTimeMicros
  );

  useEffect(() => {
    if (!visible) return;

    async function fetchRecords(): Promise<(RecordWithSource | null)[]> {
      const curTimeMicros = Date.now() * 1000;
      const elapsedMicros = curTimeMicros - startTimeMicros;

      const useRelativeTimestamps = replayFromSeconds != null;
      const rangeEnd = useRelativeTimestamps
        ? elapsedMicros + replayFromSeconds * 1e6
        : undefined;

      return await Promise.all(
        SOURCES.map(async (source) => {
          const record = await api.listRecords({
            source,
            take: 1,
            useRelativeTimestamps,
            rangeEnd,
          });
          if (record.length === 0) return null;
          return { ...record[0], source };
        })
      );
    }

    const interval = setInterval(() => {
      fetchRecords()
        .then((records) => {
          setRecords(
            records.filter((record) => record !== null) as RecordWithSource[]
          );
          setHasError(false);
        })
        .catch(() => {
          setHasError(true);
        });
    }, FETCH_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [api, replayFromSeconds, startTimeMicros, visible]);

  return (
    <Panel className="px-0 grid grid-rows-[auto,auto,minmax(0,1fr)] gap-4">
      <div className="px-4">
        <p className="text-lg text-gray-text">Monitor Records</p>
      </div>
      <div className="px-4">
        {hasError && (
          <Panel color="red" className="mb-4">
            <p className="text-gray-text">Sync Error!</p>
          </Panel>
        )}
      </div>
      <div className="flex flex-col px-4 -mt-4 scrollable gap-3">
        {records.map((record) => (
          <div
            key={record.source}
            className="p-2 border border-gray-border rounded-md bg-gray-el-bg"
          >
            <pre className="text-sm break-words whitespace-pre-wrap select-text text-gray-text">
              {JSON.stringify(
                {
                  source: record.source,
                  timestamp: record.timestamp,
                  data: record.data,
                },
                null,
                2
              )}
            </pre>
          </div>
        ))}
      </div>
    </Panel>
  );
});

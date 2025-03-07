import { memo, useEffect, useState } from "react";

import { catchError, useApi } from "@/hooks/useApi";
import { useEnvironmentKey } from "@/hooks/useEnvironmentKey";
import { useReplayFromSeconds } from "@/hooks/useReplayFromSeconds";
import { useSessionName } from "@/hooks/useSessionName";
import { DEVICES } from "@/lib/serverSchemas";

import { CodeBlock } from "./design/codeBlock";
import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";

const FETCH_INTERVAL = 1000;

interface RecordWithDevice {
  device: string;
  ts: number;
  data: unknown;
}

interface Props {
  visible: boolean;
}

export const MonitorRecordsPanel = memo(function MonitorRecordsPanel({
  visible,
}: Props) {
  const api = useApi();

  const environmentKey = useEnvironmentKey();
  const sessionName = useSessionName();

  const usingCustomSession = sessionName != null;

  const [activeSession, setActiveSession] = useState<string | null>(null);

  const replayFromSeconds = useReplayFromSeconds();

  const [records, setRecords] = useState<RecordWithDevice[]>([]);
  const [hasError, setHasError] = useState(false);

  const startTimeMicros = useLaunchMachineSelector(
    (state) => state.context.startTimeMicros,
  );

  useEffect(() => {
    if (!visible) return;

    async function fetchRecords(): Promise<RecordWithDevice[]> {
      const devices = Object.values(DEVICES);

      const curTimeMicros = Date.now() * 1000;
      const elapsedMicros = curTimeMicros - startTimeMicros;

      const endTs =
        replayFromSeconds != null
          ? String(elapsedMicros + replayFromSeconds * 1e6)
          : undefined;

      const multiDeviceResult = await catchError(
        api.records.multiDevice.get({
          $query: {
            environmentKey,
            sessionName,
            devices: devices.join(","),
            endTs,
          },
        }),
      );

      const records: RecordWithDevice[] = [];

      devices.forEach((device) => {
        const record = multiDeviceResult[device];
        if (record) {
          records.push({ device, ...record });
        }
      });

      return records;
    }

    const interval = setInterval(() => {
      if (!usingCustomSession) {
        catchError(api.sessions.current.get({ $query: { environmentKey } }))
          .then((session) => {
            setActiveSession(session === "NONE" ? null : session.name);
          })
          .catch((error) => {
            console.error(error);
            setActiveSession(null);
          });
      }

      fetchRecords()
        .then((records) => {
          setRecords(records);
          setHasError(false);
        })
        .catch((error) => {
          console.error(error);
          setHasError(true);
        });
    }, FETCH_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [
    api,
    environmentKey,
    replayFromSeconds,
    sessionName,
    startTimeMicros,
    usingCustomSession,
    visible,
  ]);

  const currentSession = sessionName ?? activeSession;

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
        {currentSession != null && (
          <CodeBlock>{`Current session:\n${currentSession}`}</CodeBlock>
        )}
        {records.map((record) => (
          <CodeBlock key={record.device}>
            {JSON.stringify(
              {
                device: record.device,
                ts: record.ts,
                data: record.data,
              },
              null,
              2,
            )}
          </CodeBlock>
        ))}
      </div>
    </Panel>
  );
});

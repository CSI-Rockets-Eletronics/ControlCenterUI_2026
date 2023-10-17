import { memo, useEffect, useState } from "react";

import { useEnvironmentKey } from "@/hooks/useEnvironmentKey";
import { useReplayFromSeconds } from "@/hooks/useReplayFromSeconds";
import { useSession } from "@/hooks/useSession";
import { api, catchError } from "@/lib/api";

import { CodeBlock } from "./design/codeBlock";
import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";

const SOURCES = ["FiringStation", "scientific", "IDA100"];

const FETCH_INTERVAL = 1000;

export interface RecordWithSource {
  ts: number;
  data: unknown;
  source: string;
}

interface Props {
  visible: boolean;
}

export const MonitorRecordsPanel = memo(function MonitorRecordsPanel({
  visible,
}: Props) {
  const environmentKey = useEnvironmentKey();
  const session = useSession();

  const usingCustomSession = session != null;

  const [activeSession, setActiveSession] = useState<string | null>(null);

  const replayFromSeconds = useReplayFromSeconds();

  const [records, setRecords] = useState<RecordWithSource[]>([]);
  const [hasError, setHasError] = useState(false);

  const startTimeMicros = useLaunchMachineSelector(
    (state) => state.context.startTimeMicros,
  );

  useEffect(() => {
    if (!visible) return;

    async function fetchRecords(): Promise<RecordWithSource[]> {
      const curTimeMicros = Date.now() * 1000;
      const elapsedMicros = curTimeMicros - startTimeMicros;

      const endTs =
        replayFromSeconds != null
          ? String(elapsedMicros + replayFromSeconds * 1e6)
          : undefined;

      const records: (RecordWithSource | null)[] = await Promise.all(
        SOURCES.map(async (source) => {
          const { records } = await catchError(
            api.records.get({
              $query: {
                environmentKey,
                session,
                path: source,
                take: "1",
                endTs,
              },
            }),
          );
          if (records.length === 0) return null;
          return { ...records[0], source };
        }),
      );

      return records.filter(
        (record): record is RecordWithSource => record != null,
      );
    }

    const interval = setInterval(() => {
      if (!usingCustomSession) {
        catchError(api.sessions.current.get({ $query: { environmentKey } }))
          .then((res) => {
            setActiveSession(res === "NONE" ? null : res.session);
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
    environmentKey,
    replayFromSeconds,
    session,
    startTimeMicros,
    usingCustomSession,
    visible,
  ]);

  const currentSession = session ?? activeSession;

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
          <CodeBlock>{`Current session: ${currentSession}`}</CodeBlock>
        )}
        {records.map((record) => (
          <CodeBlock key={record.source}>
            {JSON.stringify(
              {
                source: record.source,
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

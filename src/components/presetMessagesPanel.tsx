import { memo, useCallback, useState } from "react";

import { useEnvironmentKey } from "@/hooks/useEnvironmentKey";
import { type Paths, usePaths } from "@/hooks/usePaths";
import { useSession } from "@/hooks/useSession";
import { api, catchError } from "@/lib/api";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

interface PresetMessage {
  label: string;
  path: string;
  data: unknown;
}

const getPresetMessages = (paths: Paths): PresetMessage[] => [
  {
    label: "FS RECALIBRATE",
    path: paths.firingStation,
    data: { command: "recalibrate" },
  },
  {
    label: "FS CLEAR CALIB.",
    path: paths.firingStation,
    data: { command: "clear-calibration" },
  },
  {
    label: "LOAD CELL RECALIBRATE",
    path: paths.loadCell,
    data: "calibrate",
  },
];

const SendPresetMessageButton = memo(function SendPresetMessageButton({
  message,
}: {
  message: PresetMessage;
}) {
  const launchActorRef = useLaunchMachineActorRef();

  const canSendManualMessage = useLaunchMachineSelector((state) =>
    state.can({
      type: "SEND_MANUAL_MESSAGE",
      path: "",
      data: "",
    }),
  );

  const handleClick = useCallback(() => {
    launchActorRef.send({
      type: "SEND_MANUAL_MESSAGE",
      path: message.path,
      data: message.data,
    });
  }, [launchActorRef, message]);

  return (
    <Button
      key={message.label}
      color="green"
      disabled={!canSendManualMessage}
      onClick={handleClick}
    >
      {message.label}
    </Button>
  );
});

const NewSessionButton = memo(function NewSessionButton() {
  const environmentKey = useEnvironmentKey();
  const session = useSession();

  const usingCustomSession = session != null;

  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(() => {
    if (loading) return;

    setLoading(true);

    catchError(api.sessions.create.post({ environmentKey }))
      .catch(console.error)
      .finally(() => {
        setLoading(false);
      });
  }, [environmentKey, loading]);

  return (
    <Button
      color="green"
      disabled={usingCustomSession || loading}
      onClick={handleClick}
    >
      NEW SESSION
    </Button>
  );
});

export const PresetMessagesPanel = memo(function PresetMessagesPanel() {
  const paths = usePaths();

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Send Preset Message</p>
      <div className="flex flex-wrap gap-4">
        <NewSessionButton />
        {getPresetMessages(paths).map((message) => (
          <SendPresetMessageButton key={message.label} message={message} />
        ))}
      </div>
    </Panel>
  );
});

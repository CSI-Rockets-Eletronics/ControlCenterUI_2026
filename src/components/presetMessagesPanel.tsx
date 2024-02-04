import { memo, useCallback, useState } from "react";

import { catchError, useApi } from "@/hooks/useApi";
import { useEnvironmentKey } from "@/hooks/useEnvironmentKey";
import { useSessionName } from "@/hooks/useSessionName";
import { DEVICES } from "@/lib/stationInterface";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

interface PresetMessage {
  label: string;
  device: string;
  data: unknown;
}

const PRESET_MESSAGES = [
  {
    label: "FS RECALIBRATE",
    device: DEVICES.firingStation,
    data: { command: "recalibrate" },
  },
  {
    label: "FS CLEAR CALIB.",
    device: DEVICES.firingStation,
    data: { command: "clear-calibration" },
  },
  {
    label: "ROCKET RECALIBRATE",
    device: DEVICES.rocketScientific,
    data: { command: "cal" },
  },
  {
    label: "ROCKET CLEAR CALIB.",
    device: DEVICES.rocketScientific,
    data: { command: "clear cal" },
  },
  {
    label: "LOAD CELL 1 RECALIBRATE",
    device: DEVICES.loadCell1,
    data: "calibrate",
  },
  {
    label: "LOAD CELL 2 RECALIBRATE",
    device: DEVICES.loadCell2,
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
      device: "",
      data: "",
    }),
  );

  const handleClick = useCallback(() => {
    launchActorRef.send({
      type: "SEND_MANUAL_MESSAGE",
      device: message.device,
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
  const api = useApi();

  const environmentKey = useEnvironmentKey();
  const sessionName = useSessionName();

  const usingCustomSession = sessionName != null;

  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(() => {
    if (loading) return;

    setLoading(true);

    catchError(api.sessions.create.post({ environmentKey }))
      .catch(console.error)
      .finally(() => {
        setLoading(false);
      });
  }, [api, environmentKey, loading]);

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
  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Send Preset Message</p>
      <div className="flex flex-wrap gap-4 md:max-h-60 scrollable">
        <NewSessionButton />
        {PRESET_MESSAGES.map((message) => (
          <SendPresetMessageButton key={message.label} message={message} />
        ))}
      </div>
    </Panel>
  );
});

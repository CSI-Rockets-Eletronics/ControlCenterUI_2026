import { memo, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import { useApi } from "./apiProvider";
import { Button } from "./design/button";
import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

interface PresetMessage {
  label: string;
  target: string;
  data: unknown;
}

const PRESET_MESSAGES: PresetMessage[] = [
  {
    label: "FS RECALIBRATE",
    target: "FiringStation",
    data: { command: "recalibrate" },
  },
  {
    label: "FS CLEAR CALIB.",
    target: "FiringStation",
    data: { command: "clear-calibration" },
  },
  {
    label: "IDA100 RECALIBRATE",
    target: "IDA100",
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
      target: "",
      data: "",
    })
  );

  const handleClick = useCallback(() => {
    launchActorRef.send({
      type: "SEND_MANUAL_MESSAGE",
      target: message.target,
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
  const params = useParams<{ sessionId: string }>();
  const usingParamSessionId = params.sessionId != null;

  const api = useApi();

  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(() => {
    if (loading) return;

    setLoading(true);

    api
      .createSession({
        name: uuidv4(),
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [api, loading]);

  return (
    <Button
      color="green"
      disabled={usingParamSessionId || loading}
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
      <div className="flex flex-wrap gap-4">
        <NewSessionButton />
        {PRESET_MESSAGES.map((message) => (
          <SendPresetMessageButton key={message.label} message={message} />
        ))}
      </div>
    </Panel>
  );
});

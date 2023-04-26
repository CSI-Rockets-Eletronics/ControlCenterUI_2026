import { memo, useCallback } from "react";

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
    label: "FS CLEAR CALIBRATION",
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

export const PresetMessagesPanel = memo(function PresetMessagesPanel() {
  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Send Preset Message</p>
      <div className="flex flex-wrap gap-4">
        {PRESET_MESSAGES.map((message) => (
          <SendPresetMessageButton key={message.label} message={message} />
        ))}
      </div>
    </Panel>
  );
});

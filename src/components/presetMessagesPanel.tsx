import { memo, useCallback, useMemo, useState } from "react";

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

const RECALIBRATE_MESSAGES: PresetMessage[] = [
  {
    label: "FS RECALIBRATE",
    device: DEVICES.firingStation,
    data: { command: "recalibrate" },
  },

  {
    label: "ROCKET RECALIBRATE",
    device: DEVICES.rocketScientific,
    data: "cal",
  },
  {
    label: "LOAD CELL RECALIBRATE",
    device: DEVICES.loadCell,
    data: "calibrate",
  },
  {
    label: "TRAJECTORY RECALIBRATE",
    device: DEVICES.trajectory,
    data: "CALIBRATE",
  },
];

const OTHER_MESSAGES: PresetMessage[] = [
  {
    label: "FS CLEAR CALIB.",
    device: DEVICES.firingStation,
    data: { command: "clear-calibration" },
  },
  {
    label: "ROCKET CLEAR CALIB.",
    device: DEVICES.rocketScientific,
    data: "clear cal",
  },
];

const PRESET_MESSAGES: PresetMessage[] = [
  ...RECALIBRATE_MESSAGES,
  ...OTHER_MESSAGES,
];

const SendPresetMessageButton = memo(function SendPresetMessageButton(
  props: { color: "green" | "gray" } & (
    | { message: PresetMessage }
    | { label: string; messages: PresetMessage[] }
  ),
) {
  const launchActorRef = useLaunchMachineActorRef();

  const canSendManualMessages = useLaunchMachineSelector((state) =>
    state.can({
      type: "SEND_MANUAL_MESSAGES",
      messages: [],
    }),
  );

  const label = "label" in props ? props.label : props.message.label;
  const messageOrMessages = "message" in props ? props.message : props.messages;

  const messages = useMemo(() => {
    return Array.isArray(messageOrMessages)
      ? messageOrMessages
      : [messageOrMessages];
  }, [messageOrMessages]);

  const handleClick = useCallback(() => {
    launchActorRef.send({
      type: "SEND_MANUAL_MESSAGES",
      messages: messages.map((message) => ({
        device: message.device,
        data: message.data,
      })),
    });
  }, [launchActorRef, messages]);

  return (
    <Button
      color={props.color}
      disabled={!canSendManualMessages}
      onClick={handleClick}
    >
      {label}
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
        <SendPresetMessageButton
          color="green"
          label="RECALIBRATE ALL"
          messages={RECALIBRATE_MESSAGES}
        />
        {PRESET_MESSAGES.map((message) => (
          <SendPresetMessageButton
            key={message.label}
            color="gray"
            message={message}
          />
        ))}
      </div>
    </Panel>
  );
});

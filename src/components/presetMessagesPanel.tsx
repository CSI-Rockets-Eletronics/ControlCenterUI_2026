import { memo, useCallback, useMemo, useState } from "react";

import { catchError, useApi } from "@/hooks/useApi";
import { useEnvironmentKey } from "@/hooks/useEnvironmentKey";
import { useSessionName } from "@/hooks/useSessionName";
import { DEVICES, type FsCommandMessage } from "@/lib/serverSchemas";

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
    label: "RECALIBRATE TRANSDUCERS",
    device: DEVICES.firingStation,
    data: { command: "RECALIBRATE_TRANSDUCERS" } satisfies FsCommandMessage,
  },
  {
    label: "RECALIBRATE LOAD CELL 1",
    device: DEVICES.loadCell1,
    data: "calibrate",
  },
  {
    label: "RECALIBRATE LOAD CELL 2",
    device: DEVICES.loadCell2,
    data: "calibrate",
  },
];

const OTHER_MESSAGES: PresetMessage[] = [
  {
    label: "RESTART",
    device: DEVICES.firingStation,
    data: { command: "RESTART" } satisfies FsCommandMessage,
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

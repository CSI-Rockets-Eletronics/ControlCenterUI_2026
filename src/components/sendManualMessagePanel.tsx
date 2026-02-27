import {
  type ChangeEvent,
  type FormEvent,
  memo,
  useCallback,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

import { DEVICES } from "@/lib/serverSchemas";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

function isDeviceValid(device: string) {
  return device.length > 0 && !device.includes('"');
}

function validateData(data: string) {
  try {
    JSON.parse(data);
    return true;
  } catch {
    return false;
  }
}

export const SendManualMessagePanel = memo(function SendManualMessagePanel() {
  const [device, setDevice] = useState("");
  const [data, setData] = useState("");

  const deviceIsValid = isDeviceValid(device);

  const presetDevices = Object.values(DEVICES) as string[];
  const deviceMatchesPreset = presetDevices.includes(device);

  const dataIsValid = validateData(data);

  const handleDeviceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDevice(event.target.value);
    },
    [],
  );

  const handleDataChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setData(event.target.value);
    },
    [],
  );

  const launchActorRef = useLaunchMachineActorRef();

  const canSendManualMessages = useLaunchMachineSelector((state) =>
    state.can({
      type: "SEND_MANUAL_MESSAGES",
      messages: [],
    }),
  );

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      launchActorRef.send({
        type: "SEND_MANUAL_MESSAGES",
        messages: [{ device, data: JSON.parse(data) }],
      });
      setData("");
    },
    [data, launchActorRef, device],
  );

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Send Manual Message</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-gray-text">
          Device:
          <input
            className={twMerge(
              "font-mono block w-full px-3 py-2 mt-2 text-sm border-2 outline-none rounded-md focus:ring ring-yellow-border-hover",
              device.length === 0 && "bg-gray-el-bg border-gray-border",
              device.length > 0 &&
                (deviceMatchesPreset
                  ? "bg-green-el-bg border-green-border"
                  : deviceIsValid
                    ? "bg-yellow-el-bg border-yellow-border"
                    : "bg-red-el-bg border-red-border"),
            )}
            type="text"
            spellCheck={false}
            value={device}
            onChange={handleDeviceChange}
          />
        </label>
        <label className="text-gray-text">
          Data:
          <textarea
            className={twMerge(
              "font-mono block w-full px-3 py-2 mt-2 text-sm border-2 outline-none h-32 rounded-md focus:ring ring-yellow-border-hover scrollable resize-none",
              data.length === 0 && "bg-gray-el-bg border-gray-border",
              data.length > 0 &&
                (dataIsValid
                  ? "bg-green-el-bg border-green-border"
                  : "bg-red-el-bg border-red-border"),
            )}
            spellCheck={false}
            value={data}
            onChange={handleDataChange}
          />
        </label>
        <Button
          type="submit"
          color="green"
          disabled={!canSendManualMessages || !deviceIsValid || !dataIsValid}
        >
          SEND
        </Button>
      </form>
    </Panel>
  );
});

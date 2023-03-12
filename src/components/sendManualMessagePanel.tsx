import { type ChangeEvent, memo, useCallback, useState } from "react";
import { twMerge } from "tailwind-merge";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

function validateTarget(target: string) {
  return (
    target.length > 0 &&
    // prevent mistake of wrapping target in quotes
    !target.includes('"')
  );
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
  const [target, setTarget] = useState("");
  const [data, setData] = useState("");

  const targetIsValid = validateTarget(target);
  const dataIsValid = validateData(data);

  const handleTargetChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTarget(event.target.value);
    },
    []
  );

  const handleDataChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setData(event.target.value);
    },
    []
  );

  const launchActorRef = useLaunchMachineActorRef();

  const canSendManualMessage = useLaunchMachineSelector((state) =>
    state.can({
      type: "SEND_MANUAL_MESSAGE",
      target: "",
      data: "",
    })
  );

  const sendMessage = useCallback(() => {
    launchActorRef.send({
      type: "SEND_MANUAL_MESSAGE",
      target,
      data: JSON.parse(data),
    });
    setData("");
  }, [data, launchActorRef, target]);

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Send Manual Message</p>
      <label className="text-gray-text">
        Target:
        <input
          className={twMerge(
            "block w-full p-2 mt-2 text-sm border-2 outline-none rounded-md focus:ring ring-yellow-border-hover",
            target.length === 0 && "bg-gray-el-bg border-gray-border",
            target.length > 0 &&
              (targetIsValid
                ? "bg-green-el-bg border-green-border"
                : "bg-red-el-bg border-red-border")
          )}
          value={target}
          onChange={handleTargetChange}
        />
      </label>
      <label className="text-gray-text">
        Data:
        <textarea
          className={twMerge(
            "block w-full p-2 mt-2 text-sm border-2 outline-none h-48 rounded-md focus:ring ring-yellow-border-hover",
            data.length === 0 && "bg-gray-el-bg border-gray-border",
            data.length > 0 &&
              (dataIsValid
                ? "bg-green-el-bg border-green-border"
                : "bg-red-el-bg border-red-border")
          )}
          value={data}
          onChange={handleDataChange}
        />
      </label>
      <Button
        color="green"
        disabled={!canSendManualMessage || !targetIsValid || !dataIsValid}
        onClick={sendMessage}
      >
        SEND
      </Button>
    </Panel>
  );
});

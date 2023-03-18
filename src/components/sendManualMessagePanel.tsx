import {
  type ChangeEvent,
  type FormEvent,
  memo,
  useCallback,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import {
  useLaunchMachineActorRef,
  useLaunchMachineSelector,
} from "./launchMachineProvider";

const PRESET_TARGETS = ["SET_STATION_OP_STATE"];

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
  const targetMatchesPreset = PRESET_TARGETS.includes(target);

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

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      launchActorRef.send({
        type: "SEND_MANUAL_MESSAGE",
        target,
        data: JSON.parse(data),
      });
      setData("");
    },
    [data, launchActorRef, target]
  );

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Send Manual Message</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-gray-text">
          Target:
          <input
            className={twMerge(
              "font-mono block w-full px-3 py-2 mt-2 text-sm border-2 outline-none rounded-md focus:ring ring-yellow-border-hover",
              target.length === 0 && "bg-gray-el-bg border-gray-border",
              target.length > 0 &&
                (targetMatchesPreset
                  ? "bg-green-el-bg border-green-border"
                  : targetIsValid
                  ? "bg-yellow-el-bg border-yellow-border"
                  : "bg-red-el-bg border-red-border")
            )}
            type="text"
            spellCheck={false}
            value={target}
            onChange={handleTargetChange}
          />
        </label>
        <label className="text-gray-text">
          Data:
          <textarea
            className={twMerge(
              "font-mono block w-full px-3 py-2 mt-2 text-sm border-2 outline-none h-32 rounded-md focus:ring ring-yellow-border-hover scrollable",
              data.length === 0 && "bg-gray-el-bg border-gray-border",
              data.length > 0 &&
                (dataIsValid
                  ? "bg-green-el-bg border-green-border"
                  : "bg-red-el-bg border-red-border")
            )}
            spellCheck={false}
            value={data}
            onChange={handleDataChange}
          />
        </label>
        <Button
          type="submit"
          color="green"
          disabled={!canSendManualMessage || !targetIsValid || !dataIsValid}
        >
          SEND
        </Button>
      </form>
    </Panel>
  );
});

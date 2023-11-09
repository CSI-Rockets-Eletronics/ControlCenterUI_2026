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

const PRESET_PATHS = ["FiringStation", "scientific", "IDA100"];

function isPathValid(path: string) {
  return (
    path.length > 0 &&
    // prevent mistake of wrapping path in quotes
    !path.includes('"')
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
  const [path, setPath] = useState("");
  const [data, setData] = useState("");

  const pathIsValid = isPathValid(path);
  const pathMatchesPreset = PRESET_PATHS.includes(path);

  const dataIsValid = validateData(data);

  const handlePathChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setPath(event.target.value);
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

  const canSendManualMessage = useLaunchMachineSelector((state) =>
    state.can({
      type: "SEND_MANUAL_MESSAGE",
      path: "",
      data: "",
    }),
  );

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      launchActorRef.send({
        type: "SEND_MANUAL_MESSAGE",
        path,
        data: JSON.parse(data),
      });
      setData("");
    },
    [data, launchActorRef, path],
  );

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Send Manual Message</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-gray-text">
          Path:
          <input
            className={twMerge(
              "font-mono block w-full px-3 py-2 mt-2 text-sm border-2 outline-none rounded-md focus:ring ring-yellow-border-hover",
              path.length === 0 && "bg-gray-el-bg border-gray-border",
              path.length > 0 &&
                (pathMatchesPreset
                  ? "bg-green-el-bg border-green-border"
                  : pathIsValid
                  ? "bg-yellow-el-bg border-yellow-border"
                  : "bg-red-el-bg border-red-border"),
            )}
            type="text"
            spellCheck={false}
            value={path}
            onChange={handlePathChange}
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
          disabled={!canSendManualMessage || !pathIsValid || !dataIsValid}
        >
          SEND
        </Button>
      </form>
    </Panel>
  );
});

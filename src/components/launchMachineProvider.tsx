import { createActorContext } from "@xstate/react";
import { type ReactNode, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { Api } from "@/lib/api";
import { createLaunchMachine } from "@/machines/launchMachine";

import { useApi } from "./apiProvider";

const Context = createActorContext(createLaunchMachine(new Api(""), null));

function useReplayFromSeconds(): number | null {
  const [searchParams] = useSearchParams();

  const secondsStr = searchParams.get("replay");
  if (secondsStr == null) return null;

  const seconds = Number(secondsStr);
  return Number.isNaN(seconds) ? null : seconds;
}

export function LaunchMachineProvider({ children }: { children: ReactNode }) {
  const api = useApi();

  const replayFromSeconds = useReplayFromSeconds();

  const machine = useMemo(
    () => createLaunchMachine(api, replayFromSeconds),
    [api, replayFromSeconds]
  );

  return <Context.Provider machine={machine}>{children}</Context.Provider>;
}

export const useLaunchMachineSelector = Context.useSelector;

export const useLaunchMachineActorRef = Context.useActorRef;

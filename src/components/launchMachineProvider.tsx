import { createActorContext } from "@xstate/react";
import { type ReactNode, useMemo } from "react";

import { useReplayFromSeconds } from "@/hooks/useReplayFromSeconds";
import { Api } from "@/lib/api";
import { createLaunchMachine } from "@/machines/launchMachine";

import { useApi } from "./apiProvider";

const Context = createActorContext(createLaunchMachine(new Api(""), null));

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

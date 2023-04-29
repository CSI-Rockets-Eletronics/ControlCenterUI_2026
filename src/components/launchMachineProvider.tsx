import { createActorContext } from "@xstate/react";
import { type ReactNode, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useReplayFromSeconds } from "@/hooks/useReplayFromSeconds";
import { Api } from "@/lib/api";
import { createLaunchMachine } from "@/machines/launchMachine";

import { useApi } from "./apiProvider";

const Context = createActorContext(createLaunchMachine(new Api("")));

export function LaunchMachineProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const replayFromSeconds = useReplayFromSeconds();

  const [searchParams] = useSearchParams();
  const readonly = searchParams.has("readonly");

  const machine = useMemo(
    () => createLaunchMachine(api, !readonly, replayFromSeconds),
    [api, readonly, replayFromSeconds]
  );

  return <Context.Provider machine={machine}>{children}</Context.Provider>;
}

export const useLaunchMachineSelector = Context.useSelector;

export const useLaunchMachineActorRef = Context.useActorRef;

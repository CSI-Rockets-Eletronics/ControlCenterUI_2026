import { createActorContext } from "@xstate/react";
import { type ReactNode, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import { type Api, useApi } from "@/hooks/useApi";
import { useEnvironmentKey } from "@/hooks/useEnvironmentKey";
import { useReplayFromSeconds } from "@/hooks/useReplayFromSeconds";
import { useSessionName } from "@/hooks/useSessionName";
import { createLaunchMachine } from "@/machines/launchMachine";

const Context = createActorContext(
  createLaunchMachine(undefined as unknown as Api, ""),
);

export function LaunchMachineProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const location = useLocation();

  const environmentKey = useEnvironmentKey();
  const sessionName = useSessionName();

  const replayFromSeconds = useReplayFromSeconds();

  const [searchParams] = useSearchParams();
  const readonly = searchParams.has("readonly");
  const isDataDisplayRoute = location.pathname.startsWith("/data");
  const readonly = searchParamsReadonly || isDataDisplayRoute;

  const machine = useMemo(
    () =>
      createLaunchMachine(
        api,
        environmentKey,
        sessionName,
        readonly,
        replayFromSeconds,
      ),
    [api, environmentKey, readonly, replayFromSeconds, sessionName],
  );

  return <Context.Provider machine={machine}>{children}</Context.Provider>;
}

export const useLaunchMachineSelector = Context.useSelector;

export const useLaunchMachineActorRef = Context.useActorRef;

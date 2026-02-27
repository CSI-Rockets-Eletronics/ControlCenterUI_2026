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

// Define options outside the component to ensure a stable reference
const PROVIDER_OPTIONS = {};

export function LaunchMachineProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const location = useLocation();

  const environmentKey = useEnvironmentKey();
  const sessionName = useSessionName();

  const replayFromSeconds = useReplayFromSeconds();

  const [searchParams] = useSearchParams();
  const readonlyFromQuery = searchParams.has("readonly");
  const isDataDisplayRoute = location.pathname.startsWith("/data");
  const readonly = readonlyFromQuery || isDataDisplayRoute;

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

  // Use the stable reference 'PROVIDER_OPTIONS' instead of '{{}}'
  return (
    <Context.Provider machine={machine} options={PROVIDER_OPTIONS}>
      {children}
    </Context.Provider>
  );
}

export const useLaunchMachineSelector = Context.useSelector;

export const useLaunchMachineActorRef = Context.useActorRef;

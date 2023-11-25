import { createActorContext } from "@xstate/react";
import { type ReactNode, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useEnvironmentKey } from "@/hooks/useEnvironmentKey";
import { useReplayFromSeconds } from "@/hooks/useReplayFromSeconds";
import { useSessionName } from "@/hooks/useSessionName";
import { createLaunchMachine } from "@/machines/launchMachine";

const Context = createActorContext(createLaunchMachine(""));

export function LaunchMachineProvider({ children }: { children: ReactNode }) {
  const environmentKey = useEnvironmentKey();
  const sessionName = useSessionName();

  const replayFromSeconds = useReplayFromSeconds();

  const [searchParams] = useSearchParams();
  const readonly = searchParams.has("readonly");

  const machine = useMemo(
    () =>
      createLaunchMachine(
        environmentKey,
        sessionName,
        readonly,
        replayFromSeconds,
      ),
    [environmentKey, readonly, replayFromSeconds, sessionName],
  );

  return <Context.Provider machine={machine}>{children}</Context.Provider>;
}

export const useLaunchMachineSelector = Context.useSelector;

export const useLaunchMachineActorRef = Context.useActorRef;

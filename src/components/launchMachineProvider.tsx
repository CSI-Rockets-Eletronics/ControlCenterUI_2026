import { createActorContext } from "@xstate/react";
import { type ReactNode, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useEnvironmentKey } from "@/hooks/useEnvironmentKey";
import { type Paths, usePaths } from "@/hooks/usePaths";
import { useReplayFromSeconds } from "@/hooks/useReplayFromSeconds";
import { useSession } from "@/hooks/useSession";
import { createLaunchMachine } from "@/machines/launchMachine";

const Context = createActorContext(
  createLaunchMachine("", undefined, {} as Paths),
);

export function LaunchMachineProvider({ children }: { children: ReactNode }) {
  const environmentKey = useEnvironmentKey();
  const session = useSession();

  const paths = usePaths();

  const replayFromSeconds = useReplayFromSeconds();

  const [searchParams] = useSearchParams();
  const readonly = searchParams.has("readonly");

  const machine = useMemo(
    () =>
      createLaunchMachine(
        environmentKey,
        session,
        paths,
        readonly,
        replayFromSeconds,
      ),
    [environmentKey, paths, readonly, replayFromSeconds, session],
  );

  return <Context.Provider machine={machine}>{children}</Context.Provider>;
}

export const useLaunchMachineSelector = Context.useSelector;

export const useLaunchMachineActorRef = Context.useActorRef;

import { createActorContext } from "@xstate/react";
import { type ReactNode, useMemo } from "react";

import { Api } from "@/lib/api";
import { createLaunchMachine } from "@/machines/launchMachine";

const Context = createActorContext(createLaunchMachine(new Api("")));

export function LaunchMachineProvider({
  stationId,
  sessionId,
  children,
}: {
  stationId: string;
  sessionId?: string;
  children: ReactNode;
}) {
  const machine = useMemo(() => {
    const api = new Api(stationId, sessionId);
    return createLaunchMachine(api);
  }, [stationId, sessionId]);

  return <Context.Provider machine={machine}>{children}</Context.Provider>;
}

export const useLaunchMachineSelector = Context.useSelector;

export const useLaunchMachineActorRef = Context.useActorRef;

import { createActorContext } from "@xstate/react";
import { type ReactNode, useMemo } from "react";

import { Api } from "@/lib/api";
import { createLaunchMachine } from "@/machines/launchMachine";

const Context = createActorContext(createLaunchMachine(new Api("")));

export function LaunchMachineProvider({
  api,
  children,
}: {
  api: Api;
  children: ReactNode;
}) {
  const machine = useMemo(() => createLaunchMachine(api), [api]);

  return <Context.Provider machine={machine}>{children}</Context.Provider>;
}

export const useLaunchMachineSelector = Context.useSelector;

export const useLaunchMachineActorRef = Context.useActorRef;

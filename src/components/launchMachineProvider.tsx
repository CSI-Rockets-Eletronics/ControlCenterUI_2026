import { createActorContext } from "@xstate/react";
import { type ReactNode, useMemo } from "react";

import { Api } from "@/lib/api";
import { createLaunchMachine } from "@/machines/launchMachine";

import { useApi } from "./apiProvider";

const Context = createActorContext(createLaunchMachine(new Api("")));

export function LaunchMachineProvider({ children }: { children: ReactNode }) {
  const api = useApi();

  const machine = useMemo(() => createLaunchMachine(api), [api]);

  return <Context.Provider machine={machine}>{children}</Context.Provider>;
}

export const useLaunchMachineSelector = Context.useSelector;

export const useLaunchMachineActorRef = Context.useActorRef;

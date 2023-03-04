import { createActorContext } from "@xstate/react";

import { tempGlobalApi } from "@/lib/api";
import { createLaunchMachine } from "@/machines/launchMachine";

export const LaunchMachineContext = createActorContext(
  createLaunchMachine(tempGlobalApi)
);

export const LaunchMachineProvider = LaunchMachineContext.Provider;

export const useLaunchMachineSelector = LaunchMachineContext.useSelector;

export const useLaunchMachineActorRef = LaunchMachineContext.useActorRef;

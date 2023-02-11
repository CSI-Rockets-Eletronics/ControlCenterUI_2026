import { createActorContext } from "@xstate/react";

import launchMachine from "@/machines/launchMachine";

export const LaunchMachineContext = createActorContext(launchMachine);

export const useLaunchMachineSelector = LaunchMachineContext.useSelector;

/**
 * Do not call `.send()` on the actor returned by this hook. Instead, rely on
 * `useCommandSender()`.
 */
export const useLaunchMachineActorRef = LaunchMachineContext.useActorRef;

export default LaunchMachineContext.Provider;

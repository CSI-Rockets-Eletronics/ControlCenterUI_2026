import { useMachine } from "@xstate/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { type StateFrom } from "xstate";

import { type Command } from "@/lib/command";
import commandSenderMachine from "@/machines/commandSenderMachine";

import { useLaunchMachineActorRef } from "./launchMachineProvider";

type Context = {
  state: StateFrom<typeof commandSenderMachine>;
  retryBlockingSync: () => void;
  syncSilently: () => void;
  sendCommand: (command: Command) => void;
};

const CommandSenderContext = createContext<Context | null>(null);

interface Props {
  children: ReactNode;
}

export default function CommandSenderProvider({ children }: Props) {
  const launchActorRef = useLaunchMachineActorRef();

  const [state, send] = useMachine(commandSenderMachine);

  const { baselineCommands } = state.context;

  useEffect(() => {
    launchActorRef.send("RESET");

    for (const command of baselineCommands) {
      if (launchActorRef.getSnapshot()?.can(command)) {
        launchActorRef.send(command);
      } else {
        launchActorRef.send("REPORT_INCONSISTENT_BASELINE");
        break;
      }
    }
  }, [baselineCommands, launchActorRef]);

  const retryBlockingSync = useCallback(() => {
    send("RETRY_BLOCKING_SYNC");
  }, [send]);

  const syncSilently = useCallback(() => {
    send("SYNC_SILENTLY");
  }, [send]);

  const sendCommand = useCallback(
    (command: Command) => {
      if (
        launchActorRef.getSnapshot()?.can(command) &&
        state.can({ type: "SEND", command })
      ) {
        launchActorRef.send(command);
        send({ type: "SEND", command });
      }
    },
    [launchActorRef, send, state]
  );

  const context = useMemo<Context>(
    () => ({
      state,
      retryBlockingSync,
      syncSilently,
      sendCommand,
    }),
    [retryBlockingSync, sendCommand, state, syncSilently]
  );

  return (
    <CommandSenderContext.Provider value={context}>
      {children}
    </CommandSenderContext.Provider>
  );
}

export function useCommandSender(): Context {
  const context = useContext(CommandSenderContext);
  if (!context) {
    throw new Error(
      "useCommandSender must be used within a CommandSenderProvider"
    );
  }
  return context;
}

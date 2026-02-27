import { type FsCommand, type FsState } from "@/lib/serverSchemas";

export function fsStateToCommand(state: FsState): FsCommand {
  return `STATE_${state}` as FsCommand;
}

export function fsCommandToState(command: FsCommand): FsState | null {
  if (command.startsWith("STATE_")) {
    return command.slice("STATE_".length) as FsState;
  }
  return null;
}

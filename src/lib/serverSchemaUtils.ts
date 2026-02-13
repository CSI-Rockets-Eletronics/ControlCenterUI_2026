import { type FsCommand, type FsState } from "@/lib/serverSchemas";

export function fsStateToCommand(state: FsState): FsCommand {
  return `STATE_${state}` as FsCommand;
}

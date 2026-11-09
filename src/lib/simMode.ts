import { DEFAULT_SERVER } from "@/lib/serverSchemas";

/** Where `bun run sim` (sim/fake-firing-station.ts) listens. */
export const SIM_SERVER = "http://localhost:3000";

/** True when the UI is pointed at a server on this machine, i.e. not real hardware. */
export function isLocalServer(server: string | null) {
  if (!server) return false;
  try {
    const { hostname } = new URL(server);
    return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
  } catch {
    return false;
  }
}

/** The server the UI is actually talking to (mirrors useApi). */
export function effectiveServer(server: string | null) {
  return server ?? DEFAULT_SERVER;
}

/**
 * Ask the Vite dev server to start the simulator (sim/vite-plugin.ts).
 * Returns null on success, or a message for the user.
 */
export async function startSimulator(): Promise<string | null> {
  if (!import.meta.env.DEV) {
    // `bun preview` / built app has no /__sim routes; just check it's up.
    try {
      const res = await fetch(`${SIM_SERVER}/ts`);
      if (res.ok) return null;
    } catch {
      // fall through
    }
    return "Simulator isn't running. Start it with `bun run sim`, then try again.";
  }
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}__sim/start`, {
      method: "POST",
    });
    const body = (await res.json()) as { running: boolean; error?: string };
    if (body.running) return null;
    return `Couldn't start the simulator: ${body.error ?? "unknown error"}. Try \`bun run sim\` in a terminal.`;
  } catch (e) {
    return `Couldn't reach the dev server to start the simulator (${String(e)}).`;
  }
}

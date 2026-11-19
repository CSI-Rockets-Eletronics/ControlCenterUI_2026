/**
 * Dev-only Vite plugin so the UI's "Simulation mode" toggle can start the
 * fake firing station (sim/fake-firing-station.ts) without a second terminal.
 *
 *   GET  /__sim/status  -> { running: boolean }
 *   POST /__sim/start   -> { running: boolean, started: boolean, error?: string }
 *
 * Only active under `vite` / `bun dev` (apply: "serve"). Production builds and
 * `bun preview` on the Pi don't have these routes, so the UI falls back to
 * telling the user to run `bun run sim` themselves.
 */
import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";

import type { Plugin } from "vite";

const SIM_PORT = Number(process.env.SIM_PORT ?? 3000);
const SIM_URL = `http://localhost:${SIM_PORT}`;

async function isRunning() {
  try {
    const res = await fetch(`${SIM_URL}/ts`, {
      signal: AbortSignal.timeout(500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function simPlugin(): Plugin {
  let child: ChildProcess | null = null;

  const stop = () => {
    if (child && child.exitCode === null) child.kill();
    child = null;
  };

  return {
    name: "csi-sim",
    apply: "serve",
    configureServer(server) {
      server.httpServer?.once("close", stop);
      process.once("exit", stop);

      server.middlewares.use("/__sim/status", async (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ running: await isRunning() }));
      });

      server.middlewares.use("/__sim/start", async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "POST only" }));
          return;
        }
        if (await isRunning()) {
          res.end(JSON.stringify({ running: true, started: false }));
          return;
        }

        const script = path.resolve(
          server.config.root,
          "sim/fake-firing-station.ts",
        );
        child = spawn("bun", [script], {
          cwd: server.config.root,
          env: { ...process.env, SIM_PORT: String(SIM_PORT) },
          stdio: ["ignore", "pipe", "pipe"],
        });
        const log = (chunk: Buffer) =>
          chunk
            .toString()
            .split("\n")
            .filter(Boolean)
            .forEach((line) => server.config.logger.info(`[sim] ${line}`));
        child.stdout?.on("data", log);
        child.stderr?.on("data", log);

        let spawnError: string | undefined;
        child.on("error", (e) => (spawnError = e.message));
        child.on("exit", () => (child = null));

        // wait up to ~4s for the sim server to answer
        for (let i = 0; i < 20 && !spawnError; i++) {
          if (await isRunning()) {
            res.end(JSON.stringify({ running: true, started: true }));
            return;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            running: false,
            started: false,
            error: spawnError ?? "Simulator did not start within 4 s",
          }),
        );
      });
    },
  };
}

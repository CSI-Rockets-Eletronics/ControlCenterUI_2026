/**
 * Local fire simulator. No hardware, no Docker, no Postgres.
 *
 * One Bun process that plays two roles:
 *   1. A stand-in for data-server-node: same HTTP routes the UI calls
 *      (/records, /records/multiDevice, /messages, /sessions, /ts), kept in memory.
 *   2. A fake firing station: reads FiringStation commands posted by the UI and
 *      publishes FsState / transducer / load-cell records that follow the
 *      firmware's state machine (avionics-software main/devices/dev_fs_relays.h).
 *
 * Run:   bun run sim
 * Then:  bun dev   and open
 *        http://localhost:5173/sim?server=http://localhost:3000
 *
 * The ?server=http://localhost:3000 part matters. Without it the UI talks to the
 * real firing-station Pi.
 */

const PORT = Number(process.env.SIM_PORT ?? 3000);
const TICK_MS = 100;

// ---------------------------------------------------------------------------
// In-memory data server
// ---------------------------------------------------------------------------

type Row = { ts: number; data: unknown };
type Session = { name: string; createdAt: number };

const records = new Map<string, Row[]>(); // key: env|device, sorted by ts
const messages = new Map<string, Row[]>();
const sessions = new Map<string, Session[]>(); // key: env, sorted by createdAt
const envsSeen = new Set<string>();

let lastTs = 0;
/** Unix microseconds, strictly increasing so no two rows share a ts. */
function nowMicros() {
  lastTs = Math.max(Date.now() * 1000, lastTs + 1);
  return lastTs;
}

const key = (env: string, device: string) => `${env}|${device}`;

function push(
  store: Map<string, Row[]>,
  env: string,
  device: string,
  row: Row,
) {
  envsSeen.add(env);
  const k = key(env, device);
  const list = store.get(k) ?? [];
  list.push(row);
  list.sort((a, b) => a.ts - b.ts);
  if (list.length > 20000) list.splice(0, list.length - 20000);
  store.set(k, list);
}

function sessionRange(env: string, sessionName?: string) {
  const list = sessions.get(env) ?? [];
  if (sessionName === undefined) {
    const cur = list[list.length - 1];
    return { start: cur?.createdAt, end: undefined as number | undefined };
  }
  const i = list.findIndex((s) => s.name === sessionName);
  if (i === -1) throw new Error("Cannot find session");
  return {
    start: list[i].createdAt,
    end: list[i + 1] ? list[i + 1].createdAt - 1 : undefined,
  };
}

function inRange(ts: number, start?: number, end?: number) {
  return (
    (start === undefined || ts >= start) && (end === undefined || ts <= end)
  );
}

function num(v: string | null) {
  return v === null || v === "undefined" ? undefined : Number(v);
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
const text = (body: string) =>
  new Response(body, { headers: { ...CORS, "Content-Type": "text/plain" } });

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams;
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (req.method === "GET" && path === "/ts") return json(nowMicros());

  // ----- sessions -----
  if (req.method === "POST" && path === "/sessions/create") {
    const body = await req.json();
    const createdAt = nowMicros();
    const name =
      body.name ??
      `[${new Date(Math.floor(createdAt / 1000)).toISOString()}::${createdAt % 1000}]`;
    const list = sessions.get(body.environmentKey) ?? [];
    list.push({ name, createdAt });
    sessions.set(body.environmentKey, list);
    envsSeen.add(body.environmentKey);
    console.log(
      `[server] new session ${name} for env "${body.environmentKey}"`,
    );
    return json({ name, createdAt });
  }
  if (req.method === "GET" && path === "/sessions/current") {
    const list = sessions.get(q.get("environmentKey")!) ?? [];
    const cur = list[list.length - 1];
    return cur ? json(cur) : text("NONE");
  }
  if (req.method === "GET" && path === "/sessions") {
    const after = num(q.get("createdAfter"));
    const before = num(q.get("createdBefore"));
    const list = (sessions.get(q.get("environmentKey")!) ?? []).filter((s) =>
      inRange(s.createdAt, after, before),
    );
    return json({ sessions: list });
  }

  // ----- records -----
  if (req.method === "POST" && path === "/records") {
    const body = await req.json();
    push(records, body.environmentKey, body.device, {
      ts: body.ts ?? nowMicros(),
      data: body.data,
    });
    return text("");
  }
  if (req.method === "POST" && path === "/records/batch") {
    const body = await req.json();
    for (const r of body.records)
      push(records, body.environmentKey, body.device, r);
    return text("");
  }
  if (req.method === "GET" && path === "/records") {
    const env = q.get("environmentKey")!;
    const range = sessionRange(env, q.get("sessionName") ?? undefined);
    const startTs = num(q.get("startTs"));
    const endTs = num(q.get("endTs"));
    const take = num(q.get("take"));
    let list = (records.get(key(env, q.get("device")!)) ?? []).filter(
      (r) =>
        inRange(r.ts, startTs, endTs) && inRange(r.ts, range.start, range.end),
    );
    if (startTs === undefined) list = [...list].reverse();
    if (take !== undefined) list = list.slice(0, take);
    return json({ records: list });
  }
  if (req.method === "GET" && path === "/records/multiDevice") {
    const env = q.get("environmentKey")!;
    envsSeen.add(env); // UI opened this environment: bring its station online
    const range = sessionRange(env, q.get("sessionName") ?? undefined);
    const endTs = num(q.get("endTs"));
    const out: Record<string, Row | null> = {};
    for (const device of q.get("devices")!.split(",")) {
      const list = records.get(key(env, device)) ?? [];
      let found: Row | null = null;
      for (let i = list.length - 1; i >= 0; i--) {
        const r = list[i];
        if (
          inRange(r.ts, undefined, endTs) &&
          inRange(r.ts, range.start, range.end)
        ) {
          found = r;
          break;
        }
      }
      out[device] = found;
    }
    return json(out);
  }

  // ----- messages -----
  if (req.method === "POST" && path === "/messages") {
    const body = await req.json();
    push(messages, body.environmentKey, body.device, {
      ts: nowMicros(),
      data: body.data,
    });
    console.log(
      `[server] message -> ${body.device}: ${JSON.stringify(body.data)}`,
    );
    return text("");
  }
  if (req.method === "GET" && path === "/messages/next") {
    const env = q.get("environmentKey")!;
    const range = sessionRange(env, q.get("sessionName") ?? undefined);
    const afterTs = num(q.get("afterTs"));
    const m = (messages.get(key(env, q.get("device")!)) ?? []).find(
      (r) =>
        (afterTs === undefined || r.ts > afterTs) &&
        inRange(r.ts, range.start, range.end),
    );
    return m ? json(m) : text("NONE");
  }

  if (path === "/")
    return text("Fake firing station + data server. See sim/README.md");
  return new Response("Not found", { status: 404, headers: CORS });
}

// ---------------------------------------------------------------------------
// Fake firing station (mirrors dev_fs_relays.h)
// ---------------------------------------------------------------------------

// Timing constants copied from dev_fs_relays.h
const kPilotValveOpenDurationMs = 1000;
const kPilotValveClosedDurationMs = 9000;
const kGN2FillOpenDurationMs = 5000;
const kGN2FillClosedDurationMs = 5000;
const kFillAPulseDurationMs = 500;
const kFillBPulseDurationMs = 1000;
const kFillCPulseDurationMs = 5000;
const kEnginePrimePilotOpenDelayMs = 1000;
const kFireIgniterOnDelayMs = 3000;
const kFireIgniterOffDelayMs = 3500;
const kFireRunOpenDelayMs = 10000;
const kFireBackToStandbyDelayMs = 30000;
const kMaxIgniterPulseDurationMs = 500;
const kMaxCustomOpenDurationMs = 30000;

type FsState =
  | "CUSTOM"
  | "ABORT"
  | "STANDBY"
  | "GN2_STANDBY"
  | "GN2_FILL"
  | "GN2_PULSE_FILL_A"
  | "GN2_PULSE_FILL_B"
  | "GN2_PULSE_FILL_C"
  | "ENGINE_PRIME"
  | "FIRE"
  | "FIRE_MANUAL_PRESS_PILOT"
  | "FIRE_MANUAL_DOME_PILOT_CLOSE"
  | "FIRE_MANUAL_IGNITER"
  | "FIRE_MANUAL_RUN";

const RELAYS = [
  "gn2_drain",
  "gn2_fill",
  "depress",
  "press_pilot",
  "run",
  "lox_fill",
  "lox_disconnect",
  "igniter",
  "igniter_backup",
] as const;
type Relays = Record<(typeof RELAYS)[number], boolean>;
const allClosed = (): Relays =>
  Object.fromEntries(RELAYS.map((r) => [r, false])) as Relays;

/** Per-environment simulated hardware. */
class Station {
  bootMs = Date.now();
  state: FsState = "STANDBY";
  enterStateMs = Date.now();
  enterDepressPulseMs = Date.now();
  relays = allClosed();
  manual = {
    gn2_drain: false,
    gn2_fill: false,
    lox_fill: false,
    lox_disconnect: false,
  };
  igniterOnMs: number | null = null;
  lastMsgTs: number | undefined = undefined;

  // physical model, psi / lbf / °C
  // Tuned against static fires sf_1 (4/17/2026) and sf_2 (5/13/2026) from
  // https://aruzhanabill.github.io (see sim/README.md, "Where the numbers come from").
  copv = 3800;
  oxtank = 0;
  lox = 1; // fraction of LOX load remaining (tank assumed filled at boot)
  pilot = 0;
  qd = 0;
  injector = 0;
  chamber = 0;
  thrust = 0;
  ignited = false;
  eregStage: 0 | 1 | 2 = 0;

  constructor(public env: string) {}

  private pulsesPilotVent(s: FsState) {
    return [
      "GN2_STANDBY",
      "GN2_FILL",
      "GN2_PULSE_FILL_A",
      "GN2_PULSE_FILL_B",
      "GN2_PULSE_FILL_C",
    ].includes(s);
  }

  command(data: Record<string, unknown>) {
    const cmd = String(data.command);
    const prev = this.state;
    const map: Record<string, FsState> = {
      STATE_CUSTOM: "CUSTOM",
      STATE_ABORT: "ABORT",
      STATE_STANDBY: "STANDBY",
      STATE_GN2_STANDBY: "GN2_STANDBY",
      STATE_GN2_FILL: "GN2_FILL",
      STATE_GN2_PULSE_FILL_A: "GN2_PULSE_FILL_A",
      STATE_GN2_PULSE_FILL_B: "GN2_PULSE_FILL_B",
      STATE_GN2_PULSE_FILL_C: "GN2_PULSE_FILL_C",
      STATE_ENGINE_PRIME: "ENGINE_PRIME",
      STATE_FIRE: "FIRE",
      STATE_FIRE_MANUAL_PRESS_PILOT: "FIRE_MANUAL_PRESS_PILOT",
      STATE_FIRE_MANUAL_DOME_PILOT_CLOSE: "FIRE_MANUAL_DOME_PILOT_CLOSE",
      STATE_FIRE_MANUAL_IGNITER: "FIRE_MANUAL_IGNITER",
      STATE_FIRE_MANUAL_RUN: "FIRE_MANUAL_RUN",
    };

    if (cmd === "RESTART") {
      console.log(`[station:${this.env}] RESTART -> reboot`);
      Object.assign(this, new Station(this.env), { lastMsgTs: this.lastMsgTs });
      return;
    }
    if (cmd === "EREG_CLOSED") this.eregStage = 0;
    if (cmd === "EREG_STAGE_1") this.eregStage = 1;
    if (cmd === "EREG_STAGE_2") this.eregStage = 2;
    // ereg controller follows these states too (dev_ereg_control.h)
    if (cmd === "STATE_ABORT") this.eregStage = 0;
    if (cmd === "STATE_FIRE") this.eregStage = 2;

    const next = map[cmd];
    if (!next) {
      if (!cmd.startsWith("EREG_") && cmd !== "RECALIBRATE_TRANSDUCERS") {
        console.log(
          `[station:${this.env}] firmware has no handler for ${cmd}, ignored`,
        );
      }
      return;
    }
    this.state = next;
    if (next === "CUSTOM") {
      for (const r of RELAYS) this.relays[r] = Boolean(data[r]);
      for (const r of Object.keys(
        this.manual,
      ) as (keyof typeof this.manual)[]) {
        this.manual[r] = Boolean(data[r]);
      }
    }
    if (prev !== next) this.enterStateMs = Date.now();
    if (this.pulsesPilotVent(next) && !this.pulsesPilotVent(prev)) {
      this.enterDepressPulseMs = Date.now();
    }
    if (next === "FIRE") this.ignited = false;
    console.log(`[station:${this.env}] ${cmd}: ${prev} -> ${next}`);
  }

  tick(dtS: number) {
    const now = Date.now();
    const t = now - this.enterStateMs;

    // TransitionStates()
    const prev = this.state;
    if (this.state === "GN2_PULSE_FILL_A" && t >= kFillAPulseDurationMs)
      this.state = "GN2_STANDBY";
    if (this.state === "GN2_PULSE_FILL_B" && t >= kFillBPulseDurationMs)
      this.state = "GN2_STANDBY";
    if (this.state === "GN2_PULSE_FILL_C" && t >= kFillCPulseDurationMs)
      this.state = "GN2_STANDBY";
    if (this.state === "FIRE" && t >= kFireBackToStandbyDelayMs)
      this.state = "STANDBY";
    if (this.state === "FIRE_MANUAL_IGNITER" && t >= kMaxIgniterPulseDurationMs)
      this.state = "STANDBY";
    if (this.state === "CUSTOM" && t >= kMaxCustomOpenDurationMs)
      this.state = "STANDBY";
    if (prev !== this.state) {
      // firmware does not reset enter_state_ms on auto transitions; mirror that
      console.log(`[station:${this.env}] auto: ${prev} -> ${this.state}`);
    }

    // UpdateRelayStates()
    if (this.state !== "CUSTOM") {
      const r = allClosed();
      const tt = now - this.enterStateMs;
      switch (this.state) {
        case "ABORT":
          r.depress = true;
          break;
        case "GN2_FILL":
          r.gn2_fill =
            tt % (kGN2FillOpenDurationMs + kGN2FillClosedDurationMs) <
            kGN2FillOpenDurationMs;
          break;
        case "GN2_PULSE_FILL_A":
        case "GN2_PULSE_FILL_B":
        case "GN2_PULSE_FILL_C":
          r.gn2_fill = true;
          break;
        case "ENGINE_PRIME":
          r.press_pilot = true;
          if (tt >= kEnginePrimePilotOpenDelayMs) r.gn2_fill = true;
          break;
        case "FIRE":
          r.press_pilot = true;
          r.gn2_fill = true;
          if (tt >= kFireIgniterOnDelayMs && tt < kFireIgniterOffDelayMs)
            r.igniter = true;
          if (
            tt >= kFireIgniterOnDelayMs + 1000 &&
            tt < kFireIgniterOffDelayMs + 1000
          )
            r.igniter_backup = true;
          if (tt >= kFireRunOpenDelayMs) r.run = true;
          break;
        case "FIRE_MANUAL_PRESS_PILOT":
          r.press_pilot = true;
          break;
        case "FIRE_MANUAL_IGNITER":
          r.igniter = true;
          break;
        case "FIRE_MANUAL_RUN":
          r.run = true;
          r.lox_fill = true;
          break;
      }
      if (this.pulsesPilotVent(this.state)) {
        const period = kPilotValveOpenDurationMs + kPilotValveClosedDurationMs;
        r.depress =
          (now - this.enterDepressPulseMs) % period < kPilotValveOpenDurationMs;
      }
      r.gn2_drain ||= this.manual.gn2_drain;
      r.gn2_fill ||= this.manual.gn2_fill;
      r.lox_fill ||= this.manual.lox_fill;
      r.lox_disconnect ||= this.manual.lox_disconnect;
      this.relays = r;
    }

    // EnforceIgniterSafety()
    if (this.relays.igniter && this.igniterOnMs === null)
      this.igniterOnMs = now;
    if (!this.relays.igniter) this.igniterOnMs = null;
    if (
      this.igniterOnMs !== null &&
      now - this.igniterOnMs >= kMaxIgniterPulseDurationMs
    ) {
      this.relays.igniter = false;
    }

    this.physics(dtS);
  }

  /**
   * Rough plumbing model fitted to the 2026 static fires. Not physics, just
   * curves shaped like the logged data:
   *  - ereg holds oxtank at ~240 psi (stage 1) / ~450 psi (stage 2), limited by COPV
   *  - with run open, COPV blows down exponentially (tau ~4.5 s)
   *  - LOX runs out ~8 s after run opens; chamber ~300 psi while burning
   *  - load cells read negative under thrust (~5 lbf per psi chamber), peak spike ~-3000
   */
  private physics(dt: number) {
    const r = this.relays;
    const approach = (cur: number, target: number, rate: number) =>
      cur + (target - cur) * Math.min(1, rate * dt);

    if (r.gn2_fill && !r.run) this.copv = Math.min(4150, this.copv + 40 * dt);
    if (r.gn2_drain) this.copv = Math.max(0, this.copv - 300 * dt);
    if (r.lox_fill && !r.run) this.lox = Math.min(1, this.lox + 0.01 * dt);

    this.pilot = approach(
      this.pilot,
      r.press_pilot ? Math.min(this.copv, 600) : 0,
      3,
    );
    this.qd = approach(this.qd, r.gn2_fill ? this.copv * 0.9 : 0, 2);

    // ereg: stage setpoints seen in data; can't regulate above ~70% of COPV
    const setpoint = [0, 240, 450][this.eregStage];
    const regulated = Math.min(setpoint, this.copv * 0.7);
    let oxTarget = this.eregStage === 0 ? this.oxtank : regulated;
    if (r.depress) oxTarget = 0;
    // sf_2: ~240 -> ~450 psi in under 10 s after stage 2
    // fills slowly through the ereg, but drops fast when flowing or venting
    this.oxtank = approach(
      this.oxtank,
      oxTarget,
      r.depress || (r.run && oxTarget < this.oxtank) ? 1.5 : 0.35,
    );

    if (r.igniter || r.igniter_backup) this.ignited = true;
    const flowing = r.run && this.oxtank > 30;
    if (r.run) {
      // COPV blowdown, tau ~4.5 s (sf_2: 3450 -> 1693 @5 s -> 925 @8 s -> 79 @20 s)
      this.copv = Math.max(0, this.copv - (this.copv / 4.5) * dt);
    }
    if (flowing && this.lox > 0) {
      // ~7.5 s of LOX at full tank pressure (sf_2 thrust mostly gone by +8 s)
      this.lox = Math.max(0, this.lox - ((this.oxtank / 450) * dt) / 7.5);
    }
    const loxFlow = Math.min(1, this.lox / 0.15); // tails off over the last ~15%
    this.injector = approach(
      this.injector,
      flowing ? this.oxtank * 0.95 : 0,
      8,
    );
    const burning = flowing && this.ignited && loxFlow > 0;
    // chamber ~65% of tank pressure while LOX lasts (sf_2: ~270-300 psi)
    this.chamber = approach(
      this.chamber,
      burning ? this.oxtank * 0.65 * loxFlow : 0,
      5,
    );
    // burn is over once the run valve closes after having been open
    if (this.wasRunning && !r.run) this.ignited = false;
    this.wasRunning = r.run;
    // startup transient: brief spike to ~2x on ignition (sf_2 peak -3300 @2 s)
    const spike =
      burning && this.thrustT < 2.5
        ? 1 + Math.sin((this.thrustT / 2.5) * Math.PI)
        : 1;
    this.thrustT = burning ? this.thrustT + dt : 0;
    this.thrust = approach(this.thrust, -5.2 * this.chamber * spike, 6);
  }

  thrustT = 0;
  wasRunning = false;

  publish() {
    const ts = nowMicros();
    const n = (v: number, s = 1.5) => v + (Math.random() - 0.5) * 2 * s;
    const env = this.env;

    push(records, env, "FsState", {
      ts,
      data: {
        ms_since_boot: Date.now() - this.bootMs,
        state: this.state,
        ...this.relays,
      },
    });

    const copv1 = n(this.copv, 5),
      copv2 = n(this.copv, 5);
    const ox1 = n(this.oxtank),
      ox2 = n(this.oxtank);
    const pilot = n(this.pilot),
      qd = n(this.qd, 3);
    push(records, env, "FsLoxGn2Transducers", {
      ts,
      data: {
        ts: Date.now(),
        copv_1: copv1,
        copv_2: copv2,
        oxtank_1: ox1,
        oxtank_2: ox2,
        pilot_pres: pilot,
        qd_pres: qd,
        copv_1_median: this.copv,
        copv_2_median: this.copv,
        oxtank_1_median: this.oxtank,
        oxtank_2_median: this.oxtank,
        pilot_pres_median: this.pilot,
        qd_pres_median: this.qd,
        ereg_closed: this.eregStage === 0,
        ereg_stage_1: this.eregStage === 1,
        ereg_stage_2: this.eregStage === 2,
        current_angle:
          this.eregStage === 0
            ? 0
            : Math.min(85, 20 + 60 * (1 - Math.min(1, this.copv / 3400))),
        p_cont: 0,
        i_cont: 0,
        d_cont: 0,
      },
    });

    push(records, env, "FsInjectorTransducers", {
      ts,
      data: {
        ts: Date.now(),
        injector_1: n(this.injector),
        injector_2: n(this.injector),
        upper_cc: n(this.chamber),
        injector_manifold_1: n(this.injector),
        injector_manifold_1_median: this.injector,
        injector_manifold_2_median: this.injector,
      },
    });

    const flame = this.chamber > 20 ? 400 + this.chamber : 0;
    push(records, env, "FsThermocouples", {
      ts,
      data: {
        ts: Date.now(),
        gn2_internal_celsius: n(29.5, 0.2),
        gn2_external_celsius: n(20, 0.3),
        // sf_2 shows ~31-33 C throughout; no chill on these probes
        lox_upper_celsius: n(33, 0.3),
        lox_lower_celsius: n(31, 0.3),
        lox_celsius: n(18, 0.3),
        gn2_celsius: n(21, 0.3),
        gn2_surface_celsius: n(20 + flame * 0.01, 0.3),
      },
    });

    // data: pre-fire noise ~1.5 lbf, during burn hundreds of lbf of shake
    const lcNoise = this.chamber > 20 ? 60 : 1.5;
    push(records, env, "LoadCell1", {
      ts,
      data: n(this.thrust / 2 - 4.7, lcNoise),
    });
    push(records, env, "LoadCell2", {
      ts,
      data: n(this.thrust / 2 + 7.5, lcNoise),
    });

    const ma = (on: boolean) => (on ? n(450, 10) : n(2, 1));
    push(records, env, "RelayCurrentMonitor", {
      ts,
      data: {
        ts: Date.now(),
        gn2_drain_ma: ma(this.relays.gn2_drain),
        gn2_fill_ma: ma(this.relays.gn2_fill),
        depress_ma: ma(this.relays.depress),
        press_pilot_ma: ma(this.relays.press_pilot),
        run_ma: ma(this.relays.run),
        lox_fill_ma: ma(this.relays.lox_fill),
        lox_disconnect_ma: ma(this.relays.lox_disconnect),
        igniter_ma: ma(this.relays.igniter),
        igniter_backup_ma: ma(this.relays.igniter_backup),
      },
    });

    push(records, env, "CapFill", {
      ts,
      data: {
        ts: Date.now(), // cap_fill_actual = LOX tank level in % (UI: "Cap Fill Height")
        cap_fill_base: 100,
        cap_fill_actual: Math.max(0, n(this.lox * 100, 0.3)),
        board_temp: n(30, 0.2),
      },
    });

    push(records, env, "RadioGround", {
      ts,
      data: {
        gps_ts_tail: Date.now() % 100000,
        gps_fix: true,
        gps_fixquality: 1,
        gps_satellites: 9,
        gps_latitude_fixed: 352500000,
        gps_longitude_fixed: -1176000000,
        gps_altitude: 620,
        imu_az: n(1, 0.02),
      },
    });
  }

  /** Read new FiringStation commands, like main_fs_pi.py does on the real Pi. */
  pollCommands() {
    const list = messages.get(key(this.env, "FiringStation")) ?? [];
    for (const m of list) {
      if (this.lastMsgTs !== undefined && m.ts <= this.lastMsgTs) continue;
      this.lastMsgTs = m.ts;
      this.command(m.data as Record<string, unknown>);
    }
  }
}

const stations = new Map<string, Station>();
let lastTick = Date.now();

setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  for (const env of envsSeen) {
    let s = stations.get(env);
    if (!s) {
      s = new Station(env);
      // only react to commands sent after the station came up
      const existing = messages.get(key(env, "FiringStation")) ?? [];
      s.lastMsgTs = existing[existing.length - 1]?.ts;
      stations.set(env, s);
      console.log(`[station:${env}] online in STANDBY`);
    }
    s.pollCommands();
    s.tick(dt);
    s.publish();
  }
}, TICK_MS);

Bun.serve({
  port: PORT,
  fetch: (req) =>
    handle(req).catch((e) => {
      console.error(e);
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: CORS,
      });
    }),
});

console.log(`Fake firing station + data server on http://localhost:${PORT}`);
console.log(
  `Open the UI at http://localhost:5173/sim?server=http://localhost:${PORT}`,
);

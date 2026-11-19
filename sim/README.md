# Local fire simulator

Runs the full Control Center FIRE flow on a laptop. No ESP32s, Pi, Docker, or Postgres needed.

`fake-firing-station.ts` is one Bun process that:

- serves the same HTTP routes as `data-server-node` that the UI uses, with data kept in memory
- acts as the firing station: it reads `FiringStation` commands and publishes `FsState`, transducer, thermocouple, load cell, relay current, cap fill, and radio records
- copies the relay state machine and timings from `avionics-software/main/devices/dev_fs_relays.h`

## Run

```bash
bun run sim     # terminal 1: fake server + station on :3000
bun dev         # terminal 2: UI on :5173
```

Open http://localhost:5173/sim?server=http://localhost:3000

> **Always include `?server=http://localhost:3000`.** Without it, the UI talks to
> the real firing-station Pi (`DEFAULT_SERVER`), and pressing FIRE could reach real hardware.

## FIRE walkthrough

1. Tick **Calibration**, **Operation**, and **Fire** so the panel shows ARMED.
2. Press **GN2 STANDBY**. The UI only allows FIRE from GN2_STANDBY, CUSTOM, or ENGINE_PRIME.
3. Press **ENGINE PRIME**. Press pilot opens, then GN2 fill opens 1 s later.
4. Press **FIRE**. Timeline from the firmware:
   - T+3.0–3.5 s: igniter on
   - T+4.0–4.5 s: backup igniter on
   - T+10 s: run valve opens, and chamber pressure and thrust rise
   - T+30 s: returns to STANDBY on its own

## Where the numbers come from

- **Valve states and timing** are copied from the firmware (`dev_fs_relays.h`).
- **Sensor values** come from a rough model fitted to the two 2026 static fires
  logged at https://aruzhanabill.github.io (sf_1 on 4/17/2026, sf_2 on 5/13/2026).
  It matches the shape of the data, not exact values:

| Signal                         | Static fire data (sf_2)                                  | Simulator                                    |
| ------------------------------ | -------------------------------------------------------- | -------------------------------------------- |
| Igniter to run open            | 6.9 s                                                    | 7 s (from firmware)                          |
| Oxtank, ereg stage 2           | ~450 psi                                                 | 450 psi                                      |
| COPV at run open               | 3450 psi (sf_1: 4100)                                    | ~4100 psi                                    |
| COPV blowdown                  | 1693 @ +5 s, 925 @ +8 s, 79 @ +20 s                      | 1365 @ +5 s, 866 @ +7 s, 144 @ +15 s         |
| Chamber (oxtank_1) during burn | ~270-300 psi                                             | ~290 psi                                     |
| Thrust (LoadCell1 + LoadCell2) | negative, peak ~-3300 @ +2 s, ~-1500 @ +5 s, ~0 by +12 s | peak ~-2700 @ +1 s, ~-1500 @ +5 s, 0 by +9 s |
| Ereg angle                     | ~20° opening to ~80° as COPV empties                     | same                                         |
| Load cell noise                | ~1.5 lbf at rest, hundreds of lbf during burn            | 1.5 / 60 lbf                                 |

Notes:

- **Thrust reads negative** in the logged data, and the simulator keeps that sign.
- **sf_1 was messier.** The run valve closed at +4.5 s and reopened at +14.4 s, which isn't the
  automatic FIRE sequence. sf_2 matched the firmware timeline exactly, so the fit uses sf_2.
- **Not modeled:** the cold flow tests, LOX chill on thermocouples (the sf_2 probes stayed at
  31-33 °C), and the ereg PID terms (always 0).
- Do not use the simulator's values for engineering decisions.
  State is lost when the process restarts. Use `SIM_PORT=4000 bun run sim` to change the port.

# Follow-ups

Open items found while building the simulator and the UI redesign
(branch `ui/sim-and-redesign`). None of these are fixed yet. Items marked
**firmware** live in `avionics-software-2026-2027`.

Last updated: 2026-11-08.

## Safety

### 1. ABORT does not close manually opened valves (firmware)

`main/devices/dev_fs_relays.h` keeps four manual overrides (`gn2_drain`,
`gn2_fill`, `lox_fill`, `lox_disconnect`) set from a `STATE_CUSTOM` command
and ORs them into every state, including ABORT and STANDBY (the
"Apply manual overrides" block in `UpdateRelayStates`, and the comment
"persist when leaving CUSTOM state"). If someone opens GN2 Fill from Manual
relay control and then presses ABORT, the fill valve stays open.

- Decide with the avionics team whether ABORT (and STANDBY?) should clear
  the overrides.
- Until then, the UI could warn while any manual override is active.
- Found by reading the code; not reproduced on hardware. The simulator copies
  the same logic.

### 2. The UI defaults to the live firing-station server

`DEFAULT_SERVER` in `src/lib/serverSchemas.ts` is the real Pi (ngrok).
Opening the UI without `?server=` talks to hardware. The SIMULATION /
LIVE HARDWARE badge makes this visible, but local development could
default to the simulator (for example, use `http://localhost:3000` when
`import.meta.env.DEV`) so live hardware is always an explicit choice.

### Done: Command center FIRE skipped arming

Command center (Old view) had a FIRE button that did not require the
Calibration / Operation / Fire arming switches. Removed; FIRE is now only in
Firing control, behind arming.

## Data accuracy

### 3. Pilot and QD pressure are not real readings (firmware)

In `main/devices/dev_fs_lox_gn2_transducers.h` the `pilot_pres` reading is
commented out ("DISABLED") and `qd_pres` is hard-coded to `0.0f`. On
hardware the UI's Pilot and QD values are stale or 0. The simulator invents
values for them, so they look live in simulation.

- Either re-enable them in firmware (confirm which physical PTs they are), or
  label them "sensor disabled" in the UI.

### 4. "LOX level" shows 140%

The P&ID and Readings table show `cap_fill_actual` as a percent, but the raw
value is not a percentage (the simulator sends ~140). Confirm the cap-fill
sensor's units and calibration, then convert to percent full.

### 5. Pi script command numbers not checked

`main_fs_pi.py` (separate `pi-serial-uploader` repo) maps UI command names
to firmware numbers. It must match `enum class FsCommand` in
`main/include/packets.h` (e.g. `STATE_FIRE = 20`, `RESTART = 110`). Not
reviewed; that repo was not on this machine.

Also: `STATE_FIRE_MANUAL_DOME_PILOT_OPEN` is still in the UI's command list
(`fsCommandSchema`) but has no firmware number.

## Testing / shipping

### 6. Bench-test `test_send_command.py` (firmware)

Command numbers and baud rate were fixed (branch
`fix/test-command-numbers`) and checked against `packets.h` with a script,
but not run against an ESP32 (pyserial was not installed).

### 7. Review the UI against the simulator, then push

Have a teammate run `bun run sim` + `bun dev`, try the FIRE walkthrough in
`sim/README.md`, then push `ui/sim-and-redesign` and
`fix/test-command-numbers` and open PRs.

## Smaller notes

- Small windows (about 1024×768): the top row leaves little room, so the Live
  telemetry charts get short. Shorter relay/firing buttons would help.
- `src/components/` still contains the previous UI (`controlCenter.tsx`,
  `launchCommandCenter.tsx`, `cautionPanel.tsx`, ...). No route renders it,
  but it still has FIRE buttons. Consider deleting it so it can't be wired
  back in by accident.
- The E-Reg "Stage 1 / Stage 2" descriptions in the old view ("Slow fill to
  450 PSI", "PID-controlled, launch") don't match the firmware, where both
  stages target 450 psi. Confirm with the avionics team.

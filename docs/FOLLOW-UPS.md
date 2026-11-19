# Follow-ups

Open items found while building the simulator and the UI redesign
(branch `ui/sim-and-redesign`). None of these are fixed yet. Items marked
**firmware** live in `avionics-software-2026-2027`.

Last updated: 2026-11-18. Each item now has an **Options** list:
brainstormed fixes, not decisions. A ★ marks the suggested starting point.

## Safety

### 1. ABORT does not close manually opened valves (firmware) — fix agreed

**Decided (2026-11-13):** the team confirmed ABORT should close all manually
opened valves, leaving only depress open. Fix: avionics PR #2
(`fix/abort-clears-manual-overrides`, `1cee64b`) clears the four manual
overrides on ABORT. The simulator now does the same. Until a board is
flashed with PR #2, real ABORT still keeps manual valves open, so keep the
procedure (switch manual valves off before ABORT) until then.

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

**Options**

- ★ **Firmware: clear overrides on ABORT.** In `UpdateRelayStates`, zero the
  four override flags when entering ABORT (one line per flag, or a
  `ClearManualOverrides()` helper). ABORT is a "make safe" command, so it
  should win over everything. Mirror it in `sim/fake-firing-station.ts`.
- **Also clear on STANDBY / IDLE.** Stricter: any named state resets manual
  overrides; only `STATE_CUSTOM` sets them. Needs avionics sign-off, since an
  operator might rely on a valve staying open across a state change.
- **UI guard (no firmware change).** Show a red "Manual override active:
  GN2 Fill" banner in Firing control whenever an override is set, and make
  the UI send a `STATE_CUSTOM` with all overrides off right before ABORT.
  Fragile: two commands, and the second can be lost.
- **Expose override state in telemetry.** Add the four flags to the
  `fsState` record so the UI shows true override state instead of
  inferring it. Useful with any of the above.

### 2. The UI defaults to the live firing-station server

`DEFAULT_SERVER` in `src/lib/serverSchemas.ts` is the real Pi (ngrok).
Opening the UI without `?server=` talks to hardware. The SIMULATION /
LIVE HARDWARE badge makes this visible, but local development could
default to the simulator (for example, use `http://localhost:3000` when
`import.meta.env.DEV`) so live hardware is always an explicit choice.

**Options**

- ★ **Dev defaults to the simulator.** In `src/lib/serverSchemas.ts`:
  `DEFAULT_SERVER = import.meta.env.DEV ? "http://localhost:3000" : <ngrok>`.
  Production builds on the Pi are unchanged; `bun dev` never touches
  hardware by accident.
- **Env var.** `VITE_DEFAULT_SERVER` in `.env` / `.env.local`, falling back
  to the simulator. Lets each machine pick without code changes.
- **Make the start page ask.** The Environment key screen gets a
  "Simulator / Live hardware" choice (no default), and the ngrok URL moves
  behind "Live hardware".
- **Confirm on first live connect.** Reuse `ConfirmLiveDialog` the first time
  a session connects to a non-localhost server.

### Done: Command center FIRE skipped arming

Command center (Old view) had a FIRE button that did not require the
Calibration / Operation / Fire arming switches. Removed; FIRE is now only in
Firing control, behind arming.

## Data accuracy

### 3. Pilot pressure not read (intended); QD removed

**Resolved (2026-11-18): intended.** The electronics lead confirmed that
firmware not reading Pilot, and the pilot ADC config pointing at the same
input as COPV 1 (`i2c3`, `VIN`, `SingleEnded_0`), are both intentional. No
firmware change planned.

**UI:** `DISABLED_SIGNALS` in `src/stores/telemetryStore.ts` drops
`pilot_pres_psi` samples (firmware sends a hard-coded 0), so the P&ID gauge
and Readings row, the P&ID Pilot graph and the Data display card show
"Sensor off" instead of a fake 0. The header's pilot over-pressure warning
can't fire from it. If firmware ever sends Pilot again, remove the entry.

**QD (2026-11-13, office hours):** the QD pressure sensor no longer exists,
so QD was removed from the UI entirely. Firmware and the Pi still send
`qd_pres` as 0; the UI ignores it.

### 4. LOX level: field mix-up fixed; fill % scaling is intended

**Fixed (UI + sim):** firmware `dev_cap_fill.h` sends `cap_fill_base` =
fill height (%) and `cap_fill_actual` = probe capacitance (pF). The UI had
them swapped, so on hardware the LOX level would have shown the raw pF value
(~259+ at empty) as a percent. The UI now reads `cap_fill_base` as the
level, the P&ID clamps it to 0–100, and the simulator sends the same shape
as firmware. (The 140% came from the old simulator's values.) The old UI
also had the two field labels swapped.

**Resolved (2026-11-18): intended.** `CapacitanceToHeightPercent` scales
against the highest capacitance seen since boot rather than a fixed "full"
value. The electronics lead confirmed this is intentional. Expect the
percent to sit at 100% while the tank is filling; Cap Fill Capacitance (pF)
shows the raw reading. No firmware change planned.

### 5. Pi script checked against firmware and UI (2026-11-13)

Read `main_fs_pi.py` in `pi-serial-uploader` (commit `1369f5c`, "add
igniter_backup") and compared it with `main/include/packets.h` and the UI's
`src/lib/serverSchemas.ts`. **The chain matches on paper:**

- **Commands:** every number in the Pi's `FsCommands` equals
  `enum class FsCommand` in `packets.h` (`STATE_FIRE = 20`, `RESTART = 110`,
  ...). The 10-byte command packet layout matches `FsCommandPacket`.
- **States:** the Pi's `FsState` matches the firmware enum, and every name it
  sends is in the UI's `fsStateSchema`.
- **Telemetry:** all six packet layouts (sizes 14, 51, 20, 25, 17, 26) match
  the firmware structs field for field, and the JSON keys the Pi uploads are
  the ones the UI's schemas read (including `cap_fill_base` /
  `cap_fill_actual`, so the LOX fix in item 4 is right).

Still open:

- Not run end to end on hardware yet; Wednesday's test is the real check.
- If the UI ever sends a name the Pi doesn't know, the Pi logs
  "Invalid command" and drops it, so no wrong command reaches the board.
- `LoadCell1` / `LoadCell2` / `RadioGround` are not produced by this script
  (they come from elsewhere or not at all).

**Options**

- **Done (2026-11-13): dropped the stale commands.** Removed
  `STATE_FIRE_MANUAL_DOME_PILOT_OPEN` and `EREG_SET_GAINS` from
  `fsCommandSchema` and the old view's "FIRE DOME PILOT OPEN" buttons. Add
  them back only together with a firmware + Pi number.
- **CI check.** A script that parses `packets.h` and `main_fs_pi.py` and fails
  if names or numbers differ, so this stays true.

## Testing / shipping

### 6. Bench-test `test_send_command.py` (firmware)

Command numbers and baud rate were fixed (branch
`fix/test-command-numbers`) and checked against `packets.h` with a script,
but not run against an ESP32 (pyserial was not installed).

**Options**

- ★ **Bench run checklist.** `pip install pyserial`, flash a board, send
  each command once with relays disconnected (or LEDs on the outputs),
  confirm the state in the serial log. Record results in the PR.
- **Dry-run mode.** Add `--dry-run` to `test_send_command.py` that prints
  the bytes instead of sending, so packet framing can be checked without
  hardware.
- **Point it at the simulator.** Give the sim a serial-like TCP port so the
  same script can drive it. More work; mostly useful for CI.

### 7. Review the UI against the simulator, then push

Have a teammate run `bun run sim` + `bun dev`, try the FIRE walkthrough in
`sim/README.md`, then push `ui/sim-and-redesign` and
`fix/test-command-numbers` and open PRs.

Status: both branches pushed, draft PRs open (avionics #1, UI #2).

**Options**

- ★ **Teammate walkthrough.** One teammate runs `bun run sim` + `bun dev`,
  follows the FIRE walkthrough in `sim/README.md`, and leaves PR comments.
  Then mark both PRs ready.
- **Split PR #2.** It is large. Possible split: (a) simulator + live-status
  fixes, (b) redesign. Smaller reviews, but more rebasing.
- **Record a demo.** A 2-minute screen recording of the walkthrough attached
  to the PR lets reviewers skip local setup.

## Smaller notes

- **Done (2026-11-13): deleted the unreachable old UI.** An import trace from
  `src/main.tsx` found 31 files nothing could reach: 29 in `src/components/`
  (`controlCenter.tsx`, `launchCommandCenter.tsx`, `preFirePanel.tsx`, ...,
  several with FIRE buttons) plus `src/modes/ManualControlPanel.tsx` and
  `src/modes/StatusPanel.tsx`. All removed. The settings "Old view" toggle
  is unaffected: it uses `src/modes/ElectronicsRegulator`, `SolenoidTimers`
  and `ControlButtons`. Kept `src/lib/coolprop.ts` and `src/lib/date.ts`
  (also unreferenced now, but small helpers that may be reused).
- The E-Reg "Stage 1 / Stage 2" descriptions in Old view (`src/modes/ElectronicsRegulator.tsx`) ("Slow fill to
  450 PSI", "PID-controlled, launch") don't match the firmware, where both
  stages target 450 psi. Confirm with the avionics team.
  - Options: change the text to match firmware (both stages → 450 psi); or
    remove the descriptions; or, if the firmware is what's wrong, fix the
    stage-1 setpoint there.

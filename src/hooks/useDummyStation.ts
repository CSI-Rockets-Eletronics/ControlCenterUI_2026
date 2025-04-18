import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import {
  DEVICES,
  fsCommandMessageSchema,
  type FsInjectorTransducersRecord,
  type FsLoxGn2TransducersRecord,
  type FsState,
  type FsStateRecord,
  fsStateRecordSchema,
  type FsThermocouplesRecord,
  type LoadCellRecord,
  type RadioGroundRecord,
} from "@/lib/serverSchemas";
import { fsCommandToState } from "@/lib/serverSchemaUtils";

import { type Api, catchError, useApi } from "./useApi";
import { useEnvironmentKey } from "./useEnvironmentKey";
import { useSessionName } from "./useSessionName";

const TICK_INTERVAL = 1000;

class DummyStation {
  private readonly intervalId: Timer;
  private destroyed = false;

  private bootTimeMs; // ms
  private lastMessageTs: number | null = null;
  private state: FsState | null = null;

  constructor(
    private readonly api: Api,
    private readonly environmentKey: string,
  ) {
    this.bootTimeMs = Date.now();

    this.initOpState().catch((error) => {
      console.error("Failed to init dummy station opState", error);
    });

    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL);
  }

  destroy() {
    clearInterval(this.intervalId);
    this.destroyed = true;
  }

  private async initOpState() {
    const { records } = await catchError(
      this.api.records.get({
        $query: {
          environmentKey: this.environmentKey,
          device: DEVICES.fsState,
          take: "1",
        },
      }),
    );

    if (this.destroyed) return;

    if (records.length > 0) {
      this.state = fsStateRecordSchema.parse(records[0].data).state;
    } else {
      this.state = "STANDBY";
    }
  }

  private async tick() {
    if (this.state == null) return;

    const message = await catchError(
      this.api.messages.next.get({
        $query: {
          environmentKey: this.environmentKey,
          device: DEVICES.firingStation,
          afterTs:
            this.lastMessageTs != null ? String(this.lastMessageTs) : undefined,
        },
      }),
    );

    if (this.destroyed) return;

    if (message !== "NONE") {
      this.lastMessageTs = message.ts;
      const newOpState = fsCommandToState(
        fsCommandMessageSchema.parse(message.data).command,
      );
      if (newOpState) {
        this.state = newOpState;
      }
    }

    const randBool = () => Math.random() > 0.5;

    const randRange = (min: number, max: number) =>
      min + (max - min) * Math.random();

    const curTimeMs = Date.now();
    const ts = curTimeMs * 1000; // microseconds

    const fsStateRecord: FsStateRecord = {
      ms_since_boot: curTimeMs - this.bootTimeMs,
      state: this.state,
      gn2_abort: randBool(),
      gn2_fill: randBool(),
      pilot_vent: randBool(),
      dome_pilot_open: randBool(),
      run: randBool(),
      five_two: randBool(),
      water_suppression: randBool(),
      igniter: randBool(),
    };

    const fsLoxGn2TransducersRecordSchema: FsLoxGn2TransducersRecord = {
      ts,
      lox_upper: randRange(0, 1000),
      chamber: randRange(0, 1000),
      gn2_manifold_1: randRange(0, 5000),
      gn2_manifold_2: randRange(0, 5000),
      lox_upper_median: randRange(0, 1000),
      chamber_median: randRange(0, 1000),
      gn2_manifold_1_median: randRange(0, 5000),
      gn2_manifold_2_median: randRange(0, 5000),
    };

    const fsInjectorTransducersRecord: FsInjectorTransducersRecord = {
      ts,
      injector_manifold_1: randRange(0, 1000),
      injector_manifold_2: randRange(0, 1000),
      injector_manifold_1_median: randRange(0, 1000),
      injector_manifold_2_median: randRange(0, 1000),
    };

    const fsThermocouplesRecord: FsThermocouplesRecord = {
      ts,
      lox_celsius: randRange(-200, 200),
      gn2_celsius: randRange(-200, 200),
    };

    const loadCell1Record: LoadCellRecord = randRange(-30, 1000);
    const loadCell2Record: LoadCellRecord = randRange(-30, 1000);

    const radioGroundRecord: RadioGroundRecord = {
      gps_ts_tail: Math.floor(randRange(0, 256)),
      gps_fix: true,
      gps_fixquality: 1,
      gps_satellites: Math.floor(randRange(0, 6)),
      gps_latitude_fixed: randRange(-90, 90) * 1e7,
      gps_longitude_fixed: randRange(-180, 180) * 1e7,
      gps_altitude: randRange(0, 30_000),
      imu_az: randRange(-2e4, 2e4),
    };

    await Promise.all([
      catchError(
        this.api.records.post({
          environmentKey: this.environmentKey,
          device: DEVICES.fsState,
          data: fsStateRecord,
        }),
      ),
      catchError(
        this.api.records.post({
          environmentKey: this.environmentKey,
          device: DEVICES.fsLoxGn2Transducers,
          data: fsLoxGn2TransducersRecordSchema,
        }),
      ),
      catchError(
        this.api.records.post({
          environmentKey: this.environmentKey,
          device: DEVICES.fsInjectorTransducers,
          data: fsInjectorTransducersRecord,
        }),
      ),
      catchError(
        this.api.records.post({
          environmentKey: this.environmentKey,
          device: DEVICES.fsThermocouples,
          data: fsThermocouplesRecord,
        }),
      ),
      catchError(
        this.api.records.post({
          environmentKey: this.environmentKey,
          device: DEVICES.loadCell1,
          data: loadCell1Record,
        }),
      ),
      catchError(
        this.api.records.post({
          environmentKey: this.environmentKey,
          device: DEVICES.loadCell2,
          data: loadCell2Record,
        }),
      ),
      catchError(
        this.api.records.post({
          environmentKey: this.environmentKey,
          device: DEVICES.radioGround,
          data: radioGroundRecord,
        }),
      ),
    ]);
  }
}

export function useDummyStation() {
  const api = useApi();

  const environmentKey = useEnvironmentKey();
  const sessionName = useSessionName();

  const [searchParams] = useSearchParams();
  const enabled = searchParams.has("dummy") && sessionName == null;

  const createdSession = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // hack to prevent React's 2x effect call
    if (createdSession.current) return;
    createdSession.current = true;

    catchError(api.sessions.create.post({ environmentKey })).catch((error) => {
      console.log("Failed to create session", error);
    });
  }, [api, enabled, environmentKey]);

  useEffect(() => {
    if (!enabled) return;

    const dummyStation = new DummyStation(api, environmentKey);
    return () => dummyStation.destroy();
  }, [api, enabled, environmentKey]);
}

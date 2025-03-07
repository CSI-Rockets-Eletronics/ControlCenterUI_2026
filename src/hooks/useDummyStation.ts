import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { DEVICES } from "@/lib/serverSchemas";

import { type Api, catchError, useApi } from "./useApi";
import { useEnvironmentKey } from "./useEnvironmentKey";
import { useSessionName } from "./useSessionName";

const TICK_INTERVAL = 1000;

class DummyStation {
  private readonly intervalId: Timer;
  private destroyed = false;

  private bootTime; // microseconds
  private lastMessageTs: number | null = null;
  private opState: StationOpState | null = null;

  constructor(
    private readonly api: Api,
    private readonly environmentKey: string,
  ) {
    this.bootTime = Date.now() * 1000;

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
          device: DEVICES.firingStation,
          take: "1",
        },
      }),
    );

    if (this.destroyed) return;

    if (records.length > 0) {
      this.opState = parseRemoteStationState(
        remoteStationStateSchema.parse(records[0].data),
      ).opState;
    } else {
      this.opState = "standby";
    }
  }

  private async tick() {
    if (this.opState == null) return;

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
      this.opState = remoteSetStationOpStateCommandSchema.parse(
        message.data,
      ).command;
    }

    const randBool = () => Math.random() > 0.5;

    const randRange = (min: number, max: number) =>
      min + (max - min) * Math.random();

    const curTime = Date.now() * 1000;

    const remoteStationState: RemoteStationState = {
      stateByte: dummyToStateByte(this.opState),
      relayStatusByte: toRelayStatusByte({
        fill: randBool(),
        vent: randBool(),
        abort: randBool(),
        pyroCutter: randBool(),
        igniter: randBool(),
        pValve: randBool(),
        fillServoClosed: randBool(),
      }),
      t1: randRange(0, 1e6),
      t2: randRange(0, 1e6),
      timeSinceBoot: curTime - this.bootTime,
      timeSinceCalibration: curTime - this.bootTime,
    };

    const loadCellState: LoadCellState = randRange(-30, 1000);

    const radioGroundState: RadioGroundState = {
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
          device: DEVICES.firingStation,
          data: remoteStationState,
        }),
      ),
      catchError(
        this.api.records.post({
          environmentKey: this.environmentKey,
          device: DEVICES.loadCell,
          data: loadCellState,
        }),
      ),
      catchError(
        this.api.records.post({
          environmentKey: this.environmentKey,
          device: DEVICES.radioGround,
          data: radioGroundState,
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

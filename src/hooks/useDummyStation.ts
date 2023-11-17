import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { api, catchError } from "@/lib/api";
import {
  dummyToStateByte,
  parseRemoteStationState,
  remoteSetStationOpStateCommandSchema,
  type RemoteStationState,
  remoteStationStateSchema,
  toRelayStatusByte,
} from "@/lib/stationInterface";
import { type GpsState, type StationOpState } from "@/lib/stationState";

import { useEnvironmentKey } from "./useEnvironmentKey";
import { type Paths, usePaths } from "./usePaths";
import { useSession } from "./useSession";

const TICK_INTERVAL = 1000;

class DummyStation {
  private readonly intervalId: number;
  private destroyed = false;

  private bootTime; // microseconds
  private lastMessageTs: number | null = null;
  private opState: StationOpState | null = null;

  constructor(
    private readonly environmentKey: string,
    private readonly paths: Paths,
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
      api.records.get({
        $query: {
          environmentKey: this.environmentKey,
          path: this.paths.firingStation,
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
      api.messages.next.get({
        $query: {
          environmentKey: this.environmentKey,
          path: this.paths.firingStation,
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
        pyroValve: randBool(),
        pyroCutter: randBool(),
        igniter: randBool(),
      }),
      oxTankMPSI: randRange(0, 100),
      ccMPSI: randRange(0, 100),
      timeSinceBoot: curTime - this.bootTime,
      timeSinceCalibration: curTime - this.bootTime,
    };

    const gpsState: GpsState = {
      lat: randRange(0, 90),
      long: randRange(-90, 0),
      alt: randRange(0, 10_000),
    };

    await Promise.all([
      catchError(
        api.records.post({
          environmentKey: this.environmentKey,
          path: this.paths.firingStation,
          data: remoteStationState,
        }),
      ),
      catchError(
        api.records.post({
          environmentKey: this.environmentKey,
          path: this.paths.gps,
          data: gpsState,
        }),
      ),
    ]);
  }
}

export function useDummyStation() {
  const environmentKey = useEnvironmentKey();
  const session = useSession();

  const paths = usePaths();

  const [searchParams] = useSearchParams();
  const enabled = searchParams.has("dummy") && session == null;

  const createdSession = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // hack to prevent React's 2x effect call
    if (createdSession.current) return;
    createdSession.current = true;

    catchError(api.sessions.create.post({ environmentKey })).catch((error) => {
      console.log("Failed to create session", error);
    });
  }, [enabled, environmentKey]);

  useEffect(() => {
    if (!enabled) return;

    const dummyStation = new DummyStation(environmentKey, paths);
    return () => dummyStation.destroy();
  }, [enabled, environmentKey, paths]);
}

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { type Api } from "@/lib/api";
import {
  dummyToRelayStatusByte,
  dummyToStateByte,
  GPS_STATE_SOURCE,
  parseRemoteStationState,
  remoteSetStationOpStateCommandSchema,
  type RemoteStationState,
  remoteStationStateSchema,
  SET_STATION_OP_STATE_TARGET,
  STATION_STATE_SOURCE,
} from "@/lib/stationInterface";
import { type GpsState, type StationOpState } from "@/lib/stationState";

const TICK_INTERVAL = 1000;

class DummyStation {
  private readonly intervalId: number;
  private destroyed = false;

  private bootTime; // microseconds
  private opState: StationOpState | null = null;

  constructor(private readonly api: Api) {
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
    const records = await this.api.listRecords(
      {
        source: STATION_STATE_SOURCE,
        take: 1,
      },
      remoteStationStateSchema
    );

    if (this.destroyed) return;

    if (records.length > 0) {
      this.opState = parseRemoteStationState(records[0].data).opState;
    } else {
      this.opState = "standby";
    }
  }

  private async tick() {
    if (this.opState == null) return;

    const message = await this.api.getNextMessage(
      {
        target: SET_STATION_OP_STATE_TARGET,
      },
      remoteSetStationOpStateCommandSchema
    );

    if (this.destroyed) return;

    if (message) {
      this.opState = message.data.command;
    }

    const randBool = () => Math.random() > 0.5;

    const randRange = (min: number, max: number) =>
      min + (max - min) * Math.random();

    const curTime = Date.now() * 1000;

    const remoteStationState: RemoteStationState = {
      stateByte: dummyToStateByte(this.opState),
      relayStatusByte: dummyToRelayStatusByte({
        fill: randBool(),
        vent: randBool(),
        pyroValve: randBool(),
        pyroCutter: randBool(),
        igniter: randBool(),
        extra: randBool(),
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

    this.api.createRecord({
      source: STATION_STATE_SOURCE,
      data: remoteStationState,
    });

    this.api.createRecord({
      source: GPS_STATE_SOURCE,
      data: gpsState,
    });
  }
}

export function useDummyStation(api: Api) {
  const [searchParams] = useSearchParams();

  const enabled = searchParams.has("dummy");
  const newSessionName = searchParams.get("session");

  const lastCreatedSessionName = useRef<string | null>(null);

  useEffect(() => {
    // hack to prevent React's 2x effect call
    if (newSessionName === lastCreatedSessionName.current) return;
    lastCreatedSessionName.current = newSessionName;

    if (newSessionName != null) {
      void api.createSession({ name: newSessionName });
    }
  }, [api, newSessionName]);

  useEffect(() => {
    if (!enabled) return;

    const dummyStation = new DummyStation(api);
    return () => dummyStation.destroy();
  }, [api, enabled]);
}

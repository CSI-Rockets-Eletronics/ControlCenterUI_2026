import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { type Api } from "@/lib/api";
import {
  dummyToActuatorStateByte,
  dummyToStateByte,
  type RemoteStationState,
} from "@/lib/stationInterface";
import {
  GPS_STATE_SOURCE,
  type GpsState,
  SET_STATION_OP_STATE_TARGET,
  STATION_STATE_SOURCE,
  type StationOpState,
  stationOpStateSchema,
  stationStateSchema,
} from "@/lib/stationState";

const TICK_INTERVAL = 1000;

class DummyStation {
  private readonly intervalId: number;
  private destroyed = false;

  private opState: StationOpState | null = null;

  constructor(private readonly api: Api) {
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
        source: SET_STATION_OP_STATE_TARGET,
        take: 1,
      },
      stationStateSchema
    );

    if (this.destroyed) return;

    if (records.length > 0) {
      this.opState = records[0].data.opState;
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
      stationOpStateSchema
    );

    if (this.destroyed) return;

    if (message) {
      this.opState = message.data;
    }

    const randBool = () => Math.random() > 0.5;

    const randRange = (min: number, max: number) =>
      min + (max - min) * Math.random();

    const remoteStationState: RemoteStationState = {
      stateByte: dummyToStateByte(this.opState),
      actuatorStatusByte: dummyToActuatorStateByte({
        fill: randBool(),
        vent: randBool(),
        pyroValve: randBool(),
        pyroCutter: randBool(),
        igniter: randBool(),
        extra: randBool(),
      }),
      oxidizerTankTransducerValue: randRange(0, 100),
      combustionChamberTransducerValue: randRange(0, 100),
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

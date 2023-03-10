import { useEffect } from "react";

import { type Api } from "@/lib/api";
import {
  SET_STATION_OP_STATE_TARGET,
  STATION_STATE_SOURCE,
  type StationOpState,
  stationOpStateSchema,
  type StationState,
} from "@/lib/stationInterface";

const TICK_INTERVAL = 1000;

class DummyStation {
  private readonly intervalId: number;
  private destroyed = false;

  private opState: StationOpState = "standby";

  constructor(private readonly api: Api) {
    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL);
  }

  destroy() {
    clearInterval(this.intervalId);
    this.destroyed = true;
  }

  private async tick() {
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

    const state: StationState = {
      opState: this.opState,
      relays: {
        fill: randBool(),
        vent: randBool(),
        pyroValve: randBool(),
        pyroCutter: randBool(),
        igniter: randBool(),
        extra: randBool(),
      },
      status: {
        batteryConnected: randBool(),
        fillTankOpen: randBool(),
        ignitersConnected: randBool(),
        mechPowerOn: randBool(),
        combustionPressure: randRange(0, 100),
        oxidizerTankTemp: randRange(0, 100),
      },
      gps: {
        lat: randRange(0, 10_000),
        long: randRange(0, 10_000),
        alt: randRange(0, 10_000),
      },
    };

    this.api.createRecord({
      source: STATION_STATE_SOURCE,
      data: state,
    });
  }
}

export function useDummyStation(api: Api, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const dummyStation = new DummyStation(api);
    return () => dummyStation.destroy();
  }, [api, enabled]);
}

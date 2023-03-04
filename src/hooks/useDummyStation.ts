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

    const state: StationState = {
      opState: this.opState,
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

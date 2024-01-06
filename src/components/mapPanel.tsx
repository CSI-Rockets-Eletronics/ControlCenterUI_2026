import { shallowEqual } from "@xstate/react";
import { Map, Marker, Overlay, type Point, ZoomControl } from "pigeon-maps";
import { memo, useCallback, useEffect, useState } from "react";

import { type GpsState } from "@/lib/stationState";

import { Button } from "./design/button";
import { Panel } from "./design/panel";
import { useLaunchMachineSelector } from "./launchMachineProvider";

const INITIAL_ZOOM = 16;

export const MapPanel = memo(function MapPanel() {
  const rocketAnchor: Point | undefined = useLaunchMachineSelector((state) => {
    function getGpsState(): GpsState | null {
      const { radioGround, gps } = state.context.deviceStates;
      if (radioGround && gps) {
        return radioGround.ts > gps.ts ? radioGround.data.gps : gps.data;
      }
      if (!radioGround && gps) return gps.data;
      if (radioGround && !gps) return radioGround.data.gps;
      return null;
    }

    const gpsState = getGpsState();

    if (
      gpsState &&
      gpsState.latitude_fixed != null &&
      gpsState.longitude_fixed != null
    ) {
      return [gpsState.latitude_fixed / 1e7, gpsState.longitude_fixed / 1e7];
    }
  }, shallowEqual);

  const [localAnchor, setLocalAnchor] = useState<Point | undefined>();
  const [hasLocationError, setHasLocationError] = useState(false);

  const [center, setCenter] = useState<Point | undefined>();
  const [zoom, setZoom] = useState(INITIAL_ZOOM);

  const [initialCenterSet, setInitialCenterSet] = useState(false);

  useEffect(() => {
    if (hasLocationError) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocalAnchor([pos.coords.latitude, pos.coords.longitude]);
      },
      (error) => {
        console.error(error);
        setHasLocationError(true);
      },
      {
        enableHighAccuracy: true,
      },
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [hasLocationError]);

  useEffect(() => {
    if (localAnchor && !initialCenterSet) {
      setCenter(localAnchor);
      setInitialCenterSet(true);
    }
  }, [initialCenterSet, localAnchor]);

  const handleBoundsChanged = useCallback(
    ({ center, zoom }: { center: Point; zoom: number }) => {
      setCenter(center);
      setZoom(zoom);
    },
    [],
  );

  const centerOnLocalAnchor = useCallback(() => {
    if (localAnchor) {
      setCenter(localAnchor);
      setZoom(INITIAL_ZOOM);
    }
  }, [localAnchor]);

  const centerOnRocketAnchor = useCallback(() => {
    if (rocketAnchor) {
      setCenter(rocketAnchor);
      setZoom(INITIAL_ZOOM);
    }
  }, [rocketAnchor]);

  const retryLocalLocation = useCallback(() => {
    setHasLocationError(false);
  }, []);

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-lg text-gray-text">Map</p>
      <div className="overflow-hidden grow rounded-md h-[400px]">
        <Map
          center={center}
          zoom={zoom}
          onBoundsChanged={handleBoundsChanged}
          zoomSnap={false}
        >
          <ZoomControl />

          {localAnchor && (
            <Marker
              width={60}
              color="white"
              anchor={localAnchor}
              onClick={centerOnLocalAnchor}
            />
          )}
          {localAnchor && (
            <Overlay anchor={localAnchor}>
              <div className="pointer-events-none -translate-x-1/2 -translate-y-[54px]">
                🦁
              </div>
            </Overlay>
          )}

          {rocketAnchor && (
            <Marker
              width={60}
              color="white"
              anchor={rocketAnchor}
              onClick={centerOnRocketAnchor}
            />
          )}
          {rocketAnchor && (
            <Overlay anchor={rocketAnchor}>
              <div className="pointer-events-none -translate-x-1/2 -translate-y-[54px]">
                🚀
              </div>
            </Overlay>
          )}
        </Map>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <Button
          color="green"
          disabled={!localAnchor}
          onClick={centerOnLocalAnchor}
        >
          CENTER ON ME
        </Button>
        <Button
          color="green"
          disabled={!rocketAnchor}
          onClick={centerOnLocalAnchor}
        >
          CENTER ON ROCKET
        </Button>
        {hasLocationError && (
          <Button color="red" disabled={false} onClick={retryLocalLocation}>
            FAILED TO GET YOUR LOCATION - CLICK TO RETRY
          </Button>
        )}
      </div>
    </Panel>
  );
});

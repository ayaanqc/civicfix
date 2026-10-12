"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/constants";
import type { ReportPayload } from "@/lib/types";
import { createMarkerIcon, userDotIcon } from "./marker-icons";

export interface Bbox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface FlyTarget {
  lat: number;
  lng: number;
  ts: number;
}

interface MapViewProps {
  reports: ReportPayload[];
  activeId: string | null;
  selecting: boolean;
  flyTarget: FlyTarget | null;
  userPos: { lat: number; lng: number } | null;
  onViewportChange: (bbox: Bbox) => void;
  onMarkerClick: (id: string) => void;
  onMapReady: (map: L.Map) => void;
}

function emitViewport(map: L.Map, cb: (bbox: Bbox) => void) {
  const b = map.getBounds();
  /* Slightly pad the bounds so edge pins don't pop while panning. */
  const pad = b.getNorthEast().lat - b.getSouthWest().lat;
  cb({
    minLat: b.getSouth() - pad * 0.1,
    maxLat: b.getNorth() + pad * 0.1,
    minLng: b.getWest() - pad * 0.1,
    maxLng: b.getEast() + pad * 0.1,
  });
}

/** Bridges Leaflet imperative events into React props. */
function MapBridge({
  selecting,
  flyTarget,
  onViewportChange,
  onMapReady,
}: Pick<
  MapViewProps,
  "selecting" | "flyTarget" | "onViewportChange" | "onMapReady"
>) {
  const map = useMap();

  useMapEvents({
    moveend: () => emitViewport(map, onViewportChange),
  });

  useEffect(() => {
    onMapReady(map);
    emitViewport(map, onViewportChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    map.getContainer().classList.toggle("cf-map--selecting", selecting);
  }, [map, selecting]);

  useEffect(() => {
    if (!flyTarget) return;
    map.flyTo([flyTarget.lat, flyTarget.lng], Math.max(map.getZoom(), 16), {
      duration: 0.9,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTarget?.ts]);

  return null;
}

export default function MapView({
  reports,
  activeId,
  selecting,
  flyTarget,
  userPos,
  onViewportChange,
  onMarkerClick,
  onMapReady,
}: MapViewProps) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      className="h-full w-full"
      maxZoom={19}
      minZoom={11}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <ZoomControl position="bottomleft" />
      <MapBridge
        selecting={selecting}
        flyTarget={flyTarget}
        onViewportChange={onViewportChange}
        onMapReady={onMapReady}
      />

      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={createMarkerIcon(
            report.category,
            report.status,
            report.id === activeId,
            Boolean(report.syncing),
          )}
          zIndexOffset={
            report.id === activeId ? 1000 : report.status === "pending" ? 100 : 0
          }
          eventHandlers={{ click: () => onMarkerClick(report.id) }}
        />
      ))}

      {userPos && (
        <Marker
          position={[userPos.lat, userPos.lng]}
          icon={userDotIcon()}
          interactive={false}
          keyboard={false}
          zIndexOffset={2000}
        />
      )}
    </MapContainer>
  );
}

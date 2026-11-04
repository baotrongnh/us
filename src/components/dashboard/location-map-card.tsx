"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import siteConfig from "@/data/site-config.json";
import { useLanguage } from "@/components/dashboard/language-context";

type MapLocation = {
  id: string;
  name?: string;
  city?: string;
  gender: "male" | "female";
  coords: [number, number];
};

const mapConfig = siteConfig.map;
const mapLocations: MapLocation[] = mapConfig.locations.map((location) => {
  const [latitude, longitude] = location.coords;
  if (
    (location.gender !== "male" && location.gender !== "female") ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(`Invalid map location "${location.id}" in site-config.json.`);
  }

  return {
    id: location.id,
    name: location.name,
    city: location.city,
    gender: location.gender,
    coords: [latitude, longitude],
  };
});

const LocationMapBody = dynamic(
  async () => {
    const [{ MapContainer, Marker, TileLayer, Tooltip, useMap }, { divIcon, latLngBounds }] = await Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]);

    function FitMapToLocations({ locations }: { locations: MapLocation[] }) {
      const map = useMap();

      useEffect(() => {
        if (locations.length === 0) return;
        const bounds = latLngBounds(locations.map((location) => location.coords));
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6, animate: false });
      }, [locations, map]);

      return null;
    }

    return function LocationMapBodyInner({
      tileUrl,
      onTilesLoaded,
      onTileError,
    }: {
      tileUrl: string;
      onTilesLoaded: () => void;
      onTileError: () => void;
    }) {
      const markerIcon = (gender: "male" | "female") =>
        divIcon({
          className: "date-map-pin-wrapper",
          html: `<div class="date-map-pin is-${gender}"><span></span></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

      return (
        <MapContainer
          center={mapConfig.center as [number, number]}
          zoom={mapConfig.zoom}
          scrollWheelZoom
          attributionControl={false}
          className="date-map-instance"
        >
          <TileLayer
            url={tileUrl}
            {...(tileUrl.includes("{s}") ? { subdomains: "abcd" } : {})}
            maxZoom={19}
            eventHandlers={{
              load: onTilesLoaded,
              tileerror: onTileError,
            }}
          />
          <FitMapToLocations locations={mapLocations} />
          {mapLocations.map((marker) => (
            <Marker
              key={marker.id}
              position={marker.coords}
              icon={markerIcon(marker.gender)}
            >
              {(marker.name || marker.city) && (
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -10]}
                  className="date-map-tooltip"
                >
                  <span className="tooltip-name">{marker.name}</span>
                  {marker.city && <span className="tooltip-city">({marker.city})</span>}
                </Tooltip>
              )}
            </Marker>
          ))}
        </MapContainer>
      );
    };
  },
  { ssr: false, loading: () => null }
);

export function LocationMapCard() {
  const { t } = useLanguage();
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const vietmapApiKey = process.env.NEXT_PUBLIC_VIETMAP_KEY;
  const tileUrl =
    process.env.NEXT_PUBLIC_MAP_TILE_URL ||
    (vietmapApiKey
      ? `https://maps.vietmap.vn/maps/tiles/st/{z}/{x}/{y}.png?apikey=${encodeURIComponent(vietmapApiKey)}`
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");

  return (
    <article className="location-map-card">
      <div
        className="date-map-pane"
        aria-label={t("whereWeAre")}
        aria-busy={mapStatus === "loading"}
      >
        <LocationMapBody
          tileUrl={tileUrl}
          onTilesLoaded={() => setMapStatus("ready")}
          onTileError={() => setMapStatus("error")}
        />
        {mapStatus !== "ready" && (
          <div
            className={`date-map-loading ${mapStatus === "error" ? "has-error" : ""}`}
            role={mapStatus === "error" ? "alert" : "status"}
            aria-busy={mapStatus === "loading"}
          >
            {mapStatus === "error" ? (
              <AlertCircle size={22} aria-hidden="true" />
            ) : (
              <LoaderCircle size={22} aria-hidden="true" />
            )}
            <span>{t(mapStatus === "error" ? "mapLoadFailed" : "loadingMap")}</span>
          </div>
        )}
      </div>
    </article>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import siteConfig from "@/data/site-config.json";
import { useLanguage } from "@/components/dashboard/language-context";
import type { MapLocation } from "@/lib/map-location";

const mapConfig = siteConfig.map;

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

    function groupLocations(locations: MapLocation[]) {
      const groups = new Map<string, MapLocation[]>();
      for (const location of locations) {
        const key = `${location.coords[0]},${location.coords[1]}`;
        const group = groups.get(key);
        if (group) group.push(location);
        else groups.set(key, [location]);
      }

      return [...groups.values()].map((members) => ({
        id: members.map(({ id }) => id).join("-"),
        name: members.map(({ name }) => name).join(" & "),
        city: [...new Set(members.map(({ city }) => city))].join(" & "),
        gender: members.length > 1 ? "together" as const : members[0].gender,
        coords: members[0].coords,
      }));
    }

    return function LocationMapBodyInner({
      locations,
      tileUrl,
      onTilesLoaded,
      onTileError,
    }: {
      locations: MapLocation[];
      tileUrl: string;
      onTilesLoaded: () => void;
      onTileError: () => void;
    }) {
      const markerIcon = (gender: "male" | "female" | "together") =>
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
          <FitMapToLocations locations={locations} />
          {groupLocations(locations).map((marker) => (
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

export function LocationMapCard({ locations }: { locations: MapLocation[] }) {
  const { t } = useLanguage();
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const vietmapApiKey = process.env.NEXT_PUBLIC_VIETMAP_KEY;
  const tileUrl =
    process.env.NEXT_PUBLIC_MAP_TILE_URL ||
    (vietmapApiKey
      ? `https://maps.vietmap.vn/maps/tiles/st/{z}/{x}/{y}.png?apikey=${encodeURIComponent(vietmapApiKey)}`
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");

  return (
    <article className="location-map-card" data-tour="map">
      <div
        className="date-map-pane"
        aria-label={t("whereWeAre")}
        aria-busy={mapStatus === "loading"}
      >
        <LocationMapBody
          locations={locations}
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

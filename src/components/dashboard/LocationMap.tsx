"use client";

import { ExternalLink, MapPin } from "lucide-react";

interface LocationMapProps {
  lat: number;
  lng: number;
  accuracy?: number;
  deviceName?: string;
}

/**
 * LocationMap
 *
 * FIX: This file was 0 bytes. Renders a static Google Maps embed for a given
 * lat/lng pair and provides an "Open in Google Maps" link. A full interactive
 * map (Mapbox / Leaflet) can replace this iframe later without changing the
 * props contract.
 */
export function LocationMap({ lat, lng, accuracy, deviceName }: LocationMapProps) {
  const mapsUrl    = `https://www.google.com/maps?q=${lat},${lng}`;
  const embedUrl   =
    `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

  return (
    <div className="overflow-hidden rounded-xl border dark:border-white/10 border-slate-200">
      {/* Static embed */}
      <iframe
        title={`Location of ${deviceName ?? "device"}`}
        src={embedUrl}
        width="100%"
        height="220"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block border-0"
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 dark:bg-white/5 bg-slate-50">
        <p className="flex items-center gap-1.5 text-xs dark:text-slate-400 text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-red-400" />
          {lat.toFixed(6)}, {lng.toFixed(6)}
          {accuracy != null && (
            <span className="ml-1 opacity-60">±{Math.round(accuracy)}m</span>
          )}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
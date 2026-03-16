"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Map, { Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { apiFetch } from "@/app/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: string;
  title: string;
  date?: string;
  status: string;
  current_signup_count: number;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface EventCluster {
  key: string;
  lat: number;
  lng: number;
  locationName: string;
  events: AdminEvent[];
  totalVolunteers: number;
  completedCount: number;
  upcomingCount: number;
  activeCount: number;
  cancelledCount: number;
}

interface ResourceMarker {
  id: string;
  lng: number;
  lat: number;
  type: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clusterKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

// Green gradient: light → dark as count grows; each tier also gets a larger halo
function heatStyle(count: number): {
  dotSize: number;
  dotColor: string;
  haloSize: number;
  haloRgb: string;
  haloOpacity: number;
} {
  if (count >= 8) return { dotSize: 30, dotColor: "#14532d", haloSize: 76, haloRgb: "20,83,45",   haloOpacity: 0.30 };
  if (count >= 4) return { dotSize: 22, dotColor: "#15803d", haloSize: 54, haloRgb: "21,128,61",  haloOpacity: 0.24 };
  if (count >= 2) return { dotSize: 16, dotColor: "#16a34a", haloSize: 38, haloRgb: "22,163,74",  haloOpacity: 0.20 };
  return               { dotSize: 12, dotColor: "#4ade80",  haloSize: 26, haloRgb: "74,222,128", haloOpacity: 0.16 };
}

function formatDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminEventMap({ height = 460 }: { height?: number }) {
  const [viewState, setViewState] = useState({ longitude: -73.94, latitude: 40.72, zoom: 11 });
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [resourceMarkers, setResourceMarkers] = useState<ResourceMarker[]>([]);
  const [selected, setSelected] = useState<EventCluster | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch("/admin/events?skip=0&limit=500");
        if (!res.ok) return;
        const data = await res.json();
        const events: AdminEvent[] = data.events ?? [];

        const map = new globalThis.Map<string, EventCluster>();
        for (const ev of events) {
          if (ev.latitude == null || ev.longitude == null) continue;
          const key = clusterKey(ev.latitude, ev.longitude);
          if (!map.has(key)) {
            map.set(key, {
              key, lat: ev.latitude, lng: ev.longitude,
              locationName: ev.location_name || "Unknown location",
              events: [], totalVolunteers: 0,
              completedCount: 0, upcomingCount: 0, activeCount: 0, cancelledCount: 0,
            });
          }
          const c = map.get(key)!;
          c.events.push(ev);
          c.totalVolunteers += ev.current_signup_count ?? 0;
          if (ev.status === "completed")      c.completedCount++;
          else if (ev.status === "upcoming")  c.upcomingCount++;
          else if (ev.status === "active")    c.activeCount++;
          else if (ev.status === "cancelled") c.cancelledCount++;
        }
        setClusters(Array.from(map.values()));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function loadResources(bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number }) {
    try {
      const url = `https://platform.foodhelpline.org/api/resources/markersWithinBounds`
        + `?corner=${bounds.minLng},${bounds.minLat}&corner=${bounds.maxLng},${bounds.maxLat}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const raw = await res.json();
      const fc = raw.features ? raw : raw.json;
      setResourceMarkers(
        (fc?.features ?? [])
          .filter((f: any) => f.geometry?.coordinates?.length >= 2)
          .map((f: any) => ({
            id: f.properties.id,
            type: f.properties.resourceTypeId,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
          }))
      );
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadResources({ minLng: -74.1, minLat: 40.6, maxLng: -73.7, maxLat: 40.95 });
  }, []);

  const totalEvents = clusters.reduce((s, c) => s + c.events.length, 0);

  return (
    <div style={{ width: "100%" }}>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 20, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {[
            { count: 1,  label: "1 event" },
            { count: 2,  label: "2–3 events" },
            { count: 4,  label: "4–7 events" },
            { count: 8,  label: "8+ events" },
          ].map(({ count, label }) => {
            const s = heatStyle(count);
            return (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--lt-text-secondary)" }}>
                <span style={{
                  width: s.dotSize + 8, height: s.dotSize + 8,
                  borderRadius: "50%",
                  background: `rgba(${s.haloRgb},${s.haloOpacity + 0.1})`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ width: s.dotSize, height: s.dotSize, borderRadius: "50%", background: s.dotColor, display: "inline-block" }} />
                </span>
                {label}
              </span>
            );
          })}
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--lt-text-secondary)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#6942b5", opacity: 0.25, display: "inline-block", border: "1px solid white", flexShrink: 0 }} />
            Food resource
          </span>
        </div>
        {!loading && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--lt-text-muted)", fontWeight: 600 }}>
            {clusters.length} location{clusters.length !== 1 ? "s" : ""} · {totalEvents} total event{totalEvents !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div style={{ position: "relative", width: "100%", height }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.7)", borderRadius: 8 }}>
            <div className="lt-spinner" style={{ width: 36, height: 36, borderTopColor: "#16a34a" }} />
          </div>
        )}

        <Map
          mapLib={maplibregl}
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onMoveEnd={(e) => {
            const b = e.target.getBounds();
            loadResources({ minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() });
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        >
          {/* Lemontree resource markers — dimmed context layer */}
          {resourceMarkers.map((r) => (
            <Marker key={r.id} longitude={r.lng} latitude={r.lat} anchor="center">
              <div style={{
                width: 9, height: 9, borderRadius: "50%",
                background: r.type === "SOUP_KITCHEN" ? "#E86F51" : "#6942b5",
                opacity: 0.25,
                border: "1.5px solid white",
              }} />
            </Marker>
          ))}

          {/* Heatmap-style event cluster markers */}
          {clusters.map((c) => {
            const s = heatStyle(c.events.length);
            const isSelected = selected?.key === c.key;
            return (
              <Marker key={c.key} longitude={c.lng} latitude={c.lat} anchor="center" style={{ zIndex: isSelected ? 20 : 10 }}>
                {/* Outer halo — gives the "heat" glow effect */}
                <div
                  onClick={() => setSelected(isSelected ? null : c)}
                  title={`${c.locationName} — ${c.events.length} event${c.events.length !== 1 ? "s" : ""}`}
                  style={{
                    width: s.haloSize, height: s.haloSize,
                    borderRadius: "50%",
                    background: `rgba(${s.haloRgb}, ${isSelected ? s.haloOpacity + 0.15 : s.haloOpacity})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    transition: "transform 0.15s",
                    outline: isSelected ? `2px solid ${s.dotColor}` : "none",
                    outlineOffset: 2,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {/* Inner solid dot */}
                  <div style={{
                    width: s.dotSize, height: s.dotSize,
                    borderRadius: "50%",
                    background: s.dotColor,
                    border: "2px solid white",
                    boxShadow: `0 2px 6px rgba(${s.haloRgb},0.5)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: "white",
                    userSelect: "none",
                  }}>
                    {c.events.length > 1 ? c.events.length : ""}
                  </div>
                </div>
              </Marker>
            );
          })}
        </Map>

        {/* Detail panel */}
        {selected && (() => {
          const s = heatStyle(selected.events.length);
          return (
            <div style={{
              position: "absolute", top: 12, right: 12, zIndex: 30,
              width: 300, maxHeight: "calc(100% - 24px)",
              background: "white", borderRadius: 12,
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>
              {/* Header */}
              <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#aaa", margin: "0 0 3px" }}>Location</p>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selected.locationName}
                    </h3>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#aaa", flexShrink: 0 }}>✕</button>
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: s.dotColor, margin: 0, lineHeight: 1 }}>{selected.events.length}</p>
                    <p style={{ fontSize: 10, color: "#999", margin: "2px 0 0" }}>events</p>
                  </div>
                  <div style={{ width: 1, background: "#f0f0f0" }} />
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: "#2E8B7A", margin: 0, lineHeight: 1 }}>{selected.totalVolunteers}</p>
                    <p style={{ fontSize: 10, color: "#999", margin: "2px 0 0" }}>volunteers</p>
                  </div>
                  <div style={{ width: 1, background: "#f0f0f0" }} />
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
                    {selected.completedCount > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 99, background: "#dcfce7", color: "#16a34a" }}>{selected.completedCount} completed</span>
                    )}
                    {(selected.upcomingCount + selected.activeCount) > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 99, background: "#ede5f7", color: "#6942b5" }}>{selected.upcomingCount + selected.activeCount} upcoming</span>
                    )}
                    {selected.cancelledCount > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 99, background: "#f3f4f6", color: "#6b7280" }}>{selected.cancelledCount} cancelled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Event list */}
              <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
                {[...selected.events]
                  .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
                  .map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/events/${ev.id}/manage`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", textDecoration: "none", gap: 8 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f7fdf9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</p>
                        <p style={{ fontSize: 11, color: "#999", margin: "2px 0 0" }}>{formatDate(ev.date)} · {ev.current_signup_count} volunteers</p>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, flexShrink: 0,
                        background: ev.status === "completed" ? "#dcfce7" : ev.status === "upcoming" || ev.status === "active" ? "#ede5f7" : "#f3f4f6",
                        color:      ev.status === "completed" ? "#16a34a" : ev.status === "upcoming" || ev.status === "active" ? "#6942b5" : "#6b7280",
                      }}>
                        {ev.status}
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

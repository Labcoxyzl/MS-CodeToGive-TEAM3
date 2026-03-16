"use client";

import { useState, useEffect } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface ResourceMarker {
  id: string;
  lng: number;
  lat: number;
  type: string;
  name?: string;
}

interface EventMarker {
  id: string;
  lng: number;
  lat: number;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location_name: string | null;
  current_signup_count: number;
  volunteer_limit: number | null;
}

interface ResourceMapProps {
  height?: number;
  initialLng?: number;
  initialLat?: number;
  initialZoom?: number;
}

export default function ResourceMap({
  height = 420,
  initialLng = -73.94,
  initialLat = 40.82,
  initialZoom = 11,
}: ResourceMapProps) {
  const [markers, setMarkers] = useState<ResourceMarker[]>([]);
  const [eventMarkers, setEventMarkers] = useState<EventMarker[]>([]);
  const [viewState, setViewState] = useState({ longitude: initialLng, latitude: initialLat, zoom: initialZoom });

  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [loadingResource, setLoadingResource] = useState(false);
  const [selectedMarkerCoords, setSelectedMarkerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventMarker | null>(null);

  // Load Lemontree resource markers within map bounds
  async function loadMarkers(bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number }) {
    try {
      const url =
        `https://platform.foodhelpline.org/api/resources/markersWithinBounds` +
        `?corner=${bounds.minLng},${bounds.minLat}&corner=${bounds.maxLng},${bounds.maxLat}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const raw = await res.json();
      const fc = raw.features ? raw : raw.json;
      const features: any[] = fc?.features ?? [];
      setMarkers(
        features
          .filter((f: any) => f.geometry?.coordinates?.length >= 2)
          .map((f: any) => ({
            id: f.properties.id,
            type: f.properties.resourceTypeId,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            name:
              f.properties.name ??
              (f.properties.resourceTypeId === "SOUP_KITCHEN" ? "Soup Kitchen Resource" : "Food Pantry Resource"),
          }))
      );
    } catch { /* ignore */ }
  }

  // Fetch full resource detail when a marker is clicked
  async function handleMarkerClick(id: string, coords: { lat: number; lng: number }) {
    setSelectedEvent(null);
    setSelectedResource(null);
    setSelectedMarkerCoords(coords);
    setLoadingResource(true);
    try {
      const res = await fetch(`https://platform.foodhelpline.org/api/resources/${id}`);
      const raw = await res.json();
      setSelectedResource(raw.json ?? raw);
    } catch { /* ignore */ }
    finally { setLoadingResource(false); }
  }

  useEffect(() => {
    loadMarkers({ minLng: -74.1, minLat: 40.7, maxLng: -73.8, maxLat: 40.9 });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/events/?status=upcoming&limit=100`)
      .then((r) => r.json())
      .then((data: any[]) => {
        setEventMarkers(
          data
            .filter((e) => e.latitude != null && e.longitude != null)
            .map((e) => ({
              id: e.id,
              lng: e.longitude,
              lat: e.latitude,
              title: e.title,
              date: e.date,
              start_time: e.start_time,
              end_time: e.end_time,
              location_name: e.location_name,
              current_signup_count: e.current_signup_count,
              volunteer_limit: e.volunteer_limit,
            }))
        );
      })
      .catch(() => { /* ignore */ });
  }, []);

  // Build "create event here" URL from selected resource
  function createEventUrl() {
    const name = [
      selectedResource?.name,
      selectedResource?.addressStreet1,
      selectedResource?.city,
      selectedResource?.state,
    ].filter(Boolean).join(", ");
    const params = new URLSearchParams();
    if (name) params.set("location_name", name);
    if (selectedMarkerCoords?.lat != null) params.set("lat", String(selectedMarkerCoords.lat));
    if (selectedMarkerCoords?.lng != null) params.set("lng", String(selectedMarkerCoords.lng));
    return `/events/create?${params.toString()}`;
  }

  return (
    <div style={{ width: "100%" }}>
    <div style={{ position: "relative", width: "100%", height }}>
      <Map
        mapLib={maplibregl}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        onMoveEnd={(e) => {
          const b = e.target.getBounds();
          loadMarkers({ minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() });
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        {/* Resource markers */}
        {markers.map((m) => (
          <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
            <div
              onClick={() => handleMarkerClick(m.id, { lat: m.lat, lng: m.lng })}
              title={m.type === "SOUP_KITCHEN" ? "Soup Kitchen" : "Food Pantry"}
              style={{
                width: 14, height: 14, borderRadius: "50%",
                border: "2px solid white",
                background: m.type === "SOUP_KITCHEN" ? "#E86F51" : "#6942b5",
                boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                cursor: "pointer", transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.6)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          </Marker>
        ))}

        {/* Upcoming event markers */}
        {eventMarkers.map((ev) => (
          <Marker key={`event-${ev.id}`} longitude={ev.lng} latitude={ev.lat} anchor="center" style={{ zIndex: 10 }}>
            <div
              onClick={() => { setSelectedResource(null); setLoadingResource(false); setSelectedEvent(ev); }}
              title={ev.title}
              style={{
                width: 22, height: 22, borderRadius: "50%",
                border: "3px solid white",
                background: "#22c55e",
                boxShadow: "0 2px 8px rgba(34,197,94,0.7)",
                cursor: "pointer", transition: "transform 0.15s",
                zIndex: 10, position: "relative",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.6)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          </Marker>
        ))}
      </Map>

      {/* Resource detail panel */}
      {(loadingResource || selectedResource) && (
        <div style={{
          position: "absolute", top: 16, right: 16, zIndex: 30,
          width: 280, background: "white", borderRadius: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)", padding: 20,
        }}>
          <button
            onClick={() => setSelectedResource(null)}
            style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#666" }}
          >✕</button>

          {loadingResource ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <div className="lt-spinner" style={{ width: 32, height: 32, borderTopColor: "#6942b5" }} />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                  padding: "2px 8px", borderRadius: 99,
                  background: selectedResource?.resourceType?.id === "SOUP_KITCHEN" ? "#fde8e2" : "#ede5f7",
                  color:      selectedResource?.resourceType?.id === "SOUP_KITCHEN" ? "#fd5839" : "#6942b5",
                }}>
                  {selectedResource?.resourceType?.name ?? "Resource"}
                </span>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "#1a1a1a" }}>
                {selectedResource?.name ?? "Unnamed Resource"}
              </h3>

              {(selectedResource?.addressStreet1 || selectedResource?.city) && (
                <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                  📍 {[selectedResource?.addressStreet1, selectedResource?.city, selectedResource?.state].filter(Boolean).join(", ")}
                </p>
              )}

              {selectedResource?.contacts?.[0]?.phone && (
                <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                  📞 {selectedResource.contacts[0].phone}
                </p>
              )}

              {selectedResource?.occurrences?.length ? (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#999", marginBottom: 4 }}>NEXT OPEN</p>
                  {selectedResource.occurrences.slice(0, 2).map((o: any) => (
                    <p key={o.id} style={{ fontSize: 13, color: "#444" }}>
                      {new Date(o.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" · "}
                      {new Date(o.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {" – "}
                      {new Date(o.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  ))}
                </div>
              ) : null}

              {selectedResource?.website && (
                <a href={selectedResource.website} target="_blank" rel="noreferrer"
                  style={{ display: "inline-block", marginTop: 12, fontSize: 13, color: "#6942b5", fontWeight: 600 }}>
                  Visit website →
                </a>
              )}

              <a href={createEventUrl()}
                style={{
                  display: "inline-block", marginTop: 10, fontSize: 13, color: "white",
                  fontWeight: 600, background: "#2E8B7A", padding: "6px 14px",
                  borderRadius: 6, textDecoration: "none",
                }}>
                + Create event here
              </a>
            </>
          )}
        </div>
      )}

      {/* Event detail panel */}
      {selectedEvent && (
        <div style={{
          position: "absolute", top: 16, right: 16, zIndex: 30,
          width: 280, background: "white", borderRadius: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)", padding: 20,
        }}>
          <button
            onClick={() => setSelectedEvent(null)}
            style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#666" }}
          >✕</button>

          <div style={{ marginBottom: 12 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
              padding: "2px 8px", borderRadius: 99, background: "#dcfce7", color: "#16a34a",
            }}>
              Upcoming Event
            </span>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "#1a1a1a" }}>
            {selectedEvent.title}
          </h3>

          {selectedEvent.location_name && (
            <p style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>📍 {selectedEvent.location_name}</p>
          )}

          <p style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
            📅{" "}
            {new Date(selectedEvent.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>

          <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
            🕐 {selectedEvent.start_time.slice(0, 5)} – {selectedEvent.end_time.slice(0, 5)}
          </p>

          <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
            👥 {selectedEvent.current_signup_count}
            {selectedEvent.volunteer_limit ? ` / ${selectedEvent.volunteer_limit}` : ""} volunteers
          </p>

          <a href={`/events/${selectedEvent.id}`}
            style={{ display: "inline-block", marginTop: 12, fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
            View event →
          </a>
        </div>
      )}
    </div>

    {/* Legend */}
    <div style={{ display: "flex", gap: 20, marginTop: 10, flexWrap: "wrap" }}>
      {[
        { color: "#6942b5", label: "Food Pantry" },
        { color: "#E86F51", label: "Soup Kitchen" },
        { color: "#22c55e", label: "Upcoming Event" },
      ].map(({ color, label }) => (
        <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--lt-text-secondary)" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.3)", flexShrink: 0 }} />
          {label}
        </span>
      ))}
    </div>
    </div>
  );
}

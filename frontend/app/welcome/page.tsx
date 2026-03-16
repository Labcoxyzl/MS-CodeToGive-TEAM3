"use client";

import Link from "next/link";
import {Search} from "lucide-react";
import {useState, useEffect, useRef} from "react";
import Image from "next/image";
import Map, {Marker} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/app/styles/lemontree-theme.css";
import styles from "./welcome.module.css";
import dashStyles from "@/app/dashboard/dashboard.module.css";
import Sidebar from "@/app/components/ui/Sidebar";

export default function WelcomePage() {
  useEffect(() => { document.title = "Welcome — Lemontree Volunteers"; }, []);

// ===== PAGE UI STATE =====
  // controls sidebar visibility, search toggle, dropdown expansion,
  // map markers data, selected resource panel, and viewport position

 const [isAuth, setIsAuth] = useState(false);
  const [userState, setUserState] = useState({ name: '', initials: '' });
  const [userLoading, setUserLoading] = useState(false);
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [searchError, setSearchError] = useState("");
 const [suggestions, setSuggestions] = useState<{ label: string; sublabel?: string; lng: number; lat: number; zoom: number }[]>([]);
 const [showSuggestions, setShowSuggestions] = useState(false);
 const searchInputRef = useRef<HTMLInputElement>(null);
 const searchWrapRef = useRef<HTMLDivElement>(null);
 const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 // resource markers loaded from FoodHelpline API
 const [markers, setMarkers] = useState<
  { id: string; lng: number; lat: number; type: string; name?: string }[]
>([]);
 // upcoming event markers fetched from backend
 const [eventMarkers, setEventMarkers] = useState<
  { id: string; lng: number; lat: number; title: string; date: string; start_time: string; end_time: string; location_name: string | null; current_signup_count: number; volunteer_limit: number | null }[]
>([]);
 // selected event shown in floating detail panel
 const [selectedEvent, setSelectedEvent] = useState<typeof eventMarkers[number] | null>(null);
// current map viewport (center + zoom)
 const [viewState, setViewState] = useState({ longitude: -73.94, latitude: 40.82, zoom: 11 });
 // selected resource shown in floating detail panel
 const [selectedResource, setSelectedResource] = useState<any>(null);
 // coords of the last clicked resource marker
 const [selectedMarkerCoords, setSelectedMarkerCoords] = useState<{lat:number;lng:number}|null>(null);
 // loading spinner state when fetching resource details
 const [loadingResource, setLoadingResource] = useState(false);
 // loading spinner state when fetching resource details
 const areaMap: Record<string, { longitude: number; latitude: number; zoom: number }> = {
  "harlem": { longitude: -73.9442, latitude: 40.8116, zoom: 13 },
  "bronx": { longitude: -73.8648, latitude: 40.8448, zoom: 11 },
  "brooklyn": { longitude: -73.9442, latitude: 40.6782, zoom: 11 },
  "queens": { longitude: -73.7949, latitude: 40.7282, zoom: 11 },
  "manhattan": { longitude: -73.9712, latitude: 40.7831, zoom: 11 },
  "inwood": { longitude: -73.9212, latitude: 40.8677, zoom: 14 },
  "washington heights": { longitude: -73.9400, latitude: 40.8500, zoom: 13 },
  "lower east side": { longitude: -73.9897, latitude: 40.7150, zoom: 13 },
  "upper west side": { longitude: -73.9754, latitude: 40.7870, zoom: 13 },
  "upper east side": { longitude: -73.9566, latitude: 40.7736, zoom: 13 },
};
// Load markers around a coordinate after a programmatic jump
function jumpAndLoad(lng: number, lat: number, zoom: number) {
  setViewState({ longitude: lng, latitude: lat, zoom });
  const delta = zoom >= 13 ? 0.05 : 0.15;
  loadMarkers({ minLng: lng - delta, minLat: lat - delta, maxLng: lng + delta, maxLat: lat + delta });
}

// Jump map to a known neighborhood key
function jumpToArea(query: string) {
  const key = query.trim().toLowerCase();
  const area = areaMap[key];
  if (!area) return false;
  setSearchError("");
  setSearchQuery("");
  jumpAndLoad(area.longitude, area.latitude, area.zoom);
  return true;
}

// Geocode any free-form address via Nominatim (no API key needed)
async function handleAreaSearch() {
  const query = searchQuery.trim();
  if (!query) return;

  // Try known neighborhoods first
  if (jumpToArea(query)) return;

  // Fall back to Nominatim geocoding
  setSearchError("");
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const results = await res.json();
    if (results.length === 0) {
      setSearchError(`"${query}" not found. Try a full address or neighborhood.`);
      return;
    }
    const { lon, lat } = results[0];
    setSearchQuery("");
    jumpAndLoad(parseFloat(lon), parseFloat(lat), 14);
  } catch {
    setSearchError("Search failed. Please try again.");
  }
}

// Jump to user's current GPS location
function handleUseMyLocation() {
  if (!navigator.geolocation) {
    setSearchError("Geolocation is not supported by your browser.");
    return;
  }
  setSearchError("");
  navigator.geolocation.getCurrentPosition(
    (pos) => { jumpAndLoad(pos.coords.longitude, pos.coords.latitude, 14); },
    () => { setSearchError("Unable to get your location. Please allow location access."); }
  );
}
// fetch full resource details when a marker is clicked
 async function handleMarkerClick(id: string, coords: {lat:number;lng:number}) {
   setSelectedEvent(null);
   setSelectedResource(null);
   setSelectedMarkerCoords(coords);
   setLoadingResource(true);
   try {
     const res = await fetch(`https://platform.foodhelpline.org/api/resources/${id}`);
     const raw = await res.json();
     // response may be superjson-wrapped
     const resource = raw.json ?? raw;
     setSelectedResource(resource);
   } catch (err) {
     console.error("Failed to load resource:", err);
   } finally {
     setLoadingResource(false);
   }
 }
 // load resource markers within current map bounds
 async function loadMarkers(bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number }) {
   try {
     const url = `https://platform.foodhelpline.org/api/resources/markersWithinBounds`
       + `?corner=${bounds.minLng},${bounds.minLat}&corner=${bounds.maxLng},${bounds.maxLat}`;
     const res = await fetch(url);
     if (!res.ok) throw new Error(`HTTP ${res.status}`);
     const raw = await res.json();

     // markersWithinBounds returns a GeoJSON FeatureCollection (may be superjson-wrapped)
     const featureCollection = raw.features ? raw : raw.json;
     const features: any[] = featureCollection?.features ?? [];

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
      (f.properties.resourceTypeId === "SOUP_KITCHEN"
    ? "Soup Kitchen Resource"
    : "Food Pantry Resource"),
    }))
);
   } catch (err) {
     console.error("Error loading markers:", err);
   }
 }

 useEffect(() => {
   loadMarkers({ minLng: -74.1, minLat: 40.7, maxLng: -73.8, maxLat: 40.9 });

   const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
   fetch(`${apiUrl}/api/v1/events/?status=upcoming&limit=100`)
     .then((r) => r.json())
     .then((data: { id: string; title: string; date: string; start_time: string; end_time: string; location_name: string | null; latitude: number | null; longitude: number | null; current_signup_count: number; volunteer_limit: number | null }[]) => {
       setEventMarkers(
         data
           .filter((e) => e.latitude != null && e.longitude != null)
           .map((e) => ({
             id: e.id,
             lng: e.longitude!,
             lat: e.latitude!,
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
     .catch(() => {/* silently ignore if backend is unreachable */});
   
   const token = localStorage.getItem("access_token");
   if (token) {
     setIsAuth(true);
     setUserLoading(true);
     try {
       const payload = JSON.parse(atob(token.split(".")[1]));
       const userId = payload.sub;
       
       // Fetch name and initials if possible, or decode from token
       const meta = payload?.user_metadata as Record<string, any> | undefined;
       if (meta?.name) {
         const name = meta.name;
         const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
         setUserState({ name, initials });
         setUserLoading(false);
       } else {
         // Fallback to fetching from public.users if meta doesn't have it
         const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
         const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
         if (anonKey && supabaseUrl) {
           fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=name`, {
             headers: {
               'apikey': anonKey,
               'Authorization': `Bearer ${token}`
             }
           })
           .then(res => res.json())
           .then(data => {
             if (data?.[0]?.name) {
               const name = data[0].name;
               const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
               setUserState({ name, initials });
             }
           })
           .finally(() => setUserLoading(false));
         } else {
           setUserLoading(false);
         }
       }
     } catch (e) {
       console.error("Error decoding token:", e);
       setUserLoading(false);
     }
   }
 }, []);

 // Debounced autocomplete
 useEffect(() => {
   if (debounceRef.current) clearTimeout(debounceRef.current);
   if (!searchQuery.trim() || searchQuery.trim().length < 2) {
     setSuggestions([]);
     setShowSuggestions(false);
     return;
   }
   debounceRef.current = setTimeout(async () => {
     const q = searchQuery.trim().toLowerCase();

     // 1. Matching known neighborhoods
     const neighborhoodMatches = Object.entries(areaMap)
       .filter(([key]) => key.includes(q))
       .map(([key, val]) => ({
         label: key.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
         lng: val.longitude, lat: val.latitude, zoom: val.zoom,
       }));

     // 2. Nominatim results
     try {
       const res = await fetch(
         `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery.trim())}&format=json&limit=5&addressdetails=1`,
         { headers: { "Accept-Language": "en" } }
       );
       const data = await res.json();
       const geocoded = (data as { display_name: string; lon: string; lat: string }[]).map((r) => {
         const parts = r.display_name.split(",");
         return { label: parts[0].trim(), sublabel: parts.slice(1, 3).join(",").trim(), lng: parseFloat(r.lon), lat: parseFloat(r.lat), zoom: 14 };
       });
       const combined = [...neighborhoodMatches, ...geocoded].slice(0, 6);
       setSuggestions(combined);
       setShowSuggestions(combined.length > 0);
     } catch {
       setSuggestions(neighborhoodMatches);
       setShowSuggestions(neighborhoodMatches.length > 0);
     }
   }, 350);
   return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
 }, [searchQuery]);

 // Close suggestions on outside click
 useEffect(() => {
   function onDown(e: MouseEvent) {
     if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
       setShowSuggestions(false);
     }
   }
   document.addEventListener("mousedown", onDown);
   return () => document.removeEventListener("mousedown", onDown);
 }, []);

return (
  <div
  className={`lt-page ${styles.pageFont}`}
  style={{ flexDirection: "row", alignItems: "stretch" }}
>
    {isAuth && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* header */}
      <header className={dashStyles.topBar} style={{ gap: 16 }}>
        {/* Left: Logo */}
        <Link href="/" className="lt-header__logo" style={{ flexShrink: 0 }}>
          <span>
            <Image src="/logo.svg" alt="Lemontree Icon" width={32} height={32} priority />
            <Image src="/lemontree_text_logo.svg" alt="Lemontree" width={112} height={24} priority />
          </span>
        </Link>

        {/* Center: Search bar */}
        <div ref={searchWrapRef} style={{ flex: 1, maxWidth: 420, position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.75)", borderRadius: showSuggestions ? "12px 12px 0 0" : 50,
            padding: "6px 6px 6px 14px",
            border: "1.5px solid rgba(0,0,0,0.10)",
            borderBottom: showSuggestions ? "1px solid #f0e8d8" : "1.5px solid rgba(0,0,0,0.10)",
            boxShadow: showSuggestions ? "0 2px 0 rgba(0,0,0,0.04)" : "0 1px 6px rgba(0,0,0,0.08)",
            transition: "box-shadow 0.15s, border-color 0.15s",
          }}
            onFocusCapture={(e) => { e.currentTarget.style.borderColor = "#784cc5"; }}
            onBlurCapture={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)"; }}
          >
            <Search size={14} style={{ color: "#9C9690", flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search any address or neighborhood..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchError(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setShowSuggestions(false); handleAreaSearch(); }
                if (e.key === "Escape") { setShowSuggestions(false); setSearchQuery(""); }
              }}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 13,
                background: "transparent", color: "#2D2A26",
                fontFamily: "var(--font-dm-sans)",
              }}
            />
            {searchQuery ? (
              <button
                onClick={() => { setSearchQuery(""); setSearchError(""); setSuggestions([]); setShowSuggestions(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9690", fontSize: 16, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}
              >×</button>
            ) : (
              <button
                onClick={handleUseMyLocation}
                title="Use my current location"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#784cc5", padding: "0 6px 0 2px", flexShrink: 0, display: "flex", alignItems: "center" }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="7" r="2.5" stroke="#784cc5" strokeWidth="1.5"/>
                  <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" stroke="#784cc5" strokeWidth="1.5" fill="none"/>
                </svg>
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
              background: "rgba(255,255,255,0.97)",
              border: "1.5px solid #784cc5", borderTop: "none",
              borderRadius: "0 0 12px 12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchQuery("");
                    setShowSuggestions(false);
                    setSuggestions([]);
                    jumpAndLoad(s.lng, s.lat, s.zoom);
                  }}
                  style={{
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    padding: "9px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 1,
                    borderBottom: i < suggestions.length - 1 ? "1px solid #f5ede4" : "none",
                    transition: "background 0.1s",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fdf5ef")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#2D2A26" }}>{s.label}</span>
                  {s.sublabel && <span style={{ fontSize: 11, color: "#9C9690" }}>{s.sublabel}</span>}
                </button>
              ))}
            </div>
          )}

          {searchError && (
            <p style={{ color: "#D63B2F", fontSize: 11, marginTop: 4, paddingLeft: 14, position: "absolute" }}>
              {searchError}
            </p>
          )}
        </div>

        {/* Right: Auth */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {!isAuth ? (
            <div className="flex gap-3">
              <Link href="/login">
                <button className="px-4 py-2 border-2 border-[#2D2A26] text-[#2D2A26] font-bold rounded-lg hover:bg-black/5 transition cursor-pointer text-sm">
                  LOG IN
                </button>
              </Link>
              <Link href="/signup">
                <button className="px-4 py-2 rounded-lg text-white font-bold bg-gradient-to-r from-[#6b4bc3] to-[#7f5bd6] shadow-md hover:shadow-lg transition cursor-pointer text-sm">
                  GET STARTED
                </button>
              </Link>
            </div>
          ) : (
            <Link href="/profile" className={dashStyles.topBarUser} style={{ textDecoration: "none", color: "inherit" }}>
              {userLoading ? (
                <div className="lt-spinner" style={{ width: 24, height: 24, borderTopColor: 'var(--lt-color-brand-primary)' }} />
              ) : (
                <>
                  <div className="lt-avatar" style={{ border: "2px solid rgba(0,0,0,0.1)", width: 32, height: 32, fontSize: 14 }}>
                    {userState.initials || 'V'}
                  </div>
                  <span className="hidden sm:inline" style={{ fontSize: 14 }}>{userState.name || 'Volunteer'}</span>
                </>
              )}
            </Link>
          )}
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="relative h-[500px] flex items-center justify-center">
          <div className="absolute inset-0 h-[500px] opacity-30">
            <Map
              mapLib={maplibregl}
              {...viewState}
              onMove={(e) => setViewState(e.viewState)}
              onMoveEnd={(e) => {
                const b = e.target.getBounds();

                loadMarkers({
                  minLng: b.getWest(),
                  minLat: b.getSouth(),
                  maxLng: b.getEast(),
                  maxLat: b.getNorth(),
                });
              }}
              style={{ width: "100%", height: "100%" }}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            >
              {markers.map((m) => (
                <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
                  <div
                    onClick={() => handleMarkerClick(m.id, { lat: m.lat, lng: m.lng })}
                    title={m.type === "SOUP_KITCHEN" ? "Soup Kitchen" : "Food Pantry"}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: "2px solid white",
                      background: m.type === "SOUP_KITCHEN" ? "#E86F51" : "#6942b5",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      cursor: "pointer",
                      transition: "transform 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.6)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  />
                </Marker>
              ))}
              {eventMarkers.map((ev) => (
                <Marker key={`event-${ev.id}`} longitude={ev.lng} latitude={ev.lat} anchor="center" style={{ zIndex: 10 }}>
                  <div
                    onClick={() => { setSelectedResource(null); setLoadingResource(false); setSelectedEvent(ev); }}
                    title={ev.title}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "3px solid white",
                      background: "#22c55e",
                      boxShadow: "0 2px 8px rgba(34,197,94,0.7)",
                      cursor: "pointer",
                      transition: "transform 0.15s",
                      zIndex: 10,
                      position: "relative",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.6)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  />
                </Marker>
              ))}
            </Map>
          </div>

          {/* Resource detail panel */}
          {(loadingResource || selectedResource) && (
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 30,
                width: 280,
                background: "white",
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                padding: 20,
              }}
            >
              <button
                onClick={() => setSelectedResource(null)}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 12,
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ✕
              </button>

              {loadingResource ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                  <div
                    className="lt-spinner"
                    style={{ width: 32, height: 32, borderTopColor: "#6942b5" }}
                  />
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background:
                          selectedResource?.resourceType?.id === "SOUP_KITCHEN"
                            ? "#fde8e2"
                            : "#ede5f7",
                        color:
                          selectedResource?.resourceType?.id === "SOUP_KITCHEN"
                            ? "#fd5839"
                            : "#6942b5",
                      }}
                    >
                      {selectedResource?.resourceType?.name ?? "Resource"}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 6,
                      color: "#1a1a1a",
                    }}
                  >
                    {selectedResource?.name ?? "Unnamed Resource"}
                  </h3>

                  {(selectedResource?.addressStreet1 || selectedResource?.city) && (
                    <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                      📍{" "}
                      {[
                        selectedResource?.addressStreet1,
                        selectedResource?.city,
                        selectedResource?.state,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}

                  {selectedResource?.contacts?.[0]?.phone && (
                    <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                      📞 {selectedResource.contacts[0].phone}
                    </p>
                  )}

                  {selectedResource?.occurrences?.length ? (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#999", marginBottom: 4 }}>
                        NEXT OPEN
                      </p>
                      {selectedResource.occurrences.slice(0, 2).map((o: any) => (
                        <p key={o.id} style={{ fontSize: 13, color: "#444" }}>
                          {new Date(o.startTime).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {" · "}
                          {new Date(o.startTime).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {" – "}
                          {new Date(o.endTime).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {selectedResource?.website && (
                    <a
                      href={selectedResource.website}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: 12,
                        fontSize: 13,
                        color: "#6942b5",
                        fontWeight: 600,
                      }}
                    >
                      Visit website →
                    </a>
                  )}

                  {(() => {
                    const name = [
                      selectedResource?.name,
                      selectedResource?.addressStreet1,
                      selectedResource?.city,
                      selectedResource?.state,
                    ].filter(Boolean).join(", ");
                    const lat = selectedMarkerCoords?.lat;
                    const lng = selectedMarkerCoords?.lng;
                    const params = new URLSearchParams();
                    if (name) params.set("location_name", name);
                    if (lat != null) params.set("lat", String(lat));
                    if (lng != null) params.set("lng", String(lng));
                    return (
                      <a
                        href={`/events/create?${params.toString()}`}
                        style={{
                          display: "inline-block",
                          marginTop: 10,
                          fontSize: 13,
                          color: "white",
                          fontWeight: 600,
                          background: "#2E8B7A",
                          padding: "6px 14px",
                          borderRadius: 6,
                          textDecoration: "none",
                        }}
                      >
                        + Create event here
                      </a>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* Event detail panel */}
          {selectedEvent && (
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 30,
                width: 280,
                background: "white",
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                padding: 20,
              }}
            >
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 12,
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ✕
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: "#dcfce7",
                    color: "#16a34a",
                  }}
                >
                  Upcoming Event
                </span>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "#1a1a1a" }}>
                {selectedEvent.title}
              </h3>

              {selectedEvent.location_name && (
                <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                  📍 {selectedEvent.location_name}
                </p>
              )}

              <p style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
                📅{" "}
                {new Date(selectedEvent.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>

              <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                🕐{" "}
                {selectedEvent.start_time.slice(0, 5)} – {selectedEvent.end_time.slice(0, 5)}
              </p>

              <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                👥 {selectedEvent.current_signup_count}
                {selectedEvent.volunteer_limit ? ` / ${selectedEvent.volunteer_limit}` : ""} volunteers
              </p>

              <a
                href={`/events/${selectedEvent.id}`}
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  fontSize: 13,
                  color: "#16a34a",
                  fontWeight: 600,
                }}
              >
                View event →
              </a>
            </div>
          )}

          {/* Hero Section */}
          <section className="relative z-10 pointer-events-none max-w-5xl mx-auto flex flex-col items-center text-center py-24 px-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-black">
              Welcome to Lemontree's Volunteer Hub
            </h1>

            <p className="text-black mb-6 max-w-xl">
              Help connect communities to nearby food resources
            </p>

            <Link href="/events" className="pointer-events-auto">
              <button className="bg-[#2E8B7A] text-white px-6 py-3 rounded-full hover:bg-[#247060] transition">
                Start Volunteering
              </button>
            </Link>

          </section>
        </div>

        {/* Features */}
        <section className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 py-16 px-6">
          {/* ABOUT US */}
          <div className="bg-[#2E8B7A] text-white rounded-xl shadow-lg p-8 flex flex-col justify-between min-h-[320px]">
            <div>
              <h3 className="text-xl font-bold mb-3">About Us</h3>
              <p className="text-sm opacity-80 leading-relaxed">
                Learn about Lemontree&apos;s mission to connect communities with nearby food
                resources and empower volunteers to make a meaningful impact.
              </p>
            </div>

            <Link href="https://www.foodhelpline.org/about" className="mt-8">
              <button className="bg-[#2D2A26] text-white px-6 py-3 rounded-full hover:bg-white hover:text-[#2D2A26] transition">
                Learn More
              </button>
            </Link>
          </div>

          {/* ORGANIZE EVENTS */}
          <div className="bg-[#fd5839] text-white rounded-xl shadow-lg p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3">Organize Events</h3>
              <p className="text-sm opacity-80">
                Coordinate volunteer events, manage food drives, and collaborate with local
                organizations to support community food access.
              </p>
            </div>

            <Link href="/events">
              <button className="bg-[#2D2A26] text-white px-6 py-3 rounded-full hover:bg-white hover:text-[#2D2A26] transition">
                View Events
              </button>
            </Link>
          </div>

          {/* EARN POINTS */}
          <div className="bg-[#6B46C1] text-white rounded-xl shadow-lg p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3">Earn Points</h3>
              <p className="text-sm opacity-80">
                Track your volunteer contributions, earn reward points, and celebrate milestones
                while helping communities access essential food resources.
              </p>
            </div>

            <Link href="/community/leaders">
              <button className="bg-[#2D2A26] text-white px-6 py-3 rounded-full hover:bg-white hover:text-[#2D2A26] transition">
                See Rewards
              </button>
            </Link>
          </div>
        </section>
      </main>
    </div>

  
  </div>
);
}
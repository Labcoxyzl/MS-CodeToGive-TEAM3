"use client";

import Link from "next/link";
import {Search, ChevronDown, ChevronUp, Hand } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {useState, useEffect} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Map, {Marker} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/app/styles/lemontree-theme.css";
import styles from "./welcome.module.css";
import dashStyles from "@/app/dashboard/dashboard.module.css";
import Sidebar from "@/app/components/ui/Sidebar";

export default function WelcomePage() {
// ===== PAGE UI STATE =====
  // controls sidebar visibility, search toggle, dropdown expansion,
  // map markers data, selected resource panel, and viewport position

 const [isAuth, setIsAuth] = useState(false);
  const [userState, setUserState] = useState({ name: '', initials: '' });
  const [userLoading, setUserLoading] = useState(false);
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const [searchOpen, setSearchOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 // resource markers loaded from FoodHelpline API
 const [markers, setMarkers] = useState<
  { id: string; lng: number; lat: number; type: string; name?: string }[]
>([]);
// current map viewport (center + zoom)
 const [viewState, setViewState] = useState({ longitude: -73.94, latitude: 40.82, zoom: 11 });
 // selected resource shown in floating detail panel
 const [selectedResource, setSelectedResource] = useState<any>(null);
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
// handles search submission and moves map to selected neighborhood
function handleAreaSearch() {
  const query = searchQuery.trim().toLowerCase();
  const area = areaMap[query];

  if (!area) {
    alert("Area not found. Try Harlem, Bronx, Brooklyn, Queens, Manhattan, or Inwood.");
    return;
  }

  setViewState((prev) => ({
    ...prev,
    longitude: area.longitude,
    latitude: area.latitude,
    zoom: area.zoom,
  }));
}
// fetch full resource details when a marker is clicked
 async function handleMarkerClick(id: string) {
   setSelectedResource(null);
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

return (
  <div
  className={`lt-page ${styles.pageFont}`}
  style={{ flexDirection: "row", alignItems: "stretch" }}
>
    {isAuth && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* header */}
      <header className={dashStyles.topBar} style={{ position: 'relative' }}>
        {/* Left Spacer to maintain logo centering */}
        <div style={{ width: '200px' }} />

        {/* Center: Logo */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
          <Link href="/" className="lt-header__logo">
            <span>
              <Image
                src="/logo.svg"
                alt="Lemontree Icon"
                width={32}
                height={32}
                priority
              />
              <Image
                src="/lemontree_text_logo.svg"
                alt="Lemontree"
                width={112}
                height={24}
                priority
              />
            </span>
          </Link>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "flex-end", width: "300px" }}>
          <Search
            className="w-6 h-6 cursor-pointer text-[#2D2A26] opacity-70 hover:opacity-100 transition-opacity"
            onClick={() => setSearchOpen(!searchOpen)}
          />

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

      {/* search bar */}
      {searchOpen && (
        <div className="w-full bg-white border-b shadow-sm p-4 flex justify-center relative z-30">
          <div className="w-full max-w-xl flex gap-2">
            <input
              type="text"
              placeholder="Search a neighborhood or borough..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAreaSearch();
                }
              }}
              className="flex-1 border text-black rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#6942b5]"
            />

            <button
              onClick={handleAreaSearch}
              className="bg-[#6942b5] text-white px-4 py-2 rounded-md hover:bg-[#5a34a0] transition"
            >
              Go
            </button>
          </div>
        </div>
      )}

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
                    onClick={() => handleMarkerClick(m.id)}
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
                </>
              )}
            </div>
          )}

          {/* Hero Section */}
          <section className="relative z-10 pointer-events-none max-w-5xl mx-auto flex flex-col items-center text-center py-32 px-6">
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
          <div className="bg-[#06bcb1] text-white rounded-xl shadow-lg p-8 flex flex-col justify-between min-h-[320px]">
            <div>
              <h3 className="text-xl font-bold mb-3">About Us</h3>
              <p className="text-sm opacity-90 leading-relaxed">
                Learn about Lemontree&apos;s mission to connect communities with nearby food
                resources and empower volunteers to make a meaningful impact.
              </p>
            </div>

            <Link href="https://www.foodhelpline.org/about" className="mt-8">
              <button className="bg-[#77d1cb] text-white px-6 py-3 rounded-full hover:bg-white hover:text-[#06bcb1] transition">
                Learn More
              </button>
            </Link>
          </div>

          {/* ORGANIZE EVENTS */}
          <div className="bg-[#fd5839] text-white rounded-xl shadow-lg p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3">Organize Events</h3>
              <p className="text-sm opacity-90">
                Coordinate volunteer events, manage food drives, and collaborate with local
                organizations to support community food access.
              </p>
            </div>

            <Link href="/events">
              <button className="bg-[#f5917f] text-white px-6 py-3 rounded-full hover:bg-white hover:text-[#f5917f] transition">
                View Events
              </button>
            </Link>
          </div>

          {/* EARN POINTS */}
          <div className="bg-[#754bc5] text-white rounded-xl shadow-lg p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3">Earn Points</h3>
              <p className="text-sm opacity-90">
                Track your volunteer contributions, earn reward points, and celebrate milestones
                while helping communities access essential food resources.
              </p>
            </div>

            <Link href="/points">
              <button className="bg-[#8767c2] text-white px-6 py-3 rounded-full hover:bg-white hover:text-[#8767c2] transition">
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
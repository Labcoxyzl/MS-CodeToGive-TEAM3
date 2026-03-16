"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Map, Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Sidebar from "@/app/components/ui/Sidebar";
import FlyerButton from "@/app/events/components/FlyerButton";
import styles from "@/app/dashboard/dashboard.module.css";

const LEMONTREE_API = "https://platform.foodhelpline.org";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// UUID regex — anything else is treated as a share token
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Types ──────────────────────────────────────────────────────────────────────

interface EventData {
  id: string;
  title: string;
  description: string;
  status: string;
  visibility: string;
  date: string;
  start_time: string;
  end_time: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  volunteer_limit: number | null;
  current_signup_count: number;
  event_leader_id: string;
  shareable_link: string | null;
  flyer_language: string;
  resource_id: string | null;
  pantry_mode: string;
}

interface Message {
  id: string;
  message_type: string;
  content: string;
  sent_at: string;
}

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  uploaded_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(t: string) {
  if (!t) return "";
  const timePart = t.includes("T") ? t.split("T")[1] : t;
  const [hStr, mStr] = timePart.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getInitials(name: string) {
  if (!name) return "V";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

const MSG_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  announcement: { bg: "#D3EFEA", color: "#2E8B7A", label: "📢 Announcement" },
  reminder:     { bg: "#FEF9C3", color: "#A16207", label: "⏰ Reminder" },
  appreciation: { bg: "#EDE5F7", color: "#784cc5", label: "🙏 Appreciation" },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [userName, setUserName] = useState("Volunteer");
  const [userInitials, setUserInitials] = useState("V");

  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Map state
  const [mapMarkers, setMapMarkers] = useState<{ id: string; lng: number; lat: number; type: string; name?: string }[]>([]);
  const [resourceName, setResourceName] = useState<string | null>(null);
  const [fullAddress, setFullAddress] = useState<string | null>(null);

  // Auth init
  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) { router.push("/login"); return; }
    setToken(t);
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      const id = payload.sub ?? "";
      setCurrentUserId(id);
      const meta = payload?.user_metadata as Record<string, unknown> | undefined;
      const name = typeof meta?.name === "string" ? meta.name : "Volunteer";
      setUserName(name);
      setUserInitials(getInitials(name));
    } catch { /* ignore */ }
  }, [router]);

  const fetchEvent = useCallback(async (authToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const isUUID = UUID_RE.test(rawId);

      // Fetch event (by UUID or share token)
      const evUrl = isUUID
        ? `${API_URL}/api/v1/events/${rawId}`
        : `${API_URL}/api/v1/events/share/${rawId}`;
      const evRes = await fetch(evUrl, { headers });
      if (!evRes.ok) {
        setError(evRes.status === 404 ? "Event not found." : "Failed to load event.");
        return;
      }
      const evData: EventData = await evRes.json();
      setEvent(evData);

      // Fetch joined events to determine registration status
      const joinedRes = await fetch(`${API_URL}/api/v1/events/my/joined`, { headers });
      if (joinedRes.ok) {
        const joined: { id: string }[] = await joinedRes.json();
        setIsRegistered(joined.some((e) => e.id === evData.id));
      }

      // Fetch messages + photos in parallel (failures are non-fatal)
      const [msgsRes, photosRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/events/${evData.id}/messages`, { headers }),
        fetch(`${API_URL}/api/v1/events/${evData.id}/photos`),
      ]);
      if (msgsRes.ok) setMessages(await msgsRes.json());
      if (photosRes.ok) setPhotos(await photosRes.json());
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [rawId]);

  useEffect(() => {
    if (token) fetchEvent(token);
  }, [token, fetchEvent]);

  useEffect(() => {
    if (event) document.title = `${event.title} — Lemontree Volunteers`;
  }, [event]);

  // If user is the event leader, redirect to manage page
  useEffect(() => {
    if (event && currentUserId && event.event_leader_id === currentUserId) {
      router.replace(`/events/${event.id}/manage`);
    }
  }, [event, currentUserId, router]);

  // Fetch map markers + resource name once event coords are known
  useEffect(() => {
    if (!event?.latitude || !event?.longitude) return;
    const { latitude: lat, longitude: lng } = event;
    const radius = 0.02;
    const url = `${LEMONTREE_API}/api/resources/markersWithinBounds`
      + `?corner=${lng - radius},${lat - radius}&corner=${lng + radius},${lat + radius}`;

    fetch(url)
      .then((r) => r.json())
      .then((raw) => {
        type GeoFeature = { geometry: { coordinates: number[] }; properties: { id: string; resourceTypeId: string; name?: string } };
        const fc = raw.features ? raw : raw.json;
        const features: GeoFeature[] = fc?.features ?? [];
        setMapMarkers(
          features
            .filter((f) => f.geometry?.coordinates?.length >= 2)
            .map((f) => ({
              id: f.properties.id,
              type: f.properties.resourceTypeId,
              lng: f.geometry.coordinates[0],
              lat: f.geometry.coordinates[1],
              name: f.properties.name,
            }))
        );
      })
      .catch(() => {/* ignore */});

    // Reverse geocode for full address
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "lemontree-volunteer-app" } }
    )
      .then((r) => r.json())
      .then((d) => { if (d.display_name) setFullAddress(d.display_name); })
      .catch(() => {/* ignore */});

    // Fetch specific resource name if event is linked to one
    if (event.resource_id) {
      fetch(`${LEMONTREE_API}/api/resources/${event.resource_id}`)
        .then((r) => r.json())
        .then((data) => {
          const name = data?.name ?? data?.locationName ?? null;
          if (name) setResourceName(name);
        })
        .catch(() => {/* ignore */});
    }
  }, [event]);

  async function handleRegister() {
    if (!token || !event) return;
    setRegistering(true);
    setRegisterMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/events/${event.id}/signup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setIsRegistered(true);
        setEvent((e) => e ? { ...e, current_signup_count: e.current_signup_count + 1 } : e);
        setRegisterMsg("You're registered!");
        // Fetch messages now that user is registered
        const msgsRes = await fetch(`${API_URL}/api/v1/events/${event.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (msgsRes.ok) setMessages(await msgsRes.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setRegisterMsg(body.detail ?? "Registration failed.");
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleCancel() {
    if (!token || !event) return;
    setRegistering(true);
    setRegisterMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/events/${event.id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsRegistered(false);
        setEvent((e) => e ? { ...e, current_signup_count: Math.max(0, e.current_signup_count - 1) } : e);
        setMessages([]);
        setRegisterMsg("Registration cancelled.");
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleUploadPhoto(file: File) {
    if (!token || !event || uploadingPhoto) return;
    setUploadingPhoto(true);
    setPhotoSuccess(false);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/v1/events/${event.id}/photos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const newPhoto: Photo = await res.json();
        setPhotos((prev) => [...prev, newPhoto]);
        setPhotoSuccess(true);
        setTimeout(() => setPhotoSuccess(false), 3000);
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  function triggerUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/gif,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleUploadPhoto(file);
    };
    input.click();
  }

  const isPostEvent = event?.status === "completed";
  const isActive = event?.status === "upcoming" || event?.status === "active";
  const isFull = event?.volunteer_limit != null && event.current_signup_count >= event.volunteer_limit;

  if (!token) return null;

  return (
    <div className="lt-page" style={{ flexDirection: "row", alignItems: "stretch" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.dashboardMain}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          <Link href="/" className="lt-header__logo">
            <span>
              <Image src="/logo.svg" alt="Lemontree Icon" width={32} height={32} priority />
              <Image src="/lemontree_text_logo.svg" alt="Lemontree" width={112} height={24} priority />
            </span>
          </Link>
          <Link href="/profile" className={styles.topBarUser} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="lt-avatar" style={{ border: "2px solid rgba(0,0,0,0.1)", width: 32, height: 32, fontSize: 14 }}>
              {userInitials}
            </div>
            <span>{userName}</span>
          </Link>
        </div>

        <div className={styles.dashboardContent}>
          {/* Back link */}
          <Link href="/events" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--lt-text-secondary)", marginBottom: 20, textDecoration: "none" }}>
            ← Back to Events
          </Link>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
              <div className="lt-spinner" style={{ width: 48, height: 48, borderTopColor: "var(--lt-purple)" }} />
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <p style={{ color: "var(--lt-error)", marginBottom: 16 }}>{error}</p>
              <Link href="/events" className="lt-btn lt-btn--primary">Back to Events</Link>
            </div>
          ) : event ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              {/* ── Event header ─────────────────────────────────── */}
              <div style={{ background: "var(--lt-card-bg-white)", border: "1px solid var(--lt-border)", borderRadius: "var(--lt-radius-lg)", padding: "28px 32px", boxShadow: "var(--lt-shadow-card)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--lt-text-primary)", margin: 0 }}>{event.title}</h1>
                      {event.visibility === "private" && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: "var(--lt-radius-full)", background: "var(--lt-card-bg-muted)", color: "var(--lt-text-muted)" }}>🔒 Private</span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 14, color: "var(--lt-text-secondary)" }}>📅 {formatDate(event.date)} · {formatTime(event.start_time)}–{formatTime(event.end_time)}</span>
                      {event.location_name && <span style={{ fontSize: 14, color: "var(--lt-text-secondary)" }}>📍 {event.location_name}</span>}
                      <span style={{ fontSize: 14, color: "var(--lt-text-secondary)" }}>
                        👥 {event.current_signup_count}{event.volunteer_limit ? `/${event.volunteer_limit}` : ""} volunteers
                        {isFull && <span style={{ color: "var(--lt-error)", fontWeight: 600 }}> · Full</span>}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <FlyerButton eventId={event.id} />
                    {isActive && (
                      <>
                        {isRegistered ? (
                          <button
                            onClick={() => setShowConfirmCancel(true)}
                            disabled={registering}
                            style={{ padding: "12px 28px", fontSize: 14, fontWeight: 600, borderRadius: "var(--lt-radius-full)", border: "2px solid var(--lt-error)", background: "transparent", color: "var(--lt-error)", cursor: registering ? "not-allowed" : "pointer", opacity: registering ? 0.6 : 1 }}
                          >
                            {registering ? "Cancelling…" : "Cancel Registration"}
                          </button>
                        ) : (
                          <button
                            onClick={handleRegister}
                            disabled={registering || (isFull ?? false)}
                            style={{ padding: "12px 28px", fontSize: 14, fontWeight: 600, borderRadius: "var(--lt-radius-full)", border: "none", background: isFull ? "var(--lt-card-bg-muted)" : "var(--lt-purple)", color: isFull ? "var(--lt-text-muted)" : "white", cursor: (registering || isFull) ? "not-allowed" : "pointer", opacity: registering ? 0.6 : 1 }}
                          >
                            {registering ? "Registering…" : isFull ? "Event Full" : "Register →"}
                          </button>
                        )}
                        {registerMsg && (
                          <span style={{ fontSize: 13, color: registerMsg.includes("!") ? "var(--lt-teal)" : "var(--lt-error)", fontWeight: 500 }}>{registerMsg}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Description */}
                {event.description && (
                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--lt-border)" }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--lt-text-primary)", marginBottom: 10 }}>About this event</h3>
                    <p style={{ fontSize: 14, color: "var(--lt-text-secondary)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{event.description}</p>
                  </div>
                )}
              </div>

              {/* ── Announcements (registered volunteers only) ───── */}
              {isRegistered && messages.length > 0 && (
                <div style={{ background: "var(--lt-card-bg-white)", border: "1px solid var(--lt-border)", borderRadius: "var(--lt-radius-lg)", padding: "24px 32px", boxShadow: "var(--lt-shadow-card)" }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--lt-text-primary)", marginBottom: 16 }}>Announcements</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[...messages].reverse().map((m) => {
                      const s = MSG_STYLES[m.message_type] ?? MSG_STYLES.announcement;
                      return (
                        <div key={m.id} style={{ backgroundColor: s.bg, borderRadius: "var(--lt-radius-sm)", padding: "12px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
                            <span style={{ fontSize: 11, color: "var(--lt-text-muted)" }}>
                              {new Date(m.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: 14, color: "var(--lt-text-primary)", lineHeight: 1.5 }}>{m.content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Photo gallery ─────────────────────────────────── */}
              {(photos.length > 0 || (isPostEvent && isRegistered)) && (
                <div style={{ background: "var(--lt-card-bg-white)", border: "1px solid var(--lt-border)", borderRadius: "var(--lt-radius-lg)", padding: "24px 32px", boxShadow: "var(--lt-shadow-card)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--lt-text-primary)", margin: 0 }}>Event Photos</h2>
                    {isPostEvent && isRegistered && (
                      <button
                        onClick={triggerUpload}
                        disabled={uploadingPhoto}
                        style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: "var(--lt-radius-full)", border: "none", background: "var(--lt-teal)", color: "white", cursor: uploadingPhoto ? "not-allowed" : "pointer", opacity: uploadingPhoto ? 0.6 : 1 }}
                      >
                        {uploadingPhoto ? "Uploading…" : "📷 Add Photo"}
                      </button>
                    )}
                  </div>

                  {photoSuccess && (
                    <p style={{ fontSize: 13, color: "var(--lt-teal)", fontWeight: 600, marginBottom: 12 }}>✓ Photo uploaded!</p>
                  )}

                  {photos.length === 0 ? (
                    <p style={{ fontSize: 14, color: "var(--lt-text-muted)", textAlign: "center", padding: "32px 0" }}>No photos yet. Be the first to share a memory!</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                      {photos.map((p, i) => (
                        <div
                          key={p.id}
                          onClick={() => setLightboxIndex(i)}
                          style={{ aspectRatio: "1", borderRadius: "var(--lt-radius-sm)", overflow: "hidden", cursor: "pointer", background: "var(--lt-card-bg-muted)" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.photo_url} alt={p.caption ?? "Event photo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Location map ─────────────────────────────────── */}
              {event.latitude && event.longitude && (
                <div style={{ background: "var(--lt-card-bg-white)", border: "1px solid var(--lt-border)", borderRadius: "var(--lt-radius-lg)", padding: "24px 32px", boxShadow: "var(--lt-shadow-card)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--lt-text-primary)", marginBottom: 4 }}>Location</h2>
                      {resourceName && (
                        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--lt-teal)", margin: "0 0 4px" }}>{resourceName}</p>
                      )}
                      <p style={{ fontSize: 13, color: "var(--lt-text-secondary)", margin: 0, lineHeight: 1.5 }}>
                        📍 {fullAddress ?? event.location_name}
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", fontSize: 13, fontWeight: 600, borderRadius: "var(--lt-radius-full)", background: "var(--lt-teal)", color: "white", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      Get Directions
                    </a>
                  </div>

                  <div style={{ borderRadius: "var(--lt-radius-md)", overflow: "hidden", height: 360, border: "1px solid var(--lt-border)" }}>
                    <Map
                      mapLib={maplibregl}
                      initialViewState={{ longitude: event.longitude, latitude: event.latitude, zoom: 15 }}
                      style={{ width: "100%", height: "100%" }}
                      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                      attributionControl={false}
                    >
                      {mapMarkers.filter((m) =>
                        !(Math.abs(m.lat - event.latitude!) < 0.00005 && Math.abs(m.lng - event.longitude!) < 0.00005)
                      ).map((m) => (
                        <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
                          <div
                            title={m.name ?? (m.type === "SOUP_KITCHEN" ? "Soup Kitchen" : "Food Pantry")}
                            style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid white", background: m.type === "SOUP_KITCHEN" ? "#E86F51" : "#6942b5", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", cursor: "default" }}
                          />
                        </Marker>
                      ))}
                      <Marker longitude={event.longitude} latitude={event.latitude} anchor="center" style={{ zIndex: 10 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: "3px solid white", background: "#2E8B7A", boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }} title="Event location" />
                      </Marker>
                    </Map>
                  </div>

                  <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--lt-text-secondary)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2E8B7A", display: "inline-block", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} /> Event location
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--lt-text-secondary)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#6942b5", display: "inline-block", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} /> Food Pantry
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--lt-text-secondary)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#E86F51", display: "inline-block", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} /> Soup Kitchen
                    </span>
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i !== null ? (i - 1 + photos.length) % photos.length : null); }}
            style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "white", fontSize: 32, width: 48, height: 48, borderRadius: "50%", cursor: "pointer" }}>‹</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[lightboxIndex].photo_url} alt="" style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i !== null ? (i + 1) % photos.length : null); }}
            style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "white", fontSize: 32, width: 48, height: 48, borderRadius: "50%", cursor: "pointer" }}>›</button>
          <button onClick={() => setLightboxIndex(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "white", fontSize: 20, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }}>✕</button>
        </div>
      )}

      <button className="lt-sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>

      {showConfirmCancel && (
        <>
          <div
            onClick={() => setShowConfirmCancel(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 1100,
              backdropFilter: "blur(2px)",
            }}
          />
          <div style={{
            position: "fixed",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1101,
            background: "white",
            borderRadius: "var(--lt-radius-lg)",
            padding: "32px 28px",
            maxWidth: 380,
            width: "calc(100vw - 48px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            textAlign: "center",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--lt-text-primary)", marginBottom: 10 }}>
              Unregister from this event?
            </h2>
            <p style={{ fontSize: 14, color: "var(--lt-text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>
              Your spot will be released and you won&apos;t be registered anymore.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setShowConfirmCancel(false)}
                style={{
                  padding: "10px 22px", fontSize: 14, fontWeight: 600,
                  borderRadius: "var(--lt-radius-full)",
                  border: "2px solid var(--lt-border)",
                  background: "transparent", color: "var(--lt-text-secondary)",
                  cursor: "pointer",
                }}
              >
                Keep registration
              </button>
              <button
                onClick={() => { setShowConfirmCancel(false); handleCancel(); }}
                style={{
                  padding: "10px 22px", fontSize: 14, fontWeight: 700,
                  borderRadius: "var(--lt-radius-full)",
                  border: "none",
                  background: "var(--lt-error)", color: "white",
                  cursor: "pointer",
                }}
              >
                Yes, unregister
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

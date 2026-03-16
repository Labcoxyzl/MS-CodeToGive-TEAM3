"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/ui/Sidebar";
import styles from "@/app/dashboard/dashboard.module.css";

// ── Types ──────────────────────────────────────────────────────────────────

interface EventData {
  id: string;
  title: string;
  status: string;
  volunteer_limit: number | null;
  current_signup_count: number;
  event_leader_id: string;
  location_name: string | null;
  date: string;
  start_time: string;
  end_time: string;
}

interface Signup {
  id: string;
  user_id: string | null;
  guest_signup_id: string | null;
  name: string | null;
  email: string | null;
  status: string;
  signed_up_at: string;
  checked_in_at: string | null;
}

type Tab = "pre" | "during" | "post";

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "V";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

const CLUSTER_COLORS = [
  "var(--lt-teal)",
  "var(--lt-purple)",
  "var(--lt-coral)",
];

// ── Component ──────────────────────────────────────────────────────────────

export default function ManageEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("pre");
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventData | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [toggling, setToggling] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [uncheckingIn, setUncheckingIn] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState("U");
  const [userName, setUserName] = useState("User");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messages, setMessages] = useState<{ id: string; content: string; message_type: string; sent_at: string }[]>([]);
  const [photos, setPhotos] = useState<{ id: string; photo_url: string; caption: string | null; uploaded_at: string }[]>([]);

  // ── Send Message ───────────────────────────────────────────────────────

  async function handleSendMessage(content: string, messageType: "announcement" | "reminder" | "appreciation") {
    if (!token || !content.trim()) return;
    const res = await fetch(`${API_URL}/api/v1/events/${eventId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content, message_type: messageType }),
    });
    if (res.ok) {
      const newMsg = await res.json();
      setMessages(prev => [...prev, newMsg]);
    }
  }

  // ── Upload Photo ───────────────────────────────────────────────────────

  async function handleUploadPhoto(file: File) {
    if (!token || uploadingPhoto) return;
    setUploadingPhoto(true);
    setPhotoSuccess(false);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/v1/events/${eventId}/photos`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const newPhoto = await res.json();
        setPhotos(prev => [...prev, newPhoto]);
        setPhotoSuccess(true);
        setTimeout(() => setPhotoSuccess(false), 3000);
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  // ── Auth guard + initial fetch ─────────────────────────────────────────

  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) { router.push("/login"); return; }
    setToken(t);

    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      const meta = payload?.user_metadata as Record<string, unknown> | undefined;
      const name = typeof meta?.name === "string" ? meta.name : "Leader";
      setUserName(name);
      setUserInitials(getInitials(name));
    } catch { /* ignore */ }
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!token || !eventId) return;
    setLoading(true);
    setError(null);

    try {
      const headers = { "Authorization": `Bearer ${token}` };

      const [evRes, signupsRes, msgsRes, photosRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/events/${eventId}`, { headers }),
        fetch(`${API_URL}/api/v1/events/${eventId}/signups`, { headers }),
        fetch(`${API_URL}/api/v1/events/${eventId}/messages`, { headers }),
        fetch(`${API_URL}/api/v1/events/${eventId}/photos`),
      ]);

      if (!evRes.ok) {
        setError(evRes.status === 404 ? "Event not found." : "Failed to load event.");
        return;
      }

      if (!signupsRes.ok && signupsRes.status === 403) {
        setError("You are not authorised to manage this event.");
        return;
      }

      const evData: EventData = await evRes.json();
      const signupsData: Signup[] = signupsRes.ok ? await signupsRes.json() : [];

      setEvent(evData);
      setSignups(signupsData);
      if (msgsRes.ok) setMessages(await msgsRes.json());
      if (photosRes.ok) setPhotos(await photosRes.json());
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [token, eventId, API_URL]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Toggle Event Open / Closed ─────────────────────────────────────────

  async function handleToggleOpen() {
    if (!event || !token || toggling) return;
    setToggling(true);

    const newStatus = event.status === "active" ? "upcoming" : "active";
    try {
      const res = await fetch(`${API_URL}/api/v1/events/${eventId}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated: EventData = await res.json();
        setEvent(updated);
      }
    } finally {
      setToggling(false);
    }
  }

  // ── Check In volunteer ─────────────────────────────────────────────────

  async function handleCheckIn(signupId: string) {
    if (!token || checkingIn) return;
    setCheckingIn(signupId);
    try {
      const res = await fetch(`${API_URL}/api/v1/events/${eventId}/signups/${signupId}/check-in`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        setSignups(prev =>
          prev.map(s => s.id === signupId ? { ...s, status: "attended", checked_in_at: new Date().toISOString() } : s)
        );
      }
    } finally {
      setCheckingIn(null);
    }
  }

  async function handleUncheckIn(signupId: string) {
    if (!token || uncheckingIn) return;
    setUncheckingIn(signupId);
    try {
      const res = await fetch(`${API_URL}/api/v1/events/${eventId}/signups/${signupId}/uncheck-in`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        setSignups(prev =>
          prev.map(s => s.id === signupId ? { ...s, status: "registered", checked_in_at: null } : s)
        );
      }
    } finally {
      setUncheckingIn(null);
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────

  const activeSignups = signups.filter(s => s.status !== "cancelled");
  const checkedIn = activeSignups.filter(s => s.status === "attended").length;
  const total = activeSignups.length;
  const isOpen = event?.status === "active";
  // ── Loading / Error states ─────────────────────────────────────────────

  if (!token) return null;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="lt-page" style={{ flexDirection: "row", alignItems: "stretch" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.dashboardMain}>

        {/* ── Top Bar ─────────────────────────────────────────────── */}
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
            <span className="hidden sm:inline">{userName}</span>
          </Link>
        </div>

        {/* ── Main Content ─────────────────────────────────────────── */}
        <div className={styles.dashboardContent}>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
              <div className="lt-spinner" style={{ width: 48, height: 48, borderTopColor: "var(--lt-color-brand-primary)" }} />
            </div>
          ) : error ? (
            <div className="lt-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
              <p style={{ color: "var(--lt-error)", marginBottom: 16 }}>{error}</p>
              <Link href="/dashboard" className="lt-btn lt-btn--primary">Back to Dashboard</Link>
            </div>
          ) : event ? (
            <>
              {/* ── Header row ─────────────────────────────────── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
                <div>
                  <h1 className="lt-section-title" style={{ fontSize: 32, margin: 0 }}>{event.title}</h1>
                  {activeTab !== "pre" && (
                    <p style={{ color: "var(--lt-text-secondary)", fontSize: 15, marginTop: 8, fontWeight: 500 }}>
                      Volunteers Status ({checkedIn}/{total})
                    </p>
                  )}
                </div>

                {/* ── Tab switcher ─────────────────────────── */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["pre", "during", "post"] as Tab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: "8px 20px",
                        borderRadius: "var(--lt-radius-full)",
                        fontSize: 14,
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        transition: "var(--lt-transition)",
                        backgroundColor: activeTab === tab ? "var(--lt-text-primary)" : "var(--lt-card-bg-muted)",
                        color: activeTab === tab ? "white" : "var(--lt-text-secondary)",
                      }}
                    >
                      {tab === "pre" ? "Pre-event" : tab === "during" ? "During event" : "Post-event"}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── PRE-EVENT ──────────────────────────────────── */}
              {activeTab === "pre" && (
                <div className="animate-fade-in">
                  {/* Action bar */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
                    {/* Event Open toggle */}
                    <button
                      onClick={handleToggleOpen}
                      disabled={toggling}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 20px", borderRadius: "var(--lt-radius-full)",
                        fontSize: 15, fontWeight: 600, border: "none", cursor: toggling ? "wait" : "pointer",
                        backgroundColor: "var(--lt-card-bg-muted)", color: "var(--lt-text-primary)",
                        transition: "var(--lt-transition)",
                      }}
                    >
                      Event {isOpen ? "Open" : "Closed"}
                      {/* Toggle pill */}
                      <div style={{
                        width: 44, height: 24, borderRadius: 12, transition: "background 0.2s",
                        backgroundColor: isOpen ? "var(--lt-teal)" : "var(--lt-text-muted)",
                        display: "flex", alignItems: "center",
                        justifyContent: isOpen ? "flex-end" : "flex-start", padding: "0 3px",
                      }}>
                        <div style={{ width: 18, height: 18, backgroundColor: "white", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                      </div>
                    </button>

                    <Link
                      href={`/events/${eventId}/edit`}
                      className="lt-btn"
                      style={{ borderRadius: "var(--lt-radius-full)", padding: "12px 20px", backgroundColor: "var(--lt-card-bg-muted)", color: "var(--lt-text-primary)" }}
                    >
                      Edit Event ✎
                    </Link>

                    <button
                      onClick={() => setShowMessageModal(true)}
                      className="lt-btn"
                      style={{ borderRadius: "var(--lt-radius-full)", padding: "12px 20px", backgroundColor: "var(--lt-teal)", color: "white", fontWeight: 600, fontSize: 14 }}
                    >
                      📢 Message Volunteers
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                    {/* Volunteers list */}
                    <div style={{ flex: "1 1 55%", minWidth: 280 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--lt-text-primary)" }}>
                        Volunteers ({event.current_signup_count}{event.volunteer_limit ? `/${event.volunteer_limit}` : ""})
                      </h2>
                      <VolunteerList
                        signups={activeSignups}
                        showAction={false}
                        onCheckIn={handleCheckIn}
                        onUncheckIn={handleUncheckIn}
                        checkingIn={checkingIn}
                        uncheckingIn={uncheckingIn}
                      />
                    </div>

                    {/* Right column: clusters */}
                    <ClustersPanel />
                  </div>

                  <MessageHistoryPanel messages={messages} />
                </div>
              )}

              {/* ── DURING EVENT ───────────────────────────────── */}
              {activeTab === "during" && (
                <>
                  {/* Action bar */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
                    <Link
                      href={`/events/${eventId}/edit`}
                      className="lt-btn"
                      style={{ borderRadius: "var(--lt-radius-full)", padding: "12px 20px", backgroundColor: "var(--lt-card-bg-muted)", color: "var(--lt-text-primary)" }}
                    >
                      Edit Event ✎
                    </Link>
                    <button
                      onClick={() => setShowMessageModal(true)}
                      className="lt-btn"
                      style={{ borderRadius: "var(--lt-radius-full)", padding: "12px 20px", backgroundColor: "var(--lt-teal)", color: "white", fontWeight: 600, fontSize: 14 }}
                    >
                      📢 Message Volunteers
                    </button>
                  </div>

                  <div className="animate-fade-in" style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                    {/* Volunteers with check-in */}
                    <div style={{ flex: "1 1 55%", minWidth: 280 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--lt-text-primary)" }}>
                        Volunteers ({checkedIn}/{total} checked in)
                      </h2>
                      <VolunteerList
                        signups={activeSignups}
                        showAction
                        onCheckIn={handleCheckIn}
                        onUncheckIn={handleUncheckIn}
                        checkingIn={checkingIn}
                        uncheckingIn={uncheckingIn}
                      />
                    </div>

                    <ClustersPanel />
                  </div>

                  <MessageHistoryPanel messages={messages} />
                </>
              )}

              {/* ── POST-EVENT ─────────────────────────────────── */}
              {activeTab === "post" && (
                <>
                  {/* Action bar */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
                    <Link
                      href={`/events/${eventId}/edit`}
                      className="lt-btn"
                      style={{ borderRadius: "var(--lt-radius-full)", padding: "12px 20px", backgroundColor: "var(--lt-card-bg-muted)", color: "var(--lt-text-primary)" }}
                    >
                      Edit Event ✎
                    </Link>
                    <button
                      onClick={() => setShowMessageModal(true)}
                      className="lt-btn"
                      style={{ borderRadius: "var(--lt-radius-full)", padding: "12px 20px", backgroundColor: "var(--lt-teal)", color: "white", fontWeight: 600, fontSize: 14 }}
                    >
                      📢 Message Volunteers
                    </button>
                  </div>

                  <div className="animate-fade-in" style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                    {/* Final attendance */}
                    <div style={{ flex: "1 1 55%", minWidth: 280 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--lt-text-primary)" }}>
                        Volunteers ({checkedIn}/{total} attended)
                      </h2>
                      <VolunteerList
                        signups={activeSignups}
                        showAction={false}
                        onCheckIn={handleCheckIn}
                        onUncheckIn={handleUncheckIn}
                        checkingIn={checkingIn}
                        uncheckingIn={uncheckingIn}
                        postEvent
                      />
                    </div>

                    <div style={{ flex: "1 1 40%", minWidth: 240, display: "flex", flexDirection: "column", gap: 24 }}>
                      <ClustersPanel compact />
                      <ShowcasePanel onUploadPhoto={handleUploadPhoto} uploading={uploadingPhoto} success={photoSuccess} photos={photos} />
                    </div>
                  </div>

                  <MessageHistoryPanel messages={messages} />
                </>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <button className="lt-sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>

      {/* Message Modal */}
      {showMessageModal && (
        <MessageModal
          onSend={handleSendMessage}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function VolunteerList({
  signups,
  showAction,
  onCheckIn,
  onUncheckIn,
  checkingIn,
  uncheckingIn,
  postEvent = false,
}: {
  signups: Signup[];
  showAction: boolean;
  onCheckIn: (id: string) => void;
  onUncheckIn: (id: string) => void;
  checkingIn: string | null;
  uncheckingIn: string | null;
  postEvent?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? signups.filter(s =>
        (s.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.email ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : signups;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--lt-text-muted)", pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          placeholder="Search volunteers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="lt-input"
          style={{ width: "100%", paddingLeft: 34, boxSizing: "border-box" }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="lt-panel" style={{ padding: "32px 24px", textAlign: "center", color: "var(--lt-text-secondary)" }}>
          {signups.length === 0 ? "No volunteers signed up yet." : "No volunteers match your search."}
        </div>
      ) : (
        <div style={{ backgroundColor: "var(--lt-card-bg-muted)", borderRadius: "var(--lt-radius-md)", padding: "8px 24px", maxHeight: 420, overflowY: "auto" }}>
          {filtered.map((s, i) => {
            const isLast = i === filtered.length - 1;
            const attended = s.status === "attended";
            const initials = getInitials(s.name);
            const displayName = s.name ?? "Guest";
            const displaySub = s.email ?? "—";
            const busy = checkingIn === s.id || uncheckingIn === s.id;

            let badge: React.ReactNode = null;
            if (showAction) {
              badge = attended ? (
                <button
                  onClick={() => onUncheckIn(s.id)}
                  disabled={busy}
                  title="Click to undo check-in"
                  style={{
                    padding: "4px 14px", borderRadius: "var(--lt-radius-full)",
                    fontSize: 13, fontWeight: 600, border: "none", cursor: busy ? "wait" : "pointer",
                    backgroundColor: "var(--lt-teal)", color: "white",
                    opacity: busy ? 0.6 : 1, transition: "var(--lt-transition)",
                  }}
                >
                  {uncheckingIn === s.id ? "…" : "✓ Checked In"}
                </button>
              ) : (
                <button
                  onClick={() => onCheckIn(s.id)}
                  disabled={busy}
                  title="Click to check in"
                  style={{
                    padding: "4px 14px", borderRadius: "var(--lt-radius-full)",
                    fontSize: 13, fontWeight: 600, border: "none", cursor: busy ? "wait" : "pointer",
                    backgroundColor: "var(--lt-error-bg)", color: "var(--lt-error)",
                    opacity: busy ? 0.6 : 1, transition: "var(--lt-transition)",
                  }}
                >
                  {checkingIn === s.id ? "…" : "Check In"}
                </button>
              );
            } else if (postEvent) {
              badge = attended ? (
                <span style={{ padding: "4px 14px", borderRadius: "var(--lt-radius-full)", fontSize: 13, fontWeight: 600, backgroundColor: "var(--lt-teal)", color: "white" }}>
                  ✓ Attended
                </span>
              ) : (
                <span style={{ padding: "4px 14px", borderRadius: "var(--lt-radius-full)", fontSize: 13, fontWeight: 600, backgroundColor: "var(--lt-error-bg)", color: "var(--lt-error)" }}>
                  Absent
                </span>
              );
            }

            return (
              <div
                key={s.id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "16px 0",
                  borderBottom: isLast ? "none" : "1px solid var(--lt-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    className="lt-avatar lt-avatar--sm"
                    style={{ background: "none", border: "2px solid var(--lt-border)", color: "var(--lt-text-muted)" }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--lt-text-primary)" }}>{displayName}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--lt-text-secondary)" }}>{displaySub}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {badge}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClustersPanel({ compact = false }: { compact?: boolean }) {
  const clusters = compact ? ["A"] : ["A", "B", "C"];
  return (
    <div style={{ flex: "1 1 40%", minWidth: 240 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--lt-text-primary)" }}>Team Clusters</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, backgroundColor: "var(--lt-card-bg-muted)", padding: 24, borderRadius: "var(--lt-radius-md)", maxHeight: 420, overflowY: "auto" }}>
        {clusters.map((group, i) => (
          <div
            key={group}
            style={{
              padding: "14px 18px", borderRadius: "var(--lt-radius-sm)",
              backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
              color: "white",
            }}
          >
            <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 600 }}>Group {group}: Location</p>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>Participant A, Participant B…</p>
          </div>
        ))}
        <p style={{ margin: 0, fontSize: 12, color: "var(--lt-text-muted)", textAlign: "center" }}>
          Team clustering coming soon
        </p>
      </div>
    </div>
  );
}

function MessageModal({ onSend, onClose }: {
  onSend: (content: string, type: "announcement" | "reminder" | "appreciation") => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [type, setType] = useState<"announcement" | "reminder" | "appreciation">("announcement");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const types: { value: "announcement" | "reminder" | "appreciation"; label: string; emoji: string }[] = [
    { value: "announcement", label: "Announcement", emoji: "📢" },
    { value: "reminder",     label: "Reminder",     emoji: "⏰" },
    { value: "appreciation", label: "Appreciation", emoji: "🙏" },
  ];

  async function submit() {
    if (!text.trim() || sending) return;
    setSending(true);
    await onSend(text.trim(), type);
    setSent(true);
    setSending(false);
    setTimeout(() => { setSent(false); onClose(); }, 1500);
  }

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Modal card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--lt-card-bg-white)",
          borderRadius: "var(--lt-radius-md)",
          boxShadow: "var(--lt-shadow-elevated)",
          width: "100%", maxWidth: 480,
          padding: 32,
          display: "flex", flexDirection: "column", gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--lt-text-primary)" }}>
            Message Volunteers
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--lt-text-muted)", lineHeight: 1 }}>✕</button>
        </div>

        {/* Type selector */}
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--lt-text-secondary)" }}>MESSAGE TYPE</p>
          <div style={{ display: "flex", gap: 8 }}>
            {types.map(t => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: "var(--lt-radius-full)",
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  transition: "var(--lt-transition)",
                  backgroundColor: type === t.value ? "var(--lt-text-primary)" : "var(--lt-card-bg-muted)",
                  color: type === t.value ? "white" : "var(--lt-text-secondary)",
                }}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message input */}
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--lt-text-secondary)" }}>MESSAGE</p>
          <textarea
            style={{
              width: "100%", minHeight: 120, padding: "12px 16px",
              borderRadius: "var(--lt-radius-sm)", border: "1px solid var(--lt-border)",
              fontSize: 15, color: "var(--lt-text-primary)", background: "var(--lt-card-bg-muted)",
              resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            }}
            placeholder={`Write your ${type} here...`}
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={sending || sent}
            autoFocus
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            className="lt-btn"
            style={{ borderRadius: "var(--lt-radius-full)", padding: "10px 24px", backgroundColor: "var(--lt-card-bg-muted)", color: "var(--lt-text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={sending || !text.trim() || sent}
            className="lt-btn lt-btn--primary"
            style={{ borderRadius: "var(--lt-radius-full)", padding: "10px 24px" }}
          >
            {sent ? "✓ Sent!" : sending ? "Sending…" : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}

const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  announcement: { bg: "var(--lt-teal-light)",   color: "var(--lt-teal)",   label: "📢 Announcement" },
  reminder:     { bg: "var(--lt-yellow-light)",  color: "var(--lt-yellow)", label: "⏰ Reminder"     },
  appreciation: { bg: "var(--lt-purple-light)",  color: "var(--lt-purple)", label: "🙏 Appreciation" },
};

function MessageHistoryPanel({ messages }: { messages: { id: string; content: string; message_type: string; sent_at: string }[] }) {
  if (messages.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: "var(--lt-text-primary)" }}>
        Sent Messages
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
        {[...messages].reverse().map(m => {
          const s = TYPE_STYLES[m.message_type] ?? TYPE_STYLES.announcement;
          return (
            <div key={m.id} style={{
              backgroundColor: s.bg, borderRadius: "var(--lt-radius-sm)",
              padding: "10px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
                <span style={{ fontSize: 11, color: "var(--lt-text-muted)" }}>
                  {new Date(m.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--lt-text-primary)", lineHeight: 1.5 }}>{m.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShowcasePanel({ onUploadPhoto, uploading, success, photos }: {
  onUploadPhoto: (file: File) => Promise<void>;
  uploading: boolean;
  success: boolean;
  photos: { id: string; photo_url: string; caption: string | null; uploaded_at: string }[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  function triggerUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/gif,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onUploadPhoto(file);
    };
    input.click();
  }

  function openLightbox(i: number) { setLightboxIndex(i); }
  function closeLightbox() { setLightboxIndex(null); }
  function prev() { setLightboxIndex(i => i !== null ? (i - 1 + photos.length) % photos.length : null); }
  function next() { setLightboxIndex(i => i !== null ? (i + 1) % photos.length : null); }

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") closeLightbox();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, photos.length]);

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "var(--lt-text-primary)" }}>Showcase your Service:</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, backgroundColor: "var(--lt-card-bg-muted)", padding: 20, borderRadius: "var(--lt-radius-md)" }}>
        {/* Upload Photos — wired */}
        <div
          onClick={uploading ? undefined : triggerUpload}
          style={{
            backgroundColor: "var(--lt-teal-light)", color: "var(--lt-teal)",
            border: "1px solid var(--lt-border-focus)",
            padding: "14px 18px", borderRadius: "var(--lt-radius-sm)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 15, cursor: uploading ? "wait" : "pointer", transition: "var(--lt-transition)",
            opacity: uploading ? 0.7 : 1,
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {success ? "✓ Photo uploaded!" : uploading ? "Uploading…" : "Upload Photos"}
          </span>
          <span className="lt-badge lt-badge--active">+5</span>
        </div>

        {/* Post on Social Media — placeholder */}
        <div style={{
          backgroundColor: "var(--lt-purple-light)", color: "var(--lt-purple)",
          padding: "14px 18px", borderRadius: "var(--lt-radius-sm)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 15, cursor: "pointer", transition: "var(--lt-transition)",
        }}>
          <span style={{ fontWeight: 600 }}>Post on Social Media</span>
          <span className="lt-badge lt-badge--active">+5</span>
        </div>

        {/* Reflect — placeholder */}
        <div style={{
          backgroundColor: "var(--lt-card-bg-white)", color: "var(--lt-text-primary)",
          border: "1px solid var(--lt-border)",
          padding: "14px 18px", borderRadius: "var(--lt-radius-sm)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 15, cursor: "pointer", transition: "var(--lt-transition)",
        }}>
          <span style={{ fontWeight: 600 }}>Reflect on your experience</span>
          <span className="lt-badge lt-badge--active">+5</span>
        </div>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--lt-text-secondary)" }}>
            UPLOADED PHOTOS ({photos.length})
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => openLightbox(i)}
                style={{ display: "block", aspectRatio: "1", borderRadius: "var(--lt-radius-sm)", overflow: "hidden", border: "none", padding: 0, cursor: "pointer" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photo_url}
                  alt={p.caption ?? "Event photo"}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          onClick={closeLightbox}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            backgroundColor: "rgba(0,0,0,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "white", fontSize: 32, cursor: "pointer", lineHeight: 1, zIndex: 101 }}
          >
            ✕
          </button>

          {/* Counter */}
          <span style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600 }}>
            {lightboxIndex + 1} / {photos.length}
          </span>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); prev(); }}
              style={{ position: "absolute", left: 16, background: "rgba(255,255,255,0.12)", border: "none", color: "white", fontSize: 28, cursor: "pointer", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 101 }}
            >
              ‹
            </button>
          )}

          {/* Image */}
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "85vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIndex].photo_url}
              alt={photos[lightboxIndex].caption ?? "Event photo"}
              style={{ maxWidth: "90vw", maxHeight: "78vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
            />
            {photos[lightboxIndex].caption && (
              <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center" }}>
                {photos[lightboxIndex].caption}
              </p>
            )}
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); next(); }}
              style={{ position: "absolute", right: 16, background: "rgba(255,255,255,0.12)", border: "none", color: "white", fontSize: 28, cursor: "pointer", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 101 }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}


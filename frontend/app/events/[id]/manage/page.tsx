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
  const [userInitials, setUserInitials] = useState("U");
  const [userName, setUserName] = useState("User");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      const [evRes, signupsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/events/${eventId}`, { headers }),
        fetch(`${API_URL}/api/v1/events/${eventId}/signups`, { headers }),
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
          <button
            className="lt-sidebar-toggle lg:hidden"
            onClick={() => setSidebarOpen(true)}
            style={{ position: "static", display: "flex", width: 40, height: 40 }}
          >☰</button>

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

                    {/* Send Message placeholder */}
                    <div style={{
                      flex: 1, minWidth: 200,
                      backgroundColor: "var(--lt-card-bg-muted)", padding: "12px 20px",
                      borderRadius: "var(--lt-radius-full)", color: "var(--lt-text-muted)",
                      fontSize: 15, display: "flex", alignItems: "center",
                      cursor: "not-allowed",
                    }}>
                      Send Message...
                    </div>
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
                        checkingIn={checkingIn}
                      />
                    </div>

                    {/* Team Clusters placeholder */}
                    <ClustersPanel />
                  </div>
                </div>
              )}

              {/* ── DURING EVENT ───────────────────────────────── */}
              {activeTab === "during" && (
                <div className="animate-fade-in" style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                  {/* Volunteers with check-in */}
                  <div style={{ flex: "1 1 55%", minWidth: 280 }}>
                    <VolunteerList
                      signups={activeSignups}
                      showAction
                      onCheckIn={handleCheckIn}
                      checkingIn={checkingIn}
                    />
                  </div>

                  <div style={{ flex: "1 1 40%", minWidth: 240, display: "flex", flexDirection: "column", gap: 24 }}>
                    {/* Send Message placeholder */}
                    <div style={{
                      backgroundColor: "var(--lt-card-bg-muted)", padding: "14px 20px",
                      borderRadius: "var(--lt-radius-full)", color: "var(--lt-text-muted)",
                      fontSize: 15, cursor: "not-allowed",
                    }}>
                      Send Message...
                    </div>
                    <ClustersPanel />
                  </div>
                </div>
              )}

              {/* ── POST-EVENT ─────────────────────────────────── */}
              {activeTab === "post" && (
                <div className="animate-fade-in" style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                  {/* Final attendance */}
                  <div style={{ flex: "1 1 55%", minWidth: 280 }}>
                    <VolunteerList
                      signups={activeSignups}
                      showAction={false}
                      onCheckIn={handleCheckIn}
                      checkingIn={checkingIn}
                      postEvent
                    />
                  </div>

                  <div style={{ flex: "1 1 40%", minWidth: 240, display: "flex", flexDirection: "column", gap: 24 }}>
                    {/* Send Message placeholder */}
                    <div style={{
                      backgroundColor: "var(--lt-card-bg-muted)", padding: "14px 20px",
                      borderRadius: "var(--lt-radius-full)", color: "var(--lt-text-muted)",
                      fontSize: 15, cursor: "not-allowed",
                    }}>
                      Send Message...
                    </div>

                    <ClustersPanel compact />

                    {/* Showcase Your Service */}
                    <ShowcasePanel />
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <button className="lt-sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function VolunteerList({
  signups,
  showAction,
  onCheckIn,
  checkingIn,
  postEvent = false,
}: {
  signups: Signup[];
  showAction: boolean;
  onCheckIn: (id: string) => void;
  checkingIn: string | null;
  postEvent?: boolean;
}) {
  if (signups.length === 0) {
    return (
      <div className="lt-panel" style={{ padding: "32px 24px", textAlign: "center", color: "var(--lt-text-secondary)" }}>
        No volunteers signed up yet.
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--lt-card-bg-muted)", borderRadius: "var(--lt-radius-md)", padding: "8px 24px" }}>
      {signups.map((s, i) => {
        const isLast = i === signups.length - 1;
        const attended = s.status === "attended";
        const initials = getInitials(s.name);
        const displayName = s.name ?? "Guest";
        const displaySub = s.email ?? "—";

        let badge: React.ReactNode = null;
        if (showAction) {
          // During event: click Absent to check in
          badge = attended ? (
            <span className="lt-badge lt-badge--completed">Checked In</span>
          ) : (
            <button
              onClick={() => onCheckIn(s.id)}
              disabled={checkingIn === s.id}
              style={{
                padding: "4px 12px", borderRadius: "var(--lt-radius-full)",
                fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                backgroundColor: "var(--lt-card-bg-white)", color: "var(--lt-text-secondary)",
                opacity: checkingIn === s.id ? 0.6 : 1,
                transition: "var(--lt-transition)",
              }}
              title="Click to check in"
            >
              {checkingIn === s.id ? "…" : "Absent"}
            </button>
          );
        } else if (postEvent) {
          badge = attended ? (
            <span className="lt-badge lt-badge--completed">Checked In</span>
          ) : (
            <span style={{ padding: "4px 12px", borderRadius: "var(--lt-radius-full)", fontSize: 13, fontWeight: 600, backgroundColor: "var(--lt-error-bg)", color: "var(--lt-error)" }}>
              Not Checked In
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
            {badge}
          </div>
        );
      })}
    </div>
  );
}

function ClustersPanel({ compact = false }: { compact?: boolean }) {
  const clusters = compact ? ["A"] : ["A", "B", "C"];
  return (
    <div style={{ flex: "1 1 40%", minWidth: 240 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--lt-text-primary)" }}>Team Clusters</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, backgroundColor: "var(--lt-card-bg-muted)", padding: 24, borderRadius: "var(--lt-radius-md)" }}>
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

function ShowcasePanel() {
  const actions = [
    { label: "Upload Photos", bg: "var(--lt-teal-light)", color: "var(--lt-teal)", border: "1px solid var(--lt-border-focus)" },
    { label: "Post on Social Media", bg: "var(--lt-purple-light)", color: "var(--lt-purple)", border: "none" },
    { label: "Reflect on your experience", bg: "var(--lt-card-bg-white)", color: "var(--lt-text-primary)", border: "1px solid var(--lt-border)" },
  ];
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "var(--lt-text-primary)" }}>Showcase your Service:</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, backgroundColor: "var(--lt-card-bg-muted)", padding: 20, borderRadius: "var(--lt-radius-md)" }}>
        {actions.map(a => (
          <div
            key={a.label}
            style={{
              backgroundColor: a.bg, color: a.color, border: a.border,
              padding: "14px 18px", borderRadius: "var(--lt-radius-sm)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontSize: 15, cursor: "pointer", transition: "var(--lt-transition)",
            }}
          >
            <span style={{ fontWeight: 600 }}>{a.label}</span>
            <span className="lt-badge lt-badge--active">+5</span>
          </div>
        ))}
      </div>
    </div>
  );
}

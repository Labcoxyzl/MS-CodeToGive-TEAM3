"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/ui/Sidebar";
import CreateEventGuard from "@/app/components/ui/CreateEventGuard";
import StatsCard from "@/app/components/ui/StatsCard";
import RecentImpactCarousel from "@/app/components/ui/RecentImpactCarousel";
import UpcomingEventsTable from "@/app/components/ui/UpcomingEventsTable";
import LeaderboardPreview from "@/app/components/ui/LeaderboardPreview";
import type {
  RecentEvent,
  UpcomingEvent,
  LeaderboardEntry,
} from "./mockData";
import ResourceMap from "@/app/components/ui/ResourceMap";
import styles from "./dashboard.module.css";

function getInitials(name: string) {
  if (!name) return "V";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

export default function DashboardPage() {
  useEffect(() => { document.title = "Dashboard — Lemontree Volunteers"; }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [userState, setUserState] = useState({ name: "", initials: "" });
  const [stats, setStats] = useState({ eventsAttended: 0, upcomingEvents: 0, pointsEarned: 0 });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcementToast, setAnnouncementToast] = useState<{ count: number; events: string[]; eventIds: string[] } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    
    setIsAuthorized(true);

    let userId = "";
    let payload: Record<string, unknown> | null = null;
    try {
      payload = JSON.parse(atob(token.split(".")[1]));
      if (payload && typeof payload.sub === "string") {
        userId = payload.sub;
      }
    } catch (err) {
      console.error("Failed to parse JWT", err);
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    
    const headers = {
      "Authorization": `Bearer ${token}`,
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json"
    };

    async function fetchData() {
      try {
        // 1. Fetch user data, points, and leaderboard in parallel
        let currentUserName = "Volunteer";
        let points = 0;

        const [meRes, pointsRes, lbRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/v1/points/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/v1/leaderboard?limit=4`),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (typeof meData.name === "string" && meData.name) {
            currentUserName = meData.name;
          }
        }

        if (pointsRes.ok) {
          const ptData = await pointsRes.json();
          if (typeof ptData.total_points === "number") points = ptData.total_points;
        }

        if (lbRes.ok) {
          const lbData = await lbRes.json();
          if (Array.isArray(lbData.leaders)) {
            setLeaderboard(
              lbData.leaders.map((l: { rank: number; name: string; total_points: number }) => ({
                rank: l.rank,
                name: l.name,
                initials: getInitials(l.name),
                points: l.total_points,
              }))
            );
          }
        }

        setUserState({ name: currentUserName, initials: getInitials(currentUserName) });

        // 2. Fetch joined events (from FastAPI)
        const joinedRes = await fetch(`${API_URL}/api/v1/events/my/joined`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (joinedRes.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          router.push("/login");
          return;
        }
        const joinedEvents = await joinedRes.json();

        const now = new Date();
        const past = [];
        let upcomingCount = 0;

        if (Array.isArray(joinedEvents)) {
          for (const ev of joinedEvents) {
            const evDate = new Date(ev.start_time || ev.date || Date.now());
            if (evDate < now || ev.status === "completed") {
              past.push(ev);
            } else {
              if (ev.status !== "cancelled" && ev.status !== "completed") upcomingCount++;
            }
          }
        }

        const gradients = [
          "linear-gradient(135deg, #2E8B7A 0%, #6B46C1 100%)",
          "linear-gradient(135deg, #E86F51 0%, #FFC82E 100%)",
          "linear-gradient(135deg, #6B46C1 0%, #2E8B7A 100%)",
          "linear-gradient(135deg, #FFC82E 0%, #E86F51 100%)",
          "linear-gradient(135deg, #2E8B7A 0%, #E86F51 100%)",
        ];

        const recentFormatted = past.slice(0, 5).map((ev, i) => {
          const d = new Date(ev.start_time || ev.date || Date.now());
          const timeString = ev.start_time ? d.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit' }) : "";
          return {
            id: ev.id,
            title: ev.title,
            date: d.toLocaleDateString("en-US", { weekday: 'short', month: '2-digit', day: '2-digit' }),
            time: timeString,
            location: ev.location_name || "Unknown Location",
            volunteersCount: ev.current_signup_count || 0,
            imageGradient: gradients[i % gradients.length],
            latitude: ev.latitude ?? null,
            longitude: ev.longitude ?? null,
          };
        });
        setRecentEvents(recentFormatted);

        // 3. Events attended count (from Supabase directly)
        const attendedRes = await fetch(`${SUPABASE_URL}/rest/v1/event_signups?user_id=eq.${userId}&status=eq.attended&select=id`, {
          headers
        });
        const attendedData = await attendedRes.json();
        const attendedCount = Array.isArray(attendedData) ? attendedData.length : 0;

        setStats({
          eventsAttended: attendedCount,
          upcomingEvents: upcomingCount,
          pointsEarned: points
        });

        // 4. Upcoming registered events (derived from joinedEvents already fetched)
        const upcomingFormatted = Array.isArray(joinedEvents)
          ? joinedEvents
              .filter(ev => new Date(ev.start_time || ev.date || Date.now()) >= now && ev.status !== "cancelled" && ev.status !== "completed")
              .slice(0, 5)
              .map(ev => {
                const d = new Date(ev.start_time || ev.date || Date.now());
                return {
                  id: ev.id,
                  title: ev.title,
                  location: ev.location_name || "Unknown",
                  date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                  registered: true,
                };
              })
          : [];
        setUpcomingEvents(upcomingFormatted);

        // 5. Check for recent announcements on registered events
        try {
          const annRes = await fetch(`${API_URL}/api/v1/events/my/announcements`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (annRes.ok) {
            const announcements = await annRes.json();
            if (Array.isArray(announcements) && announcements.length > 0) {
              // Only show if not dismissed in this session
              const dismissed = sessionStorage.getItem("announcements_toast_dismissed");
              if (!dismissed) {
                const uniqueEventIds = [...new Set(announcements.map((a: { event_id: string }) => a.event_id))];
                const eventTitles = Array.isArray(joinedEvents)
                  ? (uniqueEventIds as string[]).map((id) => {
                      const ev = joinedEvents.find((e: { id: string; title: string }) => e.id === id);
                      return ev?.title ?? "an event";
                    }).slice(0, 2)
                  : [];
                setAnnouncementToast({ count: announcements.length, events: eventTitles, eventIds: uniqueEventIds as string[] });
              }
            }
          }
        } catch { /* ignore */ }

      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  if (!isAuthorized) {
    return null; // Wait for client-side auth check
  }

  return (
    <div className="lt-page" style={{ flexDirection: "row", alignItems: "stretch" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.dashboardMain}>
        {/* ── Top Bar ──────────────────────────────────────── */}
        <div className={styles.topBar}>
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
          <Link href="/profile" className={styles.topBarUser} style={{ textDecoration: "none", color: "inherit" }}>
            {loading ? (
              <div className="lt-spinner" style={{ width: 24, height: 24, borderTopColor: 'var(--lt-color-brand-primary)' }} />
            ) : (
              <>
                <div className="lt-avatar" style={{ border: "2px solid rgba(0,0,0,0.1)", cursor: "pointer" }}>{userState.initials}</div>
                <span>{userState.name}</span>
              </>
            )}
          </Link>
        </div>

        {/* ── Main Content ────────────────────────────────── */}
        {/* Announcement Toast */}
        {announcementToast && (
          <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            background: "var(--lt-teal)", color: "white",
            borderRadius: "var(--lt-radius-lg)",
            padding: "14px 18px",
            maxWidth: 360,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <div
              style={{ flex: 1, cursor: "pointer" }}
              onClick={() => {
                setAnnouncementToast(null);
                sessionStorage.setItem("announcements_toast_dismissed", "1");
                const dest = announcementToast.eventIds.length === 1
                  ? `/events/${announcementToast.eventIds[0]}`
                  : "/events";
                router.push(dest);
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                New announcements for your events
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                {announcementToast.count} new message{announcementToast.count !== 1 ? "s" : ""} in{" "}
                {announcementToast.events.join(", ")}
                {announcementToast.events.length < 2 && announcementToast.count > 1 ? " and more" : ""}
              </div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>Click to view →</div>
            </div>
            <button
              onClick={() => { setAnnouncementToast(null); sessionStorage.setItem("announcements_toast_dismissed", "1"); }}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}
            >
              ×
            </button>
          </div>
        )}

        <div className={styles.dashboardContent}>
          {loading ? (
             <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
               <div className="lt-spinner" style={{ width: 48, height: 48, borderTopColor: 'var(--lt-color-brand-primary)' }} />
             </div>
          ) : (
            <>
              {/* Welcome Row */}
              <div className={styles.welcomeRow}>
                <h1 className={styles.welcomeHeading}>
                  Hey {userState.name.split(" ")[0]}!
                </h1>
                <CreateEventGuard className={styles.newEventBtn}>
                  + New Event
                </CreateEventGuard>
              </div>

              {/* Stats Cards */}
              <div className={styles.statsRow}>
                <StatsCard
                  icon={<Image src="/handForDarkBackground.svg" alt="Events Attended" width={28} height={28} />}
                  value={stats.eventsAttended}
                  label="Events Attended"
                  colorClass="lt-stat-card__icon--purple-mid"
                />
                <StatsCard
                  icon={<Image src="/vegetables.png" alt="Upcoming Events" width={28} height={28} />}
                  value={stats.upcomingEvents}
                  label="Upcoming Events"
                  colorClass="lt-stat-card__icon--purple-mid"
                />
                <Link href="/community/leaders" style={{ textDecoration: "none" }}>
                  <StatsCard
                    icon={<Image src="/coin.png" alt="Points Earned" width={28} height={28} />}
                    value={stats.pointsEarned}
                    label="Points Earned"
                    colorClass="lt-stat-card__icon--purple-mid"
                    hint="10 pts per volunteer hour"
                  />
                </Link>
              </div>

              {/* Bottom Grid: Upcoming Events + Leaderboard */}
              <div className={styles.bottomGrid}>
                <UpcomingEventsTable
                  events={upcomingEvents}
                  onRegistrationChange={(eventId, registered) =>
                    setUpcomingEvents((prev) =>
                      registered
                        ? prev.map((ev) => ev.id === eventId ? { ...ev, registered } : ev)
                        : prev.filter((ev) => ev.id !== eventId)
                    )
                  }
                />
                <LeaderboardPreview entries={leaderboard} />
              </div>

              {/* Food Resources Map */}
              <div style={{ marginTop: 32 }}>
                <h2 className="lt-section-title" style={{ marginBottom: 12 }}>Create / Volunteer for an Event</h2>
                <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.10)" }}>
                  <ResourceMap height={440} />
                </div>
              </div>

              {/* Recent Impact Carousel */}
              <div className={styles.recentImpactSection} style={{ marginTop: 32 }}>
                <h2 className="lt-section-title">Your Recent Impact</h2>
                {recentEvents.length > 0 ? (
                  <RecentImpactCarousel events={recentEvents} />
                ) : (
                  <p className="lt-text-secondary">No recent events yet. Join an event to make an impact!</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <button
        className="lt-sidebar-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>
    </div>
  );
}

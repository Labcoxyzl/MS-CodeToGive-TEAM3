"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/ui/Sidebar";
import StatsCard from "@/app/components/ui/StatsCard";
import RecentImpactCarousel from "@/app/components/ui/RecentImpactCarousel";
import UpcomingEventsTable from "@/app/components/ui/UpcomingEventsTable";
import LeaderboardPreview from "@/app/components/ui/LeaderboardPreview";
import type {
  RecentEvent,
  UpcomingEvent,
} from "./mockData";
import { MOCK_LEADERBOARD } from "./mockData";
import styles from "./dashboard.module.css";

function getInitials(name: string) {
  if (!name) return "V";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [userState, setUserState] = useState({ name: "", initials: "" });
  const [stats, setStats] = useState({ flyersDistributed: 142, eventsAttended: 0, upcomingEvents: 0, pointsEarned: 0 });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

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
        // 1. Fetch user data (Try JWT Payload first, then fallback to Auth API)
        let currentUserName = "Volunteer";
        const points = 0;

        if (payload && "user_metadata" in payload && typeof payload.user_metadata === "object" && payload.user_metadata !== null) {
          const meta = payload.user_metadata as Record<string, unknown>;
          if (typeof meta.name === "string") {
            currentUserName = meta.name;
          }
        } else {
          if (!SUPABASE_URL) {
            console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
          }
          const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers });
          if (userRes.ok) {
            const authData = await userRes.json();
            if (authData && authData.user_metadata && authData.user_metadata.name) {
              currentUserName = authData.user_metadata.name;
            }
          } else {
            console.error("Failed to fetch user:", userRes.status);
          }
        }
        setUserState({ name: currentUserName, initials: getInitials(currentUserName) });

        // 2. Fetch joined events (from FastAPI)
        const joinedRes = await fetch(`${API_URL}/api/v1/events/my/joined`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const joinedEvents = await joinedRes.json();

        const now = new Date();
        const past = [];
        let upcomingCount = 0;

        if (Array.isArray(joinedEvents)) {
          for (const ev of joinedEvents) {
            const evDate = new Date(ev.start_time || ev.date || Date.now());
            if (evDate < now) {
              past.push(ev);
            } else {
              if (ev.status !== "cancelled") upcomingCount++;
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
            imageGradient: gradients[i % gradients.length]
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
          flyersDistributed: 142, // Static mock for now
          eventsAttended: attendedCount,
          upcomingEvents: upcomingCount,
          pointsEarned: points
        });

        // 4. Upcoming Public Events (FastAPI)
        const publicRes = await fetch(`${API_URL}/api/v1/events/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const publicEvents = await publicRes.json();
        
        const upcomingFormatted = [];
        if (Array.isArray(publicEvents)) {
           const upcoming = publicEvents.filter(ev => new Date(ev.start_time || ev.date || Date.now()) >= now && ev.status !== "cancelled");
           upcomingFormatted.push(...upcoming.slice(0, 3).map(ev => {
             const d = new Date(ev.start_time || ev.date || Date.now());
             return {
                id: ev.id,
                title: ev.title,
                location: ev.location_name || "Unknown",
                date: d.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }),
                status: (ev.status === "active" ? "active" : "upcoming") as "active" | "upcoming"
             };
           }));
        }
        setUpcomingEvents(upcomingFormatted);



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
          <div className={styles.topBarUser}>
            {loading ? (
              <div className="lt-spinner" style={{ width: 24, height: 24, borderTopColor: 'var(--lt-color-brand-primary)' }} />
            ) : (
              <>
                <div className="lt-avatar" style={{ border: "2px solid rgba(0,0,0,0.1)" }}>{userState.initials}</div>
                <span>{userState.name}</span>
              </>
            )}
          </div>
        </div>

        {/* ── Main Content ────────────────────────────────── */}
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
                <Link href="/events/create" className={styles.newEventBtn}>
                  + New Event
                </Link>
              </div>

              {/* Stats Cards */}
              <div className={styles.statsRow}>
                <StatsCard
                  icon="📄"
                  value={stats.flyersDistributed}
                  label="Flyers Distributed"
                  colorClass="lt-stat-card__icon--yellow"
                />
                <StatsCard
                  icon="✅"
                  value={stats.eventsAttended}
                  label="Events Attended"
                  colorClass="lt-stat-card__icon--teal"
                />
                <StatsCard
                  icon="📅"
                  value={stats.upcomingEvents}
                  label="Upcoming Events"
                  colorClass="lt-stat-card__icon--purple"
                />
                <StatsCard
                  icon="⭐"
                  value={stats.pointsEarned}
                  label="Points Earned"
                  colorClass="lt-stat-card__icon--coral"
                />
              </div>

              {/* Recent Impact Carousel */}
              <div className={styles.recentImpactSection}>
                <h2 className="lt-section-title">Your Recent Impact</h2>
                {recentEvents.length > 0 ? (
                  <RecentImpactCarousel events={recentEvents} />
                ) : (
                  <p className="lt-text-secondary">No recent events yet. Join an event to make an impact!</p>
                )}
              </div>

              {/* Bottom Grid: Upcoming Events + Leaderboard */}
              <div className={styles.bottomGrid}>
                <UpcomingEventsTable events={upcomingEvents} />
                <LeaderboardPreview entries={MOCK_LEADERBOARD} />
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

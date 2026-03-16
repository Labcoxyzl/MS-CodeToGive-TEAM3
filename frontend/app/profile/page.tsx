"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/components/ui/Sidebar";
import Image from "next/image";
import styles from "./profile.module.css";
import dashStyles from "../dashboard/dashboard.module.css";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getInitials(name: string) {
  if (!name) return "V";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

const BADGES = [
  { id: "first_event", label: "First Event", icon: "🎉", description: "Attended your first event" },
  { id: "ten_locations", label: "10 Locations", icon: "📍", description: "Flyered in 10 different locations" },
  { id: "top5_leader", label: "Top 5 Leader", icon: "🏆", description: "Ranked in the top 5 leaders" },
];

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  category: string | null;
  location_name: string | null;
  languages: string[] | null;
  referral_source: string | null;
  referred_by_user_id: string | null;
  total_points: number;
  referral_code: string;
  created_at: string | null;
}

interface EventHistoryItem {
  id: string;
  title: string;
  location_name: string;
  date: string;
  role: "Led" | "Attended";
}

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventHistory, setEventHistory] = useState<EventHistoryItem[]>([]);
  const [rank, setRank] = useState<number | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    location_name: "",
    languages: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopyReferral() {
    if (!user?.referral_code) return;
    const url = `${window.location.origin}/signup?ref=${user.referral_code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setIsAuthorized(true);

    let userId = "";
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.sub;
    } catch {
      return;
    }

    async function fetchData() {
      try {
        const supabaseHeaders = {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_KEY,
        };
        const authHeader = { Authorization: `Bearer ${token}` };

        const [userRes, createdRes, joinedRes, pointsRes, leaderboardRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`, { headers: supabaseHeaders }),
          fetch(`${API_URL}/api/v1/events/my/created`, { headers: authHeader }),
          fetch(`${API_URL}/api/v1/events/my/joined`, { headers: authHeader }),
          fetch(`${API_URL}/api/v1/points/me`, { headers: authHeader }),
          fetch(`${API_URL}/api/v1/leaderboard?limit=100`),
        ]);

        const userData = await userRes.json();
        if (Array.isArray(userData) && userData.length > 0) {
          const profileRow = userData[0];
          // Prefer live total_points from points endpoint
          if (pointsRes.ok) {
            const pointsData = await pointsRes.json();
            profileRow.total_points = pointsData.total_points ?? profileRow.total_points;
          }
          setUser(profileRow);
        }

        // Determine rank from leaderboard
        if (leaderboardRes.ok) {
          const lb = await leaderboardRes.json();
          const entry = lb.leaders?.find((l: { id: string; rank: number }) => l.id === userId);
          if (entry) setRank(entry.rank);
        }

        const created = await createdRes.json();
        const joined = await joinedRes.json();
        const now = new Date();
        const history: EventHistoryItem[] = [];

        if (Array.isArray(created)) {
          for (const ev of created) {
            const d = new Date(ev.start_time || ev.date || Date.now());
            if (d < now) {
              history.push({
                id: ev.id,
                title: ev.title,
                location_name: ev.location_name ?? "Unknown",
                date: d.toLocaleDateString("en-US", { weekday: "short", month: "2-digit", day: "2-digit" }),
                role: "Led",
              });
            }
          }
        }

        if (Array.isArray(joined)) {
          const createdIds = new Set(Array.isArray(created) ? created.map((e: { id: string }) => e.id) : []);
          for (const ev of joined) {
            if (createdIds.has(ev.id)) continue;
            const d = new Date(ev.start_time || ev.date || Date.now());
            if (d < now) {
              history.push({
                id: ev.id,
                title: ev.title,
                location_name: ev.location_name ?? "Unknown",
                date: d.toLocaleDateString("en-US", { weekday: "short", month: "2-digit", day: "2-digit" }),
                role: "Attended",
              });
            }
          }
        }

        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEventHistory(history);
      } catch (err) {
        console.error("Error fetching profile data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name ?? "",
        phone: user.phone ?? "",
        location_name: user.location_name ?? "",
        languages: user.languages ?? [],
      });
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const token = localStorage.getItem("access_token");

    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(editForm),
    });

    setUser((prev) => (prev ? { ...prev, ...editForm } : prev));
    setIsEditing(false);
    setSaving(false);
  }

  if (!isAuthorized) return null;

  return (
    <div className={dashStyles.dashboardShell}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={dashStyles.dashboardMain}>
        {/* Top Bar */}
        <div className={dashStyles.topBar}>
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
          <div className={dashStyles.topBarUser}>
            {loading ? (
              <div className="lt-spinner" style={{ width: 24, height: 24, borderTopColor: 'var(--lt-color-brand-primary)' }} />
            ) : (
              <>
                <div className="lt-avatar" style={{ border: "2px solid rgba(0,0,0,0.1)" }}>{getInitials(user?.name ?? "V")}</div>
                <span>{user?.name || "Volunteer"}</span>
              </>
            )}
          </div>
        </div>

        <div className={dashStyles.dashboardContent}>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
            <div className="lt-spinner" style={{ width: 48, height: 48, borderTopColor: "var(--lt-color-brand-primary)" }} />
          </div>
        ) : (
          <div className={styles.profileContent}>
            {/* Left Column */}
            <div className={styles.leftColumn}>
              {/* Profile Card */}
              <div className={`lt-panel ${styles.profileCard}`}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatarLarge}>
                    {getInitials(user?.name ?? "")}
                  </div>
                </div>

                <h2 className={styles.profileName}>{user?.name}</h2>

                <div className={styles.profilePills}>
                  {user?.role && (
                    <span className="lt-badge lt-badge--upcoming" style={{ textTransform: "capitalize" }}>
                      {user.role}
                    </span>
                  )}
                  {user?.location_name && (
                    <span className="lt-badge lt-badge--completed">
                      📍 {user.location_name}
                    </span>
                  )}
                </div>

                <div className={styles.xpSection}>
                  <div className={styles.xpRow}>
                    <span className={styles.xpLabel}>Total XP</span>
                    <span className={styles.xpValue}>{user?.total_points ?? 0}</span>
                  </div>
                  <div className={styles.xpRow}>
                    <span className={styles.xpLabel}>Rank</span>
                    <span className={styles.xpValue}>{rank !== null ? `#${rank}` : "—"}</span>
                  </div>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressLabel}>
                    <span>Next rank</span>
                    <span>{Math.max(0, 500 - (user?.total_points ?? 0))} pts to go</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${Math.min(100, ((user?.total_points ?? 0) / 500) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Badges Card */}
              <div className="lt-panel">
                <h2 className="lt-section-title">Badges</h2>
                <div className={styles.badgesGrid}>
                  {BADGES.map((badge) => {
                    const earned = false; // TODO: wire to real data in points phase
                    return (
                      <div
                        key={badge.id}
                        className={`${styles.badgeItem} ${earned ? styles.badgeEarned : styles.badgeLocked}`}
                        title={badge.description}
                      >
                        <div className={styles.badgeIcon}>{badge.icon}</div>
                        <span className={styles.badgeLabel}>{badge.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className={styles.rightColumn}>
              {/* Personal Info Card */}
              <div className="lt-panel">
                <div className={styles.infoHeader}>
                  <h2 className="lt-section-title" style={{ margin: 0 }}>Personal Info</h2>
                  {!isEditing ? (
                    <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                      ✏️ Edit Profile
                    </button>
                  ) : (
                    <div className={styles.editActions}>
                      <button className={styles.cancelBtn} onClick={() => setIsEditing(false)}>
                        Cancel
                      </button>
                      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                        {saving ? <span className="lt-spinner" style={{ width: 16, height: 16 }} /> : "Save"}
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.infoGrid}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Name</span>
                    {isEditing ? (
                      <input
                        className="lt-input"
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    ) : (
                      <span className={styles.infoValue}>{user?.name ?? "—"}</span>
                    )}
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Email</span>
                    <span className={styles.infoValue}>{user?.email ?? "—"}</span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Phone</span>
                    {isEditing ? (
                      <input
                        className="lt-input"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                      />
                    ) : (
                      <span className={styles.infoValue}>{user?.phone ?? "—"}</span>
                    )}
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Location</span>
                    {isEditing ? (
                      <input
                        className="lt-input"
                        value={editForm.location_name}
                        onChange={(e) => setEditForm((p) => ({ ...p, location_name: e.target.value }))}
                      />
                    ) : (
                      <span className={styles.infoValue}>{user?.location_name ?? "—"}</span>
                    )}
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Languages</span>
                    <span className={styles.infoValue}>
                      {user?.languages?.length ? user.languages.join(", ") : "—"}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Role</span>
                    <span className={styles.infoValue} style={{ textTransform: "capitalize" }}>
                      {user?.role ?? "—"}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Joined on</span>
                    <span className={styles.infoValue}>
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                        : "—"}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Referral Code</span>
                    <div className={styles.referralRow}>
                      <span className={`${styles.infoValue} ${styles.referralCode}`}>
                        {user?.referral_code ?? "—"}
                      </span>
                      {user?.referral_code && (
                        <button
                          className={styles.copyBtn}
                          onClick={handleCopyReferral}
                          title="Copy referral link"
                        >
                          {copied ? "✓ Copied!" : "Copy link"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Event History Card */}
              <div className="lt-panel">
                <h2 className="lt-section-title">Event History</h2>
                {eventHistory.length === 0 ? (
                  <p style={{ color: "var(--lt-text-muted)", fontSize: 14 }}>
                    No past events yet. Join or create an event to get started!
                  </p>
                ) : (
                  <div className={styles.historyList}>
                    {eventHistory.map((ev) => (
                      <div key={ev.id} className={styles.historyItem}>
                        <div className={styles.historyDate}>{ev.date}</div>
                        <div className={styles.historyInfo}>
                          <span className={styles.historyTitle}>{ev.title}</span>
                          <span className={styles.historyLocation}>📍 {ev.location_name}</span>
                        </div>
                        <span className={`lt-badge ${ev.role === "Led" ? "lt-badge--upcoming" : "lt-badge--completed"}`}>
                          {ev.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

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

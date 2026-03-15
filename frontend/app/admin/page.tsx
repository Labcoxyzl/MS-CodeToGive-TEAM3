"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/ui/Sidebar";
import StatsCard from "@/app/components/ui/StatsCard";
import { apiFetch } from "@/app/lib/api";
import styles from "./admin.module.css";

type Tab = "overview" | "users" | "events";
type Role = "volunteer" | "leader" | "promoter" | "admin";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
  total_points: number;
  phone?: string;
  category?: string;
}

interface EventRow {
  id: string;
  title: string;
  location_name: string;
  date?: string;
  start_time?: string;
  status: string;
  current_signup_count: number;
  volunteer_limit?: number;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

const PAGE_SIZE = 15;

function getInitials(name: string) {
  if (!name) return "A";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  // Analytics
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalSignups, setTotalSignups] = useState(0);
  const [rolesBreakdown, setRolesBreakdown] = useState<Record<string, number>>({});

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Events
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  // UI state
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    const res = await apiFetch("/admin/analytics");
    if (res.status === 403) {
      setAccessDenied(true);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setTotalUsers(data.total_users ?? 0);
    setTotalEvents(data.total_events ?? 0);
    setTotalSignups(data.total_signups ?? 0);
    setRolesBreakdown(data.roles_breakdown ?? {});
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async (page: number, search: string = "") => {
    const skip = page * PAGE_SIZE;
    let url = `/admin/users?skip=${skip}&limit=${PAGE_SIZE}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const res = await apiFetch(url);
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users ?? []);
    setUsersTotal(data.total ?? 0);
  }, []);

  // Fetch events
  const fetchEvents = useCallback(async (page: number, status: string = "") => {
    const skip = page * PAGE_SIZE;
    let url = `/admin/events?skip=${skip}&limit=${PAGE_SIZE}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    const res = await apiFetch(url);
    if (!res.ok) return;
    const data = await res.json();
    setEvents(data.events ?? []);
    setEventsTotal(data.total ?? 0);
  }, []);

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setIsAuthorized(true);

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const meta = payload?.user_metadata;
      if (meta?.name) setUserName(meta.name);
      else setUserName("Admin");
    } catch {
      setUserName("Admin");
    }

    async function init() {
      await fetchAnalytics();
      await Promise.all([fetchUsers(0), fetchEvents(0)]);
      setLoading(false);
    }
    init();
  }, [router, fetchAnalytics, fetchUsers, fetchEvents]);

  // Role update
  async function handleRoleChange(userId: string, newRole: Role) {
    setUpdatingRole(userId);
    try {
      const res = await apiFetch(`/admin/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        fetchAnalytics();
        showToast("Role updated successfully", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to update role", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setUpdatingRole(null);
    }
  }

  // Event delete
  async function handleDeleteEvent() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/admin/events/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        setEventsTotal((prev) => prev - 1);
        setTotalEvents((prev) => prev - 1);
        showToast("Event deleted successfully", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to delete event", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // Search handler with debounce
  function handleSearchChange(value: string) {
    setSearchTerm(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setUsersPage(0);
      fetchUsers(0, value);
    }, 400);
  }

  // Status filter handler
  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    setEventsPage(0);
    fetchEvents(0, value);
  }

  // Pagination handlers
  function handleUsersPageChange(page: number) {
    setUsersPage(page);
    fetchUsers(page, searchTerm);
  }

  function handleEventsPageChange(page: number) {
    setEventsPage(page);
    fetchEvents(page, statusFilter);
  }

  if (!isAuthorized) return null;

  if (accessDenied) {
    return (
      <div className="lt-page" style={{ flexDirection: "row", alignItems: "stretch" }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={styles.adminMain}>
          <div className={styles.topBar}>
            <Link href="/" className="lt-header__logo">
              <span>
                <Image src="/logo.svg" alt="Lemontree Icon" width={32} height={32} priority />
                <Image src="/lemontree_text_logo.svg" alt="Lemontree" width={112} height={24} priority />
              </span>
            </Link>
          </div>
          <div className={styles.adminContent}>
            <div className={styles.accessDenied}>
              <div className={styles.accessDeniedIcon}>🔒</div>
              <h2 className={styles.accessDeniedTitle}>Access Denied</h2>
              <p className={styles.accessDeniedText}>
                You don&apos;t have admin privileges. Contact an administrator if you
                believe this is a mistake.
              </p>
              <Link href="/dashboard" className="lt-btn lt-btn--primary" style={{ width: "auto", padding: "12px 32px" }}>
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const usersTotalPages = Math.ceil(usersTotal / PAGE_SIZE);
  const eventsTotalPages = Math.ceil(eventsTotal / PAGE_SIZE);

  return (
    <div className="lt-page" style={{ flexDirection: "row", alignItems: "stretch" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.adminMain}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          <Link href="/" className="lt-header__logo">
            <span>
              <Image src="/logo.svg" alt="Lemontree Icon" width={32} height={32} priority />
              <Image src="/lemontree_text_logo.svg" alt="Lemontree" width={112} height={24} priority />
            </span>
          </Link>
          <div className={styles.topBarUser}>
            <div className="lt-avatar" style={{ border: "2px solid rgba(0,0,0,0.1)" }}>
              {getInitials(userName)}
            </div>
            <span>{userName}</span>
          </div>
        </div>

        {/* Content */}
        <div className={styles.adminContent}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
              <div className="lt-spinner" style={{ width: 48, height: 48, borderTopColor: "var(--lt-teal)" }} />
            </div>
          ) : (
            <>
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Admin Panel</h1>
              </div>

              {/* Tab Navigation */}
              <div className={styles.tabNav}>
                <button
                  className={`${styles.tab} ${activeTab === "overview" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("overview")}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                  </svg>
                  Overview
                </button>
                <button
                  className={`${styles.tab} ${activeTab === "users" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("users")}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  Users
                  <span className={styles.tabCount}>{usersTotal}</span>
                </button>
                <button
                  className={`${styles.tab} ${activeTab === "events" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("events")}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  Events
                  <span className={styles.tabCount}>{eventsTotal}</span>
                </button>
              </div>

              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div>
                  <div className={styles.statsRow} style={{ maxWidth: "none", gridTemplateColumns: "repeat(4, 1fr)" }}>
                    <StatsCard
                      icon={
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                      }
                      value={totalUsers}
                      label="Total Users"
                      colorClass="lt-stat-card__icon--teal"
                    />
                    <StatsCard
                      icon={
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                      }
                      value={totalEvents}
                      label="Total Events"
                      colorClass="lt-stat-card__icon--purple"
                    />
                    <StatsCard
                      icon={
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                      }
                      value={totalSignups}
                      label="Total Signups"
                      colorClass="lt-stat-card__icon--yellow"
                    />
                    <StatsCard
                      icon={
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                        </svg>
                      }
                      value={Object.keys(rolesBreakdown).length}
                      label="Active Roles"
                      colorClass="lt-stat-card__icon--coral"
                    />
                  </div>

                  {/* Roles Breakdown */}
                  {Object.keys(rolesBreakdown).length > 0 && (
                    <div className={styles.tablePanel} style={{ marginTop: 24 }}>
                      <div className={styles.tablePanelHeader}>
                        <h3 className={styles.tablePanelTitle}>Roles Breakdown</h3>
                      </div>
                      <div style={{ padding: "0 24px 24px", display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {Object.entries(rolesBreakdown).map(([role, count]) => (
                          <div
                            key={role}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "12px 20px",
                              background: "var(--lt-card-bg-muted)",
                              borderRadius: "var(--lt-radius-sm)",
                              minWidth: 140,
                            }}
                          >
                            <span
                              className={styles.roleBadge}
                              data-role={role}
                            >
                              {role}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 20, color: "var(--lt-text-primary)" }}>
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === "users" && (
                <div className={styles.tablePanel}>
                  <div className={styles.tablePanelHeader}>
                    <h3 className={styles.tablePanelTitle}>All Users</h3>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                  </div>
                  <div className={styles.tableScroll}>
                    {users.length === 0 ? (
                      <div className={styles.emptyState}>No users found.</div>
                    ) : (
                      <table className="lt-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined</th>
                            <th>Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div className="lt-avatar lt-avatar--sm">{getInitials(user.name)}</div>
                                  <span style={{ fontWeight: 600 }}>{user.name || "—"}</span>
                                </div>
                              </td>
                              <td style={{ color: "var(--lt-text-secondary)" }}>{user.email}</td>
                              <td>
                                <select
                                  className={styles.roleSelect}
                                  value={user.role}
                                  onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                                  disabled={updatingRole === user.id}
                                >
                                  <option value="volunteer">Volunteer</option>
                                  <option value="leader">Leader</option>
                                  <option value="promoter">Promoter</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                              <td style={{ color: "var(--lt-text-secondary)" }}>
                                {formatDate(user.created_at)}
                              </td>
                              <td>
                                <span style={{ fontWeight: 700, color: "var(--lt-purple)" }}>
                                  {user.total_points ?? 0}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {usersTotal > PAGE_SIZE && (
                    <div className={styles.pagination}>
                      <span className={styles.paginationInfo}>
                        Showing {usersPage * PAGE_SIZE + 1}–
                        {Math.min((usersPage + 1) * PAGE_SIZE, usersTotal)} of {usersTotal}
                      </span>
                      <div className={styles.paginationBtns}>
                        <button
                          className={styles.pageBtn}
                          disabled={usersPage === 0}
                          onClick={() => handleUsersPageChange(usersPage - 1)}
                        >
                          Previous
                        </button>
                        <button
                          className={styles.pageBtn}
                          disabled={usersPage >= usersTotalPages - 1}
                          onClick={() => handleUsersPageChange(usersPage + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Events Tab */}
              {activeTab === "events" && (
                <div className={styles.tablePanel}>
                  <div className={styles.tablePanelHeader}>
                    <h3 className={styles.tablePanelTitle}>All Events</h3>
                    <select
                      className={styles.statusFilter}
                      value={statusFilter}
                      onChange={(e) => handleStatusFilterChange(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className={styles.tableScroll}>
                    {events.length === 0 ? (
                      <div className={styles.emptyState}>No events found.</div>
                    ) : (
                      <table className="lt-table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Location</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Signups</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map((event) => (
                            <tr key={event.id}>
                              <td style={{ fontWeight: 600 }}>{event.title}</td>
                              <td style={{ color: "var(--lt-text-secondary)" }}>
                                {event.location_name || "—"}
                              </td>
                              <td style={{ color: "var(--lt-text-secondary)" }}>
                                {formatDate(event.start_time || event.date)}
                              </td>
                              <td>
                                <span
                                  className={`lt-badge lt-badge--${
                                    event.status === "active"
                                      ? "active"
                                      : event.status === "completed"
                                      ? "completed"
                                      : event.status === "cancelled"
                                      ? "cancelled"
                                      : "upcoming"
                                  }`}
                                >
                                  {event.status || "draft"}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontWeight: 600 }}>
                                  {event.current_signup_count ?? 0}
                                  {event.volunteer_limit ? ` / ${event.volunteer_limit}` : ""}
                                </span>
                              </td>
                              <td>
                                <button
                                  className={styles.deleteBtn}
                                  onClick={() => setDeleteTarget(event)}
                                >
                                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                      fillRule="evenodd"
                                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {eventsTotal > PAGE_SIZE && (
                    <div className={styles.pagination}>
                      <span className={styles.paginationInfo}>
                        Showing {eventsPage * PAGE_SIZE + 1}–
                        {Math.min((eventsPage + 1) * PAGE_SIZE, eventsTotal)} of {eventsTotal}
                      </span>
                      <div className={styles.paginationBtns}>
                        <button
                          className={styles.pageBtn}
                          disabled={eventsPage === 0}
                          onClick={() => handleEventsPageChange(eventsPage - 1)}
                        >
                          Previous
                        </button>
                        <button
                          className={styles.pageBtn}
                          disabled={eventsPage >= eventsTotalPages - 1}
                          onClick={() => handleEventsPageChange(eventsPage + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className={styles.confirmOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Delete Event</h3>
            <p className={styles.confirmMessage}>
              Are you sure you want to delete &ldquo;{deleteTarget.title}&rdquo;? This action
              cannot be undone and will remove all associated signups.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteEvent}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

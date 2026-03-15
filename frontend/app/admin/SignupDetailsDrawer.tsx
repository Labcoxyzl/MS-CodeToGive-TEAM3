"use client";

import { useState } from "react";
import styles from "./admin.module.css";

interface SignupRow {
  id: string;
  event_id: string;
  user_id: string | null;
  guest_signup_id: string | null;
  status: string;
  signed_up_at: string;
  checked_in_at: string | null;
  referred_by_code: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  is_guest: boolean;
  user_role: string | null;
  user_category: string | null;
  event_title: string | null;
  event_date: string | null;
  event_location: string | null;
  event_latitude: number | null;
  event_longitude: number | null;
  event_start_time: string | null;
  event_end_time: string | null;
}

interface SignupDetailsDrawerProps {
  signup: SignupRow;
  onClose: () => void;
  onUpdateStatus: (signupId: string, newStatus: string) => Promise<void>;
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SignupDetailsDrawer({ signup, onClose, onUpdateStatus }: SignupDetailsDrawerProps) {
  const [updating, setUpdating] = useState(false);

  async function handleStatusChange(newStatus: string) {
    if (newStatus === signup.status) return;
    setUpdating(true);
    await onUpdateStatus(signup.id, newStatus);
    setUpdating(false);
  }

  const hasLocation = signup.event_latitude != null && signup.event_longitude != null;
  const mapSrc = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${signup.event_longitude! - 0.01},${signup.event_latitude! - 0.01},${signup.event_longitude! + 0.01},${signup.event_latitude! + 0.01}&layer=mapnik&marker=${signup.event_latitude},${signup.event_longitude}`
    : null;

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <h3 className={styles.drawerTitle}>Signup Details</h3>
          <button className={styles.drawerClose} onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className={styles.drawerBody}>
          {/* Volunteer info */}
          <div className={styles.drawerSection}>
            <h4 className={styles.drawerSectionTitle}>
              {signup.is_guest ? "Guest Info" : "Volunteer Info"}
            </h4>
            <div className={styles.drawerFields}>
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Name</span>
                <span className={styles.drawerFieldValue}>{signup.name || "—"}</span>
              </div>
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Email</span>
                <span className={styles.drawerFieldValue}>{signup.email || "—"}</span>
              </div>
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Phone</span>
                <span className={styles.drawerFieldValue}>{signup.phone || "—"}</span>
              </div>
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Type</span>
                <span className={styles.drawerFieldValue}>
                  {signup.is_guest ? (
                    <span className={styles.guestBadge}>Guest</span>
                  ) : (
                    "Registered User"
                  )}
                </span>
              </div>
              {!signup.is_guest && signup.user_role && (
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Role</span>
                  <span className={styles.drawerFieldValue}>
                    <span className={styles.roleBadge} data-role={signup.user_role}>
                      {signup.user_role}
                    </span>
                  </span>
                </div>
              )}
              {!signup.is_guest && signup.user_category && (
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Category</span>
                  <span className={styles.drawerFieldValue}>{signup.user_category}</span>
                </div>
              )}
            </div>
          </div>

          {/* Event info */}
          <div className={styles.drawerSection}>
            <h4 className={styles.drawerSectionTitle}>Event Info</h4>
            <div className={styles.drawerFields}>
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Event</span>
                <span className={styles.drawerFieldValue}>{signup.event_title || "—"}</span>
              </div>
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Date</span>
                <span className={styles.drawerFieldValue}>{signup.event_date || "—"}</span>
              </div>
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Time</span>
                <span className={styles.drawerFieldValue}>
                  {signup.event_start_time && signup.event_end_time
                    ? `${signup.event_start_time} – ${signup.event_end_time}`
                    : "—"}
                </span>
              </div>
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Location</span>
                <span className={styles.drawerFieldValue}>{signup.event_location || "—"}</span>
              </div>
            </div>

            {mapSrc && (
              <div className={styles.drawerMap}>
                <iframe
                  src={mapSrc}
                  width="100%"
                  height="200"
                  style={{ border: 0, borderRadius: "var(--lt-radius-sm)" }}
                  title="Event location"
                />
              </div>
            )}
          </div>

          {/* Signup details */}
          <div className={styles.drawerSection}>
            <h4 className={styles.drawerSectionTitle}>Signup Details</h4>
            <div className={styles.drawerFields}>
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Signed Up</span>
                <span className={styles.drawerFieldValue}>{formatDateTime(signup.signed_up_at)}</span>
              </div>
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Checked In</span>
                <span className={styles.drawerFieldValue}>{formatDateTime(signup.checked_in_at)}</span>
              </div>
              {signup.referred_by_code && (
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Referral Code</span>
                  <span className={styles.drawerFieldValue}>{signup.referred_by_code}</span>
                </div>
              )}
              <div className={styles.drawerField}>
                <span className={styles.drawerFieldLabel}>Status</span>
                <span className={styles.drawerFieldValue}>
                  <span className={styles.signupStatusBadge} data-status={signup.status}>
                    {signup.status}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Status actions */}
          <div className={styles.drawerSection}>
            <h4 className={styles.drawerSectionTitle}>Update Status</h4>
            <div className={styles.drawerActions}>
              {signup.status !== "attended" && (
                <button
                  className={styles.actionBtnSuccess}
                  onClick={() => handleStatusChange("attended")}
                  disabled={updating}
                >
                  Mark Attended
                </button>
              )}
              {signup.status !== "registered" && (
                <button
                  className={styles.actionBtnDefault}
                  onClick={() => handleStatusChange("registered")}
                  disabled={updating}
                >
                  Mark Registered
                </button>
              )}
              {signup.status !== "cancelled" && (
                <button
                  className={styles.actionBtnDanger}
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={updating}
                >
                  Cancel Signup
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

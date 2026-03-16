"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./EventModal.module.css";

interface EventPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
}

interface EventDetails {
  id: string;
  title: string;
  description: string;
  location_name: string | null;
  date: string;
  start_time: string;
  end_time: string;
  volunteer_limit: number | null;
  current_signup_count: number;
}

interface EventModalProps {
  eventId: string | null;
  onClose: () => void;
  onRegistrationChange?: (eventId: string, registered: boolean) => void;
}

export default function EventModal({ eventId, onClose, onRegistrationChange }: EventModalProps) {
  const [eventData, setEventData] = useState<EventDetails | null>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [attendLoading, setAttendLoading] = useState(false);
  const [attendError, setAttendError] = useState("");
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    let isMounted = true;
    setLoading(true);
    setError("");

    async function fetchEventDetails() {
      try {
        const token = localStorage.getItem("access_token");
        const headers = {
          "Authorization": `Bearer ${token}`,
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          "Content-Type": "application/json",
        };

        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

        // 1. Fetch Event Document from FastAPI
        const evtReq = fetch(`${API_URL}/api/v1/events/${eventId}`, { headers });
        // 2. Fetch related photos from Supabase directly
        const photosReq = fetch(`${SUPABASE_URL}/rest/v1/event_photos?event_id=eq.${eventId}&select=id,photo_url,caption`, { headers });
        // 3. Fetch currently joined events to see if User is registered for this event
        const joinedReq = fetch(`${API_URL}/api/v1/events/my/joined`, { headers });

        const [evtRes, photosRes, joinedRes] = await Promise.all([evtReq, photosReq, joinedReq]);

        if (!evtRes.ok) throw new Error("Failed to load event details");
        const evtData = await evtRes.json();
        
        const photosData = photosRes.ok ? await photosRes.json() : [];
        const joinedData = joinedRes.ok ? await joinedRes.json() : [];

        if (isMounted) {
          setEventData(evtData);
          setPhotos(Array.isArray(photosData) ? photosData : []);
          setIsJoined(Array.isArray(joinedData) && joinedData.some((ev: { id: string }) => ev.id === eventId));
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error loading event");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchEventDetails();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (eventId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [eventId]);

  if (!eventId) return null;

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // Formatting helpers
  function formatTime(timeStr: string) {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  async function handleAttendEvent() {
    if (!eventId) return;
    
    setAttendLoading(true);
    setAttendError("");
    
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Please log in to attend events.");
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const headers = {
        "Authorization": `Bearer ${token}`,
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
      };
      
      const res = await fetch(`${API_URL}/api/v1/events/${eventId}/signup`, {
        method: "POST",
        headers,
        body: JSON.stringify({}), // Schema `AuthSignupRequest` requires empty object natively
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to sign up for event. It may be full or you may already be signed up.");
      }
      
      // Success
      onRegistrationChange?.(eventId, true);
      onClose();
    } catch (err: unknown) {
      setAttendError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setAttendLoading(false);
    }
  }

  async function handleCancelRegistration() {
    if (!eventId) return;
    
    setAttendLoading(true);
    setAttendError("");
    
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Please log in to manage events.");
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const headers = {
        "Authorization": `Bearer ${token}`,
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
      };
      
      const res = await fetch(`${API_URL}/api/v1/events/${eventId}/signup`, {
        method: "DELETE",
        headers,
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to cancel your registration.");
      }
      
      // Success
      onRegistrationChange?.(eventId, false);
      onClose();
    } catch (err: unknown) {
      setAttendError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setAttendLoading(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick} role="dialog" aria-modal="true">
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">×</button>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
             <div className="lt-spinner" style={{ width: 48, height: 48, borderTopColor: 'var(--lt-teal)' }} />
          </div>
        ) : error ? (
          <div className="lt-error-text" style={{ padding: 40, textAlign: "center" }}>{error}</div>
        ) : eventData ? (
          <>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{eventData.title}</h2>
              <div className={styles.modalDate}>
                📅 {formatDate(eventData.date)} • {formatTime(eventData.start_time)} - {formatTime(eventData.end_time)}
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Location</span>
                  <span className={styles.infoValue}>{eventData.location_name || "TBA"}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Volunteer Status</span>
                  <span className={styles.infoValue}>
                    {eventData.current_signup_count} / {eventData. volunteer_limit || "Unlimited"}
                  </span>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>About this event</h3>
                <p className={styles.description}>{eventData.description}</p>
              </div>

              {photos.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Event Photos</h3>
                  <div className={styles.photoGrid}>
                    {photos.map((p) => (
                      <div key={p.id}>
                        <div className={styles.photoWrap}>
                          <Image
                            src={p.photo_url}
                            alt={p.caption || "Event photo"}
                            fill
                            style={{ objectFit: "cover" }}
                            unoptimized={p.photo_url.startsWith("http")}
                          />
                        </div>
                        {p.caption && <div className={styles.photoCaption}>{p.caption}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
               {attendError && <div className="lt-error-text" style={{ alignSelf: "center", marginRight: "auto" }}>{attendError}</div>}
               <Link
                 href={`/events/${eventData.id}`}
                 className={`lt-btn lt-btn--outline ${styles.attendBtn}`}
                 onClick={onClose}
               >
                 View Event Page
               </Link>
               {isJoined ? (
                 <button
                   className={`lt-btn lt-btn--outline ${styles.attendBtn}`}
                   onClick={() => setShowConfirmCancel(true)}
                   disabled={attendLoading}
                 >
                   {attendLoading ? <span className="lt-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : "Cancel Registration"}
                 </button>
               ) : (
                 <button 
                   className={`lt-btn lt-btn--primary ${styles.attendBtn}`} 
                   onClick={handleAttendEvent}
                   disabled={attendLoading}
                 >
                   {attendLoading ? <span className="lt-spinner" style={{ width: 16, height: 16, borderTopColor: "white", borderWidth: 2 }} /> : "Attend Event"}
                 </button>
               )}
            </div>
          </>
        ) : null}
      </div>

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
                onClick={() => { setShowConfirmCancel(false); handleCancelRegistration(); }}
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

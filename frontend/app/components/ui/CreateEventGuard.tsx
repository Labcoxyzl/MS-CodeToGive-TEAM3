"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onBeforeNavigate?: () => void; // e.g. close sidebar
}

async function fetchUserRole(): Promise<string> {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return "";
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.role ?? "";
  } catch {
    return "";
  }
}

export default function CreateEventGuard({ className, style, children, onBeforeNavigate }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  async function handleClick() {
    const role = await fetchUserRole();
    if (role === "volunteer") {
      setShowModal(true);
    } else {
      onBeforeNavigate?.();
      router.push("/events/create");
    }
  }

  function handleContinue() {
    setShowModal(false);
    onBeforeNavigate?.();
    router.push("/events/create");
  }

  return (
    <>
      <button type="button" className={className} style={style} onClick={handleClick}>
        {children}
      </button>

      {showModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowModal(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 1000,
              backdropFilter: "blur(2px)",
            }}
          />

          {/* Modal */}
          <div style={{
            position: "fixed",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1001,
            background: "white",
            borderRadius: "var(--lt-radius-lg)",
            padding: "40px 36px",
            maxWidth: 440,
            width: "calc(100vw - 48px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            textAlign: "center",
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--lt-text-primary)", marginBottom: 10 }}>
              You&apos;re becoming an Event Leader!
            </h2>

            <p style={{ fontSize: 14, color: "var(--lt-text-secondary)", lineHeight: 1.6, marginBottom: 28 }}>
              Congrats! Creating your first event upgrades your account to{" "}
              <strong style={{ color: "var(--lt-purple)" }}>Event Leader</strong> — unlocking
              volunteer management, check-ins, messaging, and more.
            </p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "11px 24px", fontSize: 14, fontWeight: 600,
                  borderRadius: "var(--lt-radius-full)",
                  border: "2px solid var(--lt-border)",
                  background: "transparent", color: "var(--lt-text-secondary)",
                  cursor: "pointer",
                }}
              >
                Maybe later
              </button>
              <button
                onClick={handleContinue}
                style={{
                  padding: "11px 28px", fontSize: 14, fontWeight: 700,
                  borderRadius: "var(--lt-radius-full)",
                  border: "none",
                  background: "var(--lt-purple)", color: "white",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(120,76,197,0.35)",
                }}
              >
                Let&apos;s go!
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

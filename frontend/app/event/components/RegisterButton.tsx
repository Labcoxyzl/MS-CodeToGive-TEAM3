"use client";

import { useState } from "react";
import styles from "./RegisterButton.module.css";

type LocalStatus = "idle" | "loading" | "error";

interface RegisterButtonProps {
  eventId: string;
  isRegistered: boolean;
  isLoadingExternal?: boolean;
  onRegister: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  small?: boolean;
}

export default function RegisterButton({
  eventId,
  isRegistered,
  isLoadingExternal,
  onRegister,
  onCancel,
  small,
}: RegisterButtonProps) {
  const [localStatus, setLocalStatus] = useState<LocalStatus>("idle");

  // Derive display state from props + local status
  const btnState =
    localStatus === "loading"
      ? "loading"
      : localStatus === "error"
      ? "error"
      : isRegistered
      ? "registered"
      : "idle";

  async function handleClick() {
    if (localStatus === "loading") return;
    setLocalStatus("loading");
    try {
      if (isRegistered) {
        await onCancel(eventId);
      } else {
        await onRegister(eventId);
      }
      setLocalStatus("idle");
    } catch {
      setLocalStatus("error");
      setTimeout(() => setLocalStatus("idle"), 1500);
    }
  }

  const stateClass = styles[btnState];
  const label = (() => {
    if (btnState === "loading" || isLoadingExternal) return <span className={styles.spinner} />;
    if (btnState === "registered") return "Registered ✓";
    if (btnState === "error") return "Try Again";
    return "Register";
  })();

  return (
    <button
      className={`${styles.btn} ${stateClass} ${small ? styles.small ?? "" : ""}`}
      onClick={handleClick}
      disabled={btnState === "loading" || isLoadingExternal}
      aria-label={btnState === "registered" ? "Cancel registration" : "Register for event"}
    >
      {label}
    </button>
  );
}

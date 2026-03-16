"use client";
import { useState } from "react";
import { apiFetch } from "@/app/lib/api";
import styles from "./FlyerButton.module.css";

interface Props {
  eventId: string;
  small?: boolean;
}

export default function FlyerButton({ eventId, small }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleDownload() {
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await apiFetch(`/api/v1/flyer/${eventId}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flyer-${eventId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  return (
    <button
      className={`${styles.btn} ${styles[status]} ${small ? styles.small : ""}`}
      onClick={handleDownload}
      disabled={status === "loading"}
      aria-label="Download event flyer"
    >
      {status === "loading" ? <span className={styles.spinner} /> :
       status === "error" ? "Failed" :
       "↓ Flyer"}
    </button>
  );
}

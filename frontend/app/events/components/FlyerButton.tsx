"use client";
import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/app/lib/api";
import styles from "./FlyerButton.module.css";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" },
  { code: "pl", label: "Polski" },
  { code: "ht", label: "Kreyòl" },
  { code: "tl", label: "Tagalog" },
];

interface Props {
  eventId: string;
  small?: boolean;
}

export default function FlyerButton({ eventId, small }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function handleDownload(langCode: string) {
    setOpen(false);
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await apiFetch(`/api/v1/flyer/${eventId}?lang=${langCode}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flyer-${eventId}-${langCode}.pdf`;
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
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        className={`${styles.btn} ${styles[status]} ${small ? styles.small : ""}`}
        onClick={() => status === "idle" && setOpen((o) => !o)}
        disabled={status === "loading"}
        aria-label="Download event flyer"
      >
        {status === "loading" ? <span className={styles.spinner} /> :
         status === "error"   ? "Failed" :
         "↓ Flyer"}
      </button>

      {open && (
        <div className={styles.popover}>
          <p className={styles.popoverLabel}>Select flyer language</p>
          <div className={styles.langGrid}>
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                className={styles.langPill}
                onClick={() => handleDownload(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

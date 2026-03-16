"use client";

import type { Event } from "@/app/types/event";
import { eventGradient } from "../utils/eventGradient";
import RegisterButton from "./RegisterButton";
import styles from "./EventHeroCard.module.css";

interface Props {
  event: Event;
  onRegister: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  isLoadingId: string | null;
}

export default function EventHeroCard({ event, onRegister, onCancel, isLoadingId }: Props) {
  const gradient = eventGradient(event.title);
  const bgStyle = event.coverImageUrl
    ? { backgroundImage: `url(${event.coverImageUrl})` }
    : { ["--event-gradient" as string]: gradient, background: "var(--event-gradient)" };

  const dateDisplay = (() => {
    const d = new Date(event.date + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  return (
    <div className={styles.hero}>
      <div className={styles.bg} style={bgStyle} />
      <div className={styles.overlay} />

      <div className={styles.chips}>
        <span className={styles.featuredBadge}>Featured</span>
        <span className={styles.chip}>{event.borough}</span>
        <span className={styles.chip}>{dateDisplay}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.textBlock}>
          <h2 className={styles.title}>{event.title}</h2>
          {event.location && (
            <div className={styles.location}>
              <span>📍</span>
              {event.location}
            </div>
          )}
        </div>
        <div className={styles.regWrap}>
          <RegisterButton
            eventId={event.id}
            isRegistered={event.isRegistered}
            isLoadingExternal={isLoadingId === event.id}
            onRegister={onRegister}
            onCancel={onCancel}
          />
        </div>
      </div>
    </div>
  );
}

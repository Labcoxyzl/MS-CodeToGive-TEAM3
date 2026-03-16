"use client";

import type { Event } from "@/app/types/event";
import { eventGradient } from "../utils/eventGradient";
import { highlightText } from "../utils/eventFilters";
import RegisterButton from "./RegisterButton";
import styles from "./EventCard.module.css";

interface Props {
  event: Event;
  cardIndex?: number;
  searchQuery?: string;
  isPast?: boolean;
  onRegister: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  isLoadingId: string | null;
}

export default function EventCard({
  event,
  cardIndex = 0,
  searchQuery = "",
  isPast,
  onRegister,
  onCancel,
  isLoadingId,
}: Props) {
  const gradient = eventGradient(event.title);
  const isFull =
    event.volunteerLimit != null && event.registeredCount >= event.volunteerLimit;

  const titleHtml = highlightText(event.title, searchQuery);

  const dateDisplay = (() => {
    const d = new Date(event.date + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  return (
    <div
      className={styles.card}
      style={{ "--card-index": cardIndex } as React.CSSProperties}
    >
      <div className={styles.imageWrapper}>
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt={event.title} className={styles.image} />
        ) : (
          <div
            className={styles.imagePlaceholder}
            style={{ background: gradient }}
          />
        )}
        <span className={styles.boroughPill}>{event.borough}</span>
        {isPast && <span className={styles.pastBadge}>Past</span>}
      </div>

      {isPast && <div className={styles.pastOverlay} />}

      <div className={styles.body}>
        <div
          className={styles.title}
          // Query is regex-escaped in highlightText, safe to use here
          dangerouslySetInnerHTML={{ __html: titleHtml }}
        />

        <div className={styles.meta}>
          <span className={styles.metaIcon}>📅</span>
          {dateDisplay} &middot; {event.startTime}
        </div>

        {event.location && (
          <div className={styles.meta}>
            <span className={styles.metaIcon}>📍</span>
            {event.location}
          </div>
        )}

        <div className={styles.footer}>
          <span className={`${styles.capacity} ${isFull ? styles.capacityFull : ""}`}>
            👥 {event.registeredCount}
            {event.volunteerLimit != null ? `/${event.volunteerLimit}` : ""}
            {isFull ? " · Full" : ""}
          </span>

          {!isPast && (
            <div className={styles.registerWrap}>
              <RegisterButton
                eventId={event.id}
                isRegistered={event.isRegistered}
                isLoadingExternal={isLoadingId === event.id}
                onRegister={onRegister}
                onCancel={onCancel}
                small
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef } from "react";
import type { Event } from "@/app/types/event";
import EventCard from "./EventCard";
import styles from "../events.module.css";

interface Props {
  events: Event[];
  searchQuery?: string;
  onRegister: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  isLoadingId: string | null;
  indexOffset?: number;
}

const CARD_WIDTH = 300;

export default function HorizontalScrollRow({
  events,
  searchQuery,
  onRegister,
  onCancel,
  isLoadingId,
  indexOffset = 0,
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    rowRef.current?.scrollBy({
      left: dir === "right" ? CARD_WIDTH : -CARD_WIDTH,
      behavior: "smooth",
    });
  }

  return (
    <div className={styles.scrollRowWrap}>
      <button
        className={`${styles.arrowBtn} ${styles.arrowBtnLeft}`}
        onClick={() => scroll("left")}
        aria-label="Scroll left"
      >
        ‹
      </button>
      <div className={styles.scrollRow} ref={rowRef}>
        {events.map((ev, i) => (
          <div key={ev.id} className={styles.scrollRowCard}>
            <EventCard
              event={ev}
              cardIndex={indexOffset + i}
              searchQuery={searchQuery}
              onRegister={onRegister}
              onCancel={onCancel}
              isLoadingId={isLoadingId}
            />
          </div>
        ))}
      </div>
      <button
        className={`${styles.arrowBtn} ${styles.arrowBtnRight}`}
        onClick={() => scroll("right")}
        aria-label="Scroll right"
      >
        ›
      </button>
    </div>
  );
}

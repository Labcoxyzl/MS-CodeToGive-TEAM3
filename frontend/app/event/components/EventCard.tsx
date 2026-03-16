"use client";

import { useState, useRef, useEffect } from "react";
import { Map, Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Event } from "@/app/types/event";
import { eventGradient } from "../utils/eventGradient";
import { highlightText } from "../utils/eventFilters";
import RegisterButton from "./RegisterButton";
import FlyerButton from "./FlyerButton";
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
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const hasCoords = Boolean(event.latitude && event.longitude);
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
      <div ref={containerRef} className={styles.imageWrapper}>
        {hasCoords && isVisible ? (
          <div className={styles.mapContainer}>
            <Map
              mapLib={maplibregl}
              initialViewState={{ longitude: event.longitude!, latitude: event.latitude!, zoom: 15 }}
              style={{ width: "100%", height: "100%" }}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              interactive={false}
              attributionControl={false}
            >
              <Marker longitude={event.longitude!} latitude={event.latitude!}>
                <div style={{
                  width: 12, height: 12,
                  background: "#2E8B7A",
                  borderRadius: "50%",
                  border: "2px solid #fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }} />
              </Marker>
            </Map>
          </div>
        ) : (
          <div
            className={styles.imagePlaceholder}
            style={{ background: gradient }}
          />
        )}
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
            <div className={styles.hoverActions}>
              {event.latitude && event.longitude && (
                <FlyerButton eventId={event.id} small />
              )}
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

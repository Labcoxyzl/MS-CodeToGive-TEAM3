"use client";

import { useState, useRef, useEffect } from "react";
import { Map, Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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

  const dateDisplay = (() => {
    const d = new Date(event.date + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  return (
    <div ref={containerRef} className={styles.hero}>
      {hasCoords && isVisible ? (
        <div className={styles.mapBg}>
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
                width: 14, height: 14,
                background: "#2E8B7A",
                borderRadius: "50%",
                border: "2px solid #fff",
                boxShadow: "0 1px 6px rgba(0,0,0,0.45)",
              }} />
            </Marker>
          </Map>
        </div>
      ) : (
        <div
          className={styles.bg}
          style={{ ["--event-gradient" as string]: gradient, background: "var(--event-gradient)" }}
        />
      )}
      <div className={styles.overlay} />

      <div className={styles.chips}>
        <span className={styles.featuredBadge}>Featured</span>
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

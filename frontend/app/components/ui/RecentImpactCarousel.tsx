"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RecentEvent } from "@/app/dashboard/mockData";
import cardStyles from "@/app/events/components/EventCard.module.css";
import styles from "@/app/dashboard/dashboard.module.css";

function staticTileUrl(lat: number, lng: number, zoom = 14): string {
  const z = zoom;
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, z));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, z)
  );
  return `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
}

interface RecentImpactCarouselProps {
  events: RecentEvent[];
}

export default function RecentImpactCarousel({ events }: RecentImpactCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const visibleCount = 3;
  const gap = 16;
  const maxIndex = Math.max(0, events.length - visibleCount);

  useEffect(() => {
    function updateWidth() {
      if (!wrapperRef.current) return;
      const w = wrapperRef.current.clientWidth;
      setCardWidth((w - gap * (visibleCount - 1)) / visibleCount);
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  function scrollToIndex(index: number) {
    if (!wrapperRef.current) return;
    const cw = cardWidth || (wrapperRef.current.clientWidth - gap * (visibleCount - 1)) / visibleCount;
    wrapperRef.current.scrollTo({ left: index * (cw + gap), behavior: "smooth" });
  }

  function prev() {
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  }

  function next() {
    const newIndex = Math.min(maxIndex, currentIndex + 1);
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  }

  return (
    <div>
      <div className={styles.carouselContainer}>
        <button
          className={`lt-carousel-arrow ${styles.carouselArrowLeft}`}
          onClick={prev}
          disabled={currentIndex === 0}
          aria-label="Previous events"
        >
          ‹
        </button>

        <div className={styles.carouselTrackWrapper} ref={wrapperRef}>
          <div className={styles.carouselTrack}>
            {events.map((event) => (
              <div
                key={event.id}
                className={`${cardStyles.card} ${styles.carouselCard}`}
                style={cardWidth ? { width: cardWidth } : undefined}
                onClick={() => router.push(`/events/${event.id}`)}
              >
                <div className={cardStyles.imageWrapper}>
                  {event.latitude != null && event.longitude != null ? (
                    <div className={cardStyles.mapContainer} style={{ position: "relative", overflow: "hidden" }}>
                      <img
                        src={staticTileUrl(event.latitude, event.longitude)}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        draggable={false}
                      />
                      <div style={{
                        position: "absolute",
                        top: "50%", left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 14, height: 14,
                        background: "#2E8B7A",
                        borderRadius: "50%",
                        border: "2.5px solid #fff",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                        pointerEvents: "none",
                      }} />
                    </div>
                  ) : (
                    <div
                      className={cardStyles.imagePlaceholder}
                      style={{ background: event.imageGradient }}
                    />
                  )}
                  <span className={cardStyles.pastBadge}>Past</span>
                </div>
                <div className={cardStyles.pastOverlay} />
                <div className={cardStyles.body}>
                  <div className={cardStyles.title}>{event.title}</div>
                  <div className={cardStyles.meta}>
                    <span className={cardStyles.metaIcon}>📅</span>
                    {event.date} · {event.time}
                  </div>
                  {event.location && (
                    <div className={cardStyles.meta}>
                      <span className={cardStyles.metaIcon}>📍</span>
                      {event.location}
                    </div>
                  )}
                  <div className={cardStyles.footer}>
                    <span className={cardStyles.capacity}>
                      👥 {event.volunteersCount} volunteers
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className={`lt-carousel-arrow ${styles.carouselArrowRight}`}
          onClick={next}
          disabled={currentIndex >= maxIndex}
          aria-label="Next events"
        >
          ›
        </button>
      </div>

      <div className="lt-carousel-dots">
        {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
          <button
            key={idx}
            className={`lt-carousel-dot${idx === currentIndex ? " lt-carousel-dot--active" : ""}`}
            onClick={() => { setCurrentIndex(idx); scrollToIndex(idx); }}
            aria-label={`Go to position ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

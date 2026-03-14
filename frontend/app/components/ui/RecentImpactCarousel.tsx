"use client";

import { useState } from "react";
import { RecentEvent } from "@/app/dashboard/mockData";
import styles from "@/app/dashboard/dashboard.module.css";

interface RecentImpactCarouselProps {
  events: RecentEvent[];
}

export default function RecentImpactCarousel({ events }: RecentImpactCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const visibleCount = 3;
  const maxIndex = Math.max(0, events.length - visibleCount);

  function prev() {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  function next() {
    setCurrentIndex((i) => Math.min(maxIndex, i + 1));
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

        <div className={styles.carouselTrackWrapper}>
          <div
            className={styles.carouselTrack}
            style={{
              transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`,
            }}
          >
            {events.map((event) => (
              <div key={event.id} className={styles.carouselCard}>
                <div
                  className={styles.carouselCardImage}
                  style={{ background: event.imageGradient }}
                >
                  <span className={styles.carouselCardDate}>
                    {event.date} @ {event.time}
                  </span>
                </div>
                <div className={styles.carouselCardInfo}>
                  <span className={styles.carouselCardTitle}>{event.title}</span>
                  <span className={styles.carouselCardLocation}>
                    📍 {event.location} · {event.volunteersCount} volunteers
                  </span>
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

      {/* Dots */}
      <div className="lt-carousel-dots">
        {events.map((_, idx) => (
          <button
            key={idx}
            className={`lt-carousel-dot${idx === currentIndex ? " lt-carousel-dot--active" : ""}`}
            onClick={() => setCurrentIndex(Math.min(idx, maxIndex))}
            aria-label={`Go to event ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

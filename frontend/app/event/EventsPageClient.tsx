"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/components/ui/Sidebar";
import { useEvents } from "./hooks/useEvents";
import { useRegisterEvent } from "./hooks/useRegisterEvent";
import { filterEvents } from "./utils/eventFilters";
import type { FilterState } from "@/app/types/event";
import EventCardSkeleton from "./components/EventCardSkeleton";
import EventSectionHeader from "./components/EventSectionHeader";
import EventHeroCard from "./components/EventHeroCard";
import HorizontalScrollRow from "./components/HorizontalScrollRow";
import EventGrid from "./components/EventGrid";
import EventFilters from "./components/EventFilters";
import EmptyState from "./components/EmptyState";
import styles from "./events.module.css";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
const TODAY = "2026-03-15";

function isThisWeekDate(dateStr: string): boolean {
  const today = new Date(TODAY + "T00:00:00");
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  const d = new Date(dateStr + "T00:00:00");
  return d >= sunday && d <= saturday;
}

export default function EventsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Auth guard — lazy initializer avoids synchronous setState in effect
  const [isAuthorized] = useState<boolean>(() => {
    if (USE_MOCK) return true;
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("access_token");
  });

  useEffect(() => {
    if (!isAuthorized) {
      router.push("/login");
    }
  }, [isAuthorized, router]);

  // Hero band collapse on scroll
  useEffect(() => {
    function handleScroll() {
      setIsCollapsed(window.scrollY > 60);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Filter state from URL
  const filters: FilterState = useMemo(
    () => ({
      q: searchParams.get("q") ?? "",
      borough: searchParams.get("borough") ?? "",
      dateRange: searchParams.get("date") ?? "",
      tab: searchParams.get("tab") ?? "",
    }),
    [searchParams]
  );

  const handleFilterChange = useCallback(
    (partial: Partial<FilterState>) => {
      const params = new URLSearchParams(searchParams.toString());

      if (partial.q !== undefined) {
        if (partial.q) {
          params.set("q", partial.q);
        } else {
          params.delete("q");
        }
      }
      if (partial.borough !== undefined) {
        if (partial.borough && partial.borough !== "all") {
          params.set("borough", partial.borough);
        } else {
          params.delete("borough");
        }
      }
      if (partial.dateRange !== undefined) {
        if (partial.dateRange) {
          params.set("date", partial.dateRange);
        } else {
          params.delete("date");
        }
      }
      if (partial.tab !== undefined) {
        if (partial.tab) {
          params.set("tab", partial.tab);
        } else {
          params.delete("tab");
        }
      }

      router.replace(`/event?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleClearFilters = useCallback(() => {
    router.replace("/event");
  }, [router]);

  const { events, loading, error, updateEventRegistration } = useEvents();

  const { register, cancel, loadingId } = useRegisterEvent(
    (id, registered) => updateEventRegistration(id, registered),
    (id, err) => console.error(`Registration error for ${id}:`, err)
  );

  // Partition events
  const { heroEvent, thisWeekEvents, comingUpEvents, pastEvents } = useMemo(() => {
    const past: typeof events = [];
    const thisWeek: typeof events = [];
    const comingUp: typeof events = [];

    for (const ev of events) {
      if (ev.date < TODAY) {
        past.push(ev);
      } else if (isThisWeekDate(ev.date)) {
        thisWeek.push(ev);
      } else {
        comingUp.push(ev);
      }
    }

    const hero = thisWeek[0] ?? comingUp[0] ?? null;

    return {
      heroEvent: hero,
      thisWeekEvents: thisWeek,
      comingUpEvents: comingUp,
      pastEvents: past,
    };
  }, [events]);

  const thisWeekFiltered = useMemo(
    () => filterEvents(thisWeekEvents, filters),
    [thisWeekEvents, filters]
  );
  const comingUpFiltered = useMemo(
    () => filterEvents(comingUpEvents, filters),
    [comingUpEvents, filters]
  );

  if (!isAuthorized) return null;

  return (
    <div
      className={styles.eventsShell}
      style={{ flexDirection: "row", alignItems: "stretch" }}
    >
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.eventsMain}>
        {/* Hero Band */}
        <div
          className={`${styles.heroBand} ${isCollapsed ? styles.heroBandCollapsed : ""}`}
        >
          <div className={styles.heroBandText}>
            <h1 className={styles.heroBandTitle}>Find Your Next Event</h1>
            <p className={styles.heroBandSubline}>
              Browse upcoming volunteer flyering campaigns in your area.
            </p>
          </div>
          <div className={styles.heroBandActions}>
            <Link href="/events/create" className={styles.newEventBtn}>
              + New Event
            </Link>
          </div>
        </div>

        {/* Desktop filter bar */}
        <div className={styles.filterBar}>
          <EventFilters
            filters={filters}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        </div>

        {/* Events content */}
        <div className={styles.eventsContent}>
          {loading ? (
            <EventCardSkeleton count={6} />
          ) : error ? (
            <div className={styles.errorBanner}>
              ⚠ {error}{" "}
              <button
                onClick={() => router.refresh()}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Featured Hero Card */}
              {heroEvent && (
                <EventHeroCard
                  event={heroEvent}
                  onRegister={register}
                  onCancel={cancel}
                  isLoadingId={loadingId}
                />
              )}

              {/* This Week */}
              <EventSectionHeader title="This Week" count={thisWeekFiltered.length} />
              {thisWeekFiltered.length > 0 ? (
                <HorizontalScrollRow
                  events={thisWeekFiltered}
                  searchQuery={filters.q}
                  onRegister={register}
                  onCancel={cancel}
                  isLoadingId={loadingId}
                />
              ) : (
                <EmptyState onClearFilters={handleClearFilters} />
              )}

              {/* Coming Up */}
              <EventSectionHeader title="Coming Up" count={comingUpFiltered.length} />
              {comingUpFiltered.length > 0 ? (
                <EventGrid
                  events={comingUpFiltered}
                  searchQuery={filters.q}
                  onRegister={register}
                  onCancel={cancel}
                  isLoadingId={loadingId}
                  indexOffset={thisWeekFiltered.length}
                />
              ) : (
                <EmptyState onClearFilters={handleClearFilters} />
              )}

              {/* Past Events (collapsible) */}
              <EventSectionHeader
                title="Past Events"
                count={pastEvents.length}
                collapsible
                isExpanded={showPast}
                onToggle={() => setShowPast((v) => !v)}
              />
              {showPast && (
                <EventGrid
                  events={pastEvents}
                  isPast
                  onRegister={register}
                  onCancel={cancel}
                  isLoadingId={loadingId}
                  indexOffset={thisWeekFiltered.length + comingUpFiltered.length}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <button
        className="lt-sidebar-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
        style={{ bottom: 80 }}
      >
        ☰
      </button>

      {/* Mobile filter toggle */}
      <button
        className={styles.filterToggle}
        onClick={() => setMobileFilterOpen(true)}
        aria-label="Open filters"
      >
        🔍 Filters
      </button>

      {/* Mobile filter bottom sheet */}
      {mobileFilterOpen && (
        <>
          <div
            className={styles.filterSheetOverlay}
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className={styles.filterSheet}>
            <div className={styles.filterSheetHandle} />
            <div className={styles.filterSheetFilters}>
              <EventFilters
                filters={filters}
                onChange={(p) => {
                  handleFilterChange(p);
                  setMobileFilterOpen(false);
                }}
                onClear={() => {
                  handleClearFilters();
                  setMobileFilterOpen(false);
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

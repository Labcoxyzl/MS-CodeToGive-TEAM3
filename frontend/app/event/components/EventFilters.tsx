"use client";

import { useRef } from "react";
import type { FilterState } from "@/app/types/event";
import styles from "../events.module.css";

const BOROUGHS = ["all", "Brooklyn", "Manhattan", "Queens", "Bronx", "Staten Island", "Other"];

interface Props {
  filters: FilterState;
  onChange: (partial: Partial<FilterState>) => void;
  onClear: () => void;
}

export default function EventFilters({ filters, onChange, onClear }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ q: value });
    }, 200);
  }

  const hasActiveFilters =
    filters.q || (filters.borough && filters.borough !== "all") || filters.dateRange || filters.tab === "registered";

  return (
    <div className={styles.filters}>
      {/* Search input */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search events..."
          defaultValue={filters.q}
          onChange={(e) => handleSearch(e.target.value)}
          aria-label="Search events"
        />
      </div>

      {/* Borough dropdown */}
      <select
        className={styles.filterSelect}
        value={filters.borough || "all"}
        onChange={(e) => onChange({ borough: e.target.value })}
        aria-label="Filter by borough"
      >
        <option value="all">All Boroughs</option>
        {BOROUGHS.filter((b) => b !== "all").map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>

      {/* Date range dropdown */}
      <select
        className={styles.filterSelect}
        value={filters.dateRange || ""}
        onChange={(e) => onChange({ dateRange: e.target.value })}
        aria-label="Filter by date range"
      >
        <option value="">Any Date</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
      </select>

      {/* Quick-filter chips */}
      <div className={styles.chips}>
        {(["all", "registered"] as const).map((tab) => (
          <button
            key={tab}
            className={`${styles.chip} ${filters.tab === tab || (tab === "all" && !filters.tab) ? styles.chipActive : ""}`}
            onClick={() => onChange({ tab: tab === "all" ? "" : tab })}
          >
            {tab === "all" ? "All" : "Registered"}
          </button>
        ))}
      </div>

      {/* Clear button */}
      {hasActiveFilters && (
        <button className={styles.clearBtn} onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  );
}

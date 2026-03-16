"use client";

import { useRef } from "react";
import type { FilterState } from "@/app/types/event";
import styles from "../events.module.css";

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
    filters.q || filters.dateRange || filters.tab === "registered" || filters.tab === "my-events";

  const TABS = [
    { value: "", label: "All" },
    { value: "registered", label: "Registered" },
    { value: "my-events", label: "My Events" },
  ];

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
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            className={`${styles.chip} ${filters.tab === value || (!filters.tab && value === "") ? styles.chipActive : ""}`}
            onClick={() => onChange({ tab: value })}
          >
            {label}
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

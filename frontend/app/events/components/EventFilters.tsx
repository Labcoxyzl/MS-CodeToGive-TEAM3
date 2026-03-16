"use client";

import { useRef, useState, useEffect } from "react";
import type { FilterState } from "@/app/types/event";
import styles from "../events.module.css";
import DateRangePicker from "./DateRangePicker";

interface Props {
  filters: FilterState;
  onChange: (partial: Partial<FilterState>) => void;
  onClear: () => void;
}

const PRESETS = [
  { value: "", label: "Any Date" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

function isCustomRange(v: string) {
  return v.includes(":");
}

function parseCustomRange(v: string): { from: string; to: string } {
  const [from = "", to = ""] = v.split(":");
  return { from, to };
}

export default function EventFilters({ filters, onChange, onClear }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const isCustom = isCustomRange(filters.dateRange);
  const { from: customFrom, to: customTo } = isCustom
    ? parseCustomRange(filters.dateRange)
    : { from: "", to: "" };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange({ q: value }), 200);
  }

  function selectPreset(value: string) {
    onChange({ dateRange: value });
    setDateDropdownOpen(false);
  }

  function handleRangeChange({ from, to }: { from: string; to: string }) {
    if (!from && !to) {
      onChange({ dateRange: "" });
    } else {
      onChange({ dateRange: `${from}:${to}` });
    }
  }

  const buttonLabel = (() => {
    if (!filters.dateRange) return "Any Date";
    if (filters.dateRange === "week") return "This Week";
    if (filters.dateRange === "month") return "This Month";
    if (isCustom) {
      const { from, to } = parseCustomRange(filters.dateRange);
      if (from && to && from === to) return from;
      if (from && to) return `${from} – ${to}`;
      if (from) return `From ${from}`;
      if (to) return `Until ${to}`;
    }
    return "Any Date";
  })();

  const hasActiveFilters =
    filters.q || filters.dateRange || filters.tab === "registered" || filters.tab === "my-events";

  const TABS = [
    { value: "", label: "All" },
    { value: "registered", label: "Registered" },
    { value: "my-events", label: "My Events" },
  ];

  const activePreset = isCustom ? "__custom__" : (filters.dateRange || "");

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
      <div ref={dateDropdownRef} style={{ position: "relative" }}>
        <button
          type="button"
          className="lt-select"
          onClick={() => setDateDropdownOpen((o) => !o)}
          aria-label="Filter by date range"
          style={{
            textAlign: "left",
            minWidth: 148,
            color: filters.dateRange ? "inherit" : "var(--lt-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ flex: 1 }}>{buttonLabel}</span>
          <span style={{ opacity: 0.45, fontSize: 11, flexShrink: 0 }}>▾</span>
        </button>

        {dateDropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 20,
              width: 240,
              background: "#fff",
              border: "1.5px solid var(--lt-border)",
              borderRadius: "var(--lt-radius-sm)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}
          >
            {/* Preset chips */}
            <div style={{ display: "flex", gap: 6, padding: "10px 14px 6px" }}>
              {PRESETS.map((opt) => {
                const active = activePreset === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectPreset(opt.value)}
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                      fontFamily: "var(--font-dm-sans)",
                      borderRadius: 99,
                      border: `1.5px solid ${active ? "var(--lt-color-brand-primary)" : "var(--lt-border)"}`,
                      background: active ? "var(--lt-teal-light)" : "transparent",
                      color: active ? "var(--lt-teal)" : "var(--lt-text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Divider with label */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 14px" }}>
              <div style={{ flex: 1, height: 1, background: "var(--lt-border)" }} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--lt-text-muted)" }}>
                Custom
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--lt-border)" }} />
            </div>

            {/* Calendar */}
            <DateRangePicker
              from={customFrom}
              to={customTo}
              onChange={handleRangeChange}
            />

            {/* Clear custom range */}
            {isCustom && (customFrom || customTo) && (
              <div style={{ padding: "0 14px 10px", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => { onChange({ dateRange: "" }); setDateDropdownOpen(false); }}
                  style={{
                    fontSize: 12, color: "var(--lt-text-muted)", background: "none",
                    border: "none", cursor: "pointer", textDecoration: "underline",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                >
                  Clear range
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* Clear all */}
      {hasActiveFilters && (
        <button className={styles.clearBtn} onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";

const PURPLE = "#784cc5";

const IB: React.CSSProperties = {
  width: "100%", padding: "10px 13px", fontSize: "14px",
  fontFamily: "var(--font-dm-sans)", color: "#2D2A26",
  background: "#fdf0e8", border: "2px solid #e0bfb0",
  borderRadius: "5px", outline: "none", boxSizing: "border-box",
  cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
  display: "flex", alignItems: "center", justifyContent: "space-between",
};

// Generate time slots in 30-min increments: "00:00" … "23:30"
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_SLOTS.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
  }
}

function display(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

interface Props {
  value: string;           // "HH:MM"
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  minTime?: string;        // "HH:MM" — slots before this are greyed out
}

export default function TimePicker({ value, onChange, placeholder = "Select time", hasError, minTime }: Props) {
  const [open, setOpen]     = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Scroll selected item into view when dropdown opens
  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "center" });
    }
  }, [open]);

  const borderColor = hasError ? "#D63B2F" : focused || open ? PURPLE : "#e0bfb0";
  const boxShadow   = hasError
    ? "0 0 0 3px rgba(214,59,47,0.15)"
    : focused || open
    ? "0 0 0 3px rgba(107,70,193,0.15)"
    : "none";

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => { setOpen(o => !o); setFocused(true); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(o => !o); }}
        style={{ ...IB, border: `2px solid ${borderColor}`, boxShadow, background: open ? "#EDE5F7" : "#fdf0e8" }}
      >
        <span style={{ color: value ? "#2D2A26" : "#9C9690" }}>
          {value ? display(value) : placeholder}
        </span>
        {/* Clock icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginLeft: 6 }}>
          <circle cx="8" cy="8" r="6.25" stroke="#784cc5" strokeWidth="1.5"/>
          <line x1="8" y1="4.5" x2="8" y2="8" stroke="#784cc5" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="8" y1="8" x2="10.5" y2="9.5" stroke="#784cc5" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Dropdown list */}
      {open && (
        <div
          ref={listRef}
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
            background: "#fff", borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)", border: "1px solid #e8d8cc",
            width: "100%", maxHeight: 220, overflowY: "auto",
            padding: "6px 0",
          }}
        >
          {TIME_SLOTS.map((slot) => {
            const isSelected = slot === value;
            const isDisabled = !!minTime && slot <= minTime;
            return (
              <div
                key={slot}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => {
                  if (!isDisabled) { onChange(slot); setOpen(false); }
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: 14,
                  fontFamily: "var(--font-dm-sans)",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  background: isSelected ? "#EDE5F7" : "transparent",
                  color: isSelected ? PURPLE : isDisabled ? "#ccc" : "#2D2A26",
                  fontWeight: isSelected ? 700 : 400,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled && !isSelected) (e.currentTarget as HTMLDivElement).style.background = "#f5f0fb";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                {display(slot)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

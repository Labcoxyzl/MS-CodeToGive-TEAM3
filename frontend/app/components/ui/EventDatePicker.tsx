"use client";

import { useState, useRef, useEffect } from "react";

const TEAL       = "#2E8B7A";
const TEAL_LIGHT = "#D3EFEA";
const PURPLE     = "#784cc5";
const IB: React.CSSProperties = {
  width: "100%", padding: "10px 13px", fontSize: "14px",
  fontFamily: "var(--font-dm-sans)", color: "#2D2A26",
  background: "#fdf0e8", border: "2px solid #e0bfb0",
  borderRadius: "5px", outline: "none", boxSizing: "border-box",
  cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
  display: "flex", alignItems: "center", justifyContent: "space-between",
};

const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function daysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function displayDate(ymd: string): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m-1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  value: string;          // "YYYY-MM-DD"
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disablePast?: boolean;
}

export default function EventDatePicker({ value, onChange, placeholder = "Select date", hasError, disablePast = true }: Props) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayYmd = toYMD(today);

  const initDate = value ? new Date(value + "T00:00:00") : today;
  const [open, setOpen]           = useState(false);
  const [viewYear, setViewYear]   = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [focused, setFocused]     = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); }
    else setViewMonth(m => m-1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); }
    else setViewMonth(m => m+1);
  }

  const firstDow   = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays  = daysInMonth(viewYear, viewMonth);
  const cells: (string|null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_,i) => toYMD(new Date(viewYear, viewMonth, i+1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

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
        onBlur={() => { setFocused(false); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(o => !o); }}
        style={{ ...IB, border: `2px solid ${borderColor}`, boxShadow, background: open ? "#EDE5F7" : "#fdf0e8" }}
      >
        <span style={{ color: value ? "#2D2A26" : "#9C9690" }}>
          {value ? displayDate(value) : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginLeft: 6 }}>
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="#784cc5" strokeWidth="1.5"/>
          <line x1="1" y1="6.5" x2="15" y2="6.5" stroke="#784cc5" strokeWidth="1.5"/>
          <line x1="5" y1="1" x2="5" y2="5" stroke="#784cc5" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="11" y1="1" x2="11" y2="5" stroke="#784cc5" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Calendar dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: "#fff", borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.14)", border: "1px solid #e8d8cc",
          padding: "10px 12px", width: 260,
        }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button type="button" onClick={prevMonth}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, color: "#6B6560", padding: "0 4px" }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#2D2A26", fontFamily: "var(--font-dm-sans)" }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, color: "#6B6560", padding: "0 4px" }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#9C9690", padding: "2px 0", textTransform: "uppercase", fontFamily: "var(--font-dm-sans)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((ymd, i) => {
              if (!ymd) return <div key={`e-${i}`} style={{ height: 32 }} />;
              const isPast      = disablePast && ymd < todayYmd;
              const isSelected  = ymd === value;
              const isToday     = ymd === todayYmd;
              return (
                <div
                  key={ymd}
                  onClick={() => { if (!isPast) { onChange(ymd); setOpen(false); } }}
                  style={{
                    height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: isPast ? "not-allowed" : "pointer",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: isSelected ? TEAL : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontFamily: "var(--font-dm-sans)",
                    fontWeight: isSelected || isToday ? 700 : 400,
                    color: isSelected ? "#fff" : isPast ? "#ccc" : isToday ? TEAL : "#2D2A26",
                    outline: isToday && !isSelected ? `2px solid ${TEAL}` : "none",
                    outlineOffset: -2,
                    transition: "background 0.1s",
                  }}>
                    {new Date(viewYear, viewMonth, parseInt(ymd.slice(8))).getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

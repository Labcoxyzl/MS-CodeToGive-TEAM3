"use client";

import { useState } from "react";

interface Range {
  from: string; // "YYYY-MM-DD"
  to: string;
}

interface Props {
  from: string;
  to: string;
  onChange: (range: Range) => void;
}

const TEAL = "#2E8B7A";
const TEAL_LIGHT = "#D3EFEA";
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function DateRangePicker({ from, to, onChange }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hovered, setHovered] = useState<string | null>(null);

  const todayYmd = toYMD(today);
  const pickingEnd = !!from && !to;

  // Determine the effective displayed range (including hover preview)
  const rangeStart = from || "";
  const rangeEnd = to || (pickingEnd && hovered ? hovered : "");
  const lo = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeStart : rangeEnd) : rangeStart;
  const hi = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeEnd : rangeStart) : rangeEnd;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(ymd: string) {
    if (!from || (from && to)) {
      onChange({ from: ymd, to: "" });
    } else if (ymd === from) {
      onChange({ from: ymd, to: ymd });
    } else if (ymd < from) {
      onChange({ from: ymd, to: from });
    } else {
      onChange({ from, to: ymd });
    }
  }

  // Build grid cells
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => toYMD(new Date(viewYear, viewMonth, i + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ padding: "10px 14px", userSelect: "none" }}>
      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button type="button" onClick={prevMonth}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: "#6B6560", padding: "0 4px" }}>
          ‹
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#2D2A26", fontFamily: "var(--font-dm-sans)" }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: "#6B6560", padding: "0 4px" }}>
          ›
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#9C9690", padding: "2px 0", fontFamily: "var(--font-dm-sans)", textTransform: "uppercase" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((ymd, i) => {
          if (!ymd) return <div key={`empty-${i}`} style={{ height: 32 }} />;

          const isStart  = ymd === lo && !!lo;
          const isEnd    = ymd === hi && !!hi;
          const inRange  = !!lo && !!hi && ymd > lo && ymd < hi;
          const isEndpoint = isStart || isEnd;
          const isSingle = lo === hi && isStart;
          const isToday  = ymd === todayYmd;

          // Strip for in-range cells (full width background behind the circle)
          const stripBg = inRange || (isStart && hi) || (isEnd && lo)
            ? TEAL_LIGHT
            : "transparent";
          const stripLeft  = isStart ? "50%" : "0";
          const stripRight = isEnd   ? "50%" : "0";

          return (
            <div
              key={ymd}
              onClick={() => handleDayClick(ymd)}
              onMouseEnter={() => setHovered(ymd)}
              onMouseLeave={() => setHovered(null)}
              style={{ position: "relative", height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              {/* Range strip */}
              {(inRange || (isStart && hi && !isSingle) || (isEnd && lo && !isSingle)) && (
                <div style={{
                  position: "absolute",
                  top: 2, bottom: 2,
                  left: stripLeft,
                  right: stripRight,
                  background: TEAL_LIGHT,
                  pointerEvents: "none",
                }} />
              )}

              {/* Circle */}
              <div style={{
                position: "relative",
                zIndex: 1,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: isEndpoint ? TEAL : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: isEndpoint || isToday ? 700 : 400,
                color: isEndpoint ? "#ffffff" : isToday ? TEAL : "#2D2A26",
                fontFamily: "var(--font-dm-sans)",
                outline: isToday && !isEndpoint ? `2px solid ${TEAL}` : "none",
                outlineOffset: -2,
                transition: "background 0.1s",
              }}>
                {new Date(viewYear, viewMonth, parseInt(ymd.slice(8))).getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <p style={{ marginTop: 8, fontSize: 11, color: "#9C9690", textAlign: "center", fontFamily: "var(--font-dm-sans)", margin: "8px 0 0" }}>
        {!from
          ? "Click to set start date"
          : !to
          ? "Click to set end date"
          : from === to
          ? from
          : `${from} – ${to}`}
      </p>
    </div>
  );
}

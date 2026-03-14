"use client";

import Link from "next/link";
import { LeaderboardEntry } from "@/app/dashboard/mockData";

interface LeaderboardPreviewProps {
  entries: LeaderboardEntry[];
}

export default function LeaderboardPreview({ entries }: LeaderboardPreviewProps) {
  return (
    <div className="lt-panel">
      <h2 className="lt-section-title">Leaderboard</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {entries.map((entry) => (
          <div
            key={entry.rank}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderBottom:
                entry.rank < entries.length
                  ? "1px solid rgba(0,0,0,0.04)"
                  : "none",
            }}
          >
            <div className="lt-avatar lt-avatar--sm">{entry.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--lt-text-primary)" }}>
                {entry.name}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: "var(--lt-teal)",
              }}
            >
              {entry.points.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Link
          href="/community/leaders"
          className="lt-link"
          style={{ fontSize: 14 }}
        >
          View Full Leaderboard →
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from "recharts";
import { apiFetch } from "@/app/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface TrendPoint  { week: string; events: number; signups: number; }
interface StatusPoint { status: string; count: number; }
interface ParticipationPoint { title: string; date: string; signups: number; attended: number; rate: number; }

// ── Colours ────────────────────────────────────────────────────────────────────
const TEAL   = "#2E8B7A";
const PURPLE = "#6942b5";
const STATUS_COLORS: Record<string, string> = {
  upcoming:  "#6942b5",
  active:    "#2E8B7A",
  completed: "#16a34a",
  cancelled: "#9ca3af",
};

// ── Small helpers ──────────────────────────────────────────────────────────────
function ChartShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
      padding: "20px 24px", flex: 1, minWidth: 0,
    }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: "#374151", margin: "0 0 2px", fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif" }}>{title}</p>
      {subtitle && <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 16px" }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 16 }} />}
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ height: 220, background: "#f3f4f6", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
  );
}

// ── Participation bar colours ─── green if ≥80 %, yellow if ≥50 %, red below
function rateColor(rate: number) {
  if (rate >= 80) return "#16a34a";
  if (rate >= 50) return "#f59e0b";
  return "#ef4444";
}

// Truncate long event titles for the bar axis
function shortTitle(title: string, max = 22) {
  return title.length > max ? title.slice(0, max) + "…" : title;
}

// ── Main component ─────────────────────────────────────────────────────────────
const PERIODS: { label: string; weeks: number }[] = [
  { label: "4W",  weeks: 4  },
  { label: "8W",  weeks: 8  },
  { label: "12W", weeks: 12 },
  { label: "26W", weeks: 26 },
];

export default function AdminCharts({ part = "all" }: { part?: "top" | "bottom" | "all" }) {
  const [trend,         setTrend]         = useState<TrendPoint[] | null>(null);
  const [trendLoading,  setTrendLoading]  = useState(false);
  const [weeks,         setWeeks]         = useState(12);
  const [statusData,    setStatusData]    = useState<StatusPoint[] | null>(null);
  const [participation, setParticipation] = useState<ParticipationPoint[] | null>(null);

  useEffect(() => {
    setTrend(null);
    setTrendLoading(true);
    apiFetch(`/admin/analytics/trend?weeks=${weeks}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setTrend(d))
      .catch(() => {})
      .finally(() => setTrendLoading(false));
  }, [weeks]);

  useEffect(() => {
    apiFetch("/admin/analytics/status-breakdown")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStatusData(d))
      .catch(() => {});

    apiFetch("/admin/analytics/participation?limit=10")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setParticipation(d))
      .catch(() => {});
  }, []);

  // ── Trend — line chart ───────────────────────────────────────────────────────
  const trendChart = (
    <ChartShell title="Activity Trend" subtitle={`Events held & volunteer signups — past ${weeks} weeks`}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {PERIODS.map((p) => (
          <button key={p.weeks} onClick={() => setWeeks(p.weeks)}
            style={{
              padding: "3px 12px", fontSize: 12, fontWeight: 600, borderRadius: 99,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              background: weeks === p.weeks ? "#1a1a1a" : "#f3f4f6",
              color:      weeks === p.weeks ? "#fff"    : "#6b7280",
              transition: "background 0.15s, color 0.15s",
            }}
          >{p.label}</button>
        ))}
      </div>
      {trendLoading || !trend ? <Skeleton /> : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              labelStyle={{ fontWeight: 700, color: "#374151" }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Line type="monotone" dataKey="events"  name="Events"   stroke={PURPLE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="signups" name="Signups"  stroke={TEAL}   strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartShell>
  );

  // ── Status breakdown — donut ─────────────────────────────────────────────────
  const total = statusData?.reduce((s, d) => s + d.count, 0) ?? 0;
  const statusChart = (
    <ChartShell title="Events by Status" subtitle="Current status distribution">
      {!statusData ? <Skeleton /> : (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={statusData} dataKey="count" nameKey="status"
                cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                paddingAngle={3} strokeWidth={0}
              >
                {statusData.map((d) => (
                  <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "#9ca3af"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                formatter={(v, name) => [`${v} (${total ? Math.round(Number(v) / total * 100) : 0}%)`, name]}
              />
            </PieChart>
          </ResponsiveContainer>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {statusData.map((d) => (
              <div key={d.status} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLORS[d.status] ?? "#9ca3af", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize", flex: 1 }}>{d.status}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{d.count}</span>
                <span style={{ fontSize: 11, color: "#9ca3af", width: 34, textAlign: "right" }}>
                  {total ? Math.round(d.count / total * 100) : 0}%
                </span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Total</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{total}</span>
            </div>
          </div>
        </div>
      )}
    </ChartShell>
  );

  // ── Participation rate — horizontal bar ───────────────────────────────────────
  const participationChart = (
    <ChartShell title="Volunteer Participation Rate" subtitle="Check-in rate for recent completed events (latest 10)">
      {!participation ? <Skeleton /> : participation.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "40px 0" }}>No completed events yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, participation.length * 38)}>
          <BarChart
            data={[...participation].reverse().map(d => ({ ...d, title: shortTitle(d.title) }))}
            layout="vertical"
            margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
            barSize={14}
          >
            <CartesianGrid horizontal={false} stroke="#f0f0f0" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false}
              tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="title" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} width={140} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              formatter={(v, _name, entry: any) =>
                [`${v}% (${entry.payload.attended}/${entry.payload.signups} checked in)`, "Participation"]
              }
            />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
              {[...participation].reverse().map((d, i) => (
                <Cell key={i} fill={rateColor(d.rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartShell>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {part !== "bottom" && (
        <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
          <div style={{ flex: 2, minWidth: 0 }}>{trendChart}</div>
          <div style={{ flex: 1, minWidth: 260 }}>{statusChart}</div>
        </div>
      )}
      {part !== "top" && participationChart}
    </div>
  );
}

"use client";

interface StatsCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  colorClass: string; // e.g. "lt-stat-card__icon--yellow"
}

export default function StatsCard({ icon, value, label, colorClass }: StatsCardProps) {
  return (
    <div className="lt-stat-card">
      <div className={`lt-stat-card__icon ${colorClass}`}>{icon}</div>
      <div className="lt-stat-card__value">{value.toLocaleString()}</div>
      <div className="lt-stat-card__label">{label}</div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { UpcomingEvent } from "@/app/dashboard/mockData";

interface UpcomingEventsTableProps {
  events: UpcomingEvent[];
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`lt-badge lt-badge--${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function UpcomingEventsTable({ events }: UpcomingEventsTableProps) {
  return (
    <div className="lt-panel">
      <h2 className="lt-section-title">Upcoming Events</h2>
      <table className="lt-table">
        <thead>
          <tr>
            <th>Location</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{event.title}</div>
                <div style={{ fontSize: 13, color: "var(--lt-text-muted)", marginTop: 2 }}>
                  {event.location}
                </div>
              </td>
              <td>{event.date}</td>
              <td>
                <StatusBadge status={event.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/events" className="lt-btn lt-btn--outline" style={{ width: "100%" }}>
          + Attend Event
        </Link>
      </div>
    </div>
  );
}

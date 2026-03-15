"use client";

import { useState } from "react";
import { UpcomingEvent } from "@/app/dashboard/mockData";
import EventModal from "./EventModal";

interface UpcomingEventsTableProps {
  events: UpcomingEvent[];
}

function RegisteredBadge({ registered }: { registered: boolean }) {
  if (registered) {
    return (
      <span className="lt-badge lt-badge--success" style={{ background: 'var(--lt-teal-light)', color: 'var(--lt-teal)' }}>
        Yes
      </span>
    );
  }
  return (
    <span className="lt-badge lt-badge--ghost" style={{ background: '#f0f0f0', color: 'var(--lt-text-secondary)' }}>
      No
    </span>
  );
}

export default function UpcomingEventsTable({ events }: UpcomingEventsTableProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <>
      <div className="lt-panel">
      <h2 className="lt-section-title">Upcoming Events</h2>
      <table className="lt-table">
        <thead>
          <tr>
            <th>Location</th>
            <th>Date</th>
            <th>Registered</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              onClick={() => setSelectedEventId(event.id)}
              style={{ cursor: "pointer" }}
              title="Click to view details"
            >
              <td>
                <div style={{ fontWeight: 600 }}>{event.title}</div>
                <div style={{ fontSize: 13, color: "var(--lt-text-muted)", marginTop: 2 }}>
                  {event.location}
                </div>
              </td>
              <td>{event.date}</td>
              <td>
                <RegisteredBadge registered={event.registered} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Event Modal Overlay */}
    {selectedEventId && (
      <EventModal
        eventId={selectedEventId}
        onClose={() => setSelectedEventId(null)}
      />
    )}
    </>
  );
}

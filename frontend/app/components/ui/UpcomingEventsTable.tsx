"use client";

import { useState } from "react";
import Link from "next/link";
import { UpcomingEvent } from "@/app/dashboard/mockData";
import EventModal from "./EventModal";

interface UpcomingEventsTableProps {
  events: UpcomingEvent[];
  onRegistrationChange?: (eventId: string, registered: boolean) => void;
}

export default function UpcomingEventsTable({ events, onRegistrationChange }: UpcomingEventsTableProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <>
      <div className="lt-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 className="lt-section-title" style={{ margin: 0 }}>My Upcoming Events</h2>
          <Link href="/events" style={{ fontSize: 13, color: "var(--lt-color-brand-primary)", fontWeight: 500, textDecoration: "none" }}>
            Browse all events →
          </Link>
        </div>
        {events.length === 0 ? (
          <p style={{ color: "var(--lt-text-muted)", fontSize: 14, margin: 0 }}>
            You have no upcoming events.{" "}
            <Link href="/events" style={{ color: "var(--lt-color-brand-primary)" }}>Browse events</Link> to sign up.
          </p>
        ) : (
          <table className="lt-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    {/* Event Modal Overlay */}
    {selectedEventId && (
      <EventModal
        eventId={selectedEventId}
        onClose={() => setSelectedEventId(null)}
        onRegistrationChange={onRegistrationChange}
      />
    )}
    </>
  );
}

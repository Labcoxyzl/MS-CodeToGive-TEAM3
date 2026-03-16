import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import type { ApiEvent, Event } from "@/app/types/event";
import { MOCK_EVENTS } from "@/app/mocks/events";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

function extractBorough(locationName: string | null): string {
  if (!locationName) return "Other";
  const lower = locationName.toLowerCase();
  if (lower.includes("brooklyn")) return "Brooklyn";
  if (lower.includes("manhattan")) return "Manhattan";
  if (lower.includes("queens")) return "Queens";
  if (lower.includes("bronx")) return "Bronx";
  if (lower.includes("staten island")) return "Staten Island";
  return "Other";
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  // Full ISO datetime: "2026-04-15T09:00:00" or "2026-04-15T09:00"
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  // Time-only: "09:00:00" or "09:00"
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function mapApiEvent(api: ApiEvent, joinedIds: Set<string>): Event {
  return {
    id: api.id,
    title: api.title,
    description: api.description,
    location: api.location_name ?? "",
    borough: extractBorough(api.location_name),
    date: api.date,
    startTime: formatTime(api.start_time),
    endTime: formatTime(api.end_time),
    coverImageUrl: undefined,
    volunteerLimit: api.volunteer_limit ?? undefined,
    registeredCount: api.current_signup_count,
    isRegistered: joinedIds.has(api.id),
    visibility: api.visibility,
    status: api.status,
    flyerLanguage: api.flyer_language,
    createdBy: api.event_leader_id,
  };
}

interface UseEventsReturn {
  events: Event[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updateEventRegistration: (id: string, registered: boolean) => void;
}

export function useEvents(): UseEventsReturn {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const updateEventRegistration = useCallback((id: string, registered: boolean) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== id) return ev;
        const delta = registered ? 1 : -1;
        return {
          ...ev,
          isRegistered: registered,
          registeredCount: Math.max(0, ev.registeredCount + delta),
        };
      })
    );
  }, []);

  useEffect(() => {
    if (USE_MOCK) {
      setEvents(MOCK_EVENTS);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [eventsRes, joinedRes] = await Promise.all([
          apiFetch("/api/v1/events/"),
          apiFetch("/api/v1/events/my/joined"),
        ]);

        if (!eventsRes.ok || !joinedRes.ok) {
          if (eventsRes.status === 401 || joinedRes.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to load events");
        }

        const [eventsData, joinedData]: [ApiEvent[], ApiEvent[]] = await Promise.all([
          eventsRes.json(),
          joinedRes.json(),
        ]);

        if (cancelled) return;

        const joinedIds = new Set<string>(
          Array.isArray(joinedData) ? joinedData.map((e) => e.id) : []
        );
        const mapped = Array.isArray(eventsData)
          ? eventsData.map((e) => mapApiEvent(e, joinedIds))
          : [];

        setEvents(mapped);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [router, tick]);

  return { events, loading, error, refresh, updateEventRegistration };
}

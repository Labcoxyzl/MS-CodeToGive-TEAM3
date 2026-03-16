import type { Event, FilterState } from "@/app/types/event";

function isThisWeek(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  const d = new Date(dateStr);
  return d >= sunday && d <= saturday;
}

function isThisMonth(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr);
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
}

export function filterEvents(events: Event[], filters: FilterState): Event[] {
  return events.filter((ev) => {
    // Tab filter
    if (filters.tab === "registered" && !ev.isRegistered) return false;

    // Search query
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase();
      const inTitle = ev.title.toLowerCase().includes(q);
      const inLocation = ev.location.toLowerCase().includes(q);
      const inDescription = ev.description.toLowerCase().includes(q);
      if (!inTitle && !inLocation && !inDescription) return false;
    }

    // Borough filter
    if (filters.borough && filters.borough !== "all") {
      if (ev.borough.toLowerCase() !== filters.borough.toLowerCase()) return false;
    }

    // Date range filter
    if (filters.dateRange === "week" && !isThisWeek(ev.date)) return false;
    if (filters.dateRange === "month" && !isThisMonth(ev.date)) return false;

    return true;
  });
}

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    '<mark class="searchHighlight">$1</mark>'
  );
}

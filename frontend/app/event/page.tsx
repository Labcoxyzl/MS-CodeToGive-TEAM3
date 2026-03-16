import { Suspense } from "react";
import EventsPageClient from "./EventsPageClient";
import EventCardSkeleton from "./components/EventCardSkeleton";

export default function EventPage() {
  return (
    <Suspense fallback={<EventCardSkeleton count={6} />}>
      <EventsPageClient />
    </Suspense>
  );
}

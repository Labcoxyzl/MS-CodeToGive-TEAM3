import type { Event } from "@/app/types/event";
import EventCard from "./EventCard";
import styles from "../events.module.css";

interface Props {
  events: Event[];
  searchQuery?: string;
  isPast?: boolean;
  onRegister: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  isLoadingId: string | null;
  indexOffset?: number;
}

export default function EventGrid({
  events,
  searchQuery,
  isPast,
  onRegister,
  onCancel,
  isLoadingId,
  indexOffset = 0,
}: Props) {
  return (
    <div className={styles.eventGrid}>
      {events.map((ev, i) => (
        <EventCard
          key={ev.id}
          event={ev}
          cardIndex={indexOffset + i}
          searchQuery={searchQuery}
          isPast={isPast}
          onRegister={onRegister}
          onCancel={onCancel}
          isLoadingId={isLoadingId}
        />
      ))}
    </div>
  );
}

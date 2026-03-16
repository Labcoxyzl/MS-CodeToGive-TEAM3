// Snake_case API response shape
export interface ApiEvent {
  id: string;
  title: string;
  description: string;
  event_leader_id: string;
  visibility: "public" | "private";
  status: "draft" | "upcoming" | "active" | "completed" | "cancelled";
  date: string;
  start_time: string;
  end_time: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  volunteer_limit: number | null;
  current_signup_count: number;
  flyer_language: string;
  flyer_url: string | null;
  shareable_link: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Frontend camelCase enriched shape
export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  borough: string;
  date: string;
  startTime: string;
  endTime: string;
  coverImageUrl?: string;
  volunteerLimit?: number;
  registeredCount: number;
  isRegistered: boolean;
  visibility: "public" | "private";
  status: string;
  flyerLanguage?: string;
  createdBy: string;
}

export interface FilterState {
  q: string;
  borough: string;
  dateRange: string;
  tab: string;
}

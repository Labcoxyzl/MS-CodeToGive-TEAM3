/* ── Synthetic data for dashboard ───────────────────────────────── */

export const MOCK_USER = {
  name: "Sarah Chen",
  initials: "SC",
  role: "Event Leader",
  email: "sarah.chen@example.com",
};

export const MOCK_STATS = {
  flyersDistributed: 142,
  eventsAttended: 8,
  upcomingEvents: 3,
  pointsEarned: 520,
};

export interface RecentEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  volunteersCount: number;
  imageGradient: string; // CSS gradient for the placeholder image card
}

export const MOCK_RECENT_EVENTS: RecentEvent[] = [
  {
    id: "evt-1",
    title: "Harlem Food Drive",
    date: "Mon 03/10",
    time: "10:00 AM",
    location: "Harlem, NY",
    volunteersCount: 12,
    imageGradient: "linear-gradient(135deg, #2E8B7A 0%, #6B46C1 100%)",
  },
  {
    id: "evt-2",
    title: "Brooklyn Pantry Outreach",
    date: "Sat 03/08",
    time: "9:00 AM",
    location: "Brooklyn, NY",
    volunteersCount: 8,
    imageGradient: "linear-gradient(135deg, #E86F51 0%, #FFC82E 100%)",
  },
  {
    id: "evt-3",
    title: "Queens Community Flyer Run",
    date: "Wed 03/05",
    time: "2:00 PM",
    location: "Queens, NY",
    volunteersCount: 15,
    imageGradient: "linear-gradient(135deg, #6B46C1 0%, #2E8B7A 100%)",
  },
  {
    id: "evt-4",
    title: "Bronx SNAP Awareness Walk",
    date: "Mon 03/03",
    time: "11:00 AM",
    location: "Bronx, NY",
    volunteersCount: 6,
    imageGradient: "linear-gradient(135deg, #FFC82E 0%, #E86F51 100%)",
  },
  {
    id: "evt-5",
    title: "Manhattan Resource Fair",
    date: "Fri 02/28",
    time: "1:00 PM",
    location: "Manhattan, NY",
    volunteersCount: 20,
    imageGradient: "linear-gradient(135deg, #2E8B7A 0%, #E86F51 100%)",
  },
];

export interface UpcomingEvent {
  id: string;
  title: string;
  location: string;
  date: string;
  registered: boolean;
}

export const MOCK_UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    id: "evt-u1",
    title: "East Village Flyering",
    location: "East Village, NY",
    date: "Mar 18, 2026",
    registered: false,
  },
  {
    id: "evt-u2",
    title: "Washington Heights Outreach",
    location: "Washington Heights, NY",
    date: "Mar 22, 2026",
    registered: true,
  },
  {
    id: "evt-u3",
    title: "Midtown Food Resource Drive",
    location: "Midtown, NY",
    date: "Mar 25, 2026",
    registered: false,
  },
];

export interface LeaderboardEntry {
  rank: number;
  name: string;
  initials: string;
  points: number;
}

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "Maria G.", initials: "MG", points: 1250 },
  { rank: 2, name: "James W.", initials: "JW", points: 1080 },
  { rank: 3, name: "Sarah C.", initials: "SC", points: 520 },
  { rank: 4, name: "Kevin L.", initials: "KL", points: 490 },
];

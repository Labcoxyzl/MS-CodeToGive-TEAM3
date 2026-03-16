'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Sidebar from '@/app/components/ui/Sidebar';
import dashStyles from '@/app/dashboard/dashboard.module.css';

const C = {
  yellow:      '#fecc0e',
  purple:      '#784cc5',
  purpleLight: '#f0e8f8',
  purpleMid:   '#5a37a8',
  teal:        '#2E8B7A',
  tealLight:   '#D3EFEA',
  coral:       '#E86F51',
  bg:          '#fef6df',
  blush:       '#f2d1be',
  blushLight:  '#fdf5ef',
  text:        '#2D2A26',
  textSec:     '#6B6560',
  textMuted:   '#9C9690',
  border:      '#e8d8cc',
  card:        '#fffdf7',
};

const TOP3 = [
  { rank: 2, name: 'Jordan M.', points: 820,  avatar: 'JM', color: C.teal   },
  { rank: 1, name: 'Alex T.',   points: 1240, avatar: 'AT', color: C.purple },
  { rank: 3, name: 'Sam R.',    points: 640,  avatar: 'SR', color: C.coral  },
];

const ALL = [
  { rank: 1, name: 'Alex T.',    xp: 1240, avatar: 'AT', color: C.purple },
  { rank: 2, name: 'Jordan M.',  xp: 820,  avatar: 'JM', color: C.teal   },
  { rank: 3, name: 'Sam R.',     xp: 640,  avatar: 'SR', color: C.coral  },
  { rank: 4, name: 'Casey L.',   xp: 580,  avatar: 'CL', color: C.teal   },
  { rank: 5, name: 'Morgan P.',  xp: 510,  avatar: 'MP', color: C.purple },
  { rank: 6, name: 'Riley K.',   xp: 470,  avatar: 'RK', color: C.coral  },
  { rank: 7, name: 'Taylor B.',  xp: 430,  avatar: 'TB', color: C.teal   },
];

const SPOTLIGHT = {
  name: 'Alex T.', role: 'Event Leader',
  location: 'Crown Heights, Brooklyn',
  events: 22, hours: 68, referred: 11,
  avatar: 'AT', color: C.purple,
};

const BADGES = [
  { label: 'First Event',     icon: '★', color: C.yellow,  earned: true  },
  { label: 'Team Player',     icon: '★', color: C.teal,    earned: true  },
  { label: 'Impact Maker',    icon: '★', color: C.purple,  earned: true  },
  { label: 'Super Volunteer', icon: '★', color: C.coral,   earned: false },
  { label: '10 Events',       icon: '★', color: C.yellow,  earned: false },
  { label: 'Community Hero',  icon: '★', color: C.purple,  earned: false },
];

const UPCOMING = [
  { date: 'Mon 03/16', title: 'Food Pantry Drive',  creator: 'Alex T.'   },
  { date: 'Mon 03/16', title: 'Community Clean-Up', creator: 'Jordan M.' },
  { date: 'Mon 03/16', title: 'Clothing Donation',  creator: 'Sam R.'    },
];

const PERIODS = ['All time', 'This month', 'This week'];

function Avatar({ initials, color, size = 40 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color === C.yellow ? C.text : 'white',
      fontSize: Math.round(size * 0.34), fontWeight: 700,
      letterSpacing: '0.5px', flexShrink: 0,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {initials}
    </div>
  );
}

function TrophyIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 10.5C5.5 10.5 3.5 8.5 3.5 6V2.5H12.5V6C12.5 8.5 10.5 10.5 8 10.5Z"
        stroke={color} strokeWidth="1.2" fill="none"/>
      <path d="M3.5 4H1.5C1.5 4 1 7 3.5 7" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M12.5 4H14.5C14.5 4 15 7 12.5 7" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="8" y1="10.5" x2="8" y2="13" stroke={color} strokeWidth="1.2"/>
      <line x1="5.5" y1="13" x2="10.5" y2="13" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function Badge({ color, earned, label }: { color: string; earned: boolean; label: string }) {
  const c = earned ? color : C.border;
  const textC = earned ? (color === C.yellow ? C.text : color) : C.textMuted;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      width: 72,
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: earned ? 1 : 0.35 }}>
        <polygon points="24,4 40,14 40,34 24,44 8,34 8,14"
          fill={earned ? color + '22' : '#f5f0ea'}
          stroke={c} strokeWidth="1.5"/>
        <polygon points="24,10 36,17 36,31 24,38 12,31 12,17"
          fill="none" stroke={c} strokeWidth="1" opacity="0.5"/>
        <text x="24" y="29" textAnchor="middle" fontSize="16" fontWeight="700"
          fill={c} fontFamily="'DM Sans', sans-serif">★</text>
      </svg>
      <span style={{
        fontSize: 10, fontWeight: 600, color: textC,
        textAlign: 'center', lineHeight: 1.3,
        fontFamily: "'DM Sans', sans-serif",
        maxWidth: 72,
      }}>{label}</span>
    </div>
  );
}

function Card({ accentColor, title, children, noPad }: {
  accentColor: string; title: string; children: React.ReactNode; noPad?: boolean;
}) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 6, overflow: 'hidden',
      borderLeft: `4px solid ${accentColor}`,
    }}>
      <div style={{
        padding: '12px 20px 10px',
        borderBottom: `1px solid ${C.border}`,
        background: C.blushLight,
      }}>
        <h2 style={{
          fontSize: 14, fontWeight: 700, color: C.text, margin: 0,
          textTransform: 'uppercase', letterSpacing: '0.8px',
          fontFamily: "'DM Sans', sans-serif",
        }}>{title}</h2>
      </div>
      <div style={noPad ? {} : { padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('All time');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userState, setUserState] = useState({ name: '', initials: '' });
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setUserLoading(true);
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.sub;
        
        const meta = payload?.user_metadata as Record<string, any> | undefined;
        if (meta?.name) {
          const name = meta.name;
          const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
          setUserState({ name, initials });
          setUserLoading(false);
        } else {
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (anonKey && supabaseUrl) {
            fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=name`, {
              headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${token}`
              }
            })
            .then(res => res.json())
            .then(data => {
              if (data?.[0]?.name) {
                const name = data[0].name;
                const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                setUserState({ name, initials });
              }
            })
            .finally(() => setUserLoading(false));
          } else {
            setUserLoading(false);
          }
        }
      } catch (e) {
        console.error("Error decoding token:", e);
        setUserLoading(false);
      }
    }
  }, []);

  return (
    <div className={dashStyles.dashboardShell}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={dashStyles.dashboardMain} style={{ background: C.bg, minHeight: '100vh' }}>
        {/* Header */}
        <header className={dashStyles.topBar}>
          <Link href="/" className="lt-header__logo">
            <span>
              <Image
                src="/logo.svg"
                alt="Lemontree Icon"
                width={32}
                height={32}
                priority
              />
              <Image
                src="/lemontree_text_logo.svg"
                alt="Lemontree"
                width={112}
                height={24}
                priority
              />
            </span>
          </Link>
          <Link href="/profile" className={dashStyles.topBarUser} style={{ textDecoration: "none", color: "inherit" }}>
            {userLoading ? (
              <div className="lt-spinner" style={{ width: 24, height: 24, borderTopColor: 'var(--lt-color-brand-primary)' }} />
            ) : (
              <>
                <div className="lt-avatar" style={{ border: "2px solid rgba(0,0,0,0.1)" }}>
                  {userState.initials || 'V'}
                </div>
                <span className="hidden sm:inline" style={{ fontSize: 14 }}>{userState.name || 'Volunteer'}</span>
              </>
            )}
          </Link>
        </header>

        {/* content area */}
        <div className={dashStyles.dashboardContent}>
          {/* Page title */}
          <div style={{ marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: C.text, letterSpacing: '-0.3px' }}>
              Community Leaderboard
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '4px 0 0' }}>
              Volunteers ranked by total impact points
            </p>
          </div>

          {/* Two-col grid — full width */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

            {/* ── LEFT ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <Card accentColor={C.purple} title="Rankings">
                {/* Period tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                  {PERIODS.map(p => (
                    <button key={p} type="button" onClick={() => setPeriod(p)} style={{
                      padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 4,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                      background: period === p ? C.purple : 'transparent',
                      color: period === p ? 'white' : C.textSec,
                      border: `1.5px solid ${period === p ? C.purple : C.border}`,
                    }}>{p}</button>
                  ))}
                </div>

                {/* Podium — #2 left, #1 centre (tallest), #3 right */}
                <div style={{
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  gap: 8, marginBottom: 24, paddingBottom: 20,
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {TOP3.map((v) => {
                    const isFirst = v.rank === 1;
                    const blockH = isFirst ? 88 : 64;
                    const avatarSz = isFirst ? 56 : 44;
                    return (
                      <div key={v.rank} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {isFirst && <TrophyIcon size={13} color={C.purple} />}
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: isFirst ? C.purple : C.textMuted,
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                          }}>#{v.rank}</span>
                        </div>
                        <Avatar initials={v.avatar} color={v.color} size={avatarSz} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{v.name}</span>
                        <div style={{
                          width: isFirst ? 96 : 80, height: blockH,
                          background: isFirst ? C.purple : C.blush,
                          borderRadius: '4px 4px 0 0',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 2,
                          border: `1px solid ${isFirst ? C.purpleMid : C.border}`,
                          borderBottom: 'none',
                        }}>
                          <span style={{
                            fontSize: isFirst ? 18 : 15, fontWeight: 800,
                            color: isFirst ? 'white' : C.text,
                          }}>{v.points.toLocaleString()}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 600,
                            color: isFirst ? 'rgba(255,255,255,0.75)' : C.textMuted,
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                          }}>pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Full list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {ALL.map((v, i) => (
                    <div key={v.rank} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '9px 10px', borderRadius: 4,
                      background: i % 2 === 0 ? C.blushLight : 'transparent',
                    }}>
                      <span style={{
                        width: 22, fontSize: 12, fontWeight: 700, textAlign: 'right',
                        color: v.rank <= 3 ? C.purple : C.textMuted, flexShrink: 0,
                      }}>#{v.rank}</span>
                      <Avatar initials={v.avatar} color={v.color} size={30} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>{v.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>{v.xp.toLocaleString()} XP</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: C.textMuted,
                        background: C.purpleLight, padding: '2px 8px', borderRadius: 3,
                        letterSpacing: '0.3px',
                      }}>Rank {v.rank}</span>
                    </div>
                  ))}
                </div>
              </Card>

            </div>

            {/* ── RIGHT ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Volunteer Spotlight */}
              <Card accentColor={C.teal} title="Volunteer Spotlight">
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  marginBottom: 16, padding: '12px 14px',
                  background: C.blushLight, border: `1px solid ${C.border}`,
                  borderRadius: 4,
                }}>
                  <Avatar initials={SPOTLIGHT.avatar} color={SPOTLIGHT.color} size={48} />
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.text }}>{SPOTLIGHT.name}</p>
                    <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>{SPOTLIGHT.role}</p>
                    <p style={{ fontSize: 11, color: C.textMuted, margin: '2px 0 0' }}>
                      {SPOTLIGHT.location}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Events',   value: SPOTLIGHT.events,   accent: C.purple },
                    { label: 'Hours',    value: SPOTLIGHT.hours,    accent: C.teal   },
                    { label: 'Referred', value: SPOTLIGHT.referred, accent: C.coral  },
                  ].map(s => (
                    <div key={s.label} style={{
                      padding: '12px 8px', textAlign: 'center',
                      background: C.blushLight, border: `1px solid ${C.border}`,
                      borderRadius: 4, borderTop: `3px solid ${s.accent}`,
                    }}>
                      <p style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>{s.value}</p>
                      <p style={{ fontSize: 10, color: C.textMuted, margin: '3px 0 0',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Badges Earned */}
              <Card accentColor={C.coral} title="Badges Earned">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px 8px',
                  justifyItems: 'center',
                }}>
                  {BADGES.map(b => (
                    <Badge key={b.label} color={b.color} earned={b.earned} label={b.label} />
                  ))}
                </div>
              </Card>

              {/* Make an impact */}
              <Card accentColor={C.purple} title="Make an Impact, Earn More XP">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {UPCOMING.map((ev, i) => (
                    <div key={i} style={{
                      borderRadius: 4, overflow: 'hidden',
                      border: `1px solid ${C.border}`,
                      background: C.blushLight,
                    }}>
                      <div style={{
                        height: 64, background: C.blush,
                        display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '8px 8px',
                      }}>
                        <span style={{
                          background: C.purple, color: 'white',
                          fontSize: 9, fontWeight: 700, padding: '3px 7px',
                          borderRadius: 3, letterSpacing: '0.3px',
                        }}>{ev.date}</span>
                      </div>
                      <div style={{ padding: '8px 10px' }}>
                        <p style={{
                          fontSize: 11, fontWeight: 700, color: C.text,
                          margin: '0 0 3px', lineHeight: 1.3,
                        }}>{ev.title}</p>
                        <p style={{ fontSize: 10, color: C.textMuted, margin: 0 }}>
                          By {ev.creator}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

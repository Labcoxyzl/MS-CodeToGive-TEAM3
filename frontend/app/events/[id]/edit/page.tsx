'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ChevronDown, Check, AlertCircle, X, ChevronLeft } from 'lucide-react';
import MapGL, { Marker, MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Sidebar from '@/app/components/ui/Sidebar';
import EventDatePicker from '@/app/components/ui/EventDatePicker';
import TimePicker from '@/app/components/ui/TimePicker';
import styles from '@/app/dashboard/dashboard.module.css';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  yellow:       '#fecc0e',
  teal:         '#2E8B7A',
  tealLight:    '#D3EFEA',
  purple:       '#784cc5',
  purpleLight:  '#ede5f7',
  coral:        '#E86F51',
  coralLight:   '#FDDDD6',
  bg:           '#fef6df',
  inputBg:      '#fdf0e8',
  inputBorder:  '#e0bfb0',
  text:         '#2D2A26',
  textSec:      '#6B6560',
  textMuted:    '#9C9690',
  border:       '#e8d8cc',
  tealCard:     '#f2d1be',
};

const LANGUAGES = ['English','Spanish','Chinese (Simplified)','Chinese (Traditional)','Bengali','Russian','Haitian Creole','Korean','Arabic','Urdu','Polish','Yiddish','French','Tagalog','Italian','Portuguese','Hindi','Japanese','Greek','Albanian','Other'];
const FLYER_LANG_MAP: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese',
  it: 'Italian', pl: 'Polish', ht: 'Haitian Creole', tl: 'Tagalog',
};

const IB: React.CSSProperties = {
  width:'100%', padding:'10px 13px', fontSize:'14px',
  fontFamily:'var(--font-dm-sans)', color: C.text,
  background: '#fdf0e8', borderWidth: '2px', borderStyle: 'solid', borderColor: '#e0bfb0',
  borderRadius:'5px', outline:'none', boxSizing:'border-box' as const,
  transition:'border-color 0.15s, box-shadow 0.15s',
};
const IF: React.CSSProperties = { borderColor: C.purple, boxShadow:'0 0 0 3px rgba(107,70,193,0.15)', background:'#EDE5F7' };

function FInput(p: React.InputHTMLAttributes<HTMLInputElement> & { xStyle?: React.CSSProperties }) {
  const [f,setF] = useState(false);
  const { xStyle, ...rest } = p;
  return <input {...rest} style={{...IB,...(f?IF:{}),...xStyle}} onFocus={()=>setF(true)} onBlur={()=>setF(false)} />;
}
function FTextarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [f,setF] = useState(false);
  return <textarea {...p} style={{...IB,minHeight:'130px',lineHeight:'1.6',resize:'vertical',...(f?IF:{})}} onFocus={()=>setF(true)} onBlur={()=>setF(false)} />;
}

function Dropdown({ value, onChange, placeholder, options }: {
  value: string; onChange: (v:string)=>void; placeholder: string;
  options: string[];
}) {
  const [open,setOpen] = useState(false);
  const [search,setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e:MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => { if (open) setTimeout(() => inp.current?.focus(), 40); }, [open]);

  const flat = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const pick = (v:string) => { onChange(v); setOpen(false); setSearch(''); };

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button type="button" onClick={() => setOpen(o=>!o)}
        style={{...IB, ...(open?IF:{}), display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', height:'42px', padding:'0 13px', overflow:'hidden'}}>
        <span style={{color: value ? C.text : '#a89bc7', fontSize: 14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0, flex:1}}>
          {value || placeholder}
        </span>
        <div style={{display:'flex',gap:4,flexShrink:0}}>
          {value && <X size={13} style={{color:'#9b7fd4'}} onClick={e=>{e.stopPropagation();onChange('');}} />}
          <ChevronDown size={13} style={{color:'#9b7fd4',transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}} />
        </div>
      </button>
      {open && (
        <div style={{position:'absolute',zIndex:50,width:'100%',marginTop:3,background:'white',
          border:`2px solid ${C.inputBorder}`,borderRadius:'55px',
          boxShadow:'0 8px 24px rgba(107,70,193,0.15)',overflow:'hidden'}}>
          <div style={{padding:8,borderBottom:`1px solid ${C.border}`}}>
            <input ref={inp} type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search…" style={{...IB,padding:'6px 10px',fontSize:13}} />
          </div>
          <ul style={{maxHeight:350,overflowY:'auto',margin:0,padding:0,listStyle:'none'}}>
            {flat.length===0 && <li style={{padding:'8px 16px',fontSize:13,color:C.textMuted}}>No results</li>}
            {flat.map(opt => (
              <button key={opt} type="button" onClick={() => pick(opt)}
                style={{width:'100%',textAlign:'left',padding:'8px 16px',fontSize:13,display:'block',borderWidth:0,cursor:'pointer',fontFamily:'var(--font-dm-sans)',
                  background:value===opt?'#ede5f7':'white', color:value===opt?'#784cc5':C.text, fontWeight:value===opt?600:400}}
                onMouseEnter={e=>{if(value!==opt)(e.currentTarget as HTMLElement).style.background='#F9F5FF';}}
                onMouseLeave={e=>{if(value!==opt)(e.currentTarget as HTMLElement).style.background='white';}}
              >{opt}</button>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Card({ accent, bg, title, children }: { accent:string; bg:string; title:string; children:React.ReactNode }) {
  return (
    <div style={{borderRadius:7,border:'1px solid rgba(0,0,0,0.07)',boxShadow:'0 1px 5px rgba(0,0,0,0.05)',height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:accent,padding:'9px 18px',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.8px',color:'white',flexShrink:0,borderTopLeftRadius:6,borderTopRightRadius:6}}>{title}</div>
      <div style={{background:bg,padding:'16px 18px',flex:1,borderBottomLeftRadius:6,borderBottomRightRadius:6}}>{children}</div>
    </div>
  );
}
function Field({ label, children, mb=14 }: { label:string; children:React.ReactNode; mb?:number }) {
  return (
    <div style={{marginBottom:mb}}>
      <label style={{display:'block',fontSize:13,fontWeight:600,color:C.text,marginBottom:5,fontFamily:'var(--font-dm-sans)'}}>{label}</label>
      {children}
    </div>
  );
}

interface Form {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  locationAddress: string;
  volunteers: string;
  flyerLanguage: string;
  visibility: 'public' | 'private';
}

const INIT: Form = {
  title: '', description: '', date: '', startTime: '', endTime: '',
  locationAddress: '', volunteers: '', flyerLanguage: '', visibility: 'private',
};

function getInitials(name: string) {
  if (!name) return 'V';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

function parseTime(t: string | null | undefined): string {
  if (!t) return '';
  const timePart = t.includes('T') ? t.split('T')[1] : t;
  return timePart.slice(0, 5); // "HH:MM"
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const [form, setForm] = useState<Form>(INIT);
  const [busy, setBusy] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [ok, setOk] = useState(false);
  const [geocodedCoords, setGeocodedCoords] = useState<{lat:number;lng:number}|null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userState, setUserState] = useState({ name: '', initials: '', role: '' });
  const [userLoading, setUserLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedMapResource, setSelectedMapResource] = useState<any>(null);
  const [loadingMapResource, setLoadingMapResource] = useState(false);

  const [locationSuggestions, setLocationSuggestions] = useState<{display_name:string;lat:string;lon:string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const suggestionWrapRef = useRef<HTMLDivElement>(null);

  const mapRef = useRef<MapRef>(null);
  const [mapMarkers, setMapMarkers] = useState<{id:string;lng:number;lat:number;type:string}[]>([]);
  const [viewState, setViewState] = useState({longitude:-73.9857,latitude:40.7128,zoom:12});

  const ch = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(p => ({...p, [name]: value}));
    setFieldErrors(prev => { const next = {...prev}; delete next[name]; return next; });
  };

  // Load user info
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) { router.push('/login'); return; }
        const payload = JSON.parse(atob(token.split('.')[1]));
        const meta = payload?.user_metadata as Record<string,unknown> | undefined;
        const name = typeof meta?.name === 'string' ? meta.name : 'Leader';
        setUserState({ name, initials: getInitials(name), role: String(payload?.role ?? '') });
      } catch { /* ignore */ }
      finally { setUserLoading(false); }
    })();
  }, [router]);

  // Load existing event data
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/events/${eventId}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        );
        if (!res.ok) { setErr('Failed to load event.'); return; }
        const ev = await res.json();
        document.title = `Edit: ${ev.title} — Lemontree Volunteers`;
        setForm({
          title:           ev.title ?? '',
          description:     ev.description ?? '',
          date:            ev.date ?? '',
          startTime:       parseTime(ev.start_time),
          endTime:         parseTime(ev.end_time),
          locationAddress: ev.location_name ?? '',
          volunteers:      ev.volunteer_limit != null ? String(ev.volunteer_limit) : '',
          flyerLanguage:   FLYER_LANG_MAP[ev.flyer_language] ?? '',
          visibility:      ev.visibility === 'public' ? 'public' : 'private',
        });
        if (ev.latitude && ev.longitude) {
          setGeocodedCoords({ lat: ev.latitude, lng: ev.longitude });
          setViewState(s => ({ ...s, longitude: ev.longitude, latitude: ev.latitude, zoom: 15 }));
        }
        // Pre-populate resource info if event has one
        if (ev.resource_id) {
          setLoadingMapResource(true);
          fetch(`https://platform.foodhelpline.org/api/resources/${ev.resource_id}`)
            .then(r => r.json())
            .then(raw => setSelectedMapResource(raw.json ?? raw))
            .catch(() => {})
            .finally(() => setLoadingMapResource(false));
        }
      } catch { setErr('Network error loading event.'); }
      finally { setLoadingEvent(false); }
    })();
  }, [eventId]);

  // Load initial map markers
  useEffect(() => {
    loadMarkers({minLng:-74.1,minLat:40.6,maxLng:-73.7,maxLat:40.9});
  }, []);

  // Fly to coords when address is picked
  useEffect(() => {
    if (geocodedCoords && mapRef.current) {
      mapRef.current.flyTo({center:[geocodedCoords.lng, geocodedCoords.lat], zoom:15});
    }
  }, [geocodedCoords]);

  function onAddressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setForm(p => ({...p, locationAddress: val}));
    setFieldErrors(prev => { const next = {...prev}; delete next.locationAddress; return next; });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setLocationSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5`,
          { headers: { 'User-Agent': 'lemontree-volunteer-app' } }
        );
        const data = await res.json();
        setLocationSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch { /* ignore */ }
    }, 300);
  }

  function pickSuggestion(s: {display_name:string;lat:string;lon:string}) {
    setForm(p => ({...p, locationAddress: s.display_name}));
    setGeocodedCoords({lat: parseFloat(s.lat), lng: parseFloat(s.lon)});
    setShowSuggestions(false);
    setLocationSuggestions([]);
  }

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (suggestionWrapRef.current && !suggestionWrapRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  async function loadMarkers(bounds: {minLng:number;minLat:number;maxLng:number;maxLat:number}) {
    try {
      const url = `https://platform.foodhelpline.org/api/resources/markersWithinBounds`
        + `?corner=${bounds.minLng},${bounds.minLat}&corner=${bounds.maxLng},${bounds.maxLat}`;
      const raw = await fetch(url).then(r => r.json());
      const fc = raw.features ? raw : raw.json;
      type GeoFeature = { geometry: { coordinates: number[] }; properties: { id: string; resourceTypeId: string } };
      setMapMarkers((fc?.features ?? [])
        .filter((f: GeoFeature) => f.geometry?.coordinates?.length >= 2)
        .map((f: GeoFeature) => ({
          id: f.properties.id,
          type: f.properties.resourceTypeId,
          lng: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
        })));
    } catch { /* ignore */ }
  }

  async function pickMarker(lng: number, lat: number, resourceId?: string) {
    setSelectedMapResource(null);
    setGeocodedCoords({lat, lng});
    setShowSuggestions(false);

    const [resourceResult] = await Promise.allSettled([
      resourceId
        ? fetch(`https://platform.foodhelpline.org/api/resources/${resourceId}`)
            .then(r => r.json())
            .then(raw => raw.json ?? raw)
        : Promise.resolve(null),
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'User-Agent': 'lemontree-volunteer-app' } }
      )
        .then(r => r.json())
        .then(d => { setForm(p => ({...p, locationAddress: d.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`})); })
        .catch(() => { setForm(p => ({...p, locationAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`})); }),
    ]);

    if (resourceResult.status === 'fulfilled' && resourceResult.value) {
      setSelectedMapResource(resourceResult.value);
    }
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Event title is required.';
    if (!form.date) {
      errors.date = 'Date is required.';
    }
    if (!form.startTime) errors.startTime = 'Start time is required.';
    if (!form.endTime) {
      errors.endTime = 'End time is required.';
    } else if (form.startTime && form.endTime <= form.startTime) {
      errors.endTime = 'End time must be after start time.';
    }
    if (!form.locationAddress.trim()) errors.locationAddress = 'Location is required.';
    if (form.volunteers.trim()) {
      const n = parseInt(form.volunteers, 10);
      if (isNaN(n) || n < 1) errors.volunteers = 'Volunteer limit must be a number ≥ 1.';
    }
    return errors;
  }

  async function submit() {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true); setErr(null);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) { router.push('/login'); return; }

      let latitude: number | null = geocodedCoords?.lat ?? null;
      let longitude: number | null = geocodedCoords?.lng ?? null;

      if (form.locationAddress.trim() && !geocodedCoords) {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.locationAddress)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'lemontree-volunteer-app' } }
        ).then(r => r.json()).catch(() => []);
        if (geo[0]) {
          latitude = parseFloat(geo[0].lat);
          longitude = parseFloat(geo[0].lon);
        }
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title:           form.title,
          description:     form.description,
          date:            form.date,
          start_time:      form.date && form.startTime ? `${form.date}T${form.startTime}:00` : undefined,
          end_time:        form.date && form.endTime   ? `${form.date}T${form.endTime}:00`   : undefined,
          location_name:   form.locationAddress || null,
          latitude,
          longitude,
          volunteer_limit: form.volunteers.trim() ? parseInt(form.volunteers) : null,
          visibility:      form.visibility,
          flyer_language:  ({
            'Spanish': 'es', 'French': 'fr', 'Portuguese': 'pt',
            'Italian': 'it', 'Polish': 'pl', 'Haitian Creole': 'ht', 'Tagalog': 'tl',
          } as Record<string,string>)[form.flyerLanguage] ?? 'en',
          resource_id:     selectedMapResource?.id ?? null,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.detail || `Error ${res.status}`); }
      setOk(true);
      window.scrollTo({top:0,behavior:'smooth'});
      setTimeout(() => router.push(`/events/${eventId}/manage`), 1500);
    } catch(e) { setErr(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  }

  if (userLoading || loadingEvent) {
    return (
      <div style={{ minHeight: '100vh', background: '#fef6df', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="lt-spinner" style={{ width: 48, height: 48, borderTopColor: '#784cc5' }} />
      </div>
    );
  }

  return (
    <div className={styles.dashboardShell}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.dashboardMain} style={{ background: '#fef6df', minHeight: '100vh' }}>
        {/* ── Top Bar ── */}
        <div className={styles.topBar}>
          <Link href="/" className="lt-header__logo">
            <span>
              <Image src="/logo.svg" alt="Lemontree Icon" width={32} height={32} priority />
              <Image src="/lemontree_text_logo.svg" alt="Lemontree" width={112} height={24} priority />
            </span>
          </Link>
          <button
            onClick={() => router.push('/profile')}
            className={styles.topBarUser}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <div className="lt-avatar" style={{ border: '2px solid rgba(0,0,0,0.1)' }}>{userState.initials || 'V'}</div>
            <span>{userState.name || 'Volunteer'}</span>
          </button>
        </div>

        <div className={styles.dashboardContent}>

          {/* Back link */}
          <Link
            href={`/events/${eventId}/manage`}
            style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:13, color:C.textSec, marginBottom:16, textDecoration:'none' }}
          >
            <ChevronLeft size={14} /> Back to Manage
          </Link>

          {/* Banners */}
          {ok && (
            <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10,padding:'11px 16px',borderRadius:5,fontSize:13,fontWeight:500,background:C.tealLight,color:C.teal,border:`1.5px solid ${C.teal}44`}}>
              <Check size={14}/><span>Event updated — redirecting…</span>
            </div>
          )}
          {err && (
            <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10,padding:'11px 16px',borderRadius:5,fontSize:13,fontWeight:500,background:'#FEF0EF',color:'#D63B2F',border:'1.5px solid rgba(214,59,47,0.25)'}}>
              <AlertCircle size={14}/><span>{err}</span>
              <button onClick={()=>setErr(null)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#D63B2F',opacity:.6}}><X size={13}/></button>
            </div>
          )}

          {/* ── Event Title ── */}
          <div style={{marginBottom:16,borderRadius:7,overflow:'hidden',border:'1px solid rgba(0,0,0,0.07)',boxShadow:'0 1px 5px rgba(0,0,0,0.05)'}}>
            <div style={{background:C.purple,padding:'9px 18px',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'white'}}>
              Event Title *
            </div>
            <div style={{background:C.tealCard,padding:'14px 18px'}}>
              <FInput type="text" name="title" value={form.title} onChange={ch}
                placeholder="e.g. Crown Heights Community Food Drive"
                xStyle={{fontSize:20,fontWeight:700,padding:'12px 14px',...(fieldErrors.title?{borderColor:'#D63B2F',boxShadow:'0 0 0 3px rgba(214,59,47,0.15)'}:{})}} />
              {fieldErrors.title && <p style={{color:'#D63B2F',fontSize:12,margin:'5px 0 0',fontWeight:500}}>{fieldErrors.title}</p>}
            </div>
          </div>

          {/* ── Two-col grid ── */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>

            {/* LEFT col */}
            <div style={{display:'flex',flexDirection:'column',gap:16}}>

              <Card accent={C.purple} bg={C.tealCard} title="About This Event">
                <Field label="Description" mb={0}>
                  <FTextarea name="description" value={form.description} onChange={ch}
                    placeholder="Tell volunteers what to expect, what to bring, and any other details…" />
                </Field>
              </Card>

              <Card accent={C.purple} bg={C.tealCard} title="Date & Time">
                <Field label="Date *">
                  <EventDatePicker
                    value={form.date}
                    onChange={(v) => setForm(f => ({ ...f, date: v }))}
                    hasError={!!fieldErrors.date}
                    disablePast={false}
                  />
                  {fieldErrors.date && <p style={{color:'#D63B2F',fontSize:12,margin:'5px 0 0',fontWeight:500}}>{fieldErrors.date}</p>}
                </Field>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <Field label="Start Time *" mb={0}>
                    <TimePicker
                      value={form.startTime}
                      onChange={(v) => setForm(f => ({ ...f, startTime: v }))}
                      hasError={!!fieldErrors.startTime}
                      placeholder="Start time"
                    />
                    {fieldErrors.startTime && <p style={{color:'#D63B2F',fontSize:12,margin:'5px 0 0',fontWeight:500}}>{fieldErrors.startTime}</p>}
                  </Field>
                  <Field label="End Time *" mb={0}>
                    <TimePicker
                      value={form.endTime}
                      onChange={(v) => setForm(f => ({ ...f, endTime: v }))}
                      hasError={!!fieldErrors.endTime}
                      placeholder="End time"
                      minTime={form.startTime}
                    />
                    {fieldErrors.endTime && <p style={{color:'#D63B2F',fontSize:12,margin:'5px 0 0',fontWeight:500}}>{fieldErrors.endTime}</p>}
                  </Field>
                </div>
              </Card>

              <Card accent={C.purple} bg={C.tealCard} title="Capacity">
                <Field label="Volunteer Limit" mb={0}>
                  <FInput type="number" name="volunteers" value={form.volunteers} onChange={ch}
                    min="1" placeholder="Leave blank for unlimited"
                    xStyle={fieldErrors.volunteers?{borderColor:'#D63B2F',boxShadow:'0 0 0 3px rgba(214,59,47,0.15)'}:{}} />
                  {fieldErrors.volunteers && <p style={{color:'#D63B2F',fontSize:12,margin:'5px 0 0',fontWeight:500}}>{fieldErrors.volunteers}</p>}
                </Field>
              </Card>

            </div>

            {/* RIGHT col */}
            <div style={{display:'flex',flexDirection:'column',gap:16}}>

              <Card accent={C.purple} bg={C.tealCard} title="Location">
                <Field label="Address *">
                  <div ref={suggestionWrapRef} style={{position:'relative'}}>
                    <FInput type="text" name="locationAddress" value={form.locationAddress}
                      onChange={onAddressChange} placeholder="e.g. 123 Main St, Brooklyn, NY"
                      autoComplete="off"
                      xStyle={fieldErrors.locationAddress?{borderColor:'#D63B2F',boxShadow:'0 0 0 3px rgba(214,59,47,0.15)'}:{}} />
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <ul style={{
                        position:'absolute',zIndex:100,width:'100%',marginTop:3,
                        background:'white',border:`2px solid ${C.inputBorder}`,borderRadius:5,
                        boxShadow:'0 8px 24px rgba(107,70,193,0.15)',
                        maxHeight:220,overflowY:'auto',margin:'3px 0 0',padding:0,listStyle:'none',
                      }}>
                        {locationSuggestions.map((s,i) => (
                          <li key={i}>
                            <button type="button" onMouseDown={()=>pickSuggestion(s)}
                              style={{width:'100%',textAlign:'left',padding:'8px 14px',fontSize:13,display:'block',borderWidth:0,cursor:'pointer',fontFamily:'var(--font-dm-sans)',background:'white',color:C.text}}
                              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#F9F5FF';}}
                              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='white';}}
                            >{s.display_name}</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {fieldErrors.locationAddress && <p style={{color:'#D63B2F',fontSize:12,margin:'5px 0 0',fontWeight:500}}>{fieldErrors.locationAddress}</p>}
                </Field>
                <div style={{position:'relative',width:'100%',height:250,borderRadius:5,border:`2px solid ${C.inputBorder}`,overflow:'hidden'}}>
                  <MapGL
                    ref={mapRef}
                    mapLib={maplibregl}
                    {...viewState}
                    onMove={e => setViewState(e.viewState)}
                    onMoveEnd={e => {
                      const b = e.target.getBounds();
                      loadMarkers({minLng:b.getWest(),minLat:b.getSouth(),maxLng:b.getEast(),maxLat:b.getNorth()});
                    }}
                    style={{width:'100%',height:'100%'}}
                    mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                  >
                    {mapMarkers.map(m => (
                      <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
                        <div
                          onClick={() => pickMarker(m.lng, m.lat, m.id)}
                          title={`${m.type==='SOUP_KITCHEN'?'Soup Kitchen':'Food Pantry'} — click to select`}
                          style={{width:14,height:14,borderRadius:'50%',border:'2px solid white',background:m.type==='SOUP_KITCHEN'?'#E86F51':'#6942b5',boxShadow:'0 1px 4px rgba(0,0,0,0.4)',cursor:'pointer'}}
                          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1.6)';}}
                          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)';}}
                        />
                      </Marker>
                    ))}
                    {geocodedCoords && (
                      <Marker longitude={geocodedCoords.lng} latitude={geocodedCoords.lat} anchor="center">
                        <div style={{width:18,height:18,borderRadius:'50%',border:'3px solid white',background:C.teal,boxShadow:'0 2px 8px rgba(0,0,0,0.5)'}} title="Event location" />
                      </Marker>
                    )}
                  </MapGL>
                  {!geocodedCoords && (
                    <div style={{position:'absolute',bottom:8,left:0,right:0,display:'flex',justifyContent:'center',pointerEvents:'none'}}>
                      <span style={{background:'rgba(255,255,255,0.88)',color:C.textMuted,fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:4}}>
                        Type an address or click a dot to select a location
                      </span>
                    </div>
                  )}
                </div>

                {/* Selected resource info panel */}
                {(loadingMapResource || selectedMapResource) && (
                  <div style={{marginTop:10,padding:'12px 14px',background:'white',borderRadius:6,border:`1.5px solid ${C.inputBorder}`,boxShadow:'0 2px 8px rgba(0,0,0,0.07)',position:'relative'}}>
                    <button
                      type="button"
                      onClick={() => setSelectedMapResource(null)}
                      style={{position:'absolute',top:8,right:10,background:'none',border:'none',fontSize:15,cursor:'pointer',color:'#999',lineHeight:1}}
                    >✕</button>
                    {loadingMapResource ? (
                      <div style={{display:'flex',justifyContent:'center',padding:'8px 0'}}>
                        <div className="lt-spinner" style={{width:24,height:24,borderTopColor:C.purple}} />
                      </div>
                    ) : (
                      <>
                        <div style={{marginBottom:6}}>
                          <span style={{
                            fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:0.5,
                            padding:'2px 8px',borderRadius:99,
                            background: selectedMapResource?.resourceType?.id === 'SOUP_KITCHEN' ? '#fde8e2' : '#ede5f7',
                            color:       selectedMapResource?.resourceType?.id === 'SOUP_KITCHEN' ? '#fd5839' : C.purple,
                          }}>
                            {selectedMapResource?.resourceType?.name ?? 'Food Resource'}
                          </span>
                        </div>
                        <p style={{fontSize:14,fontWeight:700,color:C.text,margin:'0 0 4px'}}>
                          {selectedMapResource?.name ?? 'Selected Resource'}
                        </p>
                        {(selectedMapResource?.addressStreet1 || selectedMapResource?.city) && (
                          <p style={{fontSize:12,color:C.textSec,margin:0}}>
                            {[selectedMapResource?.addressStreet1, selectedMapResource?.city, selectedMapResource?.state]
                              .filter(Boolean).join(', ')}
                          </p>
                        )}
                        {selectedMapResource?.contacts?.[0]?.phone && (
                          <p style={{fontSize:12,color:C.textSec,margin:'3px 0 0'}}>
                            {selectedMapResource.contacts[0].phone}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </Card>

              <Card accent={C.purple} bg={C.tealCard} title="Flyer">
                <Field label="Flyer Language" mb={0}>
                  <Dropdown value={form.flyerLanguage} onChange={v=>setForm(p=>({...p,flyerLanguage:v}))}
                    placeholder="Select a language…" options={LANGUAGES} />
                </Field>
              </Card>

              <Card accent={C.purple} bg={C.tealCard} title="Visibility">
                <div style={{display:'flex',gap:10,marginBottom:10}}>
                  {(['Public','Private'] as const).map(opt => {
                    const val = opt.toLowerCase() as 'public' | 'private';
                    const active = form.visibility === val;
                    return (
                      <button key={opt} type="button" onClick={()=>setForm(p=>({...p,visibility:val}))}
                        style={{flex:1,padding:'10px',fontSize:13,fontWeight:700,fontFamily:'var(--font-dm-sans)',
                          borderRadius:5,cursor:'pointer',transition:'all 0.15s',
                          background:active?C.purple:C.inputBg,color:active?'white':'#9b7fd4',
                          border:`2px solid ${active?C.purple:C.inputBorder}`}}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <p style={{fontSize:12,color:C.textMuted,lineHeight:1.5,margin:0}}>
                  {form.visibility === 'private'
                    ? 'Only people with the link can see and join this event.'
                    : 'This event appears publicly on lemontree for anyone to discover.'}
                </p>
              </Card>

            </div>
          </div>

          {/* ── Submit ── */}
          <div style={{display:'flex',justifyContent:'flex-end',gap:12,marginTop:20}}>
            <Link
              href={`/events/${eventId}/manage`}
              style={{padding:'13px 24px',fontSize:15,fontWeight:700,fontFamily:'var(--font-dm-sans)',background:'transparent',color:C.textSec,border:`2px solid ${C.border}`,borderRadius:5,textDecoration:'none',display:'inline-flex',alignItems:'center'}}
            >
              Cancel
            </Link>
            <button type="button" onClick={submit} disabled={busy} style={{
              padding:'13px 36px',fontSize:15,fontWeight:700,fontFamily:'var(--font-dm-sans)',
              background:C.teal,color:'white',border:'none',borderRadius:5,
              cursor:busy?'not-allowed':'pointer',opacity:busy?0.65:1,
              display:'flex',alignItems:'center',gap:8,
              boxShadow:`0 4px 14px ${C.teal}55`,transition:'all 0.2s',
            }}>
              {busy ? <><span className="lt-spinner"/>Saving…</> : 'Save Changes →'}
            </button>
          </div>

        </div>
      </div>

      <button className="lt-sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
    </div>
  );
}

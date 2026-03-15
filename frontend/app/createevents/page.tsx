'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, ChevronDown, Check, AlertCircle, X } from 'lucide-react';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  yellow:       '#fecc0e',
  teal:         '#2E8B7A',
  tealLight:    '#D3EFEA',
  purple:       '#784cc5',   // from palette screenshot
  purpleLight:  '#ede5f7',
  coral:        '#E86F51',
  coralLight:   '#FDDDD6',
  bg:           '#fef6df',   // cream from palette
  inputBg:      '#fdf0e8',   // blush-tinted input
  inputBorder:  '#e0bfb0',   // blush border
  text:         '#2D2A26',
  textSec:      '#6B6560',
  textMuted:    '#9C9690',
  border:       '#e8d8cc',   // blush border
  tealCard:     '#f2d1be',   // blush card body from palette
  purpleCard:   '#f2d1be',
  coralCard:    '#f2d1be',
  neutralCard:  '#f2d1be',
};

// ─── Data ──────────────────────────────────────────────────────────────────────
const BOROUGHS: Record<string, string[]> = {
  Manhattan:     ['Battery Park City','Chelsea','Chinatown','East Harlem','East Village','Financial District','Flatiron','Greenwich Village','Harlem',"Hell's Kitchen",'Inwood','Kips Bay','Little Italy','Lower East Side','Midtown','Morningside Heights','Murray Hill','NoHo','NoLita','Roosevelt Island','SoHo','Sutton Place','Tribeca','Two Bridges','Upper East Side','Upper West Side','Washington Heights','West Village','Yorkville'],
  Brooklyn:      ['Bay Ridge','Bedford-Stuyvesant','Bensonhurst','Borough Park','Brighton Beach','Brownsville','Bushwick','Carroll Gardens','Clinton Hill','Cobble Hill','Coney Island','Crown Heights','DUMBO','Dyker Heights','East Flatbush','East New York','Flatbush','Flatlands','Fort Greene','Gowanus','Gravesend','Greenpoint','Kensington','Marine Park','Park Slope','Prospect Heights','Prospect Lefferts Gardens','Red Hook','Sheepshead Bay','Sunset Park','Williamsburg','Windsor Terrace'],
  Queens:        ['Astoria','Bayside','Corona','Elmhurst','Flushing','Forest Hills','Fresh Meadows','Howard Beach','Jackson Heights','Jamaica','Kew Gardens','Long Island City','Maspeth','Middle Village','Ozone Park','Rego Park','Richmond Hill','Ridgewood','Rockaway Beach','South Ozone Park','Springfield Gardens','Sunnyside','Whitestone','Woodhaven','Woodside'],
  Bronx:         ['Bathgate','Bedford Park','Belmont','City Island','Co-op City','East Tremont','Fordham','Grand Concourse','Highbridge','Hunts Point','Kingsbridge','Melrose','Morrisania','Mott Haven','Norwood','Pelham Bay','Riverdale','Soundview','South Bronx','Throggs Neck','University Heights','Wakefield','Williamsbridge'],
  'Staten Island':['Annadale','Arden Heights','Castleton Corners','Clifton','Dongan Hills','Grasmere','Great Kills','Mariners Harbor','New Brighton','New Dorp','Port Richmond','Rossville','St. George','Stapleton','Tottenville'],
  Other:         ['Other'],
};
const ALL_NEIGHBORHOODS = Object.entries(BOROUGHS).flatMap(([g, hs]) => hs.map(h => ({ label: h, group: g })));
const LANGUAGES = ['English','Spanish','Chinese (Simplified)','Chinese (Traditional)','Bengali','Russian','Haitian Creole','Korean','Arabic','Urdu','Polish','Yiddish','French','Tagalog','Italian','Portuguese','Hindi','Japanese','Greek','Albanian','Other'];
const VOL_OPTIONS = ['5','10','15','20','25','30','40','50','Unlimited'];
const COORDS: Record<string, [number, number]> = {
  'Bedford-Stuyvesant':[-73.9444,40.6872],'Williamsburg':[-73.9517,40.7081],'Bushwick':[-73.9196,40.6940],
  'Crown Heights':[-73.9421,40.6681],'Flatbush':[-73.9574,40.6501],'East New York':[-73.8830,40.6501],
  'Brownsville':[-73.9127,40.6629],'Harlem':[-73.9442,40.8116],'East Harlem':[-73.9368,40.7957],
  'Mott Haven':[-73.9216,40.8090],'Hunts Point':[-73.8896,40.8160],'Astoria':[-73.9301,40.7721],
  'Jackson Heights':[-73.8830,40.7557],'Flushing':[-73.8330,40.7677],'Jamaica':[-73.8025,40.6982],
  'Sunset Park':[-74.0059,40.6459],'Bay Ridge':[-74.0282,40.6351],'Park Slope':[-73.9774,40.6712],
  'Prospect Heights':[-73.9658,40.6773],'Red Hook':[-74.0087,40.6757],'Greenpoint':[-73.9543,40.7307],
  'Long Island City':[-73.9442,40.7447],'Washington Heights':[-73.9377,40.8448],'Chelsea':[-74.0014,40.7465],
  'Midtown':[-73.9857,40.7549],'Lower East Side':[-73.9879,40.7157],'Chinatown':[-73.9973,40.7158],
  'Tribeca':[-74.0117,40.7195],'SoHo':[-74.0023,40.7234],'Financial District':[-74.0099,40.7074],
  'Upper East Side':[-73.9567,40.7736],'Upper West Side':[-73.9812,40.7870],'Fort Greene':[-73.9741,40.6890],
  'Clinton Hill':[-73.9656,40.6883],'DUMBO':[-73.9889,40.7033],
};

// ─── Input helpers ─────────────────────────────────────────────────────────────
const IB: React.CSSProperties = {
  width:'100%', padding:'10px 13px', fontSize:'14px',
  fontFamily:'var(--font-dm-sans)', color: C.text,
  background: '#fdf0e8', border:'2px solid #e0bfb0',
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

// ─── Dropdown ──────────────────────────────────────────────────────────────────
function Dropdown({ value, onChange, placeholder, options, groupedOptions }: {
  value: string; onChange: (v:string)=>void; placeholder: string;
  options?: string[]; groupedOptions?: {label:string;group:string}[];
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

  const groups = groupedOptions
    ? Object.entries(groupedOptions.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
        .reduce<Record<string,string[]>>((a,{label,group}) => { (a[group]=a[group]||[]).push(label); return a; }, {}))
    : null;
  const flat = options?.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const pick = (v:string) => { onChange(v); setOpen(false); setSearch(''); };

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button type="button" onClick={() => setOpen(o=>!o)}
        style={{...IB, ...(open?IF:{}), display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', height:'42px', padding:'0 13px'}}>
        <span style={{color: value ? C.text : '#a89bc7', fontSize:14}}>{value || placeholder}</span>
        <div style={{display:'flex',gap:4}}>
          {value && <X size={13} style={{color:'#9b7fd4'}} onClick={e=>{e.stopPropagation();onChange('');}} />}
          <ChevronDown size={13} style={{color:'#9b7fd4',transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}} />
        </div>
      </button>
      {open && (
        <div style={{position:'absolute',zIndex:50,width:'100%',marginTop:3,background:'white',
          border:`2px solid ${C.inputBorder}`,borderRadius:'5px',
          boxShadow:'0 8px 24px rgba(107,70,193,0.15)',overflow:'hidden'}}>
          <div style={{padding:8,borderBottom:`1px solid ${C.border}`}}>
            <input ref={inp} type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search…" style={{...IB,padding:'6px 10px',fontSize:13}} />
          </div>
          <ul style={{maxHeight:210,overflowY:'auto',margin:0,padding:0,listStyle:'none'}}>
            {groups?.length===0 && <li style={{padding:'8px 16px',fontSize:13,color:C.textMuted}}>No results</li>}
            {groups?.map(([group,items]) => (
              <li key={group}>
                <div style={{padding:'6px 12px',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#784cc5',background:'#f2d1be'}}>{group}</div>
                {items.map(item => (
                  <button key={item} type="button" onClick={() => pick(item)}
                    style={{width:'100%',textAlign:'left',padding:'8px 16px',fontSize:13,display:'block',border:'none',cursor:'pointer',fontFamily:'var(--font-dm-sans)',
                      background:value===item?'#ede5f7':'white', color:value===item?'#784cc5':C.text, fontWeight:value===item?600:400}}
                    onMouseEnter={e=>{if(value!==item)(e.currentTarget as HTMLElement).style.background='#F9F5FF';}}
                    onMouseLeave={e=>{if(value!==item)(e.currentTarget as HTMLElement).style.background='white';}}
                  >{item}</button>
                ))}
              </li>
            ))}
            {flat?.length===0 && <li style={{padding:'8px 16px',fontSize:13,color:C.textMuted}}>No results</li>}
            {flat?.map(opt => (
              <button key={opt} type="button" onClick={() => pick(opt)}
                style={{width:'100%',textAlign:'left',padding:'8px 16px',fontSize:13,display:'block',border:'none',cursor:'pointer',fontFamily:'var(--font-dm-sans)',
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

// ─── Map ───────────────────────────────────────────────────────────────────────
function Map({ neighborhood }: { neighborhood: string }) {
  const [lng,lat] = (neighborhood && COORDS[neighborhood]) ? COORDS[neighborhood] : [-73.9857,40.7128];
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.025},${lat-0.018},${lng+0.025},${lat+0.018}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div style={{position:'relative',width:'100%',height:190,borderRadius:5,border:`2px solid ${C.inputBorder}`,overflow:'hidden'}}>
      <iframe key={src} src={src} width="100%" height="100%" style={{border:0}} title="map" loading="lazy" />
      {neighborhood
        ? <span style={{position:'absolute',bottom:8,left:8,background:C.purple,color:'white',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:4,boxShadow:'0 2px 6px rgba(0,0,0,0.2)'}}>{neighborhood}</span>
        : <div style={{position:'absolute',bottom:8,left:0,right:0,display:'flex',justifyContent:'center',pointerEvents:'none'}}>
            <span style={{background:'rgba(255,255,255,0.88)',color:C.textMuted,fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:4}}>Select a neighborhood to zoom in</span>
          </div>
      }
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────
function Card({ accent, bg, title, children }: { accent:string; bg:string; title:string; children:React.ReactNode }) {
  return (
    <div style={{borderRadius:7,overflow:'hidden',border:'1px solid rgba(0,0,0,0.07)',boxShadow:'0 1px 5px rgba(0,0,0,0.05)',height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:accent,padding:'9px 18px',fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.8px',color:'white',flexShrink:0}}>{title}</div>
      <div style={{background:bg,padding:'16px 18px',flex:1}}>{children}</div>
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

// ─── Hands banner ────────────────────────────────────────────────────────────────
function HandsBanner() {
  return (
    <div style={{
      width:'100vw', marginLeft:'calc(-50vw + 50%)',
      marginTop:40, background:'#fef6df',
      padding:'20px 0 0',
    }}>
      {/* Coral/orange arch — exactly matches hands image background #ff5838 */}
      <div style={{
        position:'relative',
        background:'#ff5838',
        borderRadius:'50% 50% 0 0 / 44px 44px 0 0',
        overflow:'hidden',
        display:'flex',
        alignItems:'flex-end',
        width:'100%',
        minHeight:260,
      }}>
        {/* Side-by-side: text left, hands right — no overlap */}
        <div style={{
          width:'100%',
          display:'flex',
          flexDirection:'row',
          alignItems:'flex-end',
          minHeight:360,
          position:'relative',
          zIndex:3,
          boxSizing:'border-box',
        }}>
          {/* Left: text — takes exactly half the space */}
          <div style={{
            flex:'1 1 0',
            minWidth:0,
            padding:'36px 24px 32px 64px',
            display:'flex',
            flexDirection:'column',
            justifyContent:'center',
            alignSelf:'center',
            boxSizing:'border-box',
          }}>
            <h2 style={{
              fontSize:34, fontWeight:800, color:'white',
              fontFamily:'var(--font-dm-sans)', margin:'0 0 16px 0',
              lineHeight:1.15, letterSpacing:'-0.5px',
            }}>
              Impact Starts With You.
            </h2>
            <p style={{
              fontSize:18, color:'rgba(255,255,255,0.92)',
              fontFamily:'var(--font-dm-sans)', margin:0, lineHeight:1.85,
              fontWeight:700,
            }}>
              Lemontree volunteers have turned collective action into $800,000
              of food for those in need. 1 in 8 of our neighbors still lacks
              reliable access to meals. Step up today and make a tangible
              difference.
            </p>
          </div>

          {/* Right: hands — takes exactly the other half, image contained fully */}
          <div style={{
            flex:'1 1 0',
            minWidth:0,
            display:'flex',
            alignItems:'flex-end',
            justifyContent:'center',
            alignSelf:'stretch',
            overflow:'hidden',
            boxSizing:'border-box',
          }}>
            <img
              src="/hands.png"
              alt="Diverse hands raised together"
              style={{
                display:'block',
                width:'100%',
                maxWidth:'100%',
                height:'auto',
                maxHeight:'360px',
                objectFit:'contain',
                objectPosition:'bottom center',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────
// ─── Types ─────────────────────────────────────────────────────────────────────
interface Form {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  neighborhood: string;   // used as location_name
  volunteers: string;
  flyerLanguage: string;
  visibility: 'public' | 'private';
  pantryMode: boolean;
}
const INIT: Form = {
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  neighborhood: '',
  volunteers: '',
  flyerLanguage: '',
  visibility: 'private',
  pantryMode: false,
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function CreateEventPage() {
  const [form, setForm]       = useState<Form>(INIT);
  const [copied, setCopied]   = useState(false);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string|null>(null);
  const [ok, setOk]           = useState(false);
  const [slug, setSlug]       = useState('');

  useEffect(() => {
    setSlug(form.title
      ? form.title.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').substring(0,40)
      : '');
  }, [form.title]);

  const shareLink = slug ? `foodhelpline.org/events/${slug}` : 'foodhelpline.org/events/your-event';

  const ch = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) =>
    setForm(p => ({...p, [e.target.name]: e.target.value}));

  const copy = useCallback(() => {
    const url = `https://${shareLink}`;
    navigator.clipboard?.writeText(url).catch(() => {
      const el = document.createElement('textarea');
      el.value = url; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    });
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  }, [shareLink]);

  async function submit() {
    if (!form.title.trim()) { setErr('Please add an event title.'); return; }
    setBusy(true); setErr(null);
    try {
      // Look up lat/lng for the selected neighborhood
      const coords = form.neighborhood && COORDS[form.neighborhood]
        ? COORDS[form.neighborhood]
        : null;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: attach auth token — e.g. Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title:           form.title,
          description:     form.description,
          date:            form.date,
          start_time:      form.startTime,
          end_time:        form.endTime,
          location_name:   form.neighborhood,
          lat:             coords ? coords[1] : null,
          lng:             coords ? coords[0] : null,
          volunteer_limit: form.volunteers && form.volunteers !== 'Unlimited'
                             ? parseInt(form.volunteers)
                             : null,
          visibility:      form.visibility,       // 'public' | 'private'
          flyer_language:  form.flyerLanguage || null,
          pantry_mode:     form.pantryMode,
          pantry_count:    null,                  // not collected in UI yet
          pantry_venue_id: null,                  // not collected in UI yet
        }),
      });
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.message||`Error ${res.status}`); }
      setOk(true); setForm(INIT); window.scrollTo({top:0,behavior:'smooth'});
    } catch(e) { setErr(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{minHeight:'100vh', background:'#fef6df', fontFamily:'var(--font-dm-sans)'}}>

      {/* ── Yellow header bar with real logo ── */}
      <header style={{background:'#fecc0e', height:60, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'0 24px', flexShrink:0}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <img src="/logo-icon.png" alt="lemontree"
            style={{width:46, height:46, borderRadius:'50%', objectFit:'cover', flexShrink:0}} />
          <img src="/logo-wordmark.svg" alt="lemontree"
            style={{height:33, width:'auto', filter:'brightness(0)', flexShrink:0}} />
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8, background:'rgba(45,42,38,0.12)',
          padding:'6px 14px', borderRadius:999, fontSize:12, fontWeight:600,
          textTransform:'uppercase', letterSpacing:'0.5px', color:'#2D2A26',
          fontFamily:'var(--font-dm-sans)'}}>
          <div style={{width:10, height:10, borderRadius:'50%', background:'#2D2A26', opacity:0.45}} />
          User
        </div>
      </header>

      {/* ── Sticky top bar — ONE logo only ── */}
      <div style={{position:'sticky',top:0,zIndex:20,
        background:'rgba(254,246,223,0.97)',backdropFilter:'blur(8px)',
        borderBottom:`1px solid ${C.border}`,padding:'10px 32px',
        display:'flex',alignItems:'center',justifyContent:'space-between'}}>

        {/* Page label */}
        <div style={{display:'flex',flexDirection:'column',gap:1}}>
          <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:C.purple,lineHeight:1}}>Create</span>
          <span style={{fontSize:17,fontWeight:700,color:C.text,lineHeight:1}}>New Event</span>
        </div>

        {/* Actions */}
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {['Save Draft','My Events'].map(label => (
            <button key={label} type="button" style={{
              padding:'8px 16px',fontSize:13,fontWeight:600,fontFamily:'var(--font-dm-sans)',
              background:'rgba(255,255,255,0.7)',color:C.textSec,
              border:`1.5px solid ${C.border}`,borderRadius:5,cursor:'pointer',whiteSpace:'nowrap',
            }}>{label}</button>
          ))}
          <button type="button" onClick={submit} disabled={busy} style={{
            padding:'9px 22px',fontSize:14,fontWeight:700,fontFamily:'var(--font-dm-sans)',
            background:C.teal,color:'white',border:'none',borderRadius:5,
            cursor:busy?'not-allowed':'pointer',opacity:busy?0.65:1,
            display:'flex',alignItems:'center',gap:7,
            boxShadow:`0 2px 10px ${C.teal}55`,whiteSpace:'nowrap',
          }}>
            {busy ? <><span className="lt-spinner" style={{width:14,height:14}}/>Creating…</> : 'Create Event'}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{maxWidth:1160,margin:'0 auto',padding:'22px 32px 0'}}>

        {/* Banners */}
        {ok && (
          <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10,padding:'11px 16px',borderRadius:5,fontSize:13,fontWeight:500,background:C.tealLight,color:C.teal,border:`1.5px solid ${C.teal}44`}}>
            <Check size={14}/><span>Event created — it's live!</span>
            <button onClick={()=>setOk(false)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:C.teal,opacity:.6}}><X size={13}/></button>
          </div>
        )}
        {err && (
          <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10,padding:'11px 16px',borderRadius:5,fontSize:13,fontWeight:500,background:'#FEF0EF',color:'#D63B2F',border:'1.5px solid rgba(214,59,47,0.25)'}}>
            <AlertCircle size={14}/><span>{err}</span>
            <button onClick={()=>setErr(null)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#D63B2F',opacity:.6}}><X size={13}/></button>
          </div>
        )}

        {/* ── Event Title — full width ── */}
        <div style={{marginBottom:16,borderRadius:7,overflow:'hidden',border:'1px solid rgba(0,0,0,0.07)',boxShadow:'0 1px 5px rgba(0,0,0,0.05)'}}>
          <div style={{background:C.purple,padding:'9px 18px',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'white'}}>
            Event Title *
          </div>
          <div style={{background:C.tealCard,padding:'14px 18px'}}>
            <FInput type="text" name="title" value={form.title} onChange={ch}
              placeholder="e.g. Crown Heights Community Food Drive"
              xStyle={{fontSize:20,fontWeight:700,padding:'12px 14px'}} />
          </div>
        </div>

        {/* ── Two-col grid — equal height rows ── */}
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
              <Field label="Date">
                <FInput type="date" name="date" value={form.date} onChange={ch} />
              </Field>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Field label="Start Time" mb={0}><FInput type="time" name="startTime" value={form.startTime} onChange={ch} /></Field>
                <Field label="End Time"   mb={0}><FInput type="time" name="endTime"   value={form.endTime}   onChange={ch} /></Field>
              </div>
            </Card>

            <Card accent={C.purple} bg={C.tealCard} title="Capacity">
              <Field label="Volunteer Limit" mb={0}>
                <Dropdown value={form.volunteers} onChange={v=>setForm(p=>({...p,volunteers:v}))}
                  placeholder="How many volunteers can sign up?" options={VOL_OPTIONS} />
              </Field>
            </Card>

          </div>

          {/* RIGHT col */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>

            <Card accent={C.purple} bg={C.tealCard} title="Location">
              <Field label="NYC Neighborhood">
                <Dropdown value={form.neighborhood} onChange={v=>setForm(p=>({...p,neighborhood:v}))}
                  placeholder="Pick a neighborhood…" groupedOptions={ALL_NEIGHBORHOODS} />
              </Field>
              <Map neighborhood={form.neighborhood} />
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
                  const active = (opt==='Private') === form.visibility === 'private';
                  return (
                    <button key={opt} type="button" onClick={()=>setForm(p=>({...p,isPrivate:opt==='Private'}))}
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

        {/* ── Shareable link — full width ── */}
        <div style={{marginTop:16,borderRadius:7,overflow:'hidden',border:'1px solid rgba(0,0,0,0.07)',boxShadow:'0 1px 5px rgba(0,0,0,0.05)'}}>
          <div style={{background:C.teal,padding:'9px 18px',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'white'}}>
            Shareable Link
          </div>
          <div style={{background:C.tealCard,padding:'14px 18px'}}>
            <p style={{fontSize:13,color:C.textSec,margin:'0 0 10px 0'}}>
              Share this with volunteers. The URL updates as you type your event title.
            </p>
            <div style={{display:'flex',gap:10}}>
              <div style={{flex:1,display:'flex',alignItems:'center',gap:8,background:C.inputBg,
                border:`2px solid ${C.inputBorder}`,borderRadius:5,padding:'0 14px',height:42,overflow:'hidden'}}>
                <span style={{fontSize:12,fontWeight:700,color:'#9b7fd4',flexShrink:0}}>https://</span>
                <span style={{fontSize:13,fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',
                  whiteSpace:'nowrap',color:slug?C.text:'#a89bc7'}}>{shareLink}</span>
              </div>
              <button type="button" onClick={copy} style={{
                height:42,padding:'0 20px',borderRadius:5,cursor:'pointer',
                fontSize:13,fontWeight:700,fontFamily:'var(--font-dm-sans)',
                display:'flex',alignItems:'center',gap:7,flexShrink:0,transition:'all 0.2s',
                background:copied?C.tealLight:C.purpleLight,
                color:copied?C.teal:C.purple,
                border:`2px solid ${copied?C.teal+'66':C.inputBorder}`,
              }}>
                {copied ? <><Check size={14}/>Copied!</> : <><Copy size={14}/>Copy Link</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Submit button ── */}
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:20}}>
          <button type="button" onClick={submit} disabled={busy} style={{
            padding:'13px 36px',fontSize:15,fontWeight:700,fontFamily:'var(--font-dm-sans)',
            background:C.teal,color:'white',border:'none',borderRadius:5,
            cursor:busy?'not-allowed':'pointer',opacity:busy?0.65:1,
            display:'flex',alignItems:'center',gap:8,
            boxShadow:`0 4px 14px ${C.teal}55`,transition:'all 0.2s',
          }}>
            {busy ? <><span className="lt-spinner"/>Creating Event…</> : 'Create Event →'}
          </button>
        </div>

        {/* ── Hands banner ── */}
        <HandsBanner />

      </div>
    </div>
  );
}

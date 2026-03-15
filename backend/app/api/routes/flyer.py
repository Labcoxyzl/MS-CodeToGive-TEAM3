"""Flyer generation route — produces a branded volunteer recruitment PDF."""
import base64
import io
from datetime import datetime
from pathlib import Path

import httpx
import qrcode
import weasyprint
from staticmap import CircleMarker, StaticMap
from fastapi import APIRouter, HTTPException, Response
from jinja2 import Environment, FileSystemLoader

from app.core.auth import CurrentUser
from app.core.config import settings
from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/flyer", tags=["flyer"])

_TEMPLATES_DIR = Path(__file__).resolve().parents[2] / "templates"
_ASSETS_DIR = Path(__file__).resolve().parents[4] / "assets"
_jinja_env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)), autoescape=True)


def _build_qr_b64(url: str) -> str:
    """Generate a QR code for *url* and return it as a base64-encoded PNG string."""
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _fmt_time(t: str) -> str:
    """Convert 'HH:MM:SS', 'HH:MM', or ISO datetime to '12-hr AM/PM' (e.g. '9:00 AM')."""
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(t, fmt).strftime("%-I:%M %p")
        except ValueError:
            continue
    # Handle ISO format: "2026-03-25T10:00:00+00:00"
    try:
        return datetime.fromisoformat(t).strftime("%-I:%M %p")
    except ValueError:
        return t


def _read_logo_svg() -> str:
    """Return the inline SVG markup for the Lemontree text logo."""
    svg_path = _ASSETS_DIR / "lemontree_text_logo.svg"
    try:
        return svg_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        # Graceful fallback: plain-text logo name
        return '<span style="font-size:32px;font-weight:700;color:#2E8B7A;">lemontree</span>'


def _read_lemon_svg() -> str:
    """Return the inline SVG markup for the Lemontree lemon icon."""
    svg_path = _ASSETS_DIR / "logo.svg"
    try:
        return svg_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


async def _fetch_nearby_markers(lat: float, lng: float, radius_deg: float = 0.02) -> list[dict]:
    """Fetch nearby food resource markers from the Lemontree markersWithinBounds API."""
    min_lng = lng - radius_deg
    min_lat = lat - radius_deg
    max_lng = lng + radius_deg
    max_lat = lat + radius_deg
    url = (
        "https://platform.foodhelpline.org/api/resources/markersWithinBounds"
        f"?corner={min_lng},{min_lat}&corner={max_lng},{max_lat}"
    )
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            raw = resp.json()
            # Response may be a GeoJSON FeatureCollection directly or superjson-wrapped
            fc = raw if raw.get("features") is not None else raw.get("json", {})
            features = fc.get("features") or []
            return [
                {
                    "type": f["properties"]["resourceTypeId"],
                    "lng": f["geometry"]["coordinates"][0],
                    "lat": f["geometry"]["coordinates"][1],
                }
                for f in features
                if f.get("geometry", {}).get("coordinates") and len(f["geometry"]["coordinates"]) >= 2
            ]
    except Exception:
        return []


_CARTO_TILES = "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"


def _add_marker(m: StaticMap, coord: tuple, color: str, diameter: int = 14) -> None:
    """Add a white-bordered circle marker by stacking a larger white circle beneath."""
    m.add_marker(CircleMarker(coord, "white", diameter + 4))
    m.add_marker(CircleMarker(coord, color, diameter))


def _add_event_marker(m: StaticMap, coord: tuple) -> None:
    """Add the teal event-location pin with a white border (matches frontend style)."""
    m.add_marker(CircleMarker(coord, "white", 24))
    m.add_marker(CircleMarker(coord, "#2E8B7A", 18))


async def _build_map_b64(lat: float, lng: float) -> str:
    """Render a static CartoDB Positron map centred on lat/lng with nearby food resource markers.

    Uses the same Lemontree markersWithinBounds API and colour scheme as the
    frontend welcome/event-creation maps:
      • purple  (#6942b5) — food pantry
      • orange  (#E86F51) — soup kitchen
    All markers have white borders to match the frontend MapLibre style.
    The event location is a larger teal (#2E8B7A) pin.
    Returns a base64-encoded PNG string, or '' on failure.
    """
    try:
        m = StaticMap(508, 300, url_template=_CARTO_TILES)

        # Fetch nearby resource markers (same API call as frontend)
        nearby = await _fetch_nearby_markers(lat, lng)

        # Add food resource markers (rendered first so the event pin sits on top)
        for resource in nearby[:80]:
            color = "#E86F51" if resource["type"] == "SOUP_KITCHEN" else "#6942b5"
            _add_marker(m, (resource["lng"], resource["lat"]), color)

        # Event location: teal pin with white border (matches frontend)
        _add_event_marker(m, (lng, lat))

        image = m.render(zoom=14)
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return ""


async def _reverse_geocode(lat: float, lng: float) -> str:
    """Return a human-readable address for lat/lng via Nominatim, or '' on failure."""
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"lat": lat, "lon": lng, "format": "json"}
    headers = {"User-Agent": "LemontreeVolunteerPlatform/1.0"}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            addr = data.get("address", {})
            parts = [
                addr.get("road") or addr.get("pedestrian"),
                addr.get("suburb") or addr.get("neighbourhood"),
                addr.get("city") or addr.get("town") or addr.get("village"),
                addr.get("state"),
            ]
            return ", ".join(p for p in parts if p)
    except Exception:
        return ""


@router.get("/{event_id}")
async def generate_flyer(event_id: str, current_user: CurrentUser):
    """Generate and return a volunteer recruitment flyer PDF for *event_id*."""

    # 1. Fetch event
    result = get_supabase_admin().table("events").select("*").eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")

    event = result.data[0]

    # 3. Require lat/lng (needed so the flyer represents a real, located event)
    if event.get("latitude") is None or event.get("longitude") is None:
        raise HTTPException(status_code=422, detail="Event must have a location (latitude/longitude) set")

    # 4. Build QR destination
    shareable_link = event.get("shareable_link") or f"/events/{event_id}"
    signup_url = f"{settings.frontend_url}{shareable_link}"

    # 5. Generate QR code
    qr_b64 = _build_qr_b64(signup_url)

    # 6. Read SVG logos
    logo_svg = _read_logo_svg()
    lemon_svg = _read_lemon_svg()

    # 7. Render HTML template
    start_fmt = _fmt_time(event.get("start_time", ""))
    end_fmt = _fmt_time(event.get("end_time", ""))

    location_display = event.get("location_name") or await _reverse_geocode(
        event["latitude"], event["longitude"]
    )

    map_b64 = await _build_map_b64(event["latitude"], event["longitude"])

    template = _jinja_env.get_template("flyer.html")
    html = template.render(
        event=event,
        qr_b64=qr_b64,
        logo_svg=logo_svg,
        lemon_svg=lemon_svg,
        signup_url=signup_url,
        start_time_fmt=start_fmt,
        end_time_fmt=end_fmt,
        location_display=location_display,
        map_b64=map_b64,
    )

    # 8. Convert to PDF
    pdf_bytes = weasyprint.HTML(string=html).write_pdf()

    # 9. Return PDF response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="flyer-{event_id}.pdf"'},
    )

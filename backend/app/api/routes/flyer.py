"""Flyer generation route — produces a branded volunteer recruitment PDF."""
import base64
import io
from pathlib import Path

import qrcode
import weasyprint
from fastapi import APIRouter, HTTPException, Response
from jinja2 import Environment, FileSystemLoader

from app.core.auth import CurrentUser
from app.core.config import settings
from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/flyer", tags=["flyer"])

_TEMPLATES_DIR = Path(__file__).resolve().parents[2] / "templates"
_ASSETS_DIR = Path(__file__).resolve().parents[5] / "assets"
_jinja_env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)), autoescape=True)


def _build_qr_b64(url: str) -> str:
    """Generate a QR code for *url* and return it as a base64-encoded PNG string."""
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _read_logo_svg() -> str:
    """Return the inline SVG markup for the Lemontree text logo."""
    svg_path = _ASSETS_DIR / "lemontree_text_logo.svg"
    try:
        return svg_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        # Graceful fallback: plain-text logo name
        return '<span style="font-size:32px;font-weight:700;color:#2E8B7A;">lemontree</span>'


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

    # 6. Read SVG logo
    logo_svg = _read_logo_svg()

    # 7. Render HTML template
    template = _jinja_env.get_template("flyer.html")
    html = template.render(event=event, qr_b64=qr_b64, logo_svg=logo_svg, signup_url=signup_url)

    # 8. Convert to PDF
    pdf_bytes = weasyprint.HTML(string=html).write_pdf()

    # 9. Return PDF response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="flyer-{event_id}.pdf"'},
    )

import math
import logging

from fastapi import APIRouter, Query
from fastapi.responses import Response
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/map", tags=["map"])


def _tile_coords(lat: float, lon: float, zoom: int) -> tuple[int, int]:
    """Convert lat/lon/zoom to OSM tile x/y."""
    lat_rad = math.radians(lat)
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


@router.get("")
async def static_map(
    lat: float = Query(...),
    lon: float = Query(...),
    zoom: int = Query(15),
    width: int = Query(300),
    height: int = Query(160),
):
    x, y = _tile_coords(lat, lon, zoom)
    url = f"https://tile.openstreetmap.org/{zoom}/{x}/{y}.png"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                headers={"User-Agent": "LemontreeApp/1.0"},
                timeout=10,
            )
    except httpx.ConnectError as exc:
        logger.warning("Map tile connect error for %s: %s", url, exc)
        return Response(status_code=502)

    if resp.status_code != 200:
        logger.warning("Upstream tile returned %s for %s", resp.status_code, url)
        return Response(status_code=502)

    return Response(
        content=resp.content,
        media_type=resp.headers.get("content-type", "image/png"),
        headers={"Cache-Control": "public, max-age=86400, stale-while-revalidate=3600"},
    )

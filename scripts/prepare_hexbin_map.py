from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

SOURCE = DATA_DIR / "viirs_sample_map.csv"
GEOJSON = DATA_DIR / "australia_states.geojson"
OUT = DATA_DIR / "fire_hexbin_map.json"

WIDTH = 760
HEIGHT = 420
CENTER_LON = 134.5
CENTER_LAT = -27.4
SCALE = 680
HEX_R = 13
HEX_DRAW_R = HEX_R * 0.76

STATE_ABBR = {
    "New South Wales": "NSW",
    "Northern Territory": "NT",
    "Queensland": "QLD",
    "South Australia": "SA",
    "Victoria": "VIC",
    "Western Australia": "WA",
}


def mercator_y(lat_rad: float) -> float:
    return math.log(math.tan(math.pi / 4 + lat_rad / 2))


def project(lon: float, lat: float) -> tuple[float, float]:
    lon_rad = math.radians(lon)
    lat_rad = math.radians(lat)
    center_lon_rad = math.radians(CENTER_LON)
    center_lat_rad = math.radians(CENTER_LAT)
    x = WIDTH / 2 + SCALE * (lon_rad - center_lon_rad)
    y = HEIGHT / 2 + SCALE * (mercator_y(center_lat_rad) - mercator_y(lat_rad))
    return x, y


def inverse_project(x: float, y: float) -> tuple[float, float]:
    center_lon_rad = math.radians(CENTER_LON)
    center_lat_rad = math.radians(CENTER_LAT)
    lon_rad = center_lon_rad + (x - WIDTH / 2) / SCALE
    lat_mercator = mercator_y(center_lat_rad) - (y - HEIGHT / 2) / SCALE
    lat_rad = 2 * math.atan(math.exp(lat_mercator)) - math.pi / 2
    return math.degrees(lon_rad), math.degrees(lat_rad)


def point_in_ring(lon: float, lat: float, ring: list[list[float]]) -> bool:
    inside = False
    j = len(ring) - 1
    for i, point in enumerate(ring):
        xi, yi = point[0], point[1]
        xj, yj = ring[j][0], ring[j][1]
        intersects = (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
        if intersects:
            inside = not inside
        j = i
    return inside


def containing_state(lon: float, lat: float, features: list[dict]) -> str | None:
    for feature in features:
        name = feature["properties"].get("STATE_NAME")
        abbr = STATE_ABBR.get(name)
        if not abbr:
            continue
        geometry = feature["geometry"]
        polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        for polygon in polygons:
            outer = polygon[0]
            holes = polygon[1:]
            if point_in_ring(lon, lat, outer) and not any(point_in_ring(lon, lat, hole) for hole in holes):
                return abbr
    return None


def pixel_to_axial(x: float, y: float, radius: float) -> tuple[int, int]:
    q = (math.sqrt(3) / 3 * x - 1 / 3 * y) / radius
    r = (2 / 3 * y) / radius
    return axial_round(q, r)


def axial_round(q: float, r: float) -> tuple[int, int]:
    x = q
    z = r
    y = -x - z
    rx = round(x)
    ry = round(y)
    rz = round(z)

    x_diff = abs(rx - x)
    y_diff = abs(ry - y)
    z_diff = abs(rz - z)

    if x_diff > y_diff and x_diff > z_diff:
        rx = -ry - rz
    elif y_diff > z_diff:
        ry = -rx - rz
    else:
        rz = -rx - ry

    return int(rx), int(rz)


def axial_to_pixel(q: int, r: int, radius: float) -> tuple[float, float]:
    x = radius * math.sqrt(3) * (q + r / 2)
    y = radius * 1.5 * r
    return x, y


def hex_path(cx: float, cy: float, radius: float) -> str:
    points = []
    for i in range(6):
        angle = math.radians(60 * i - 30)
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in points) + " Z"


def main() -> None:
    df = pd.read_csv(SOURCE)
    geo = json.loads(GEOJSON.read_text(encoding="utf-8"))
    features = geo["features"]
    bins: dict[tuple[int, int], dict[str, object]] = defaultdict(
        lambda: {"count": 0, "frp_sum": 0.0, "states": Counter(), "months": Counter()}
    )

    for row in df.to_dict("records"):
        x, y = project(float(row["longitude"]), float(row["latitude"]))
        if x < -HEX_R or x > WIDTH + HEX_R or y < -HEX_R or y > HEIGHT + HEX_R:
            continue
        key = pixel_to_axial(x, y, HEX_R)
        item = bins[key]
        item["count"] = int(item["count"]) + 1
        item["frp_sum"] = float(item["frp_sum"]) + float(row["frp"])
        item["states"][row["state"]] += 1
        item["months"][row["month"]] += 1

    records = []
    max_count = max(int(item["count"]) for item in bins.values())
    for (q, r), item in bins.items():
        cx, cy = axial_to_pixel(q, r, HEX_R)
        lon, lat = inverse_project(cx, cy)
        clipped_state = containing_state(lon, lat, features)
        if clipped_state is None:
            continue
        count = int(item["count"])
        month = item["months"].most_common(1)[0][0]
        records.append(
            {
                "q": q,
                "r": r,
                "x": round(cx, 2),
                "y": round(cy, 2),
                "path": hex_path(cx, cy, HEX_DRAW_R),
                "count": count,
                "avg_frp": round(float(item["frp_sum"]) / count, 1),
                "state": clipped_state,
                "month": month,
                "density_rank": round(count / max_count, 4),
            }
        )

    records.sort(key=lambda d: (d["y"], d["x"]))
    payload = {
        "meta": {
            "source": SOURCE.name,
            "projection": "Mercator screen-space hexbin",
            "width": WIDTH,
            "height": HEIGHT,
            "center": [CENTER_LON, CENTER_LAT],
            "scale": SCALE,
            "hex_radius_px": HEX_R,
            "draw_radius_px": round(HEX_DRAW_R, 2),
            "clip": "Bin centers are retained only when they fall inside the Australia state GeoJSON polygons.",
            "bins": len(records),
            "max_count": max_count,
        },
        "bins": records,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"- bins: {len(records)}")
    print(f"- max count: {max_count}")


if __name__ == "__main__":
    main()

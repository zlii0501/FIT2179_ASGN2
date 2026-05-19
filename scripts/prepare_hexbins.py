"""
Generate hexagonal bin GeoJSON from VIIRS fire data for the spatial bin map.
Outputs data/hex_bins.geojson and data/hex_bins_fine.geojson with all land bins,
including empty no-data bins.
"""
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
OUTDIR = ROOT / "data"
SOURCE = OUTDIR / "viirs_sample_map.csv"
GEOJSON = OUTDIR / "australia_states.geojson"

# At roughly 26S, longitude degrees are shorter than latitude degrees.
COS26 = math.cos(math.radians(26))

LON_MIN, LON_MAX = 112.0, 154.5
LAT_MIN, LAT_MAX = -44.5, -10.0

STATE_ABBR = {
    "New South Wales": "NSW",
    "Northern Territory": "NT",
    "Queensland": "QLD",
    "South Australia": "SA",
    "Victoria": "VIC",
    "Western Australia": "WA",
    "Tasmania": "TAS",
    "Australian Capital Territory": "NSW",
}


def ring_bounds(ring):
    xs = [point[0] for point in ring]
    ys = [point[1] for point in ring]
    return min(xs), min(ys), max(xs), max(ys)


def point_in_ring(lon, lat, ring):
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


def build_state_polygons(features):
    polygons = []
    for feature in features:
        state = STATE_ABBR.get(feature["properties"].get("STATE_NAME"))
        if not state:
            continue
        geometry = feature["geometry"]
        coordinates = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        for polygon in coordinates:
            outer = polygon[0]
            polygons.append(
                {
                    "state": state,
                    "outer": outer,
                    "holes": polygon[1:],
                    "bounds": ring_bounds(outer),
                }
            )
    return polygons


def containing_state(lon, lat, polygons):
    for polygon in polygons:
        min_x, min_y, max_x, max_y = polygon["bounds"]
        if lon < min_x or lon > max_x or lat < min_y or lat > max_y:
            continue
        if point_in_ring(lon, lat, polygon["outer"]) and not any(
            point_in_ring(lon, lat, hole) for hole in polygon["holes"]
        ):
            return polygon["state"]
    return None


def flat_top_verts(cx, cy, radius):
    radius_lat = radius / COS26
    vertices = []
    for i in range(5, -1, -1):
        angle = math.radians(60 * i)
        vertices.append([round(cx + radius * math.cos(angle), 4), round(cy + radius_lat * math.sin(angle), 4)])
    vertices.append(vertices[0])
    return vertices


def build_hex_features(df, state_polygons, radius, resolution):
    dx = radius * 1.5
    dy = radius * math.sqrt(3)
    half = dy / 2
    centers = []
    center_states = []
    col = 0
    lon = LON_MIN
    while lon <= LON_MAX + dx:
        lat = LAT_MIN + (half if col % 2 == 1 else 0)
        while lat <= LAT_MAX + dy:
            state = containing_state(lon, lat, state_polygons)
            if state:
                centers.append((lon, lat))
                center_states.append(state)
            lat += dy
        lon += dx
        col += 1

    centers = np.array(centers, dtype=np.float64)
    print(f"Generated {len(centers):,} {resolution} Australian land hex centers")

    pts = df[["longitude", "latitude"]].values.copy()
    pts[:, 0] *= COS26
    cen_s = centers.copy()
    cen_s[:, 0] *= COS26

    batch = 2000
    assignments = np.empty(len(pts), dtype=np.int32)
    for i in range(0, len(pts), batch):
        chunk = pts[i : i + batch]
        distances = np.sum((chunk[:, None, :] - cen_s[None, :, :]) ** 2, axis=2)
        assignments[i : i + batch] = np.argmin(distances, axis=1)

    stats = defaultdict(lambda: {"count": 0, "frp_sum": 0.0, "months": Counter()})
    for row, hex_id in zip(df.to_dict("records"), assignments):
        item = stats[int(hex_id)]
        item["count"] += 1
        item["frp_sum"] += float(row["frp"])
        item["months"][row["month"]] += 1

    max_count = max((item["count"] for item in stats.values()), default=0)
    features = []
    for hex_id, (lon_c, lat_c) in enumerate(centers):
        item = stats[hex_id]
        count = int(item["count"])
        avg_frp = round(item["frp_sum"] / count, 1) if count else None
        dominant_month = item["months"].most_common(1)[0][0] if count else None
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [flat_top_verts(lon_c, lat_c, radius)]},
                "properties": {
                    "count": count,
                    "state": center_states[hex_id],
                    "avg_frp": avg_frp,
                    "month": dominant_month,
                    "has_data": count > 0,
                    "density_rank": round(count / max_count, 4) if max_count else 0,
                    "resolution": resolution,
                    "lon": round(float(lon_c), 2),
                    "lat": round(float(lat_c), 2),
                },
            }
        )
    return features


def write_hex_file(out, features):
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, separators=(",", ":"))

    size_kb = out.stat().st_size / 1024
    print(f"Wrote {out} ({size_kb:.0f} KB, {len(features)} hexagons)")

    counts = pd.Series([feature["properties"]["count"] for feature in features])
    print("\nCount distribution")
    print(counts.describe().to_string())
    print("\nPer-state hex count")
    summary = pd.DataFrame(
        {
            "state": [feature["properties"]["state"] for feature in features],
            "count": [feature["properties"]["count"] for feature in features],
        }
    )
    print(summary.groupby("state")["count"].agg(["count", "sum", "max"]).to_string())


def main():
    df = pd.read_csv(SOURCE)
    states_geo = json.loads(GEOJSON.read_text(encoding="utf-8"))
    state_polygons = build_state_polygons(states_geo["features"])
    print(f"Loaded {len(df):,} VIIRS points")

    coarse_features = build_hex_features(df, state_polygons, radius=0.45, resolution="coarse")
    write_hex_file(OUTDIR / "hex_bins.geojson", coarse_features)

    fine_features = build_hex_features(df, state_polygons, radius=0.23, resolution="fine")
    write_hex_file(OUTDIR / "hex_bins_fine.geojson", fine_features)


if __name__ == "__main__":
    main()

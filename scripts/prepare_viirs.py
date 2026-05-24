"""
Prepare VIIRS 375m fire data for web visualisation.

Reads VIIRS archive CSVs directly from ZIP files, filters to
Black Summer (Aug 2019 – Jan 2020), assigns Australian states,
then applies spatial grid thinning to produce a ~2-5 MB web-ready CSV.

Outputs:
  data/viirs_sample_map.csv   — 3000-5000 points, stratified by month+state
  data/viirs_wa.csv           — WA-only subset (~800 pts) for the WA overlay
"""

import zipfile, io, sys
from pathlib import Path
import pandas as pd
import numpy as np

ROOT    = Path(__file__).resolve().parent.parent
OUTDIR  = ROOT / "data"
OUTDIR.mkdir(exist_ok=True)

ZIPS = [
    OUTDIR / "Fires from Space Australia.zip",
    OUTDIR / "Australian Bush fire satellite data (NASA).zip",
]

# VIIRS files: archive (Aug-Oct) + NRT (Oct-Jan)
VIIRS_FILES = [
    "fire_archive_V1_96617.csv",   # Aug–Oct 2019 (standard quality)
    "fire_archive_V1_101674.csv",  # Sep–Jan (standard quality, dedup with above)
    "fire_nrt_V1_96617.csv",       # Oct 2019 – Jan 2020 (NRT, has daynight column)
    "fire_nrt_V1_101674.csv",      # same period, second request
]

# ── Bounding box filter ───────────────────────────────────────────────────
AUS_BBOX = dict(lat_min=-44.0, lat_max=-10.0, lon_min=112.0, lon_max=154.0)
DATE_START = "2019-01-01"
DATE_END   = "2020-01-31"

# ── State assignment (bounding-box method, same as prepare_data.py) ───────
def assign_state(lat, lon):
    if   lat > -29 and lon > 129 and lon < 138: return "NT"   # top end
    elif lat > -20 and lon >= 138:               return "QLD"
    elif lat <= -20 and lat > -29 and lon >= 138: return "QLD"
    elif lat > -38 and lat <= -29 and lon > 148: return "NSW"
    elif lat <= -29 and lat > -37.5 and lon > 141 and lon <= 148: return "VIC" if lat < -34 else "NSW"
    elif lat <= -37.5 and lon > 141:             return "VIC"
    elif lat > -26 and lon >= 129 and lon < 138: return "SA" if lat < -30 else "NT"
    elif lon < 129 and lat > -35:                return "WA"
    elif lon < 141 and lat <= -26:               return "SA"
    elif lat <= -35 and lon < 141:               return "SA"
    else:                                        return "OTHER"

# ── Local solar time → day / night ───────────────────────────────────────
def day_night(acq_time_int, lon):
    utc_h = (acq_time_int // 100) + (acq_time_int % 100) / 60.0
    lst   = (utc_h + lon / 15.0) % 24
    return "D" if 6 <= lst < 18 else "N"

# ── Load & filter ─────────────────────────────────────────────────────────
frames = []
seen_files = set()

for zpath in ZIPS:
    if not zpath.exists():
        print(f"  [skip] {zpath.name} not found")
        continue
    with zipfile.ZipFile(zpath) as zf:
        for fname in VIIRS_FILES:
            if fname not in zf.namelist() or fname in seen_files:
                continue
            seen_files.add(fname)
            print(f"  reading {fname} from {zpath.name} …", end=" ", flush=True)
            with zf.open(fname) as f:
                df = pd.read_csv(io.TextIOWrapper(f, encoding="utf-8"), low_memory=False)
            print(f"{len(df):,} rows")

            # Rename to standard names
            df.columns = df.columns.str.strip().str.lower()

            # Filter bounding box
            df = df[
                (df.latitude  >= AUS_BBOX["lat_min"]) & (df.latitude  <= AUS_BBOX["lat_max"]) &
                (df.longitude >= AUS_BBOX["lon_min"]) & (df.longitude <= AUS_BBOX["lon_max"])
            ].copy()

            # Parse date, filter to season
            df["acq_date"] = pd.to_datetime(df["acq_date"])
            df = df[(df.acq_date >= DATE_START) & (df.acq_date <= DATE_END)]

            # Keep vegetation fires only (type 0) and nominal/high confidence
            if "type" in df.columns:
                df = df[df["type"] == 0]
            if "confidence" in df.columns:
                df = df[df["confidence"].isin(["n", "h", "nominal", "high"])]

            frames.append(df)
            print(f"    → after filter: {len(df):,} rows")

if not frames:
    sys.exit("No VIIRS archive files found in any ZIP.")

raw = pd.concat(frames, ignore_index=True)

# Drop exact lat/lon/date duplicates (both zips may overlap)
raw = raw.drop_duplicates(subset=["latitude", "longitude", "acq_date"])
print(f"\nTotal after dedup: {len(raw):,} rows")

# ── Derived columns ───────────────────────────────────────────────────────
raw["month"]    = raw["acq_date"].dt.to_period("M").astype(str)
raw["state"]    = [assign_state(la, lo) for la, lo in zip(raw.latitude, raw.longitude)]
# Use native daynight column from NRT files where available; compute for archive rows
if "daynight" not in raw.columns:
    raw["daynight"] = [day_night(int(t), lo) for t, lo in zip(raw.acq_time, raw.longitude)]
else:
    mask = raw["daynight"].isna() | (raw["daynight"] == "")
    raw.loc[mask, "daynight"] = [
        day_night(int(t), lo) for t, lo in zip(raw.loc[mask, "acq_time"], raw.loc[mask, "longitude"])
    ]
    # Normalise to single char D/N
    raw["daynight"] = raw["daynight"].str[0].str.upper().fillna("D")

# Drop non-AU
raw = raw[raw.state != "OTHER"]

# ── Spatial grid thinning ─────────────────────────────────────────────────
# Divide into 0.25° × 0.25° cells; keep at most MAX_PER_CELL per month
MAX_PER_CELL = 3

raw["cell_lat"] = (raw.latitude  / 0.25).astype(int)
raw["cell_lon"] = (raw.longitude / 0.25).astype(int)

thinned = (
    raw.groupby(["month", "state", "cell_lat", "cell_lon"], group_keys=False)
       .apply(lambda g: g.nlargest(MAX_PER_CELL, "frp"))   # keep highest FRP
       .reset_index(drop=True)
)
print(f"After spatial thinning (0.25° grid, max {MAX_PER_CELL}/cell/month): {len(thinned):,} rows")

# ── Further cap per month if still too large ──────────────────────────────
TARGET_TOTAL = 5000
if len(thinned) > TARGET_TOTAL:
    # Stratified sample: proportional to each month's count
    thinned = (
        thinned.groupby("month", group_keys=False)
               .apply(lambda g: g.sample(
                   min(len(g), max(1, int(TARGET_TOTAL * len(g) / len(thinned)))),
                   random_state=42
               ))
    )
    print(f"After month-stratified cap ({TARGET_TOTAL}): {len(thinned):,} rows")

# ── Select output columns ─────────────────────────────────────────────────
out_cols = ["latitude", "longitude", "frp", "acq_date", "month", "state", "daynight", "confidence"]
out_cols = [c for c in out_cols if c in thinned.columns]
out = thinned[out_cols].copy()
out["frp"] = out["frp"].round(1)
out = out.sort_values(["month", "state", "frp"], ascending=[True, True, False])

# ── Write full map sample ─────────────────────────────────────────────────
out_path = OUTDIR / "viirs_sample_map.csv"
out.to_csv(out_path, index=False)
print(f"\nWrote {out_path}  ({out_path.stat().st_size/1024:.0f} KB, {len(out):,} rows)")

# ── WA subset ─────────────────────────────────────────────────────────────
wa = raw[raw.state == "WA"].copy()

# Re-thin WA at 0.15° grid for finer detail
wa["cell_lat"] = (wa.latitude  / 0.15).astype(int)
wa["cell_lon"] = (wa.longitude / 0.15).astype(int)
wa_thin = (
    wa.groupby(["month", "cell_lat", "cell_lon"], group_keys=False)
      .apply(lambda g: g.nlargest(2, "frp"))
      .reset_index(drop=True)
)
if len(wa_thin) > 1200:
    wa_thin = (
        wa_thin.groupby("month", group_keys=False)
               .apply(lambda g: g.sample(min(len(g), 240), random_state=42))
    )

wa_out = wa_thin[out_cols].copy()
wa_out["frp"] = wa_out["frp"].round(1)
wa_path = OUTDIR / "viirs_wa.csv"
wa_out.to_csv(wa_path, index=False)
print(f"Wrote {wa_path}  ({wa_path.stat().st_size/1024:.0f} KB, {len(wa_out):,} rows)")

# ── Summary ───────────────────────────────────────────────────────────────
print("\n── Month breakdown ──────────────────────────────")
print(out.groupby("month").size().to_string())
print("\n── State breakdown ──────────────────────────────")
print(out.groupby("state").size().to_string())
print("\n── WA month breakdown ───────────────────────────")
print(wa_out.groupby("month").size().to_string())

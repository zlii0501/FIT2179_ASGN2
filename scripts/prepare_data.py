import zipfile
import os
import pandas as pd
import numpy as np

os.makedirs("data", exist_ok=True)

def assign_state(lat, lon):
    if lat < -43.5:
        return "TAS"
    if lat < -39 and lon > 141:
        return "VIC"
    if lat < -28 and lat >= -39 and lon > 141:
        return "NSW"
    if lat < -28 and lon < 141 and lon > 129:
        return "SA"
    if lat >= -28 and lat < -10 and lon > 138:
        return "QLD"
    if lon < 129:
        return "WA"
    return "NT"

frames = []

with zipfile.ZipFile("Fires from Space Australia.zip") as z:
    with z.open("fire_archive_M6_96619.csv") as f:
        df = pd.read_csv(f)
        aug = df[df["acq_date"].str[:7] == "2019-08"]
        frames.append(aug)
        print(f"Aug (Fires from Space): {len(aug)} rows")

with zipfile.ZipFile("Australian Bush fire satellite data (NASA).zip") as z:
    with z.open("fire_archive_M6_101673.csv") as f:
        df = pd.read_csv(f)
        frames.append(df)
        print(f"Archive (NASA): {len(df)} rows")
    with z.open("fire_nrt_M6_101673.csv") as f:
        df = pd.read_csv(f)
        frames.append(df)
        print(f"NRT (NASA): {len(df)} rows")

df = pd.concat(frames, ignore_index=True)
df = df.drop_duplicates(subset=["latitude", "longitude", "acq_date"])
df["month"] = df["acq_date"].str[:7]
df["state"] = df.apply(lambda r: assign_state(r["latitude"], r["longitude"]), axis=1)
df["date"] = pd.to_datetime(df["acq_date"])

# Filter to Aug 2019 – Jan 2020 only
df = df[df["month"].between("2019-08", "2020-01")]
print(f"\nTotal after dedup + filter: {len(df)} rows")
print("Month counts:")
print(df["month"].value_counts().sort_index())

# 1. Stratified sample for dot map (3000 pts, 500 per month)
months = df["month"].unique()
sample_frames = []
for m in sorted(months):
    chunk = df[df["month"] == m]
    n = min(500, len(chunk))
    sample_frames.append(chunk.sample(n=n, random_state=42))
sample = pd.concat(sample_frames, ignore_index=True)
sample[["latitude", "longitude", "frp", "month", "state", "daynight"]].to_csv(
    "data/fire_sample_map.csv", index=False
)
print(f"\nfire_sample_map.csv: {len(sample)} rows")

# 2. Daily totals
daily = df.groupby("acq_date").size().reset_index(name="count")
daily.columns = ["date", "count"]
daily.to_csv("data/fire_daily.csv", index=False)
print(f"fire_daily.csv: {len(daily)} rows")

# 3. Monthly × state aggregation
monthly_state = (
    df.groupby(["month", "state"])
    .agg(count=("frp", "size"), avg_frp=("frp", "mean"), total_frp=("frp", "sum"))
    .reset_index()
)
monthly_state["avg_frp"] = monthly_state["avg_frp"].round(1)
monthly_state["total_frp"] = monthly_state["total_frp"].round(0)
monthly_state.to_csv("data/fire_monthly_state.csv", index=False)
print(f"fire_monthly_state.csv: {len(monthly_state)} rows")

# 4. FRP histogram bins (log scale)
frp_vals = df["frp"].dropna()
bins = [0, 10, 25, 50, 100, 250, 500, 1000, 5000, 15000]
labels = ["<10", "10-25", "25-50", "50-100", "100-250", "250-500", "500-1k", "1k-5k", ">5k"]
df["frp_bin"] = pd.cut(frp_vals, bins=bins, labels=labels, right=False)
frp_hist = df["frp_bin"].value_counts().reindex(labels).reset_index()
frp_hist.columns = ["bin", "count"]
frp_hist["bin_order"] = range(len(frp_hist))
frp_hist.to_csv("data/fire_frp_bins.csv", index=False)
print(f"fire_frp_bins.csv: {len(frp_hist)} rows")

# 5. Day vs Night
daynight = df["daynight"].value_counts().reset_index()
daynight.columns = ["daynight", "count"]
daynight["label"] = daynight["daynight"].map({"D": "Daytime", "N": "Nighttime"})
daynight.to_csv("data/fire_daynight.csv", index=False)
print(f"fire_daynight.csv: {len(daynight)} rows")

# 6. Day vs Night by state for bullet-chart small multiples
daynight_state = (
    df.groupby(["state", "daynight"])
    .size()
    .unstack(fill_value=0)
    .reset_index()
)
daynight_state["day_count"] = daynight_state.get("D", 0)
daynight_state["night_count"] = daynight_state.get("N", 0)
daynight_state["total_count"] = daynight_state["day_count"] + daynight_state["night_count"]
daynight_state["day_share_pct"] = (
    daynight_state["day_count"] / daynight_state["total_count"] * 100
).round(1)
daynight_state = daynight_state[
    ["state", "day_count", "night_count", "total_count", "day_share_pct"]
].sort_values("day_share_pct", ascending=False)
daynight_state.to_csv("data/fire_daynight_state.csv", index=False)
print(f"fire_daynight_state.csv: {len(daynight_state)} rows")

print("\nAll data files written to data/")

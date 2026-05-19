from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

SOURCE_CANDIDATES = [
    DATA_DIR / "Historical_Wildfires.csv",
    ROOT.parent.parent / "data" / "Historical_Wildfires.csv",
    Path(r"D:\Evolustion\FIT_2179\ASGN2\data\Historical_Wildfires.csv"),
]

REGION_MAP = {
    "QL": "QLD",
    "VI": "VIC",
    "TA": "TAS",
}

SOUTHEAST_REGIONS = {"NSW", "VIC", "QLD", "SA", "TAS"}
MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def find_source() -> Path:
    for candidate in SOURCE_CANDIDATES:
        if candidate.exists():
            return candidate
    searched = "\n".join(f"- {path}" for path in SOURCE_CANDIDATES)
    raise FileNotFoundError(f"Historical_Wildfires.csv not found. Searched:\n{searched}")


def season_label(start_year: int) -> str:
    return f"{start_year}-{str(start_year + 1)[-2:]}"


def load_historical() -> pd.DataFrame:
    source = find_source()
    df = pd.read_csv(source)
    df["Date"] = pd.to_datetime(df["Date"], format="%m/%d/%Y")
    df["Region"] = df["Region"].replace(REGION_MAP)
    df["Estimated_fire_area"] = pd.to_numeric(df["Estimated_fire_area"], errors="coerce").fillna(0)
    df["Mean_estimated_fire_radiative_power"] = pd.to_numeric(
        df["Mean_estimated_fire_radiative_power"], errors="coerce"
    ).fillna(0)
    df["Count"] = pd.to_numeric(df["Count"], errors="coerce").fillna(0)
    df["year"] = df["Date"].dt.year
    df["month_num"] = df["Date"].dt.month
    df["month_day"] = df["Date"].dt.strftime("%m-%d")
    return df


def write_annual(df: pd.DataFrame) -> None:
    records = []
    for start_year in range(2005, 2020):
        start = pd.Timestamp(start_year, 8, 1)
        end = pd.Timestamp(start_year + 1, 1, 31)
        season = df[(df["Date"] >= start) & (df["Date"] <= end)]
        southeast = season[season["Region"].isin(SOUTHEAST_REGIONS)]
        records.append(
            {
                "year": season_label(start_year),
                "season_start": start_year,
                "total_fire_area_km2": round(southeast["Estimated_fire_area"].sum(), 1),
                "national_fire_area_km2": round(season["Estimated_fire_area"].sum(), 1),
                "total_count": int(southeast["Count"].sum()),
                "is_black_summer": season_label(start_year) == "2019-20",
            }
        )

    pd.DataFrame(records).to_csv(DATA_DIR / "hist_annual.csv", index=False)


def write_yearmonth(df: pd.DataFrame) -> None:
    grouped = (
        df.groupby(["year", "month_num"], as_index=False)
        .agg(
            total_fire_area_km2=("Estimated_fire_area", "sum"),
            total_count=("Count", "sum"),
        )
        .sort_values(["year", "month_num"])
    )
    grouped["month_label"] = grouped["month_num"].apply(lambda month: MONTH_LABELS[month - 1])
    grouped["total_fire_area_km2"] = grouped["total_fire_area_km2"].round(1)
    grouped["total_count"] = grouped["total_count"].astype(int)
    grouped.to_csv(DATA_DIR / "hist_yearmonth.csv", index=False)


def write_season_horizon(df: pd.DataFrame) -> None:
    records = []
    year_months = list(range(1, 13))
    month_order = {month: idx for idx, month in enumerate(year_months)}
    southeast_df = df[df["Region"].isin(SOUTHEAST_REGIONS)]
    for year in range(2005, 2021):
        year_df = southeast_df[southeast_df["year"] == year]
        monthly = (
            year_df.groupby("month_num", as_index=False)
            .agg(
                total_fire_area_km2=("Estimated_fire_area", "sum"),
                total_count=("Count", "sum"),
            )
        )
        for month in year_months:
            row = monthly[monthly["month_num"] == month]
            area = float(row["total_fire_area_km2"].iloc[0]) if not row.empty else 0
            count = int(row["total_count"].iloc[0]) if not row.empty else 0
            records.append(
                {
                    "season": str(year),
                    "season_start": year,
                    "month_num": month,
                    "month_order": month_order[month],
                    "month_label": MONTH_LABELS[month - 1],
                    "total_fire_area_km2": round(area, 1),
                    "total_count": count,
                    "is_black_summer": (year == 2019 and month >= 8) or (year == 2020 and month == 1),
                    "black_summer_window": month >= 8 or month == 1,
                }
            )

    seasonal = pd.DataFrame(records)
    baseline = seasonal[(seasonal["season_start"] >= 2005) & (seasonal["season_start"] <= 2018)]
    month_avg = (
        baseline.groupby("month_order", as_index=False)
        .agg(baseline_fire_area_km2=("total_fire_area_km2", "mean"))
    )
    seasonal = seasonal.merge(month_avg, on="month_order", how="left")
    seasonal["area_ratio"] = (
        seasonal["total_fire_area_km2"] / seasonal["baseline_fire_area_km2"].replace(0, pd.NA)
    ).fillna(0)
    seasonal["area_ratio"] = seasonal["area_ratio"].clip(upper=4)
    seasonal["row_index"] = 2020 - seasonal["season_start"]
    seasonal["row_base"] = seasonal["row_index"] * 1.55
    seasonal["row_label_y"] = seasonal["row_base"] + 0.5

    band_records = []
    bands = [
        (0, "0-1x avg", "#4f1f22"),
        (1, "1-2x avg", "#a3372b"),
        (2, "2-3x avg", "#e74c3c"),
        (3, "3-4x avg", "#f8c471"),
    ]
    for row in seasonal.to_dict("records"):
        for band_start, band_label, band_color in bands:
            band_value = min(max(row["area_ratio"] - band_start, 0), 1)
            band_records.append(
                {
                    **row,
                    "band_start": band_start,
                    "band_label": band_label,
                    "band_color": band_color,
                    "band_value": round(float(band_value), 3),
                    "row_top": round(float(row["row_base"] + band_value), 3),
                    "area_ratio_label": round(float(row["area_ratio"]), 2),
                    "baseline_fire_area_km2": round(float(row["baseline_fire_area_km2"]), 1),
                }
            )

    pd.DataFrame(band_records).to_csv(DATA_DIR / "hist_season_horizon.csv", index=False)


def write_firework(df: pd.DataFrame) -> None:
    southeast_df = df[df["Region"].isin(SOUTHEAST_REGIONS)]
    monthly = (
        southeast_df.groupby(["year", "month_num"], as_index=False)
        .agg(
            total_fire_area_km2=("Estimated_fire_area", "sum"),
            total_count=("Count", "sum"),
        )
    )
    monthly["month_label"] = monthly["month_num"].apply(lambda month: MONTH_LABELS[month - 1])
    monthly["month_order"] = monthly["month_num"] - 1
    monthly["angle"] = monthly["month_order"] / 12 * 2 * np.pi
    monthly["is_black_summer"] = (
        ((monthly["year"] == 2019) & (monthly["month_num"] >= 8))
        | ((monthly["year"] == 2020) & (monthly["month_num"] == 1))
    )
    monthly["period"] = monthly["is_black_summer"].map({True: "Black Summer", False: "Historical years"})
    monthly["total_fire_area_km2"] = monthly["total_fire_area_km2"].round(1)
    monthly["total_count"] = monthly["total_count"].astype(int)

    baseline = monthly[(monthly["year"] >= 2005) & (monthly["year"] <= 2018)]
    medians = (
        baseline.groupby("month_num", as_index=False)
        .agg(median_fire_area_km2=("total_fire_area_km2", "median"))
    )
    monthly = monthly.merge(medians, on="month_num", how="left")
    monthly["ratio_to_median"] = (
        monthly["total_fire_area_km2"] / monthly["median_fire_area_km2"].replace(0, pd.NA)
    ).fillna(0)
    monthly["radius_value"] = np.sqrt(monthly["total_fire_area_km2"].clip(lower=0))
    monthly["x_pos"] = np.sin(monthly["angle"]) * monthly["radius_value"]
    monthly["y_pos"] = -np.cos(monthly["angle"]) * monthly["radius_value"]
    monthly["label_x"] = np.sin(monthly["angle"]) * 275
    monthly["label_y"] = -np.cos(monthly["angle"]) * 275
    monthly["total_fire_area_km2"] = monthly["total_fire_area_km2"].round(1)
    monthly["median_fire_area_km2"] = monthly["median_fire_area_km2"].round(1)
    monthly["ratio_to_median"] = monthly["ratio_to_median"].round(2)
    monthly["radius_value"] = monthly["radius_value"].round(3)
    monthly["x_pos"] = monthly["x_pos"].round(3)
    monthly["y_pos"] = monthly["y_pos"].round(3)
    monthly["label_x"] = monthly["label_x"].round(3)
    monthly["label_y"] = monthly["label_y"].round(3)
    monthly["y_jitter"] = monthly["month_order"] + (((monthly["year"] * 37) % 100) / 100 - 0.5) * 0.22
    monthly["y_jitter"] = monthly["y_jitter"].round(3)
    monthly.to_csv(DATA_DIR / "hist_firework.csv", index=False)

    historical = monthly[(monthly["year"] >= 2005) & (monthly["year"] <= 2018)].copy()
    summary = (
        historical.groupby(["month_num", "month_label", "month_order"], as_index=False)
        .agg(
            q1_fire_area_km2=("total_fire_area_km2", lambda s: s.quantile(0.25)),
            median_fire_area_km2=("total_fire_area_km2", "median"),
            q3_fire_area_km2=("total_fire_area_km2", lambda s: s.quantile(0.75)),
            min_fire_area_km2=("total_fire_area_km2", "min"),
            max_fire_area_km2=("total_fire_area_km2", "max"),
        )
    )
    summary["cloud_y0"] = summary["month_order"] - 0.18
    summary["cloud_y1"] = summary["month_order"] + 0.18
    summary = summary.round(
        {
            "q1_fire_area_km2": 1,
            "median_fire_area_km2": 1,
            "q3_fire_area_km2": 1,
            "min_fire_area_km2": 1,
            "max_fire_area_km2": 1,
            "cloud_y0": 3,
            "cloud_y1": 3,
        }
    )
    summary.to_csv(DATA_DIR / "hist_month_distribution.csv", index=False)


def write_seasonal_average(df: pd.DataFrame) -> None:
    baseline = df[(df["year"] >= 2005) & (df["year"] <= 2018)]
    baseline = baseline[baseline["month_num"].isin([8, 9, 10, 11, 12, 1])]
    daily = baseline.groupby(["year", "month_day"], as_index=False).agg(count=("Count", "sum"))
    avg = daily.groupby("month_day", as_index=False).agg(avg_count=("count", "mean"))
    avg["month_num"] = avg["month_day"].str.slice(0, 2).astype(int)
    avg["baseline_date"] = avg.apply(
        lambda row: f"2019-{row['month_day']}" if row["month_num"] >= 8 else f"2020-{row['month_day']}",
        axis=1,
    )
    avg["avg_count"] = avg["avg_count"].round(1)
    avg = avg.sort_values("baseline_date")[["month_day", "baseline_date", "avg_count"]]
    avg.to_csv(DATA_DIR / "hist_seasonal_avg.csv", index=False)


def write_daily_seasons(df: pd.DataFrame) -> None:
    season_months = [8, 9, 10, 11, 12, 1]
    daily = (
        df[df["month_num"].isin(season_months)]
        .groupby(["Date"], as_index=False)
        .agg(count=("Count", "sum"))
    )

    records = []
    for start_year in range(2005, 2020):
        start = pd.Timestamp(start_year, 8, 1)
        end = pd.Timestamp(start_year + 1, 1, 31)
        calendar = pd.DataFrame({"Date": pd.date_range(start, end, freq="D")})
        season_daily = calendar.merge(daily, on="Date", how="left")
        season_daily["count"] = season_daily["count"].fillna(0).astype(int)
        season = season_label(start_year)
        is_black_summer = season == "2019-20"
        season_daily["season"] = season
        season_daily["season_start"] = start_year
        season_daily["month_day"] = season_daily["Date"].dt.strftime("%m-%d")
        season_daily["month_label"] = season_daily["Date"].dt.strftime("%b")
        season_daily["season_day"] = (season_daily["Date"] - start).dt.days
        season_daily["season_week"] = (season_daily["season_day"] // 7).astype(int)
        season_daily["weekday_order"] = ((season_daily["Date"].dt.dayofweek + 1) % 7).astype(int)
        season_daily["is_black_summer"] = is_black_summer
        season_daily["period"] = "Black Summer" if is_black_summer else "Historical season"
        season_daily["date"] = season_daily["Date"].dt.strftime("%Y-%m-%d")
        season_daily["day_label"] = season_daily["Date"].dt.strftime("%d %b %Y")
        records.append(
            season_daily[
                [
                    "date",
                    "season",
                    "season_start",
                    "month_day",
                    "month_label",
                    "season_day",
                    "season_week",
                    "weekday_order",
                    "day_label",
                    "count",
                    "is_black_summer",
                    "period",
                ]
            ]
        )

    pd.concat(records, ignore_index=True).to_csv(DATA_DIR / "hist_daily_seasons.csv", index=False)


def write_daily_continuous(df: pd.DataFrame) -> None:
    daily = df.groupby(["Date"], as_index=False).agg(count=("Count", "sum"))
    start = pd.Timestamp(2005, 1, 1)
    end = pd.Timestamp(2020, 10, 31)
    calendar = pd.DataFrame({"Date": pd.date_range(start, end, freq="D")})
    calendar = calendar.merge(daily, on="Date", how="left")
    calendar["count"] = calendar["count"].fillna(0).astype(int)
    calendar["day_index"] = (calendar["Date"] - start).dt.days.astype(int)
    calendar["weekday_order"] = ((calendar["Date"].dt.dayofweek + 1) % 7).astype(int)
    calendar["date"] = calendar["Date"].dt.strftime("%Y-%m-%d")
    calendar["day_label"] = calendar["Date"].dt.strftime("%d %b %Y")
    calendar["month_label"] = calendar["Date"].dt.strftime("%b")
    calendar["year"] = calendar["Date"].dt.year
    black_start = pd.Timestamp(2019, 8, 1)
    black_end = pd.Timestamp(2020, 1, 31)
    calendar["is_black_summer"] = calendar["Date"].between(black_start, black_end)
    calendar["period"] = calendar["is_black_summer"].map({True: "Black Summer", False: "Historical record"})
    calendar[
        [
            "date",
            "day_index",
            "weekday_order",
            "day_label",
            "month_label",
            "year",
            "count",
            "is_black_summer",
            "period",
        ]
    ].to_csv(DATA_DIR / "hist_daily_continuous.csv", index=False)


def write_window_summary(df: pd.DataFrame) -> None:
    daily = df.groupby(["Date"], as_index=False).agg(count=("Count", "sum"))
    start = pd.Timestamp(2005, 1, 1)
    end = pd.Timestamp(2020, 10, 31)
    calendar = pd.DataFrame({"Date": pd.date_range(start, end, freq="D")})
    calendar = calendar.merge(daily, on="Date", how="left")
    calendar["count"] = calendar["count"].fillna(0).astype(int)

    records = []
    for window_start in pd.date_range(start, pd.Timestamp(2020, 5, 1), freq="MS"):
        window_end = window_start + pd.Timedelta(days=183)
        window = calendar[(calendar["Date"] >= window_start) & (calendar["Date"] <= window_end)]
        records.append(
            {
                "start_date": window_start.strftime("%Y-%m-%d"),
                "start_day": int((window_start - start).days),
                "end_date": window_end.strftime("%Y-%m-%d"),
                "window_label": f"{window_start.strftime('%b %Y')}-{window_end.strftime('%b %Y')}",
                "short_label": window_start.strftime("%b %Y"),
                "year_label": window_start.strftime("%Y"),
                "total_count": int(window["count"].sum()),
                "max_daily": int(window["count"].max()),
                "is_black_summer_window": window_start == pd.Timestamp(2019, 8, 1),
            }
        )

    pd.DataFrame(records).to_csv(DATA_DIR / "hist_window_summary.csv", index=False)


def write_wa_monthly_frp(df: pd.DataFrame) -> None:
    start = pd.Timestamp(2005, 1, 1)
    end = pd.Timestamp(2020, 10, 1)
    wa = df[df["Region"] == "WA"].copy()
    wa["month_start"] = wa["Date"].dt.to_period("M").dt.to_timestamp()
    wa["weighted_frp"] = wa["Mean_estimated_fire_radiative_power"] * wa["Count"]

    grouped = (
        wa.groupby("month_start", as_index=False)
        .agg(
            detection_count=("Count", "sum"),
            weighted_frp=("weighted_frp", "sum"),
            avg_daily_frp=("Mean_estimated_fire_radiative_power", "mean"),
            max_daily_frp=("Mean_estimated_fire_radiative_power", "max"),
            active_days=("Date", "nunique"),
        )
    )

    months = pd.DataFrame({"month_start": pd.date_range(start, end, freq="MS")})
    monthly = months.merge(grouped, on="month_start", how="left").fillna(0)
    monthly["avg_frp"] = np.where(
        monthly["detection_count"] > 0,
        monthly["weighted_frp"] / monthly["detection_count"],
        0,
    )
    monthly["year"] = monthly["month_start"].dt.year
    monthly["month_num"] = monthly["month_start"].dt.month
    monthly["month_index"] = (
        (monthly["year"] - start.year) * 12 + monthly["month_num"] - 1
    ).astype(int)
    monthly["month_start_day"] = (monthly["month_start"] - start).dt.days.astype(int)
    monthly["month"] = monthly["month_start"].dt.strftime("%Y-%m")
    monthly["month_label"] = monthly["month_start"].dt.strftime("%b")
    monthly["month_label_long"] = monthly["month_start"].dt.strftime("%b %Y")
    monthly["is_black_summer"] = monthly["month_start"].between(
        pd.Timestamp(2019, 8, 1), pd.Timestamp(2020, 1, 1)
    )
    monthly["period"] = monthly["is_black_summer"].map(
        {True: "Black Summer", False: "Historical record"}
    )
    monthly["detection_count"] = monthly["detection_count"].astype(int)
    monthly["active_days"] = monthly["active_days"].astype(int)
    monthly["avg_frp"] = monthly["avg_frp"].round(1)
    monthly["avg_daily_frp"] = monthly["avg_daily_frp"].round(1)
    monthly["max_daily_frp"] = monthly["max_daily_frp"].round(1)
    monthly[
        [
            "month",
            "month_index",
            "month_start_day",
            "year",
            "month_num",
            "month_label",
            "month_label_long",
            "avg_frp",
            "avg_daily_frp",
            "max_daily_frp",
            "detection_count",
            "active_days",
            "is_black_summer",
            "period",
        ]
    ].to_csv(DATA_DIR / "hist_wa_monthly_frp.csv", index=False)


def main() -> None:
    df = load_historical()
    write_annual(df)
    write_yearmonth(df)
    write_season_horizon(df)
    write_firework(df)
    write_seasonal_average(df)
    write_daily_seasons(df)
    write_daily_continuous(df)
    write_window_summary(df)
    write_wa_monthly_frp(df)
    print("Wrote historical chart data:")
    print("- data/hist_annual.csv")
    print("- data/hist_yearmonth.csv")
    print("- data/hist_season_horizon.csv")
    print("- data/hist_firework.csv")
    print("- data/hist_month_distribution.csv")
    print("- data/hist_seasonal_avg.csv")
    print("- data/hist_daily_seasons.csv")
    print("- data/hist_daily_continuous.csv")
    print("- data/hist_window_summary.csv")
    print("- data/hist_wa_monthly_frp.csv")


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

OUT = DATA_DIR / "alluvial_month_state_intensity.json"
SOURCE = DATA_DIR / "viirs_sample_map.csv"

STATE_ORDER = ["NSW", "QLD", "WA", "NT", "SA", "VIC"]
MONTH_ORDER = [
    "2019-08",
    "2019-09",
    "2019-10",
    "2019-11",
    "2019-12",
    "2020-01",
]
MONTH_LABEL = {
    "2019-08": "Aug 2019",
    "2019-09": "Sep 2019",
    "2019-10": "Oct 2019",
    "2019-11": "Nov 2019",
    "2019-12": "Dec 2019",
    "2020-01": "Jan 2020",
}
INTENSITY_ORDER = ["Low", "Moderate", "High", "Severe", "Extreme"]
INTENSITY_COLOR = {
    "Low": "#ffd166",
    "Moderate": "#f8961e",
    "High": "#f3722c",
    "Severe": "#d00000",
    "Extreme": "#7f1d1d",
}
STATE_COLOR = {
    "NSW": "#D55E00",
    "QLD": "#E69F00",
    "WA": "#0072B2",
    "NT": "#CC79A7",
    "SA": "#009E73",
    "VIC": "#56B4E9",
}


def intensity_bin(frp: float) -> str:
    if frp < 50:
        return "Low"
    if frp < 100:
        return "Moderate"
    if frp < 250:
        return "High"
    if frp < 500:
        return "Severe"
    return "Extreme"


def cubic_path(x1: float, y1: float, x2: float, y2: float) -> str:
    dx = (x2 - x1) * 0.52
    return f"M{x1:.1f},{y1:.1f} C{x1 + dx:.1f},{y1:.1f} {x2 - dx:.1f},{y2:.1f} {x2:.1f},{y2:.1f}"


def make_nodes(df: pd.DataFrame, chart_height: int, scale: float) -> list[dict]:
    nodes: list[dict] = []
    columns = [
        ("month", MONTH_ORDER, 110, "Month", {m: "#e8c9a0" for m in MONTH_ORDER}),
        ("state", STATE_ORDER, 420, "State", STATE_COLOR),
        ("intensity", INTENSITY_ORDER, 710, "Intensity", INTENSITY_COLOR),
    ]

    for column, order, x, column_label, colors in columns:
        if column == "state":
            counts = df.groupby("state").size().to_dict()
        elif column == "month":
            counts = df.groupby("month").size().to_dict()
        else:
            counts = df.groupby("intensity").size().to_dict()

        present = [item for item in order if counts.get(item, 0) > 0]
        min_h = 6
        gap = 16 if column != "intensity" else 18
        heights = {item: max(counts.get(item, 0) * scale, min_h) for item in present}
        total_h = sum(heights[item] for item in present)
        y = (chart_height - total_h - gap * (len(present) - 1)) / 2
        for item in present:
            count = int(counts.get(item, 0))
            h = heights[item]
            label = MONTH_LABEL.get(item, item)
            nodes.append(
                {
                    "id": f"{column}:{item}",
                    "column": column,
                    "columnLabel": column_label,
                    "name": item,
                    "label": label,
                    "count": count,
                    "x": x,
                    "x0": x - 11,
                    "x1": x + 11,
                    "y0": round(y, 2),
                    "y1": round(y + h, 2),
                    "yc": round(y + h / 2, 2),
                    "color": colors.get(item, "#9ca3af"),
                }
            )
            y += h + gap
    return nodes


def make_links(df: pd.DataFrame, nodes: list[dict], scale: float) -> list[dict]:
    node_map = {node["id"]: node for node in nodes}
    source_offsets: dict[str, float] = defaultdict(float)
    target_offsets: dict[str, float] = defaultdict(float)
    links: list[dict] = []

    def add_link(source_id: str, target_id: str, count: int, color: str, link_type: str, label: str) -> None:
        source = node_map[source_id]
        target = node_map[target_id]
        thickness = max(count * scale, 1.2)
        sy = source["y0"] + source_offsets[source_id] + thickness / 2
        ty = target["y0"] + target_offsets[target_id] + thickness / 2
        source_offsets[source_id] += thickness
        target_offsets[target_id] += thickness
        links.append(
            {
                "source": source_id,
                "target": target_id,
                "count": int(count),
                "path": cubic_path(source["x1"], sy, target["x0"], ty),
                "strokeWidth": round(thickness, 2),
                "source_y": round(sy, 2),
                "target_y": round(ty, 2),
                "color": color,
                "type": link_type,
                "label": label,
            }
        )

    month_state = (
        df.groupby(["month", "state"])
        .size()
        .reset_index(name="count")
        .sort_values(
            by=["month", "state"],
            key=lambda s: s.map({**{v: i for i, v in enumerate(STATE_ORDER)}, **{v: i for i, v in enumerate(MONTH_ORDER)}}).fillna(99),
        )
    )
    for month in MONTH_ORDER:
        chunk = month_state[month_state["month"] == month].sort_values(
            "state", key=lambda s: s.map({state: i for i, state in enumerate(STATE_ORDER)})
        )
        for row in chunk.to_dict("records"):
            add_link(
                f"month:{row['month']}",
                f"state:{row['state']}",
                row["count"],
                "#e8c9a0",
                "month-state",
                f"{MONTH_LABEL.get(row['month'], row['month'])} -> {row['state']}",
            )

    state_intensity = (
        df.groupby(["state", "intensity"])
        .size()
        .reset_index(name="count")
        .sort_values(
            by=["state", "intensity"],
            key=lambda s: s.map({**{v: i for i, v in enumerate(MONTH_ORDER)}, **{v: i for i, v in enumerate(INTENSITY_ORDER)}}).fillna(99),
        )
    )
    for state in STATE_ORDER:
        chunk = state_intensity[state_intensity["state"] == state].sort_values(
            "intensity", key=lambda s: s.map({v: i for i, v in enumerate(INTENSITY_ORDER)})
        )
        for row in chunk.to_dict("records"):
            add_link(
                f"state:{row['state']}",
                f"intensity:{row['intensity']}",
                row["count"],
                INTENSITY_COLOR.get(row["intensity"], "#9ca3af"),
                "state-intensity",
                f"{row['state']} -> {row['intensity']}",
            )

    return links


def main() -> None:
    df = pd.read_csv(SOURCE)
    df = df[df["state"].isin(STATE_ORDER)].copy()
    df["intensity"] = df["frp"].apply(intensity_bin)

    chart_height = 600
    total = len(df)
    scale = (chart_height - 150) / total

    nodes = make_nodes(df, chart_height, scale)
    links = make_links(df, nodes, scale)

    payload = {
        "meta": {
            "source": "viirs_sample_map.csv rebuilt from raw NASA VIIRS zip files in data/",
            "total": int(total),
            "scale": round(scale, 5),
            "note": "Static alluvial layout: Month -> State -> FRP intensity. Month labels include years and reflect the months present in viirs_sample_map.csv.",
        },
        "nodes": nodes,
        "links": links,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"- nodes: {len(nodes)}")
    print(f"- links: {len(links)}")


if __name__ == "__main__":
    main()

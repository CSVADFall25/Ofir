#!/usr/bin/env python3
import csv
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timedelta, timezone

# --- TUNE THIS: which sources win when multiple report the same minute ---
PRIORITY = ["Apple Watch", "Watch", "iPhone"]  # substrings matched case-insensitively
# If none match, we pick an arbitrary present source for that minute.

def parse_apple_date(s: str) -> datetime:
    # Apple Health dates look like: "2025-11-07 12:34:56 -0700"
    # (sometimes without timezone, but most exports include it)
    for fmt in ("%Y-%m-%d %H:%M:%S %z", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(s, fmt)
            if dt.tzinfo is None:
                # If no tz given, treat as UTC (you can change this if you prefer)
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    raise ValueError(f"Unrecognized date format: {s!r}")

def minute_floor(dt: datetime) -> datetime:
    return dt.replace(second=0, microsecond=0)

def minute_slots(start: datetime, end: datetime):
    """
    Yield minute timestamps m such that m is the start of a whole minute and
    start < m < = end, effectively covering [start, end) in minute steps.
    We distribute equally across these minute start times.
    """
    m = minute_floor(start)
    if m < start:
        m += timedelta(minutes=1)
    while m < end:
        yield m
        m += timedelta(minutes=1)

def pick_source(sources_here):
    """Choose one source name from iterable, honoring PRIORITY substrings."""
    low = [s.lower() for s in sources_here]
    for pref in PRIORITY:
        pref_l = pref.lower()
        for i, s in enumerate(low):
            if pref_l in s:
                return list(sources_here)[i]
    # fallback: deterministic choice
    return sorted(sources_here)[0]

def main(xml_path: str):
    raw_out = "steps_raw.csv"
    daily_out = "steps_daily.csv"

    # Prepare writers
    raw_f = open(raw_out, "w", newline="", encoding="utf-8")
    raw_w = csv.writer(raw_f)
    raw_w.writerow([
        "startDate", "endDate", "creationDate", "value", "unit",
        "sourceName", "sourceVersion", "device"
    ])

    # --- De-dup state ---
    # per_minute[moment] -> {sourceName: step_fraction_sum}
    # Using dict of dicts; if memory becomes an issue for very large exports,
    # this can be chunked per-day.
    per_minute = defaultdict(lambda: defaultdict(float))

    # Stream parse
    for event, elem in ET.iterparse(xml_path, events=("end",)):
        if elem.tag == "Record" and elem.attrib.get("type") == "HKQuantityTypeIdentifierStepCount":
            start_s = elem.attrib.get("startDate", "")
            end_s = elem.attrib.get("endDate", "")
            creation_s = elem.attrib.get("creationDate", "")
            value_s = elem.attrib.get("value", "0")
            unit = elem.attrib.get("unit", "")
            sourceName = elem.attrib.get("sourceName", "")
            sourceVersion = elem.attrib.get("sourceVersion", "")
            device = elem.attrib.get("device", "")

            # Write raw record unchanged
            raw_w.writerow([
                start_s, end_s, creation_s, value_s, unit,
                sourceName, sourceVersion, device
            ])

            # Distribute record value across whole minutes, per source
            try:
                start_dt = parse_apple_date(start_s)
                end_dt   = parse_apple_date(end_s)
            except Exception:
                elem.clear()
                continue

            try:
                val = float(value_s)
            except ValueError:
                val = 0.0

            if end_dt <= start_dt or val <= 0:
                elem.clear()
                continue

            mins = list(minute_slots(start_dt, end_dt))
            if mins:
                share = val / len(mins)
                for m in mins:
                    per_minute[m][sourceName] += share

        # Important: clear elements to free memory as we go
        elem.clear()

    raw_f.close()

    # Collapse per-minute buckets with de-dup to per-day totals
    per_day = defaultdict(int)
    for m, by_src in per_minute.items():
        chosen = pick_source(by_src.keys())
        steps = by_src[chosen]
        per_day[m.date().isoformat()] += int(round(steps))

    # Write daily summary (DE-DUPLICATED)
    with open(daily_out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["date", "steps"])
        for day in sorted(per_day.keys()):
            w.writerow([day, per_day[day]])

    print(f"Wrote {raw_out} and {daily_out} (daily is de-duplicated by minute and source)")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 health_steps_to_csv.py /path/to/export.xml")
        sys.exit(1)
    main(sys.argv[1])

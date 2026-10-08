#!/usr/bin/env python3

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


PROFILE_URL = "https://scholar.google.com/citations?user=K_6-iJYAAAAJ&hl=en"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "scholar-metrics.json"


class MetricsTableParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_metrics_table = False
        self.current_row = None
        self.current_cell = None
        self.rows = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "table" and attributes.get("id") == "gsc_rsb_st":
            self.in_metrics_table = True
        elif self.in_metrics_table and tag == "tr":
            self.current_row = []
        elif self.current_row is not None and tag in {"th", "td"}:
            self.current_cell = []

    def handle_data(self, data):
        if self.current_cell is not None:
            self.current_cell.append(data)

    def handle_endtag(self, tag):
        if self.current_cell is not None and tag in {"th", "td"}:
            text = " ".join("".join(self.current_cell).split())
            self.current_row.append(text)
            self.current_cell = None
        elif self.current_row is not None and tag == "tr":
            if self.current_row:
                self.rows.append(self.current_row)
            self.current_row = None
        elif self.in_metrics_table and tag == "table":
            self.in_metrics_table = False


def fetch_profile():
    request = Request(
        PROFILE_URL,
        headers={
            "Accept": "text/html",
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (compatible; TylerChangWebsite/1.0)",
        },
    )
    delays = (5, 15)
    for attempt in range(len(delays) + 1):
        try:
            with urlopen(request, timeout=30) as response:
                return response.read().decode("utf-8")
        except (URLError, TimeoutError) as error:
            if isinstance(error, HTTPError) and error.code not in {403, 429, 500, 502, 503, 504}:
                raise
            if attempt == len(delays):
                raise RuntimeError(
                    "Google Scholar could not be reached after 3 attempts; "
                    "the last successful metrics have been preserved."
                ) from error
            delay = delays[attempt]
            if isinstance(error, HTTPError):
                retry_after = error.headers.get("Retry-After", "") if error.headers else ""
                if retry_after.isdigit():
                    delay = min(60, max(delay, int(retry_after)))
            print(f"Scholar request failed ({error}); retrying in {delay}s.", file=sys.stderr)
            time.sleep(delay)


def parse_metrics(html):
    parser = MetricsTableParser()
    parser.feed(html)
    metrics = {}

    for row in parser.rows:
        if len(row) < 2:
            continue
        label = row[0].strip().lower()
        if label == "citations":
            metrics["citations"] = int(row[1].replace(",", ""))
        elif label == "h-index":
            metrics["h_index"] = int(row[1].replace(",", ""))

    if "citations" not in metrics or "h_index" not in metrics:
        raise RuntimeError("Google Scholar metrics table was not found")

    if metrics["citations"] < 0 or not 0 <= metrics["h_index"] <= metrics["citations"]:
        raise ValueError("Google Scholar returned invalid metrics")

    return metrics


def main():
    argument_parser = argparse.ArgumentParser()
    argument_parser.add_argument(
        "--input",
        type=Path,
        help="Read a saved Google Scholar profile instead of requesting it",
    )
    arguments = argument_parser.parse_args()

    html = arguments.input.read_text(encoding="utf-8") if arguments.input else fetch_profile()
    metrics = parse_metrics(html)
    payload = {
        "source": "Google Scholar",
        "profile_url": PROFILE_URL,
        "citations": metrics["citations"],
        "h_index": metrics["h_index"],
        "updated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = OUTPUT_PATH.with_suffix(".json.tmp")
    temporary_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary_path.replace(OUTPUT_PATH)
    print(
        f"Updated Scholar metrics: {payload['citations']} citations, "
        f"h-index {payload['h_index']}"
    )


if __name__ == "__main__":
    main()

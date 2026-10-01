#!/usr/bin/env python3

import argparse
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
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
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (compatible; TylerChangWebsite/1.0)",
        },
    )
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


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
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"Updated Scholar metrics: {payload['citations']} citations, "
        f"h-index {payload['h_index']}"
    )


if __name__ == "__main__":
    main()

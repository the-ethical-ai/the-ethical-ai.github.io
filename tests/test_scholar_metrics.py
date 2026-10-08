import importlib.util
import json
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError


spec = importlib.util.spec_from_file_location(
    "scholar", Path(__file__).resolve().parents[1] / "scripts" / "update-scholar-metrics.py"
)
scholar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scholar)


def profile(citations="1,234", h_index="12"):
    return (
        '<table id="unrelated"><tr><td>Citations</td><td>9999</td></tr></table>'
        '<table id="gsc_rsb_st"><tr><th></th><th>All</th><th>Since 2021</th></tr>'
        f'<tr><td><a>Citations</a></td><td>{citations}</td><td>100</td></tr>'
        f'<tr><td>h-index</td><td><span>{h_index}</span></td><td>5</td></tr></table>'
    )


class ScholarMetricsTests(unittest.TestCase):
    def test_parses_all_time_metrics_with_nested_elements(self):
        self.assertEqual(scholar.parse_metrics(profile()), {"citations": 1234, "h_index": 12})

    def test_rejects_block_pages_and_invalid_counts(self):
        for html in ["<html>CAPTCHA</html>", profile("-1", "0"), profile("3", "4")]:
            with self.subTest(html=html):
                with self.assertRaises((RuntimeError, ValueError)):
                    scholar.parse_metrics(html)

    def test_retries_temporary_block_and_then_succeeds(self):
        error = HTTPError(scholar.PROFILE_URL, 403, "Forbidden", {}, None)
        with patch.object(scholar, "urlopen", side_effect=[error, BytesIO(profile().encode())]) as request:
            with patch.object(scholar.time, "sleep") as sleep:
                self.assertEqual(scholar.parse_metrics(scholar.fetch_profile())["citations"], 1234)
        self.assertEqual(request.call_count, 2)
        sleep.assert_called_once_with(5)

    def test_retry_limit_preserves_output(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "scholar-metrics.json"
            output.write_text('{"citations": 14, "h_index": 3}')
            previous = output.read_bytes()
            error = HTTPError(scholar.PROFILE_URL, 403, "Forbidden", {}, None)
            with patch.object(scholar, "OUTPUT_PATH", output), patch.object(scholar, "urlopen", side_effect=error) as request:
                with patch.object(scholar.time, "sleep"), patch.object(scholar.sys, "argv", ["update"]):
                    with self.assertRaisesRegex(RuntimeError, "last successful metrics have been preserved"):
                        scholar.main()
            self.assertEqual(request.call_count, 3)
            self.assertEqual(output.read_bytes(), previous)

    def test_invalid_response_preserves_output(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "scholar-metrics.json"
            output.write_text('{"citations": 14, "h_index": 3}')
            previous = output.read_bytes()
            with patch.object(scholar, "OUTPUT_PATH", output), patch.object(scholar, "fetch_profile", return_value="CAPTCHA"):
                with patch.object(scholar.sys, "argv", ["update"]):
                    with self.assertRaises(RuntimeError):
                        scholar.main()
            self.assertEqual(output.read_bytes(), previous)

    def test_success_replaces_metrics_and_timestamp(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "scholar-metrics.json"
            with patch.object(scholar, "OUTPUT_PATH", output), patch.object(scholar, "fetch_profile", return_value=profile("14", "3")):
                with patch.object(scholar.sys, "argv", ["update"]):
                    scholar.main()
            data = json.loads(output.read_text())
            self.assertEqual((data["citations"], data["h_index"]), (14, 3))
            self.assertTrue(data["updated_at"].endswith("Z"))
            self.assertFalse(output.with_suffix(".json.tmp").exists())


if __name__ == "__main__":
    unittest.main()

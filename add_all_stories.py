"""Add a <wwt-preview> to index.html for every project folder that doesn't have one yet.

A project folder is any subdirectory containing an index.html.
New elements are inserted just before </ol>, with title set to the project name.
"""

import re
from pathlib import Path

ROOT = Path(__file__).parent
INDEX = ROOT / "index.html"

html = INDEX.read_text()

existing = set(re.findall(r'<wwt-preview[^>]*\bproject="([^"]+)"', html))
projects = sorted(d.name for d in ROOT.iterdir() if (d / "index.html").is_file())
missing = [p for p in projects if p not in existing]

if missing:
    new_elements = "".join(
        f'\t\t\t<wwt-preview project="{p}" title="{p}"></wwt-preview>\n' for p in missing
    )
    html = html.replace("\t\t</ol>", new_elements + "\t\t</ol>", 1)
    INDEX.write_text(html)

print(f"Added {len(missing)}: {', '.join(missing) or '(none)'}")

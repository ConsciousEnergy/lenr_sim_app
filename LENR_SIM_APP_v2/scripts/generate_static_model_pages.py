#!/usr/bin/env python3
"""Generate crawler-readable static HTML for /models/* and methodology pages.

Writes into LENR_SIM_APP_v2/frontend/public/ so Vite/nginx serve them without
SSR. Run from repo with backend on PYTHONPATH, or via:

  cd LENR_SIM_APP_v2/backend && PYTHONPATH=. python ../scripts/generate_static_model_pages.py
"""

from __future__ import annotations

import html
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

SCRIPT = Path(__file__).resolve()
APP_ROOT = SCRIPT.parents[1]  # LENR_SIM_APP_v2
BACKEND = APP_ROOT / "backend"
PUBLIC = APP_ROOT / "frontend" / "public"
MODELS_DIR = PUBLIC / "models"
EXPERIMENTS_DIR = PUBLIC / "experiments"

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

MODEL0_IDS = ("quantum_tunneling", "electron_screening", "null_recombination")


def _esc(value: Any) -> str:
    return html.escape("" if value is None else str(value), quote=True)


def _li_list(items: List[Any]) -> str:
    if not items:
        return "<p><em>None listed.</em></p>"
    out = ["<ul>"]
    for item in items:
        if isinstance(item, dict):
            bits = []
            for k, v in item.items():
                bits.append(f"<strong>{_esc(k)}</strong>: {_esc(v)}")
            out.append("<li>" + "; ".join(bits) + "</li>")
        else:
            out.append(f"<li>{_esc(item)}</li>")
    out.append("</ul>")
    return "\n".join(out)


def _page(title: str, description: str, body: str, *, canonical: str = "") -> str:
    canon = f'\n  <link rel="canonical" href="{_esc(canonical)}" />' if canonical else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{_esc(title)}</title>
  <meta name="description" content="{_esc(description)}" />{canon}
  <style>
    :root {{
      --ink: #1a1f24;
      --muted: #4a5560;
      --line: #d5dbe0;
      --bg: #f7f5f1;
      --panel: #ffffff;
      --accent: #0b5f4b;
    }}
    body {{
      margin: 0;
      font-family: "Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, serif;
      color: var(--ink);
      background:
        radial-gradient(1200px 600px at 10% -10%, #e7efe9 0%, transparent 55%),
        linear-gradient(180deg, #fbfaf7 0%, var(--bg) 100%);
      line-height: 1.55;
    }}
    header, main, footer {{
      max-width: 52rem;
      margin: 0 auto;
      padding: 1.25rem 1.25rem;
    }}
    header {{
      border-bottom: 1px solid var(--line);
    }}
    h1, h2, h3 {{
      font-family: "IBM Plex Sans", "Source Sans 3", "Helvetica Neue", sans-serif;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }}
    h1 {{ font-size: 1.85rem; margin: 0.2rem 0 0.5rem; }}
    h2 {{ font-size: 1.25rem; margin-top: 1.75rem; color: var(--accent); }}
    .brand {{
      font-family: "IBM Plex Sans", sans-serif;
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--accent);
      text-decoration: none;
    }}
    .meta, .note {{ color: var(--muted); font-size: 0.95rem; }}
    .panel {{
      background: var(--panel);
      border: 1px solid var(--line);
      padding: 1rem 1.1rem;
      margin: 1rem 0;
    }}
    a {{ color: var(--accent); }}
    nav a {{ margin-right: 0.85rem; }}
    code, .mono {{
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.92em;
    }}
    table {{ border-collapse: collapse; width: 100%; }}
    th, td {{ border: 1px solid var(--line); padding: 0.45rem 0.55rem; text-align: left; vertical-align: top; }}
    th {{ background: #eef3f0; font-family: "IBM Plex Sans", sans-serif; }}
    footer {{ border-top: 1px solid var(--line); color: var(--muted); font-size: 0.9rem; }}
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/models/">LENR-Sim</a>
    <nav>
      <a href="/models/">Models</a>
      <a href="/experiments/">Experiments</a>
      <a href="/methodology.html">Methodology</a>
      <a href="/validation.html">Validation</a>
      <a href="/sources.html">Sources</a>
      <a href="/">Interactive app</a>
    </nav>
    <h1>{_esc(title)}</h1>
    <p class="meta">{_esc(description)}</p>
  </header>
  <main>
{body}
  </main>
  <footer>
    <p>Static documentation surface for independent audit and indexing.
    LENR-Sim is a comparative hypothesis workbench — not a proof of LENR.
    Generated {_esc(datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%MZ"))}.</p>
  </footer>
</body>
</html>
"""


def _model_body(row: Dict[str, Any]) -> str:
    tid = row["theory_id"]
    control = row.get("control_role") or "—"
    model0_banner = ""
    if tid in MODEL0_IDS:
        model0_banner = (
            '<div class="panel"><strong>Model 0 / established-physics control.</strong> '
            "Compare every LENR hypothesis against this baseline set "
            "(conventional tunneling, screening, null recombination).</div>"
        )
    sigs = row.get("predicted_signatures") or []
    fals = row.get("falsifiers") or []
    cites = row.get("equation_citations") or []
    warnings = row.get("identifiability_warnings") or []
    parents = row.get("historical_parents") or []
    sources = row.get("primary_sources") or row.get("references") or []
    display_ver = row.get("display_model_version") or row.get("theory_model_version") or "—"

    return f"""
{model0_banner}
<section class="panel">
  <p><strong>Theory id:</strong> <span class="mono">{_esc(tid)}</span></p>
  <p><strong>Model version:</strong> {_esc(display_ver)}</p>
  <p><strong>Simulation implementation:</strong> <span class="mono">{_esc(row.get("theory_model_version") or "—")}</span></p>
  <p><strong>Taxonomy:</strong> {_esc(row.get("taxonomy_kind") or "—")} ·
     <strong>Control role:</strong> {_esc(control)}</p>
  <p><strong>Model fidelity:</strong> {_esc(row.get("model_fidelity"))} ·
     <strong>Empirical support:</strong> {_esc(row.get("empirical_support"))}</p>
  <p><strong>Historical parents:</strong> {_esc(", ".join(parents) if parents else "—")}</p>
</section>

<h2>What does this theory claim?</h2>
<p>{_esc(row.get("description") or "")}</p>

<h2>Predicted signatures</h2>
{_li_list(sigs)}

<h2>What would falsify this?</h2>
{_li_list(fals)}

<h2>Equation / source citations</h2>
{_li_list(cites)}

<h2>Identifiability warnings</h2>
{_li_list(warnings)}

<h2>Primary sources</h2>
{_li_list(sources)}

<h2>Epistemic status</h2>
<p>Independent maturity axes — not a single credibility percentage.
Fidelity describes simulator faithfulness to the named account; empirical
support describes evidence for the claim. Neither proves LENR.</p>

<p class="note">Interactive run: open the SPA Theory Testbed and enable
<span class="mono">{_esc(tid)}</span>. Static page is the no-JS audit surface.</p>
"""


def _index_body(rows: List[Dict[str, Any]]) -> str:
    model0 = [r for r in rows if r["theory_id"] in MODEL0_IDS]
    named = [r for r in rows if r["theory_id"] not in MODEL0_IDS]

    def table(items: List[Dict[str, Any]]) -> str:
        lines = [
            "<table><thead><tr><th>Model</th><th>Version</th><th>Taxonomy</th><th>Role</th></tr></thead><tbody>"
        ]
        for r in sorted(items, key=lambda x: x["theory_name"].lower()):
            tid = r["theory_id"]
            ver = r.get("display_model_version") or r.get("theory_model_version") or "—"
            lines.append(
                "<tr>"
                f'<td><a href="/models/{_esc(tid)}.html">{_esc(r["theory_name"])}</a>'
                f' <span class="mono">({_esc(tid)})</span></td>'
                f"<td>{_esc(ver)}</td>"
                f"<td>{_esc(r.get('taxonomy_kind') or '—')}</td>"
                f"<td>{_esc(r.get('control_role') or '—')}</td>"
                "</tr>"
            )
        lines.append("</tbody></table>")
        return "\n".join(lines)

    return f"""
<div class="panel">
  <p><strong>Comparative scientific workbench.</strong> LENR/CMNS refers to a
  class of reported anomalous thermal, nuclear and isotopic observations in
  hydrogen-loaded condensed-matter systems. The interpretation, reproducibility
  and underlying mechanism of these observations remain disputed. LENR-Sim makes
  competing explanations precise enough that they can fail.</p>
</div>

<h2>Model 0 — established-physics controls (required comparison set)</h2>
<p>Every experiment comparison should include these baselines.</p>
{table(model0)}

<h2>Named theories, mechanisms, and experiment-linked modules</h2>
{table(named)}

<h2>Related static pages</h2>
<ul>
  <li><a href="/methodology.html">Methodology</a></li>
  <li><a href="/validation.html">Validation</a></li>
  <li><a href="/sources.html">Sources</a></li>
  <li><a href="/experiments/">Experiments</a></li>
</ul>
"""


def _methodology_body() -> str:
    return """
<div class="panel">
  <p>LENR-Sim separates <strong>experiment/environment</strong>,
  <strong>known physical mechanisms</strong>, <strong>named LENR theories</strong>,
  <strong>proposed states/entities</strong>, and <strong>observed outputs</strong>.
  A universal cross-section multiplier is an educational abstraction only — not
  the Research Mode computational foundation.</p>
</div>
<h2>Recommended workflow</h2>
<ol>
  <li>Choose experiment / environment</li>
  <li>Enter measured conditions</li>
  <li>Select candidate theories + Model 0 baselines</li>
  <li>Compare predicted signatures</li>
  <li>Inspect falsifiers, equation citations, and identifiability warnings</li>
</ol>
<h2>Learning Mode vs Research Mode</h2>
<p><strong>Learning Mode</strong> (SPA): conceptual explanations and simplified
paths. <strong>Research Mode</strong>: author equations, model versions, units,
uncertainties, and paper fidelity. Mode UI switch is deferred; metadata and
static pages already expose Research Mode fields.</p>
<h2>Honesty</h2>
<p>No theory leaderboard credibility percentages. Maturity axes stay independent.
<code>EQ-OPEN-*</code> remain open.</p>
"""


def _validation_body() -> str:
    return """
<p>Validation surfaces include paper-reproduction benchmarks under
<code>backend/tests/test_paper_benchmarks/</code>, science-gate contract locks,
and per-theory falsifiers on each model page.</p>
<ul>
  <li>Source fidelity ≠ empirical support</li>
  <li>Phenomenological stubs must not invent author rate laws</li>
  <li>Null/baseline controls must remain available for every comparison</li>
</ul>
<p>See also <a href="/models/">model registry</a> and the interactive SPA
analytics / theory testbed.</p>
"""


def _sources_body(rows: List[Dict[str, Any]]) -> str:
    lines = ["<p>Primary sources aggregated from the theory registry.</p>", "<ul>"]
    seen = set()
    for r in sorted(rows, key=lambda x: x["theory_name"].lower()):
        for src in r.get("primary_sources") or r.get("references") or []:
            key = (r["theory_id"], src)
            if key in seen:
                continue
            seen.add(key)
            lines.append(
                f'<li><a href="/models/{_esc(r["theory_id"])}.html">{_esc(r["theory_name"])}</a>: {_esc(src)}</li>'
            )
    lines.append("</ul>")
    return "\n".join(lines)


def _experiments_body() -> str:
    return """
<p>Experiment/environment templates (static index). Interactive campaign
templates live in the SPA; this page is the crawler-readable outline.</p>
<table>
  <thead><tr><th>Environment</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Pd-D electrolysis</td><td>Classic electrochemical loading</td></tr>
    <tr><td>Pd-D gas loading</td><td>Gas-phase deuterium</td></tr>
    <tr><td>Ni-H gas loading</td><td>Elevated-temperature Ni-H</td></tr>
    <tr><td>NiCu multilayer</td><td>Thin-film / multilayer cells</td></tr>
    <tr><td>D permeation</td><td>Iwamura-style permeation test bed</td></tr>
    <tr><td>Laser H(0)/D(0)</td><td>Holmlid-linked ultra-dense hydrogen claims</td></tr>
    <tr><td>Electrical discharge / EVO</td><td>Shoulders-linked phenomenology</td></tr>
    <tr><td>Driven lattice / LCF</td><td>Lattice-confinement fusion control bridge</td></tr>
  </tbody>
</table>
<p>Select candidate theories on <a href="/models/">/models/</a> and always
include Model 0 baselines.</p>
"""


def generate() -> List[Path]:
    from app.physics_engine.theory_pipeline import get_default_pipeline

    # Fresh pipeline each run
    import app.physics_engine.theory_pipeline as tp

    tp._default_pipeline = None
    rows = get_default_pipeline().list_theories()
    assert rows, "theory registry empty"

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    EXPERIMENTS_DIR.mkdir(parents=True, exist_ok=True)
    written: List[Path] = []

    index_path = MODELS_DIR / "index.html"
    index_path.write_text(
        _page(
            "LENR-Sim model registry",
            "Crawler-readable registry of LENR/CMNS theories, Model 0 baselines, and epistemic status.",
            _index_body(rows),
            canonical="/models/",
        ),
        encoding="utf-8",
    )
    written.append(index_path)

    for row in rows:
        tid = row["theory_id"]
        path = MODELS_DIR / f"{tid}.html"
        path.write_text(
            _page(
                f"{row['theory_name']} — LENR-Sim model",
                (row.get("description") or row["theory_name"])[:300],
                _model_body(row),
                canonical=f"/models/{tid}.html",
            ),
            encoding="utf-8",
        )
        written.append(path)

    for name, body, title, desc in (
        (
            PUBLIC / "methodology.html",
            _methodology_body(),
            "LENR-Sim methodology",
            "Taxonomy, Learning vs Research Mode, and comparative workbench methodology.",
        ),
        (
            PUBLIC / "validation.html",
            _validation_body(),
            "LENR-Sim validation",
            "Paper benchmarks, falsifiers, and science-gate validation surfaces.",
        ),
        (
            PUBLIC / "sources.html",
            _sources_body(rows),
            "LENR-Sim sources",
            "Primary sources for registered LENR-Sim theory modules.",
        ),
        (
            EXPERIMENTS_DIR / "index.html",
            _experiments_body(),
            "LENR-Sim experiments",
            "Experiment and environment templates for comparative theory runs.",
        ),
    ):
        name.parent.mkdir(parents=True, exist_ok=True)
        name.write_text(
            _page(title, desc, body, canonical=f"/{name.relative_to(PUBLIC).as_posix()}"),
            encoding="utf-8",
        )
        written.append(name)

    return written


def main() -> int:
    paths = generate()
    print(f"Wrote {len(paths)} static pages under {PUBLIC}")
    for p in paths:
        print(f"  {p.relative_to(APP_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

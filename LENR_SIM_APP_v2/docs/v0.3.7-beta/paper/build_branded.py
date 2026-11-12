#!/usr/bin/env python3
"""Build Conscious Energies branded Unified Theory Paper HTML (+ helpers)."""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

import markdown
from markdown.extensions.toc import TocExtension
from markdown.extensions.tables import TableExtension
from markdown.extensions.fenced_code import FencedCodeExtension
from markdown.extensions.nl2br import Nl2BrExtension

PAPER_DIR = Path(__file__).resolve().parent
REPO_ROOT = PAPER_DIR.parents[3]  # lenr_sim_app
SRC = REPO_ROOT / "docs" / "A_Unified_Theoretical_Framework_for_LENR.md"
OUT_HTML = PAPER_DIR / "A_Unified_Theoretical_Framework_for_LENR.html"
REPO_HTML = OUT_HTML

TITLE = (
    "A Unified Theoretical and Mathematical Framework for "
    "Low-Energy Nuclear Reactions (LENR)"
)
SHORT_TITLE = "Unified Theoretical Framework for LENR"
SUBTITLE = "Coupling is all you need"
CANONICAL = "https://lenr-sim-beta.conscious.energy/theory-paper"
OG_IMAGE = (
    "https://conscious.energy/wp-content/uploads/2022/10/"
    "CE-Featured-Image-1200-%C3%97-675-px-2.png"
)
SITE = "https://www.conscious.energy"
BETA = "https://lenr-sim-beta.conscious.energy"
BETA_PAPER = f"{BETA}/theory-paper"
DATE_PUBLISHED = "2026-02-14"
DATE_MODIFIED = "2026-11-12"

# Brand from live CE favicon / featured image (oceanic blue, energy accent)
CE_NAVY = "#001848"
CE_DEEP = "#002454"
CE_PRIMARY = "#005490"
CE_MID = "#185f97"
CE_LIGHT = "#4a90b8"
CE_SKY = "#7eb6d4"
CE_ACCENT = "#e87722"  # warm energy accent from app spectrum (sparingly)
CE_PAPER = "#f7fafc"
CE_INK = "#0f1c2e"
CE_MUTED = "#3d5266"

def _ce_logo_data_uri() -> str:
    import base64

    candidates = [
        PAPER_DIR / "ce-logo-hex.png",
        Path("/cursor/stores/bc-5b00a6aa-1b96-4ba5-8554-8c49079a113f/docs/ce-logo-hex.png"),
        Path("/cursor/stores/self/docs/ce-logo-hex.png"),
    ]
    for p in candidates:
        if p.exists():
            b64 = base64.b64encode(p.read_bytes()).decode("ascii")
            return f"data:image/png;base64,{b64}"
    raise FileNotFoundError("CE hex logo PNG not found")


CE_LOGO_URI = _ce_logo_data_uri()
CE_MARK_IMG = (
    f'<img class="ce-mark" src="{CE_LOGO_URI}" width="56" height="56" '
    f'alt="Conscious Energies" decoding="async"/>'
)


def grab(label: str, text: str) -> str:
    m = re.search(rf"\*\*{re.escape(label)}:\*\*\s*(.+)", text)
    return m.group(1).strip() if m else ""


def slugify(text: str) -> str:
    t = re.sub(r"<[^>]+>", "", text)
    t = html.unescape(t)
    t = t.replace("\\.", ".")
    t = re.sub(r"[*_`]", "", t)
    t = t.strip().lower()
    t = re.sub(r"[^a-z0-9]+", "-", t)
    return t.strip("-") or "section"


_CITE_ONLY = re.compile(r"^[\d,\s\-–—]+$")
_UNIT_TOKEN = (
    r"(?:GeV|MeV|keV|eV|meV|cm|nm|μm|um|fm|mm|pm|m|s|J|N|V|K|Hz|W|Pa|mol)"
)


def normalize_tex(tex: str) -> str:
    """Repair over-escaped markdown math for KaTeX (\\=, \\+, \\-, \\_, \\\\cmd, nested $)."""
    tex = tex.strip()
    # Drop trailing lone backslashes from export artifacts
    tex = re.sub(r"\\\\\s*$", "", tex)
    tex = re.sub(r"\\\s*$", "", tex)
    # Nested dollar math inside already-math contexts → plain text/commands
    tex = tex.replace("$^3$", "^{3}")
    tex = tex.replace("$^2$", "^{2}")
    tex = re.sub(r"\$([^$]+)\$", r"\1", tex)
    # Soft-escaped operators from Word/Docs-style markdown
    tex = tex.replace(r"\=", "=")
    tex = tex.replace(r"\+", "+")
    # \- is not unary minus in KaTeX; keep LaTeX commands like \frac intact
    tex = re.sub(r"(?<![A-Za-z])\\-(?![A-Za-z])", "-", tex)
    # HTML entities that may appear in dollar leftovers after markdown
    tex = (
        tex.replace("&gt;", ">")
        .replace("&lt;", "<")
        .replace("&amp;", "&")
        .replace(r"\>", ">")
        .replace(r"\<", "<")
    )
    # Over-escaped underscores: P\_{...} / \epsilon\_0 → P_{...} / \epsilon_0
    tex = tex.replace(r"\_{", "_{")
    tex = tex.replace(r"\_", "_")
    # Appendix / reconciliation blocks double-escape TeX commands (\\frac, \\partial, \\,).
    double_cmds = len(re.findall(r"\\\\[A-Za-z]", tex))
    if double_cmds >= 2:
        for _ in range(2):
            tex = re.sub(r"\\\\([A-Za-z]+)", r"\\\1", tex)
            tex = re.sub(r"\\\\([,;:!])", r"\\\1", tex)
            tex = re.sub(r"\\\\([\^_])", r"\\\1", tex)
    # Unicode middot in \text{...} is invalid as \cdot there — use hyphen.
    tex = tex.replace("·", "-")
    tex = tex.replace("⋅", "-")
    return tex.strip()


def convert_dollar_math(md: str) -> str:
    """Normalize legacy $...$ / $$...$$ delimiters to \\( \\) / \\[ \\]."""
    # Unit brackets with nested dollars must not be dollar-split.
    md = re.sub(
        r"\\\[C/m\$\^3\$\\\]",
        r"`[\\mathrm{C}/\\mathrm{m}^{3}]`",
        md,
    )
    md = re.sub(r"\$\$([\s\S]+?)\$\$", r"\\[\1\\]", md)
    # Merge $tex$$^n$ unit-split dollars before converting
    md = re.sub(r"\$([^$\n]+?)\$\s*\$(\^[^$\n]+?)\$", r"$\1\2$", md)
    md = re.sub(
        r"(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)",
        r"\\(\1\\)",
        md,
    )
    return md


def merge_unit_exponent_fragments(md: str) -> str:
    """Merge unit/exponent splits into one inline math span for readability."""
    # \(tex\) GeV\(^{-2}\)  or  \(tex\) m\(^2\)
    md = re.sub(
        rf"\\\((.+?)\\\)\s*({_UNIT_TOKEN})\s*\\\((\^\{{[^}}]+\}}|\^\d+)\\\)",
        lambda m: f"\\({m.group(1)}\\,\\mathrm{{{m.group(2)}}}{m.group(3)}\\)",
        md,
        flags=re.I | re.S,
    )
    # Bare exponent after unit word outside math already handled; also μ-as-prefix:
    # \(A = 1\,\mu\)\(^2\) → already covered if second is ^2 with empty unit between
    md = re.sub(
        r"\\\((.+?)\\\)\s*\\\((\^\{[^}]+\}|\^\d+)\\\)",
        lambda m: f"\\({m.group(1)}{m.group(2)}\\)",
        md,
        flags=re.S,
    )
    # Range bands: \(10^{3}\)–\(10^{5}\)
    md = re.sub(
        r"\\\((10\^\{?\d+\}?)\\\)\s*[–—-]\s*\\\((10\^\{?\d+\}?)\\\)",
        r"\\(\1\\text{–}\2\\)",
        md,
    )
    return md


def protect_math(md: str) -> tuple[str, list[str]]:
    """Stash real math; convert numeric \\[1,4\\] citation escapes to [1,4]."""
    slots: list[str] = []
    md = convert_dollar_math(md)
    md = merge_unit_exponent_fragments(md)
    # Interval notation mistakenly written as display math inside inline math,
    # e.g. \( x \in \[0.6, 1.1\] \) → \( x \in [0.6, 1.1] \) (builder-only).
    md = re.sub(
        r"\\\[(\d+\.\d+\s*,\s*\d+\.\d+)\\\]",
        r"[\1]",
        md,
    )

    def stash_display(m: re.Match) -> str:
        inner = m.group(1).strip()
        # Manuscript uses \[n\] / \[n,m\] for bibliography pointers, not math.
        if _CITE_ONLY.match(inner):
            return f"[{inner}]"
        # Unit brackets like \[C/m$^3$\] or \[C/m\(^3\)\] → upright units.
        unit_inner = re.sub(r"\\\(([^)]+)\\\)", r"\1", inner)
        unit_inner = unit_inner.replace("$", "")
        if (
            len(inner) < 40
            and "=" not in inner
            and r"\frac" not in inner
            and (
                "/" in inner
                or inner.startswith("C/")
                or "$" in inner
                or "\\(" in inner
            )
            and re.match(r"^[A-Za-z0-9/$.\\^{}_\\()\\\-]+$", inner)
        ):
            unit = normalize_tex(unit_inner)
            unit = re.sub(r"\^(\d+)", r"^{\1}", unit)
            return f"`[{unit}]`"
        slots.append("\\[" + normalize_tex(inner) + "\\]")
        return f"@@MATH{len(slots)-1}@@"

    def stash_inline(m: re.Match) -> str:
        inner = m.group(1)
        slots.append("\\(" + normalize_tex(inner) + "\\)")
        return f"@@MATH{len(slots)-1}@@"

    md = re.sub(r"\\\[(.+?)\\\]", stash_display, md, flags=re.S)
    md = re.sub(r"\\\((.+?)\\\)", stash_inline, md, flags=re.S)
    return md, slots


def restore_math(html_body: str, slots: list[str]) -> str:
    def repl(m: re.Match) -> str:
        i = int(m.group(1))
        raw = slots[i]
        if raw.startswith("\\["):
            inner = raw[2:-2].strip()
            return (
                f'<div class="math-display" role="math" data-tex="{html.escape(inner, quote=True)}" '
                f'data-display="1" aria-label="Display equation">'
                f'<noscript>{html.escape(inner)}</noscript></div>'
            )
        inner = raw[2:-2].strip()
        return (
            f'<span class="math-inline" role="math" data-tex="{html.escape(inner, quote=True)}" '
            f'data-display="0" aria-label="Inline equation">'
            f'<noscript>{html.escape(inner)}</noscript></span>'
        )

    return re.sub(r"@@MATH(\d+)@@", repl, html_body)


def clean_heading_text(text: str) -> str:
    text = text.replace("\\.", ".")
    text = re.sub(r"\*\*", "", text)
    return text.strip()


def extract_front(md: str) -> dict:
    body_start = md.find("## **1")
    if body_start < 0:
        body_start = md.find("## 1")
    front = md[:body_start] if body_start > 0 else md
    body = md[body_start:] if body_start > 0 else ""

    abs_m = re.search(r"\*\*Abstract\*\*\s*\n(.+?)(?:\n---|\n## )", front, re.S)
    abstract = abs_m.group(1).strip() if abs_m else ""

    keywords = grab("Keywords", front)
    authors = grab("Authors", front)
    date_line = ""
    dm = re.search(r"^Date:\s*(.+)$", front, re.M)
    if dm:
        date_line = dm.group(1).strip()
    org = ""
    om = re.search(r"^Organization:\s*(.+)$", front, re.M)
    if om:
        org = om.group(1).strip()

    contrib_m = re.search(
        r"\*\*Author Contributions & AI Assistance\.\*\*\s*(.+?)(?:\n\n\*\*|\n---)",
        front,
        re.S,
    )
    contrib = contrib_m.group(1).strip() if contrib_m else ""

    epist_m = re.search(
        r"\*\*Epistemic posture\.\*\*\s*(.+?)(?:\n\n\*\*Abstract\*\*|\n---)",
        front,
        re.S,
    )
    epistemic = epist_m.group(1).strip() if epist_m else ""

    revisions = re.findall(
        r"\*\*Revision note \(([^)]+)\)\.\*\*\s*(.+?)(?=\n\n\*\*Revision note|\n\n\*\*Keywords|\n\n\*\*Author)",
        front,
        re.S,
    )

    subtitle = grab("Subtitle", front) or SUBTITLE
    return {
        "abstract": abstract,
        "keywords": keywords,
        "authors": authors,
        "date_line": date_line,
        "org": org or "Conscious Energies | www.conscious.energy",
        "contrib": contrib,
        "epistemic": epistemic,
        "revisions": revisions,
        "subtitle": subtitle,
        "body": body,
    }


def md_to_html(text: str) -> str:
    text, slots = protect_math(text)
    # Normalize bold headings: ## **1. Title** → ## 1. Title
    def clean_h(m: re.Match) -> str:
        return f"{m.group(1)} {clean_heading_text(m.group(2))}"

    text = re.sub(r"^(#{1,6})\s+\*\*(.+?)\*\*\s*$", clean_h, text, flags=re.M)
    text = re.sub(
        r"^(#{1,6})\s+(.+)$",
        lambda m: f"{m.group(1)} {clean_heading_text(m.group(2))}",
        text,
        flags=re.M,
    )
    # Escape bare HTML-ish but keep markdown
    html_body = markdown.markdown(
        text,
        extensions=[
            TocExtension(permalink=False, toc_depth="2-4"),
            TableExtension(),
            FencedCodeExtension(),
            "sane_lists",
            "smarty",
        ],
        output_format="html5",
    )
    html_body = restore_math(html_body, slots)
    return html_body


def add_heading_ids_and_toc(body_html: str) -> tuple[str, str, list[dict]]:
    toc_items: list[dict] = []
    imrad_map = {
        "abstract": "Abstract",
        "1-introduction": "Introduction",
        "3-computational-methods": "Methods",
        "5-results-and-discussion": "Results",
        "5a-open-theoretical-challenges-and-fundamental-questions": "Open questions",
        "6-conclusion": "Discussion",
        "references": "References",
    }

    def heading_repl(m: re.Match) -> str:
        level = int(m.group(1))
        attrs = m.group(2) or ""
        inner = m.group(3)
        existing_id = re.search(r'\bid="([^"]+)"', attrs)
        sid = existing_id.group(1) if existing_id else slugify(inner)
        base = sid
        n = 2
        known = {t["id"] for t in toc_items}
        while sid in known:
            sid = f"{base}-{n}"
            n += 1
        plain = re.sub(r"<[^>]+>", "", inner)
        plain = html.unescape(plain)
        if level <= 3:
            toc_items.append({"id": sid, "level": level, "text": plain})
        return f'<h{level} id="{sid}">{inner}</h{level}>'

    body_html = re.sub(
        r"<h([1-6])([^>]*)>(.*?)</h\1>", heading_repl, body_html, flags=re.S
    )

    # Build TOC HTML
    lines = ['<nav class="toc" aria-label="Table of contents" id="toc">', "<ol>"]
    for item in toc_items:
        if item["level"] == 2:
            lines.append(
                f'<li class="toc-l2"><a href="#{item["id"]}">{html.escape(item["text"])}</a></li>'
            )
        elif item["level"] == 3:
            lines.append(
                f'<li class="toc-l3"><a href="#{item["id"]}">{html.escape(item["text"])}</a></li>'
            )
    lines.append("</ol></nav>")
    toc_html = "\n".join(lines)

    # IMRaD quick nav
    imrad = ['<nav class="imrad" aria-label="Academic section shortcuts"><ul>']
    # Always include abstract anchor
    imrad.append('<li><a href="#abstract">Abstract</a></li>')
    for tid, label in [
        ("1-introduction", "Introduction"),
        ("3-computational-methods", "Methods"),
        ("5-results-and-discussion", "Results"),
        (
            "5a-open-theoretical-challenges-and-fundamental-questions",
            "Open questions",
        ),
        ("6-conclusion", "Conclusion"),
        ("references", "References"),
    ]:
        # find best matching id
        match = next((t for t in toc_items if t["id"].startswith(tid.split("-")[0]) and label.lower().split()[0] in t["text"].lower()), None)
        # simpler: search by start of text
        if not match:
            for t in toc_items:
                if t["level"] == 2 and (
                    t["id"] == tid
                    or t["text"].lower().startswith(label.lower().split()[0])
                    or (label == "Open questions" and "5a" in t["text"].lower())
                    or (label == "Open questions" and t["text"].startswith("5A"))
                ):
                    match = t
                    break
        href = f"#{match['id']}" if match else f"#{tid}"
        if label == "Introduction":
            for t in toc_items:
                if t["level"] == 2 and "Introduction" in t["text"]:
                    href = f"#{t['id']}"
                    break
        elif label == "Methods":
            for t in toc_items:
                if t["level"] == 2 and "Computational Methods" in t["text"]:
                    href = f"#{t['id']}"
                    break
        elif label == "Results":
            for t in toc_items:
                if t["level"] == 2 and t["text"].startswith("5.") and "Results" in t["text"]:
                    href = f"#{t['id']}"
                    break
        elif label == "Open questions":
            for t in toc_items:
                if t["level"] == 2 and ("5A" in t["text"] or "Open Theoretical" in t["text"]):
                    href = f"#{t['id']}"
                    break
        elif label == "Conclusion":
            for t in toc_items:
                if t["level"] == 2 and t["text"].startswith("6"):
                    href = f"#{t['id']}"
                    break
        elif label == "References":
            for t in toc_items:
                if "References" in t["text"]:
                    href = f"#{t['id']}"
                    break
        imrad.append(f'<li><a href="{href}">{label}</a></li>')
    imrad.append("</ul></nav>")
    return body_html, toc_html, toc_items


def meta_description(abstract: str) -> str:
    plain = re.sub(r"\s+", " ", abstract).strip()
    # Keep honesty
    suffix = (
        " Exploratory models only; lenr_proved remains false; "
        "all EQ-OPEN-* obligations remain OPEN."
    )
    budget = 300 - len(suffix)
    if len(plain) > budget:
        plain = plain[: budget - 1].rsplit(" ", 1)[0] + "…"
    return plain + suffix


def build_html(meta: dict, body_html: str, toc_html: str) -> str:
    desc = meta_description(meta["abstract"])
    keywords = meta["keywords"]
    kw_list = [k.strip() for k in keywords.split(";") if k.strip()]

    abs_html = md_to_html(meta["abstract"])
    # abstract md_to_html may wrap in <p>
    epist_html = md_to_html(meta["epistemic"]) if meta["epistemic"] else ""
    contrib_html = md_to_html(meta["contrib"]) if meta["contrib"] else ""

    rev_items = []
    for when, note in meta["revisions"]:
        rev_items.append(
            f"<li><strong>{html.escape(when)}.</strong> "
            f"{md_to_html(note.strip())}</li>"
        )
    rev_block = (
        "<details class=\"revisions\"><summary>Revision history "
        f"({len(rev_items)} notes)</summary><ol>{''.join(rev_items)}</ol></details>"
        if rev_items
        else ""
    )

    json_ld = {
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        "headline": TITLE,
        "alternativeHeadline": meta["subtitle"],
        "name": TITLE,
        "abstract": meta["abstract"],
        "datePublished": DATE_PUBLISHED,
        "dateModified": DATE_MODIFIED,
        "inLanguage": "en",
        "isAccessibleForFree": True,
        "url": CANONICAL,
        "mainEntityOfPage": CANONICAL,
        "keywords": kw_list,
        "author": [
            {
                "@type": "Person",
                "name": "Diadon Acs",
                "affiliation": {
                    "@type": "Organization",
                    "name": "Conscious Energies",
                    "url": SITE,
                },
            }
        ],
        "publisher": {
            "@type": "Organization",
            "name": "Conscious Energies",
            "url": SITE,
            "logo": {
                "@type": "ImageObject",
                "url": "https://lenr-sim-beta.conscious.energy/favicon.png?v=ce-2",
            },
        },
        "license": "https://www.gnu.org/licenses/gpl-3.0.html",
        "creativeWorkStatus": "Preprint companion software documentation",
        "about": [
            "Low-Energy Nuclear Reactions",
            "Condensed-matter nuclear hypotheses",
            "Claim-tiered modelling",
        ],
        "description": desc,
        "image": OG_IMAGE,
    }

    how_to_cite = (
        "Acs, D. (2026). <em>A Unified Theoretical and Mathematical Framework "
        "for Low-Energy Nuclear Reactions (LENR)</em> [Preprint companion "
        "software]. Conscious Energies. "
        f'<a href="{html.escape(CANONICAL)}">{html.escape(CANONICAL)}</a>. '
        "DOI: none (preprint companion software). "
        "<code>lenr_proved</code> remains false; all <code>EQ-OPEN-*</code> remain OPEN."
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{html.escape(SHORT_TITLE)} — Conscious Energies</title>
<meta name="description" content="{html.escape(desc)}"/>
<meta name="author" content="Diadon Acs, Conscious Energies"/>
<meta name="keywords" content="{html.escape(', '.join(kw_list))}"/>
<meta name="robots" content="index,follow,max-image-preview:large"/>
<meta name="color-scheme" content="light"/>
<link rel="canonical" href="{html.escape(CANONICAL)}"/>
<link rel="icon" type="image/png" href="{CE_LOGO_URI}"/>

<meta property="og:type" content="article"/>
<meta property="og:site_name" content="Conscious Energies"/>
<meta property="og:locale" content="en_US"/>
<meta property="og:title" content="{html.escape(TITLE)}"/>
<meta property="og:description" content="{html.escape(desc)}"/>
<meta property="og:url" content="{html.escape(CANONICAL)}"/>
<meta property="og:image" content="{html.escape(OG_IMAGE)}"/>
<meta property="og:image:alt" content="Conscious Energies brand imagery"/>
<meta property="article:published_time" content="{DATE_PUBLISHED}"/>
<meta property="article:modified_time" content="{DATE_MODIFIED}"/>
<meta property="article:author" content="Diadon Acs"/>
<meta property="article:section" content="Research"/>
{''.join(f'<meta property="article:tag" content="{html.escape(k)}"/>' for k in kw_list)}

<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{html.escape(SHORT_TITLE)}"/>
<meta name="twitter:description" content="{html.escape(desc)}"/>
<meta name="twitter:image" content="{html.escape(OG_IMAGE)}"/>
<meta name="twitter:image:alt" content="Conscious Energies"/>

<script type="application/ld+json">
{json.dumps(json_ld, ensure_ascii=False, indent=2)}
</script>

<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css" crossorigin="anonymous"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&amp;family=Source+Sans+3:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap"/>

<style>
:root {{
  --ce-navy: {CE_NAVY};
  --ce-deep: {CE_DEEP};
  --ce-primary: {CE_PRIMARY};
  --ce-mid: {CE_MID};
  --ce-light: {CE_LIGHT};
  --ce-sky: {CE_SKY};
  --ce-accent: {CE_ACCENT};
  --ce-paper: {CE_PAPER};
  --ce-ink: {CE_INK};
  --ce-muted: {CE_MUTED};
  --ce-line: rgba(0, 36, 84, 0.14);
  --ce-warn-bg: #eef6fb;
  --max: 46rem;
  --side: 16rem;
}}
*, *::before, *::after {{ box-sizing: border-box; }}
html {{ scroll-behavior: smooth; overflow-x: clip; }}
body {{
  margin: 0;
  overflow-x: clip;
  max-width: 100%;
  color: var(--ce-ink);
  background:
    radial-gradient(1200px 500px at 10% -10%, rgba(126, 182, 212, 0.35), transparent 60%),
    radial-gradient(900px 420px at 100% 0%, rgba(0, 84, 144, 0.18), transparent 55%),
    linear-gradient(180deg, #e8f1f7 0%, var(--ce-paper) 28%, #ffffff 100%);
  font-family: "Source Serif 4", "Source Serif Pro", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  font-size: 1.0625rem;
  line-height: 1.7;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}}
.skip-link {{
  position: absolute; left: -999px; top: 0; background: var(--ce-navy); color: #fff;
  padding: 0.6rem 1rem; z-index: 1000; border-radius: 0 0 0.4rem 0;
}}
.skip-link:focus {{ left: 0; }}
a {{ color: var(--ce-primary); text-underline-offset: 0.15em; }}
a:hover {{ color: var(--ce-deep); }}
code, .tt {{
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  background: rgba(0, 84, 144, 0.07);
  padding: 0.08em 0.28em;
  border-radius: 0.25rem;
}}
.site-header {{
  background: linear-gradient(135deg, var(--ce-navy) 0%, var(--ce-deep) 42%, var(--ce-primary) 100%);
  color: #eef6fb;
  border-bottom: 3px solid var(--ce-accent);
}}
.site-header-inner {{
  max-width: calc(var(--max) + var(--side) + 4rem);
  margin: 0 auto;
  padding: 1.1rem 1.25rem 1.35rem;
  display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between;
}}
.brand {{
  display: flex; gap: 0.85rem; align-items: center; text-decoration: none; color: inherit;
}}
.ce-mark {{
  width: 56px; height: 56px; border-radius: 0.5rem;
  background: transparent; flex: 0 0 auto; object-fit: contain;
  image-rendering: -webkit-optimize-contrast;
}}
.brand-text {{ display: flex; flex-direction: column; gap: 0.1rem; }}
.brand-name {{
  font-family: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
  font-weight: 700; font-size: 1.35rem; letter-spacing: 0.02em;
}}
.brand-url {{
  font-family: "Source Sans 3", sans-serif;
  font-size: 0.85rem; opacity: 0.9; font-weight: 500;
}}
.header-links {{
  display: flex; flex-wrap: wrap; gap: 0.75rem;
  font-family: "Source Sans 3", sans-serif; font-size: 0.9rem;
}}
.header-links a {{
  color: #fff; text-decoration: none; border: 1px solid rgba(255,255,255,0.35);
  padding: 0.35rem 0.7rem; border-radius: 0.35rem; background: rgba(255,255,255,0.06);
}}
.header-links a:hover {{ background: rgba(255,255,255,0.14); }}
.masthead {{
  max-width: calc(var(--max) + var(--side) + 4rem);
  margin: 0 auto;
  padding: 2.25rem 1.25rem 1.5rem;
}}
.masthead-kicker {{
  font-family: "Source Sans 3", sans-serif;
  text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.78rem;
  color: var(--ce-mid); font-weight: 700; margin: 0 0 0.75rem;
}}
.masthead h1 {{
  font-size: clamp(1.55rem, 2.4vw, 2.15rem);
  line-height: 1.22; margin: 0 0 0.55rem; color: var(--ce-navy);
  font-weight: 700; max-width: 40rem;
}}
.subtitle {{
  font-size: 1.2rem; font-style: italic; color: var(--ce-mid); margin: 0 0 1.1rem;
}}
.meta-grid {{
  display: grid; gap: 0.45rem;
  font-family: "Source Sans 3", sans-serif; font-size: 0.95rem; color: var(--ce-muted);
  max-width: 42rem;
}}
.meta-grid strong {{ color: var(--ce-ink); font-weight: 600; }}
.honesty-banner {{
  margin: 1.25rem 0 0;
  padding: 0.9rem 1rem;
  border-left: 4px solid var(--ce-accent);
  background: var(--ce-warn-bg);
  border-radius: 0 0.4rem 0.4rem 0;
  font-family: "Source Sans 3", sans-serif;
  font-size: 0.95rem;
}}
.honesty-banner strong {{ color: var(--ce-navy); }}
.layout {{
  max-width: min(calc(var(--max) + var(--side) + 4rem), 100%);
  margin: 0 auto;
  padding: 0 1.25rem 3rem;
  display: grid;
  grid-template-columns: var(--side) minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}}
.sidebar {{
  position: sticky; top: 0.75rem; max-height: calc(100vh - 1.5rem); overflow: auto;
  font-family: "Source Sans 3", sans-serif; font-size: 0.86rem;
  padding-right: 0.25rem;
}}
.imrad ul {{
  list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-wrap: wrap; gap: 0.35rem;
}}
.imrad a {{
  display: inline-block; text-decoration: none; color: var(--ce-primary);
  border: 1px solid var(--ce-line); padding: 0.25rem 0.5rem; border-radius: 0.3rem;
  background: #fff;
}}
.imrad a:hover {{ background: #eef6fb; }}
.toc {{
  background: rgba(255,255,255,0.72); border: 1px solid var(--ce-line);
  border-radius: 0.5rem; padding: 0.75rem 0.85rem;
}}
.toc ol {{ list-style: none; padding: 0; margin: 0; }}
.toc li {{ margin: 0.28rem 0; }}
.toc-l2 > a {{ font-weight: 600; color: var(--ce-navy); text-decoration: none; }}
.toc-l3 {{ padding-left: 0.75rem; }}
.toc-l3 > a {{ color: var(--ce-muted); text-decoration: none; }}
.toc a:hover {{ text-decoration: underline; }}
main.paper {{
  background: rgba(255,255,255,0.92);
  border: 1px solid var(--ce-line);
  border-radius: 0.65rem;
  padding: 1.75rem 1.6rem 2.25rem;
  box-shadow: 0 10px 30px rgba(0, 24, 72, 0.06);
  max-width: 42rem;
  min-width: 0;
  width: 100%;
  overflow-wrap: anywhere;
}}
.paper .body-sections p,
.paper .abstract p,
.paper .epistemic-block p,
.paper .contrib p {{
  max-width: 40rem;
}}
.cite-block, .keywords, .affiliations, .contrib, .epistemic-block {{
  margin: 1rem 0;
}}
.cite-block {{
  background: #f0f6fa; border: 1px solid var(--ce-line); border-radius: 0.45rem;
  padding: 0.85rem 1rem; font-size: 0.95rem;
}}
.cite-block h2 {{
  font-family: "Source Sans 3", sans-serif; font-size: 0.95rem;
  margin: 0 0 0.4rem; color: var(--ce-navy); text-transform: uppercase;
  letter-spacing: 0.06em;
}}
.keywords {{
  font-family: "Source Sans 3", sans-serif; font-size: 0.95rem;
}}
details.revisions {{
  margin: 1rem 0 1.25rem; font-family: "Source Sans 3", sans-serif; font-size: 0.92rem;
  border: 1px solid var(--ce-line); border-radius: 0.45rem; padding: 0.55rem 0.8rem;
  background: #fff;
}}
details.revisions summary {{ cursor: pointer; font-weight: 600; color: var(--ce-navy); }}
details.revisions ol {{ padding-left: 1.2rem; }}
details.revisions li {{ margin: 0.55rem 0; }}
section.abstract {{
  margin: 1.25rem 0 1.75rem;
}}
section.abstract h2 {{
  font-size: 1.15rem; color: var(--ce-navy); margin: 0 0 0.5rem;
  font-family: "Source Sans 3", sans-serif; letter-spacing: 0.04em;
  text-transform: uppercase;
}}
.paper h2 {{
  color: var(--ce-navy); font-size: 1.35rem; margin: 2rem 0 0.7rem;
  padding-top: 0.4rem; border-top: 1px solid var(--ce-line);
}}
.paper h2:first-of-type {{ border-top: 0; padding-top: 0; }}
.paper h3 {{ color: var(--ce-deep); font-size: 1.12rem; margin: 1.4rem 0 0.5rem; }}
.paper h4 {{ color: var(--ce-mid); font-size: 1.02rem; margin: 1.15rem 0 0.4rem; }}
.paper p {{ margin: 0.7rem 0; }}
.paper ul, .paper ol {{ padding-left: 1.3rem; }}
.paper li {{ margin: 0.25rem 0; }}
.paper blockquote {{
  margin: 1rem 0; padding: 0.6rem 0.9rem; border-left: 3px solid var(--ce-light);
  background: #f3f8fb; color: var(--ce-muted);
}}
.paper table {{
  width: 100%; border-collapse: collapse; font-size: 0.92rem; margin: 1rem 0;
  font-family: "Source Sans 3", sans-serif; overflow-x: auto; display: block;
}}
.paper th, .paper td {{
  border: 1px solid var(--ce-line); padding: 0.4rem 0.55rem; text-align: left;
}}
.paper th {{ background: #e8f1f7; color: var(--ce-navy); }}
.math-display {{
  display: block; overflow-x: auto; max-width: 100%; margin: 1.1rem 0; padding: 0.85rem 0.75rem;
  text-align: center; background: #f5f9fc; border-radius: 0.4rem;
  border: 1px solid rgba(0, 84, 144, 0.08);
  line-height: 1.55;
  -webkit-overflow-scrolling: touch;
}}
.math-display .katex-display {{ margin: 0; max-width: 100%; overflow-x: auto; }}
.math-display .katex {{ max-width: 100%; }}
.math-inline {{
  white-space: nowrap; padding: 0 0.05em;
}}
.math-inline .katex {{ font-size: 1.05em; }}
.katex-error, .math-fallback {{
  font-family: "IBM Plex Mono", monospace; font-size: 0.88em; color: var(--ce-deep);
}}
.paper {{
  --reading-measure: 40rem;
}}
.site-footer {{
  background: var(--ce-navy); color: #d7e8f4;
  padding: 2rem 1.25rem; margin-top: 1rem;
  font-family: "Source Sans 3", sans-serif;
}}
.site-footer-inner {{
  max-width: calc(var(--max) + var(--side) + 4rem); margin: 0 auto;
  display: grid; gap: 1rem;
}}
.site-footer a {{ color: #fff; }}
.cta-row {{ display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }}
.cta-row a {{
  text-decoration: none; background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.35); padding: 0.5rem 0.85rem; border-radius: 0.35rem;
}}
.cta-row a:hover {{ background: rgba(255,255,255,0.18); }}
.footer-note {{ font-size: 0.88rem; opacity: 0.9; max-width: 46rem; }}
@media (max-width: 960px) {{
  .layout {{ grid-template-columns: 1fr; padding: 0 0.75rem 2rem; gap: 1rem; }}
  .sidebar {{ position: static; max-height: none; }}
  main.paper {{ padding: 1.1rem 1rem 1.75rem; }}
  .masthead, .site-header-inner {{
    padding-left: 0.75rem; padding-right: 0.75rem;
  }}
}}
@media print {{
  body {{
    background: #fff !important; color: #000; font-size: 11pt;
  }}
  .skip-link, .header-links, .imrad, .site-footer .cta-row {{ display: none !important; }}
  .site-header {{
    background: #fff !important; color: var(--ce-navy) !important;
    border-bottom: 2pt solid var(--ce-primary);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }}
  .brand {{ color: var(--ce-navy) !important; }}
  .layout {{ display: block; max-width: none; padding: 0; }}
  .sidebar {{
    position: static; max-height: none; page-break-after: always;
    border: 1px solid #ccc; padding: 0.5rem;
  }}
  main.paper {{
    box-shadow: none; border: none; padding: 0; background: #fff;
  }}
  .honesty-banner, .cite-block, .math-display, details.revisions {{
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }}
  a[href]::after {{ content: ""; }}
  h2, h3 {{ page-break-after: avoid; }}
  .math-display, table, tr {{ page-break-inside: avoid; }}
  @page {{ margin: 18mm 16mm 20mm; }}
}}
/* Print-only brand cover (PDF / browser print) */
.pdf-cover {{ display: none; }}
@media print {{
  .pdf-cover {{
    display: block;
    page-break-after: always;
    min-height: 90vh;
    padding: 12mm 8mm;
  }}
  .pdf-cover-inner {{ max-width: 160mm; }}
  .pdf-cover-brand {{ display: flex; gap: 14px; align-items: center; margin-bottom: 24px; }}
  .pdf-cover .ce-mark {{ width: 84px; height: 84px; border-radius: 0.55rem; background: transparent; }}
  .pdf-cover-org {{
    font-family: "Source Sans 3", sans-serif; font-size: 18pt; font-weight: 700; color: var(--ce-navy);
  }}
  .pdf-cover-url {{ font-family: "Source Sans 3", sans-serif; font-size: 11pt; color: var(--ce-primary); }}
  .pdf-cover-kicker {{
    font-family: "Source Sans 3", sans-serif; text-transform: uppercase; letter-spacing: 0.12em;
    font-size: 9pt; color: var(--ce-mid);
  }}
  .pdf-cover-title {{ font-size: 20pt; line-height: 1.25; color: var(--ce-navy); margin: 0.6em 0; }}
  .pdf-cover-sub {{ font-size: 14pt; font-style: italic; color: var(--ce-mid); }}
  .pdf-cover-authors, .pdf-cover-date, .pdf-cover-id {{
    font-family: "Source Sans 3", sans-serif; font-size: 11pt; color: var(--ce-muted);
  }}
  .pdf-cover-honesty {{
    margin-top: 24px; padding: 10px 12px; border-left: 3pt solid var(--ce-accent);
    background: var(--ce-warn-bg); font-family: "Source Sans 3", sans-serif; font-size: 10pt;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }}
  .site-header {{ display: none !important; }}
  .sidebar {{ display: none !important; }}
  .layout {{ display: block; }}
  main.paper {{ border: none; box-shadow: none; padding: 0; }}
}}
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to paper content</a>

<header class="site-header" role="banner">
  <div class="site-header-inner">
    <a class="brand" href="{html.escape(SITE)}" rel="noopener noreferrer">
      {CE_MARK_IMG}
      <span class="brand-text">
        <span class="brand-name">Conscious Energies</span>
        <span class="brand-url">www.conscious.energy</span>
      </span>
    </a>
    <nav class="header-links" aria-label="Related sites">
      <a href="{html.escape(SITE)}" rel="noopener noreferrer">Organization</a>
      <a href="{html.escape(BETA)}" rel="noopener noreferrer">LENR_SIM beta</a>
      <a href="{html.escape(BETA_PAPER)}" rel="noopener noreferrer">In-app Theory Paper</a>
    </nav>
  </div>
</header>

<section class="pdf-cover" aria-label="Title page">
  <div class="pdf-cover-inner">
    <div class="pdf-cover-brand">
      {CE_MARK_IMG}
      <div>
        <div class="pdf-cover-org">Conscious Energies</div>
        <div class="pdf-cover-url">www.conscious.energy</div>
      </div>
    </div>
    <p class="pdf-cover-kicker">Research preprint companion · LENR_SIM</p>
    <p class="pdf-cover-title">{html.escape(TITLE)}</p>
    <p class="pdf-cover-sub">{html.escape(meta["subtitle"])}</p>
    <p class="pdf-cover-authors">Diadon Acs (lead, Conscious Energies)</p>
    <p class="pdf-cover-date">{DATE_PUBLISHED} · revised {DATE_MODIFIED}</p>
    <p class="pdf-cover-id">DOI: none — preprint companion software</p>
    <div class="pdf-cover-honesty">
      <code>lenr_proved</code> remains false · all <code>EQ-OPEN-*</code> remain OPEN · hydro ≠ nuclear
    </div>
  </div>
</section>

<div class="masthead">
  <p class="masthead-kicker">Conscious Energies · Research preprint companion</p>
  <h1>{html.escape(TITLE)}</h1>
  <p class="subtitle">{html.escape(meta["subtitle"])}</p>
  <div class="meta-grid">
    <div><strong>Authors:</strong> {html.escape(meta["authors"] or "Diadon Acs (lead, Conscious Energies)")}</div>
    <div><strong>Organization:</strong> {html.escape(meta["org"])}</div>
    <div><strong>Date:</strong> {html.escape(meta["date_line"] or DATE_MODIFIED)}</div>
    <div><strong>Identifier:</strong> DOI none — preprint companion software (not a journal DOI)</div>
  </div>
  <div class="honesty-banner" role="note">
    <strong>Epistemic posture.</strong>
    Exploratory models only. <code>lenr_proved</code> remains <strong>false</strong>.
    All five <code>EQ-OPEN-*</code> obligations remain <strong>OPEN</strong>
    (<code>EQ-OPEN-MEV-01</code>, <code>EQ-OPEN-RAD-01</code>, <code>EQ-OPEN-RATE-01</code>,
    <code>EQ-OPEN-EC-01</code>, <code>EQ-OPEN-YIELD-01</code>).
    Cavitation–collapse is <strong>modelled enhancement / contested hydro</strong> — hydro ≠ nuclear.
  </div>
</div>

<div class="layout">
  <aside class="sidebar" aria-label="Navigation">
    <nav class="imrad" aria-label="Academic section shortcuts">
      <ul>
        <li><a href="#abstract">Abstract</a></li>
        <li><a href="#1-introduction">Introduction</a></li>
        <li><a href="#3-computational-methods">Methods</a></li>
        <li><a href="#5-results-and-discussion">Results</a></li>
        <li><a href="#5a-open-theoretical-challenges-and-fundamental-questions">Open questions</a></li>
        <li><a href="#6-conclusion">Conclusion</a></li>
        <li><a href="#references">References</a></li>
      </ul>
    </nav>
    {toc_html}
  </aside>

  <main id="main" class="paper" role="main">
    <article itemscope itemtype="https://schema.org/ScholarlyArticle">
      <header>
        <div class="cite-block" id="how-to-cite">
          <h2>How to cite</h2>
          <p>{how_to_cite}</p>
        </div>
        <p class="keywords"><strong>Keywords:</strong> {html.escape(keywords)}</p>
        <div class="affiliations">
          <p><strong>Corresponding author:</strong> Diadon Acs, Conscious Energies —
          <a href="mailto:diadon@conscious.energy">diadon@conscious.energy</a> —
          <a href="{html.escape(SITE)}" rel="noopener noreferrer">www.conscious.energy</a></p>
        </div>
        {rev_block}
        <section class="epistemic-block" aria-label="Epistemic posture detail">
          <h2 id="epistemic-posture">Epistemic posture</h2>
          {epist_html}
        </section>
        <section class="contrib" aria-label="Author contributions">
          <h2 id="author-contributions">Author contributions &amp; AI assistance</h2>
          {contrib_html}
        </section>
        <section class="abstract" id="abstract" aria-labelledby="abstract-heading">
          <h2 id="abstract-heading">Abstract</h2>
          <div itemprop="abstract">{abs_html}</div>
        </section>
      </header>

      <div class="body-sections">
        {body_html}
      </div>
    </article>
  </main>
</div>

<footer class="site-footer" role="contentinfo">
  <div class="site-footer-inner">
    <div>
      <strong>Conscious Energies</strong> ·
      <a href="{html.escape(SITE)}" rel="noopener noreferrer">www.conscious.energy</a>
    </div>
    <p class="footer-note">
      This standalone HTML is a branded reading copy of the Unified Theory Paper pack
      (companion to LENR_SIM). It does <strong>not</strong> claim LENR is proved.
      Model outputs are not laboratory measurements. For the interactive simulator and
      in-app paper view, use the research preview links below.
    </p>
    <div class="cta-row">
      <a href="{html.escape(SITE)}" rel="noopener noreferrer">Visit conscious.energy</a>
      <a href="{html.escape(BETA_PAPER)}" rel="noopener noreferrer">Open Theory Paper in LENR_SIM</a>
      <a href="{html.escape(BETA)}" rel="noopener noreferrer">LENR_SIM public beta</a>
    </div>
  </div>
</footer>

<script>
/* Tiny fallback only: math is pre-rendered at build via katex.renderToString. */
(function () {{
  document.documentElement.setAttribute('data-math-ready', '1');
  var pending = document.querySelectorAll('.math-display:not(:has(.katex)), .math-inline:not(:has(.katex))');
  if (!pending.length) return;
  function paint() {{
    if (!window.katex) {{
      pending.forEach(function (el) {{ el.classList.add('math-fallback'); }});
      return;
    }}
    pending.forEach(function (el) {{
      var tex = el.getAttribute('data-tex') || '';
      try {{
        katex.render(tex, el, {{
          displayMode: el.getAttribute('data-display') === '1',
          throwOnError: false,
          strict: 'ignore'
        }});
      }} catch (e) {{
        el.classList.add('math-fallback');
      }}
    }});
  }}
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.js';
  s.crossOrigin = 'anonymous';
  s.onload = paint;
  s.onerror = paint;
  document.head.appendChild(s);
}})();
</script>
</body>
</html>
"""


def fix_imrad_hrefs(html_doc: str, toc_items: list[dict]) -> str:
    """Rewrite IMRaD links to actual heading ids found in TOC."""
    mapping = {
        "#1-introduction": None,
        "#3-computational-methods": None,
        "#5-results-and-discussion": None,
        "#5a-open-theoretical-challenges-and-fundamental-questions": None,
        "#6-conclusion": None,
        "#references": None,
    }
    for t in toc_items:
        text = t["text"]
        if t["level"] != 2:
            continue
        if text.startswith("1") and "Introduction" in text:
            mapping["#1-introduction"] = t["id"]
        elif text.startswith("3") and "Computational" in text:
            mapping["#3-computational-methods"] = t["id"]
        elif text.startswith("5.") and "Results" in text:
            mapping["#5-results-and-discussion"] = t["id"]
        elif text.startswith("5A") or "Open Theoretical" in text:
            mapping["#5a-open-theoretical-challenges-and-fundamental-questions"] = t["id"]
        elif text.startswith("6") and "Conclusion" in text:
            mapping["#6-conclusion"] = t["id"]
        elif text.strip() == "References" or text.endswith("References"):
            mapping["#references"] = t["id"]
    for old, new in mapping.items():
        if new:
            html_doc = html_doc.replace(f'href="{old}"', f'href="#{new}"')
    return html_doc


def main() -> int:
    md = SRC.read_text(encoding="utf-8")
    # Prefer tip main identity — local checkout matches store docs
    meta = extract_front(md)
    body_html = md_to_html(meta["body"])
    body_html, toc_html, toc_items = add_heading_ids_and_toc(body_html)
    doc = build_html(meta, body_html, toc_html)
    doc = fix_imrad_hrefs(doc, toc_items)

    # Verify honesty preserved
    for token in [
        "EQ-OPEN-MEV-01",
        "EQ-OPEN-RAD-01",
        "EQ-OPEN-RATE-01",
        "EQ-OPEN-EC-01",
        "EQ-OPEN-YIELD-01",
        "lenr_proved",
        "OPEN",
        "hydro",
    ]:
        if token not in doc:
            print(f"WARNING: missing token {token}", file=sys.stderr)

    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(doc, encoding="utf-8")
    print(f"wrote {OUT_HTML} ({OUT_HTML.stat().st_size} bytes)")

    # Pre-render KaTeX into static HTML (build-time renderToString)
    import subprocess

    node = "/exec-daemon/node" if Path("/exec-daemon/node").exists() else "node"
    prer = subprocess.run(
        [node, str(PAPER_DIR / "prerender_katex.mjs"), str(OUT_HTML)],
        capture_output=True,
        text=True,
        cwd=str(PAPER_DIR),
    )
    print(prer.stdout.strip())
    if prer.returncode != 0:
        print(prer.stderr, file=sys.stderr)
        print("WARNING: katex prerender reported failures", file=sys.stderr)

    if prer.returncode != 0:
        return 1
    print(f"branded HTML ready: {OUT_HTML}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

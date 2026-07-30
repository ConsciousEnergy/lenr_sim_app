#!/usr/bin/env python3
"""
Convert Part-1 LENR theory markdown → academic-format LaTeX for LaTeX Workshop.

Produces:
  - unified_lenr_framework.tex  (article-class academic manuscript)
  - references.bib              (BibTeX for the numbered primary sources)
"""

from __future__ import annotations

import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "_part1_source.md"
OUT = ROOT / "unified_lenr_framework.tex"
BIB = ROOT / "references.bib"

# Numbered primary refs → BibTeX keys (matches markdown list order 1–35)
REF_KEYS = {
    1: "fleischmann1989",
    2: "mckubre1994",
    3: "storms2010",
    4: "arata2002",
    5: "mizuno2007",
    6: "mizuno2019",
    7: "miles1993",
    8: "steinetz2020",
    9: "pines2020",
    10: "raiola2002",
    11: "huke2008",
    12: "czerski2023",
    13: "fralick2003",
    14: "iwamura2024",
    15: "bellucci2023",
    16: "oppenheimer1935",
    17: "bordag2001",
    18: "hagelstein2015",
    19: "takahashi2004",
    20: "takahashi2016",
    21: "holmlid2015",
    22: "widom2006",
    23: "preparata1995",
    24: "schwinger1990",
    25: "kim2001",
    26: "taleyarkhan2002",
    27: "menlove1989",
    28: "bockris1991",
    29: "wolf1990",
    30: "celani2014",
    31: "bakranov2024",
    32: "levi2013",
    33: "delgiudice1985",
    34: "safajuei2023",
    35: "karahadian2026",
}

# Supplementary AuthorYear keys → BibTeX keys
SUPP_KEYS = {
    "karahadian2026": "karahadian2026",
    "vaswani2017": "vaswani2017",
    "steinetz2020exp": "steinetz2020",
    "pines2020theory": "pines2020",
    "raiola2002": "raiola2002",
    "huke2008": "huke2008",
    "czerski2023": "czerski2023",
    "miles1993": "miles1993",
    "takahashi2016": "takahashi2016",
    "hagelstein2025": "hagelstein2025",
    "screeningreview2024": "screeningreview2024",
    "storms2015": "storms2015",
    "tennfors2013": "tennfors2013",
    "mulnix2026": "mulnix2026",
    "nguyen2026": "nguyen2026",
    "floquetwkb2026": "floquetwkb2026",
    "parkhomov2018": "parkhomov2018",
}

PREAMBLE = r"""\documentclass[11pt,a4paper]{article}

%% =====================================================================
%% Academic manuscript — Unified LENR Theoretical Framework
%% Engine: LuaLaTeX (LaTeX Workshop default recipe)
%% Source of truth: Part 1 of the companion markdown paper
%% =====================================================================

\usepackage{fontspec}
\defaultfontfeatures{Ligatures=TeX}
\usepackage{microtype}
\usepackage[margin=1in]{geometry}
\usepackage{setspace}
\onehalfspacing

% Title / authors
\usepackage{authblk}

% Math & tables
\usepackage{amsmath,amssymb,amsfonts,mathtools}
\usepackage{siunitx}
\usepackage{booktabs}
\usepackage{array}
\usepackage{longtable}
\usepackage{tabularx}
\usepackage{graphicx}
\usepackage{xcolor}

% Lists, quotes, theorems
\usepackage{enumitem}
\setlist{nosep,leftmargin=*}
\usepackage{csquotes}

% Headers / footers
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textit{Unified LENR Framework}}
\fancyhead[R]{\small\textit{v0.3.6-beta}}
\fancyfoot[C]{\thepage}
\renewcommand{\headrulewidth}{0.4pt}

% Citations (numeric, sorted)
\usepackage[numbers,sort&compress]{natbib}

% Hyperlinks (load last among these)
\usepackage{hyperref}
\hypersetup{
  colorlinks=true,
  linkcolor=blue!40!black,
  citecolor=blue!40!black,
  urlcolor=blue!50!black,
  pdftitle={A Unified Theoretical and Mathematical Framework for LENR},
  pdfauthor={Diadon Acs},
  pdfkeywords={LENR, Rydberg Matter, quantum tunneling, Casimir, claim tiers},
}

\newcommand{\subtitle}[1]{%
  \begin{center}\large\textit{#1}\end{center}\vspace{0.75em}%
}
\newcommand{\keywords}[1]{%
  \vspace{0.5em}\noindent\textbf{Keywords:} #1\par\vspace{0.75em}%
}

\title{%
  A Unified Theoretical and Mathematical Framework\\
  for Low-Energy Nuclear Reactions (LENR)%
}
\author[1]{Diadon Acs\textsuperscript{*}%
  \thanks{Corresponding author. AI systems listed below assisted under human direction;
  the human author is solely accountable for content, claims, and conclusions.}}
\affil[1]{Conscious Energies\\
  \texttt{www.conscious.energy}}
\date{14 February 2026\\
\small (revised 22 July 2026; manuscript version v0.3.6-beta)}

\begin{document}
\maketitle
\subtitle{Electron, Neutron, and Proton coupling is all you need}

\begin{abstract}
"""

POST_ABSTRACT = r"""
\end{abstract}

\keywords{LENR; electron--neutron--proton coupling; Rydberg Matter;
quantum tunneling; Casimir; claim tiers; condensed-matter nuclear hypotheses}

\noindent\textit{Contributing autonomous intelligences (disclosed):}\\
LENR-ARA/GPT-4, GPT-5.2, Sonnet~4.5, Sonnet~4.6, Opus~4.5, Opus~4.6, Opus~4.8,
Gemini~2.5, Gemini~3.0, Composer (Cursor).

\tableofcontents
\newpage
"""


BIBTEX_SEED = r"""
@article{fleischmann1989,
  author  = {Fleischmann, M. and Pons, S.},
  title   = {Electrochemically induced nuclear fusion of deuterium},
  journal = {Journal of Electroanalytical Chemistry},
  volume  = {261},
  number  = {2},
  pages   = {301--308},
  year    = {1989},
  doi     = {10.1016/0022-0728(89)80006-3}
}
@article{mckubre1994,
  author  = {McKubre, M. C. H. and others},
  title   = {Excess power observations in electrochemical studies of the {D/Pd} system},
  journal = {Journal of Electroanalytical Chemistry},
  volume  = {368},
  pages   = {55--66},
  year    = {1994},
  doi     = {10.1016/0022-0728(94)87011-6}
}
@article{storms2010,
  author  = {Storms, E.},
  title   = {A critical analysis of the {LENR} phenomenon},
  journal = {Naturwissenschaften},
  volume  = {97},
  number  = {10},
  pages   = {861--881},
  year    = {2010},
  doi     = {10.1007/s00114-010-0711-x}
}
@article{arata2002,
  author  = {Arata, Y. and Zhang, Y.-C.},
  title   = {Observation of anomalous heat release and helium-4 production from highly deuterated palladium fine particles},
  journal = {Proceedings of the Japan Academy, Series B},
  volume  = {78},
  number  = {7},
  pages   = {57--61},
  year    = {2002},
  doi     = {10.2183/pjab.78.57}
}
@article{mizuno2007,
  author  = {Mizuno, T.},
  title   = {Anomalous energy generation during treatment of nickel with hydrogen gas},
  journal = {Journal of Nuclear Science and Technology},
  volume  = {44},
  number  = {2},
  pages   = {331--338},
  year    = {2007},
  doi     = {10.1080/18811248.2007.9711293}
}
@article{mizuno2019,
  author  = {Mizuno, T. and Rothwell, J.},
  title   = {Increased excess heat from palladium deposited on nickel},
  journal = {Journal of Condensed Matter Nuclear Science},
  volume  = {29},
  pages   = {1--30},
  year    = {2019}
}
@article{miles1993,
  author  = {Miles, M. H. and others},
  title   = {Correlation of excess power and helium production},
  journal = {Journal of Electroanalytical Chemistry},
  volume  = {346},
  pages   = {99--117},
  year    = {1993},
  doi     = {10.1016/0022-0728(93)85700-H}
}
@article{steinetz2020,
  author  = {Steinetz, B. M. and others},
  title   = {Novel nuclear reactions observed in bremsstrahlung-irradiated deuterated metals},
  journal = {Physical Review C},
  volume  = {101},
  pages   = {044610},
  year    = {2020},
  doi     = {10.1103/PhysRevC.101.044610}
}
@article{pines2020,
  author  = {Pines, V. and others},
  title   = {Nuclear fusion reactions in deuterated metals},
  journal = {Physical Review C},
  volume  = {101},
  pages   = {044609},
  year    = {2020},
  doi     = {10.1103/PhysRevC.101.044609}
}
@article{raiola2002,
  author  = {Raiola, F. and others},
  title   = {Electron screening in $d(d,p)t$ for deuterated metals},
  journal = {European Physical Journal A},
  volume  = {13},
  pages   = {377--382},
  year    = {2002},
  doi     = {10.1007/s10050-002-8766-5}
}
@article{huke2008,
  author  = {Huke, A. and others},
  title   = {Enhancement of deuteron-fusion reactions in metals},
  journal = {Physical Review C},
  volume  = {78},
  pages   = {015803},
  year    = {2008},
  doi     = {10.1103/PhysRevC.78.015803}
}
@article{czerski2023,
  author  = {Czerski, K. and others},
  title   = {Electron screening in palladium},
  journal = {Physics Letters B},
  volume  = {845},
  pages   = {137750},
  year    = {2023},
  doi     = {10.1016/j.physletb.2023.137750}
}
@techreport{fralick2003,
  author      = {Fralick, G. and Decher, R. and Rousar, D.},
  title       = {Anomalous heat effects in metal hydrides},
  institution = {NASA},
  number      = {NASA/TM—2003-212795},
  year        = {2003}
}
@article{iwamura2024,
  author  = {Iwamura, Y. and Itoh, T. and Takahashi, T.},
  title   = {Anomalous heat generation in nano-composite hydrides},
  journal = {Japanese Journal of Applied Physics},
  volume  = {63},
  number  = {3},
  pages   = {037001},
  year    = {2024},
  doi     = {10.35848/1347-4065/ad2622}
}
@article{bellucci2023,
  author  = {Bellucci, S. and Cardone, F. and Pistella, F.},
  title   = {Review of experiments reporting non-conventional phenomena in nuclear matter},
  journal = {Symmetry},
  volume  = {15},
  number  = {8},
  pages   = {1507},
  year    = {2023},
  doi     = {10.3390/sym15081507}
}
@article{oppenheimer1935,
  author  = {Oppenheimer, J. R. and Phillips, M.},
  title   = {Note on the transmutation function for deuterons},
  journal = {Physical Review},
  volume  = {48},
  number  = {7},
  pages   = {500--502},
  year    = {1935},
  doi     = {10.1103/PhysRev.48.500}
}
@article{bordag2001,
  author  = {Bordag, M. and Mohideen, U. and Mostepanenko, V. M.},
  title   = {New developments in the {Casimir} effect},
  journal = {Physics Reports},
  volume  = {353},
  number  = {1--3},
  pages   = {1--205},
  year    = {2001},
  doi     = {10.1016/S0370-1573(01)00015-1}
}
@article{hagelstein2015,
  author  = {Hagelstein, P. L. and Chaudhary, I. U.},
  title   = {Coherent energy exchange between lattice and nuclear degrees of freedom},
  journal = {Journal of Condensed Matter Nuclear Science},
  volume  = {15},
  pages   = {1--24},
  year    = {2015}
}
@article{takahashi2004,
  author  = {Takahashi, A.},
  title   = {Tetrahedral symmetric condensate fusion model and multi-body fusion in deuterated metal},
  journal = {Journal of Condensed Matter Nuclear Science},
  volume  = {1},
  pages   = {4--17},
  year    = {2004}
}
@article{takahashi2016,
  author  = {Takahashi, A.},
  title   = {Fundamental of rate theory for {CMNS}},
  journal = {Journal of Condensed Matter Nuclear Science},
  volume  = {19},
  pages   = {298--315},
  year    = {2016}
}
@article{holmlid2015,
  author  = {Holmlid, L.},
  title   = {{Rydberg} Matter and its detection: A review of experimental techniques},
  journal = {Journal of Physics: Conference Series},
  volume  = {635},
  pages   = {012002},
  year    = {2015},
  doi     = {10.1088/1742-6596/635/1/012002}
}
@article{widom2006,
  author  = {Widom, A. and Larsen, L.},
  title   = {Ultra low-momentum neutron catalyzed nuclear reactions on metallic hydride surfaces},
  journal = {The European Physical Journal C},
  volume  = {46},
  number  = {1},
  pages   = {107--111},
  year    = {2006},
  doi     = {10.1140/epjc/s2006-02479-8}
}
@book{preparata1995,
  author    = {Preparata, G.},
  title     = {{QED} Coherence in Matter},
  publisher = {World Scientific},
  year      = {1995}
}
@article{schwinger1990,
  author  = {Schwinger, J.},
  title   = {Cold fusion: A hypothesis},
  journal = {Zeitschrift f{\"u}r Naturforschung A},
  volume  = {45},
  pages   = {756--758},
  year    = {1990}
}
@article{kim2001,
  author  = {Kim, Y. E. and Zubarev, A. L.},
  title   = {Theory of {Bose--Einstein} condensation mechanism for deuteron-induced nuclear reactions in micro/nano-scale metal grains and particles},
  journal = {Physical Review A},
  volume  = {64},
  pages   = {013603},
  year    = {2001},
  doi     = {10.1103/PhysRevA.64.013603}
}
@article{taleyarkhan2002,
  author  = {Taleyarkhan, R. P. and others},
  title   = {Evidence for nuclear emissions during acoustic cavitation},
  journal = {Science},
  volume  = {295},
  number  = {5561},
  pages   = {1868--1873},
  year    = {2002},
  doi     = {10.1126/science.1067589}
}
@techreport{menlove1989,
  author      = {Menlove, H. O. and others},
  title       = {Neutron emission from titanium exposed to deuterium gas at high pressure},
  institution = {Los Alamos National Laboratory},
  year        = {1989}
}
@techreport{bockris1991,
  author      = {Bockris, J. O'M. and Lin, G. H. and Bush, B. F.},
  title       = {Tritium and neutron generation in electrolysis of heavy water},
  institution = {Electrochemical Society / LENR-CANR archive},
  year        = {1991}
}
@techreport{wolf1990,
  author      = {Wolf, K. L. and others},
  title       = {Tritium production in deuterated palladium},
  institution = {Texas A\&M},
  year        = {1990}
}
@article{celani2014,
  author  = {Celani, F. and others},
  title   = {Experimental results on sub-micro structured {Pd} wires and thin films},
  journal = {Journal of Condensed Matter Nuclear Science},
  volume  = {13},
  pages   = {56--68},
  year    = {2014}
}
@article{bakranov2024,
  author  = {Bakranov, N. and Didenko, V. and Nagel, D.},
  title   = {Nanomaterials engineering for enhanced {LENR}: A comprehensive review},
  journal = {Frontiers in Materials},
  volume  = {11},
  pages   = {1500487},
  year    = {2024},
  doi     = {10.3389/fmats.2024.1500487}
}
@article{levi2013,
  author  = {Levi, G. and others},
  title   = {Indications of anomalous heat energy production in a reactor device containing hydrogen-loaded nickel powder},
  journal = {arXiv},
  year    = {2013},
  eprint  = {1305.3913}
}
@article{delgiudice1985,
  author  = {Del Giudice, E. and Doglia, S. and Milani, M. and Vitiello, G.},
  title   = {Electrodynamical coherence in biological systems},
  journal = {Physical Review Letters},
  volume  = {54},
  number  = {7},
  pages   = {622--625},
  year    = {1985},
  doi     = {10.1103/PhysRevLett.54.622}
}
@article{safajuei2023,
  author  = {Safajuei, F. and Safajuei, S. and Hajimohammadi, M.},
  title   = {Production of ultra-low momentum neutrons on metallic hydride surfaces by heavy electrons},
  journal = {Iranian Journal of Science and Technology, Transactions A: Science},
  volume  = {47},
  pages   = {995--1002},
  year    = {2023},
  doi     = {10.1007/s40995-023-01437-3}
}
@article{karahadian2026,
  author  = {Karahadian, M. E. and Colborne, M. and Persaud, A. and Schenkel, T. and Munday, J. N.},
  title   = {Enhanced nuclear fusion in the sub-{keV} energy regime},
  journal = {Nature Communications},
  year    = {2026},
  doi     = {10.1038/s41467-026-74421-1}
}
@inproceedings{vaswani2017,
  author    = {Vaswani, A. and Shazeer, N. and Parmar, N. and Uszkoreit, J. and Jones, L. and Gomez, A. N. and Kaiser, {\L}. and Polosukhin, I.},
  title     = {Attention Is All You Need},
  booktitle = {Advances in Neural Information Processing Systems},
  volume    = {30},
  year      = {2017},
  note      = {Methodological metaphor only---not a LENR physics source}
}
@misc{hagelstein2025,
  author = {Hagelstein, P. L.},
  title  = {Relativistic phonon--nuclear coupling / lossy spin-boson reviews ({MeV}-gap channel)},
  year   = {2025}
}
@article{screeningreview2024,
  title   = {Electron screening in laboratory nuclear reactions},
  journal = {Particles},
  volume  = {7},
  number  = {3},
  pages   = {50},
  year    = {2024},
  doi     = {10.3390/particles7030050}
}
@article{storms2015,
  author  = {Storms, E.},
  title   = {Efficient production of energy from the {LENR} effect},
  journal = {Current Science},
  volume  = {108},
  number  = {4},
  pages   = {574--577},
  year    = {2015}
}
@article{tennfors2013,
  author  = {Tennfors, E.},
  title   = {On the assumptions for an effective electron mass},
  journal = {European Physical Journal Plus},
  volume  = {128},
  pages   = {15},
  year    = {2013},
  doi     = {10.1140/epjp/i2013-13015-3}
}
@misc{mulnix2026,
  author = {Mulnix, A.},
  title  = {Structural theory of sonoluminescence via {Klein--Gordon} / {Rayleigh--Plesset} harmonic locking},
  year   = {2026},
  doi    = {10.5281/zenodo.19079074}
}
@article{nguyen2026,
  author  = {Nguyen, T. and others},
  title   = {Quantum shell structure of proton--neutron pairing},
  journal = {Nature},
  year    = {2026},
  doi     = {10.1038/s41586-026-10616-2}
}
@misc{floquetwkb2026,
  title = {{Floquet--WKB} analysis of lattice confinement fusion under a driven barrier},
  year  = {2026},
  doi   = {10.14293/PR2199.002776.v1}
}
@misc{parkhomov2018,
  author = {Parkhomov, A. G.},
  title  = {Nuclear reactions in {LENR}: review of experimental results},
  year   = {2018},
  note   = {LENR Academy curated subset}
}
"""


def stash_math(md: str) -> tuple[str, list[str]]:
    slots: list[str] = []

    def store(chunk: str) -> str:
        slots.append(chunk)
        return f"MATHSLOT{len(slots) - 1}END"

    # Numeric citation brackets \[1,4\] → cite markers (handled later)
    md = re.sub(r"\\\[([\d,\s\-–—]+)\\\]", r"CITENUM{\1}", md)

    md = re.sub(
        r"\\\[(.+?)\\\]",
        lambda m: store("\\begin{equation}\n" + m.group(1).strip() + "\n\\end{equation}"),
        md,
        flags=re.DOTALL,
    )
    md = re.sub(
        r"\\\((.+?)\\\)",
        lambda m: store("$" + m.group(1).strip() + "$"),
        md,
        flags=re.DOTALL,
    )
    return md, slots


def restore_math(tex: str, slots: list[str]) -> str:
    for i, chunk in enumerate(slots):
        tex = tex.replace(f"MATHSLOT{i}END", chunk)
    return tex


def cites_from_nums(nums: str) -> str:
    keys = []
    for part in re.split(r"[,，]", nums):
        part = part.strip()
        if not part:
            continue
        try:
            n = int(part)
        except ValueError:
            continue
        keys.append(REF_KEYS.get(n, f"ref{n}"))
    if not keys:
        return ""
    return "\\citep{" + ",".join(keys) + "}"


def convert_citations(text: str) -> str:
    # CITENUM{1,4} from stash step
    text = re.sub(
        r"CITENUM\{([\d,\s\-–—]+)\}",
        lambda m: cites_from_nums(m.group(1)),
        text,
    )
    # Literal [1,4] left in body
    text = re.sub(
        r"(?<!\{)\[(\d+(?:\s*,\s*\d+)*)\](?!\()",
        lambda m: cites_from_nums(m.group(1)),
        text,
    )
    # AuthorYear keys [steinetz2020exp]
    def supp(m: re.Match[str]) -> str:
        key = m.group(1)
        bib = SUPP_KEYS.get(key, key)
        return f"\\citep{{{bib}}}"

    text = re.sub(r"\[([a-z]+[0-9]{4}[a-z]*)\]", supp, text)
    return text


def strip_section_numbers(title: str) -> str:
    # "1. Introduction" → "Introduction"; "5A. Open ..." → "Open ..."
    title = re.sub(r"^[0-9]+[A-Za-z]?\.\s*", "", title)
    title = re.sub(r"^[0-9]+(?:\.[0-9]+)*\s+", "", title)
    return title.strip()


def preprocess(md: str) -> tuple[str, list[str], str]:
    """Return (body_md, math_slots, abstract_text)."""
    md = md.lstrip("\ufeff")
    md, slots = stash_math(md)

    # Extract abstract
    abstract = ""
    m_abs = re.search(
        r"^\*\*Abstract\*\*\s*(.+?)(?=^---|^##\s)",
        md,
        flags=re.M | re.S,
    )
    if m_abs:
        abstract = m_abs.group(1).strip()
        md = md[: m_abs.start()] + md[m_abs.end() :]

    # Author contributions / epistemic → later unnumbered sections
    md = re.sub(
        r"^\*\*Author Contributions & AI Assistance\.\*\*\s*",
        "## Author Contributions and AI Assistance\n\n",
        md,
        count=1,
        flags=re.M,
    )
    md = re.sub(
        r"^\*\*Epistemic posture\.\*\*\s*",
        "## Epistemic Posture\n\n",
        md,
        count=1,
        flags=re.M,
    )

    # Drop front-matter mirrored in preamble
    md = re.sub(r"^#\s+\*?\*?A Unified Theoretical.*?\n+", "", md, count=1, flags=re.M)
    for pat in (
        r"^\*\*Subtitle:\*\*.*$",
        r"^\*\*Authors:\*\*.*$",
        r"^Date:.*$",
        r"^Organization:.*$",
        r"^\*\*Keywords:\*\*.*$",
    ):
        md = re.sub(pat + r"\n+", "", md, flags=re.M)

    # Drop markdown References dump — BibTeX/natbib replaces it
    md = re.sub(
        r"^##\s+\*?\*?References\*?\*?.*\Z",
        (
            "## References\n\n"
            "Primary numbered citations in the text map to the BibTeX database "
            "`references.bib`. A subtitle homage to Vaswani et al. "
            "[vaswani2017] is methodological metaphor only.\n"
        ),
        md,
        count=1,
        flags=re.M | re.S,
    )

    def clean_heading(m: re.Match[str]) -> str:
        hashes, title = m.group(1), m.group(2)
        title = title.replace("\\.", ".")
        title = re.sub(r"^\*\*|\*\*$", "", title).strip()
        title = strip_section_numbers(title)
        level = max(1, len(hashes) - 1)
        return f"{'#' * level} {title}"

    md = re.sub(r"^(#{2,4})\s+(.+)$", clean_heading, md, flags=re.M)
    md = re.sub(r"^---+\s*$", "", md, flags=re.M)
    md = convert_citations(md)
    abstract = convert_citations(abstract)
    # Restore math in abstract after cite conversion (cites only)
    return md.strip() + "\n", slots, abstract


def postprocess_body(tex: str) -> str:
    tex = re.sub(
        r"\\hypertarget\{[^}]+\}\{%\s*(\\.*?section\*?\{[^}]+\})\\label\{[^}]+\}\}",
        r"\1",
        tex,
        flags=re.DOTALL,
    )
    for title in (
        "Author Contributions and AI Assistance",
        "Epistemic Posture",
    ):
        tex = tex.replace(f"\\section{{{title}}}", f"\\section*{{{title}}}")

    # References section → starred + bibliography (lambda avoids re escape of \s)
    tex = re.sub(
        r"\\section\{References\}.*?(?=(?:\n\\section|\n\\end\{document\}|\Z))",
        lambda _m: (
            "\\section*{References}\n"
            "\\bibliographystyle{unsrtnat}\n"
            "\\bibliography{references}\n"
        ),
        tex,
        count=1,
        flags=re.S,
    )
    tex = re.sub(r"\{\[\}([\d,\s\-–—]+)\{\]\}", lambda m: cites_from_nums(m.group(1)), tex)
    tex = re.sub(r"\\\\\n(\\item)", r"\n\1", tex)
    tex = re.sub(r"\\\\\n(\\end\{)", r"\n\1", tex)
    tex = tex.replace("\\tightlist\n", "")
    tex = tex.replace("\\textbackslash{}cite", "\\cite")
    return tex


def main() -> None:
    raw = SRC.read_text(encoding="utf-8")
    md, slots, abstract = preprocess(raw)

    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", suffix=".md", delete=False
    ) as tmp:
        tmp.write(md)
        tmp_path = Path(tmp.name)

    body_path = ROOT / "_pandoc_body.tex"
    subprocess.run(
        [
            "pandoc",
            str(tmp_path),
            "-f",
            "markdown+pipe_tables+strikeout",
            "-t",
            "latex",
            "--wrap=none",
            "-o",
            str(body_path),
        ],
        check=True,
    )
    tmp_path.unlink(missing_ok=True)

    body = body_path.read_text(encoding="utf-8")
    body = postprocess_body(body)
    body = restore_math(body, slots)

    # Restore math in abstract
    abstract_tex = abstract
    for i, chunk in enumerate(slots):
        abstract_tex = abstract_tex.replace(f"MATHSLOT{i}END", chunk)
    # Abstract should use inline math only; demote equation env if any leaked
    abstract_tex = re.sub(
        r"\\begin\{equation\}(.*?)\\end\{equation\}",
        lambda m: "$" + m.group(1).strip() + "$",
        abstract_tex,
        flags=re.S,
    )

    # Escape underscores outside math in abstract (e.g. LENR_SIM)
    def escape_underscores_outside_math(s: str) -> str:
        parts = re.split(r"(\$[^$]*\$)", s)
        out = []
        for part in parts:
            if part.startswith("$") and part.endswith("$"):
                out.append(part)
            else:
                # LENR_SIM → \texttt{LENR\_SIM}; other bare _ → \_
                part = re.sub(
                    r"\bLENR_SIM\b",
                    r"\\texttt{LENR\\_SIM}",
                    part,
                )
                part = re.sub(r"(?<!\\)_", r"\\_", part)
                # undo double-escape inside the texttt we just wrote
                part = part.replace("\\texttt{LENR\\_SIM}", "\\texttt{LENR\\_SIM}")
                out.append(part)
        return "".join(out)

    abstract_tex = escape_underscores_outside_math(abstract_tex)

    # If bibliography replace failed (no References section left), append it
    if "\\bibliography{references}" not in body:
        body += (
            "\n\\section*{References}\n"
            "\\bibliographystyle{unsrtnat}\n"
            "\\bibliography{references}\n"
        )

    full = PREAMBLE + abstract_tex + "\n" + POST_ABSTRACT + body + "\n\\end{document}\n"
    OUT.write_text(full, encoding="utf-8")
    BIB.write_text(BIBTEX_SEED.strip() + "\n", encoding="utf-8")

    # Latin Modern lacks many Unicode science glyphs — normalize to TeX
    try:
        from fix_unicode import replace_unicode

        normalized = replace_unicode(OUT.read_text(encoding="utf-8"))
        OUT.write_text(normalized, encoding="utf-8")
    except Exception as exc:  # pragma: no cover
        print(f"unicode normalize skipped: {exc}")

    print(f"Wrote {OUT.name} ({OUT.stat().st_size:,} bytes); math={len(slots)}")
    print(f"Wrote {BIB.name} ({BIB.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()

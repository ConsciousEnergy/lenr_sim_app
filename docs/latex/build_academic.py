# normalize + build academic PDF
from pathlib import Path
import subprocess
import shutil
import os

root = Path(__file__).resolve().parent
os.chdir(root)
miktex = Path(os.environ["LOCALAPPDATA"]) / "Programs/MiKTeX/miktex/bin/x64"
os.environ["PATH"] = str(miktex) + os.pathsep + os.environ["PATH"]

tex = root / "unified_lenr_framework.tex"
t = tex.read_text(encoding="utf-8")
repl = {
    "\u2013": "--",
    "\u2014": "---",
    "\u2018": "`",
    "\u2019": "'",
    "\u201c": "``",
    "\u201d": "''",
    "\ufeff": "",
}
for a, b in repl.items():
    t = t.replace(a, b)
tex.write_text(t, encoding="utf-8")
print("MATHSLOT left:", t.count("MATHSLOT"))
print("cite count:", t.count("\\cite{"))

out = root / "out"
out.mkdir(exist_ok=True)
shutil.copy(root / "references.bib", out / "references.bib")

def run(cmd, logname):
    log = out / logname
    with log.open("w", encoding="utf-8", errors="replace") as f:
        p = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, cwd=root)
    print(cmd[0], "->", p.returncode)
    return p.returncode

run(["lualatex", "-interaction=nonstopmode", "-file-line-error",
     "-output-directory=out", "unified_lenr_framework.tex"], "a1.log")
run(["bibtex", "unified_lenr_framework"], "bib.log")  # will fail if cwd wrong

# bibtex must run in out/
p = subprocess.run(
    ["bibtex", "unified_lenr_framework"],
    cwd=out,
    capture_output=True,
    text=True,
)
(out / "bib.log").write_text(p.stdout + p.stderr, encoding="utf-8")
print("bibtex ->", p.returncode)

run(["lualatex", "-interaction=nonstopmode", "-file-line-error",
     "-output-directory=out", "unified_lenr_framework.tex"], "a2.log")
run(["lualatex", "-interaction=nonstopmode", "-file-line-error",
     "-output-directory=out", "unified_lenr_framework.tex"], "a3.log")

pdf = out / "unified_lenr_framework.pdf"
log = (out / "a3.log").read_text(encoding="utf-8", errors="replace")
for line in log.splitlines():
    if line.startswith("!") or "Output written" in line or "Fatal" in line:
        print(line)
print("PDF exists:", pdf.exists(), "bytes:", pdf.stat().st_size if pdf.exists() else 0)
biblog = (out / "bib.log").read_text(encoding="utf-8", errors="replace")
for line in biblog.splitlines()[:30]:
    if line.strip():
        print("BIB:", line)

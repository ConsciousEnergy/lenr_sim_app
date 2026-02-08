"""
Remove broken scipy install (missing METADATA/RECORD) so pip install -r requirements.txt can succeed.
Run from LENR_SIM_APP_v2/backend with venv activated: python remove_broken_scipy.py
"""
import os
import sys
import shutil

# Find site-packages: same prefix as this Python (the venv)
prefix = sys.prefix
site_packages = os.path.join(prefix, "Lib", "site-packages")
if not os.path.isdir(site_packages):
    site_packages = os.path.join(prefix, "lib", "site-packages")
if not os.path.isdir(site_packages):
    print("Could not find site-packages at", prefix)
    sys.exit(1)

to_remove = [
    os.path.join(site_packages, "scipy"),
    os.path.join(site_packages, "scipy-1.11.2.dist-info"),
    os.path.join(site_packages, "scipy-1.14.1.dist-info"),
]
removed = []
for path in to_remove:
    if os.path.exists(path):
        try:
            shutil.rmtree(path)
            removed.append(path)
            print("Removed:", path)
        except Exception as e:
            print("Failed to remove", path, ":", e)
            sys.exit(1)

if removed:
    print("Done. Run: pip install -r requirements.txt")
else:
    print("No broken scipy folders found. Try: pip install -r requirements.txt")

#!/usr/bin/env python3
"""Attempt Hostinger hPanel login + pending billing 3DS via Playwright.

Reads /tmp/lenr-ci-hpanel.env (HOSTINGER_HPANEL_EMAIL / HOSTINGER_HPANEL_PASSWORD).
Never prints the password. Screenshots go under /opt/cursor/artifacts/.

Exit codes:
  0  looks like payment progressed / dedicated VM may appear soon
  2  missing creds
  3  login failed
  4  reached billing but could not complete 3DS (needs human bank challenge)
  5  unexpected error
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

ENV_FILE = Path(os.environ.get("HPANEL_ENV_FILE", "/tmp/lenr-ci-hpanel.env"))
ART = Path("/opt/cursor/artifacts")
ART.mkdir(parents=True, exist_ok=True)


def load_creds() -> tuple[str, str]:
    if not ENV_FILE.exists():
        raise SystemExit(2)
    vals: dict[str, str] = {}
    for line in ENV_FILE.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            vals[k.strip()] = v.strip().strip('"').strip("'")
    email = vals.get("HOSTINGER_HPANEL_EMAIL", "")
    password = vals.get("HOSTINGER_HPANEL_PASSWORD", "")
    if not email or not password:
        raise SystemExit(2)
    return email, password


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright missing; use /tmp/pw-venv", flush=True)
        return 5

    email, password = load_creds()
    print(f"hpanel-3ds: login as {email}", flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1400, "height": 900},
        )
        page = context.new_page()
        try:
            page.goto("https://auth.hostinger.com/login", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(1500)
            page.fill("#email-input", email)
            page.fill("#password-input", password)
            page.click("#login-button")
            page.wait_for_timeout(5000)
            page.screenshot(path=str(ART / "hpanel-after-login.png"), full_page=True)
            url = page.url
            title = page.title()
            print(f"after_login url={url} title={title[:80]}", flush=True)
            body = page.content().lower()
            if "login" in url and ("invalid" in body or "incorrect" in body or "password" in body):
                # still on login with error
                if "hpanel.hostinger.com" not in url:
                    print("hpanel-3ds: login appears failed", flush=True)
                    return 3

            # Navigate billing
            page.goto("https://hpanel.hostinger.com/billing", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(4000)
            page.screenshot(path=str(ART / "hpanel-billing.png"), full_page=True)
            print(f"billing url={page.url} title={page.title()[:80]}", flush=True)

            # Heuristic: click anything that looks like pay / confirm / complete payment
            clicked = False
            for sel in [
                "text=Complete payment",
                "text=Pay now",
                "text=Confirm payment",
                "text=Complete order",
                "text=Pending payment",
                "text=Unpaid",
                "text=61660939",
                "text=61662216",
                "text=61663818",
                "button:has-text('Pay')",
                "a:has-text('Pay')",
            ]:
                loc = page.locator(sel).first
                try:
                    if loc.count() and loc.is_visible(timeout=1500):
                        print(f"click {sel}", flush=True)
                        loc.click(timeout=5000)
                        clicked = True
                        page.wait_for_timeout(4000)
                        page.screenshot(path=str(ART / f"hpanel-after-click.png"), full_page=True)
                        break
                except Exception as e:
                    print(f"skip {sel}: {type(e).__name__}", flush=True)

            # Look for 3DS iframe / bank challenge
            page.wait_for_timeout(3000)
            frames = [f.url for f in page.frames]
            print("frames:", frames[:10], flush=True)
            page.screenshot(path=str(ART / "hpanel-3ds-state.png"), full_page=True)

            html = page.content().lower()
            if any(x in html for x in ("3-d secure", "3ds", "acs", "challenge", "authenticate")):
                print("hpanel-3ds: bank challenge visible — needs human approval on phone/bank", flush=True)
                # Wait up to 3 minutes for redirect after human approves push
                for i in range(36):
                    time.sleep(5)
                    if "success" in page.url.lower() or "thank" in page.content().lower():
                        print("hpanel-3ds: payment may have completed", flush=True)
                        page.screenshot(path=str(ART / "hpanel-payment-done.png"), full_page=True)
                        return 0
                    print(f"waiting bank challenge… {i*5}s", flush=True)
                return 4

            if clicked:
                print("hpanel-3ds: clicked payment control; verify Hostinger VM list", flush=True)
                return 0

            print("hpanel-3ds: logged in but no obvious pending-pay control", flush=True)
            return 4
        except Exception as e:
            print(f"ERR {type(e).__name__}: {e}", flush=True)
            try:
                page.screenshot(path=str(ART / "hpanel-3ds-error.png"), full_page=True)
            except Exception:
                pass
            return 5
        finally:
            browser.close()


if __name__ == "__main__":
    raise SystemExit(main())

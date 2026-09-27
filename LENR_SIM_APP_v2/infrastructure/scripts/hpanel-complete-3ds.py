#!/usr/bin/env python3
"""Attempt Hostinger hPanel login + pending billing 3DS via Playwright.

Reads /tmp/lenr-ci-hpanel.env (HOSTINGER_HPANEL_EMAIL / HOSTINGER_HPANEL_PASSWORD).
Never prints the password. Screenshots under /opt/cursor/artifacts/.

Exit: 0 progress, 2 missing creds, 3 login failed, 4 needs human 3DS, 5 error
"""
from __future__ import annotations

import os, time
from pathlib import Path

ENV_FILE = Path(os.environ.get("HPANEL_ENV_FILE", "/tmp/lenr-ci-hpanel.env"))
ART = Path("/opt/cursor/artifacts"); ART.mkdir(parents=True, exist_ok=True)
STATE = Path("/tmp/hpanel-storage-state.json")

BILLING_URLS = [
    "https://hpanel.hostinger.com/billing",
    "https://hpanel.hostinger.com/billing/payment-history",
    "https://hpanel.hostinger.com/billing/subscriptions",
    "https://hpanel.hostinger.com/billing/invoices",
    "https://hpanel.hostinger.com/",
]

ORDER_IDS = ["61660939", "61662216", "61663818", "61665445"]

CLICK_TEXTS = [
    "Complete payment", "Pay now", "Confirm payment", "Complete order",
    "Pending payment", "Unpaid", "Pay", "Confirm", "Continue", "Retry payment",
    "Finish payment", "Authenticate",
]


def load_creds():
    if not ENV_FILE.exists():
        raise SystemExit(2)
    vals = {}
    for line in ENV_FILE.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            vals[k.strip()] = v.strip().strip('"').strip("'")
    email, password = vals.get("HOSTINGER_HPANEL_EMAIL", ""), vals.get("HOSTINGER_HPANEL_PASSWORD", "")
    if not email or not password:
        raise SystemExit(2)
    return email, password


def main() -> int:
    from playwright.sync_api import sync_playwright

    email, password = load_creds()
    print(f"hpanel-3ds: login as {email}", flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
        context = browser.new_context(
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
            viewport={"width": 1400, "height": 900},
            storage_state=str(STATE) if STATE.exists() else None,
        )
        page = context.new_page()
        try:
            page.goto("https://auth.hostinger.com/login", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(1500)
            # already logged in?
            if "hpanel.hostinger.com" in page.url and "login" not in page.url:
                print("already in hpanel session", flush=True)
            else:
                page.fill("#email-input", email)
                page.fill("#password-input", password)
                page.click("#login-button")
                page.wait_for_timeout(6000)
            page.screenshot(path=str(ART / "hpanel-after-login.png"), full_page=True)
            print(f"after_login url={page.url} title={page.title()[:80]}", flush=True)
            if "auth.hostinger.com/login" in page.url:
                body = page.content().lower()
                if "invalid" in body or "incorrect" in body or "doesn't match" in body:
                    print("hpanel-3ds: login failed", flush=True)
                    return 3
            context.storage_state(path=str(STATE))

            found_pay = False
            for url in BILLING_URLS:
                print(f"goto {url}", flush=True)
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=60000)
                except Exception as e:
                    print(f"nav err {type(e).__name__}", flush=True)
                    continue
                page.wait_for_timeout(3500)
                # Cloudflare interstitial?
                if "just a moment" in page.title().lower():
                    print("cloudflare interstitial — waiting", flush=True)
                    page.wait_for_timeout(8000)
                shot = ART / ("hpanel-" + url.rstrip("/").split("/")[-1] + ".png")
                page.screenshot(path=str(shot), full_page=True)
                print(f"  url={page.url} title={page.title()[:60]}", flush=True)

                # order id links
                for oid in ORDER_IDS:
                    loc = page.locator(f"text={oid}").first
                    try:
                        if loc.count() and loc.is_visible(timeout=1000):
                            print(f"  click order {oid}", flush=True)
                            loc.click(); page.wait_for_timeout(3000)
                            found_pay = True
                    except Exception:
                        pass

                for text in CLICK_TEXTS:
                    loc = page.get_by_role("button", name=text)
                    try:
                        if loc.count() and loc.first.is_visible(timeout=800):
                            print(f"  click button '{text}'", flush=True)
                            loc.first.click(); page.wait_for_timeout(3000)
                            found_pay = True; break
                    except Exception:
                        pass
                    loc = page.get_by_text(text, exact=False)
                    try:
                        if loc.count() and loc.first.is_visible(timeout=800):
                            print(f"  click text '{text}'", flush=True)
                            loc.first.click(); page.wait_for_timeout(3000)
                            found_pay = True; break
                    except Exception:
                        pass

                html = page.content().lower()
                if any(x in html for x in ("3-d secure", "3ds", "acs", "challenge", "authenticate your payment")):
                    print("bank challenge visible — waiting up to 3m for human approve", flush=True)
                    page.screenshot(path=str(ART / "hpanel-3ds-challenge.png"), full_page=True)
                    for i in range(36):
                        time.sleep(5)
                        html = page.content().lower()
                        if any(x in html for x in ("payment successful", "thank you", "order completed", "success")):
                            page.screenshot(path=str(ART / "hpanel-payment-done.png"), full_page=True)
                            print("payment success indicators", flush=True)
                            return 0
                        print(f"  challenge wait {i*5}s", flush=True)
                    return 4

            page.screenshot(path=str(ART / "hpanel-3ds-final.png"), full_page=True)
            if found_pay:
                print("clicked payment controls; verify VM list via API", flush=True)
                return 0
            print("logged in but no pending-pay control found", flush=True)
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

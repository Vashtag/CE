"""
Arthur Animal Rescue — Cat Adoption Alert Scraper
Checks the adoptables page every 15 min and emails when a new cat ≤ 12 months appears.
"""

import json
import os
import re
from pathlib import Path

ADOPTABLES_URL  = "https://www.arthuranimalrescue.com/adoptables"
STATE_FILE      = Path(__file__).parent / "known_cats.json"
LOG_FILE        = Path(__file__).parent / "check_log.json"
CONFIG_FILE     = Path(__file__).parent / "config.json"
MAX_LOG_ENTRIES = 100


def load_config() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}

# ── Age parsing ──────────────────────────────────────────────────────────────

def parse_age_months(text: str) -> int | None:
    """
    Extract age in months from a free-form string.
    Returns None if no age pattern found.
    Examples: "6 months old", "1 year", "2-year-old", "kitten" → 6, 12, 24, 4
    """
    t = text.lower()

    # "kitten" with no explicit age → assume ~4 months (safely under limit)
    if "kitten" in t and not re.search(r"\d", t):
        return 4

    # e.g. "6 months", "6-month-old", "6 month"
    m = re.search(r"(\d+)\s*[-\s]?months?", t)
    if m:
        return int(m.group(1))

    # e.g. "1 year", "2 years old", "2-year-old"
    y = re.search(r"(\d+)\s*[-\s]?years?", t)
    if y:
        return int(y.group(1)) * 12

    return None


def is_young_enough(age_months: int | None) -> bool:
    if age_months is None:
        return False
    return age_months <= 12


# ── State ────────────────────────────────────────────────────────────────────

def load_known() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {}


def save_known(known: dict) -> None:
    with open(STATE_FILE, "w") as f:
        json.dump(known, f, indent=2, sort_keys=True)


def append_log(total_on_page: int, alerted: list[dict], paused: bool = False) -> None:
    """Append one run record to check_log.json, keeping the last MAX_LOG_ENTRIES."""
    from datetime import datetime, timezone
    log: list[dict] = []
    if LOG_FILE.exists():
        with open(LOG_FILE) as f:
            log = json.load(f)
    entry: dict = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_on_page": total_on_page,
        "alerts_sent": len(alerted),
        "alerted_cats": [
            {"name": c["name"], "age_months": c["age_months"], "url": c["url"]}
            for c in alerted
        ],
    }
    if paused:
        entry["paused"] = True
    log.append(entry)
    log = log[-MAX_LOG_ENTRIES:]  # trim oldest
    with open(LOG_FILE, "w") as f:
        json.dump(log, f, indent=2)


# ── Scraping ─────────────────────────────────────────────────────────────────

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def fetch_html_requests() -> str | None:
    """Fast path — works if the server returns meaningful HTML without JS."""
    try:
        import requests
        r = requests.get(ADOPTABLES_URL, headers=BROWSER_HEADERS, timeout=20)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"[requests] failed: {e}")
        return None


def fetch_html_playwright() -> str:
    """Reliable path — renders JS, needed for Wix/Squarespace sites."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
        )
        page = browser.new_page(extra_http_headers=BROWSER_HEADERS)
        page.goto(ADOPTABLES_URL, wait_until="networkidle", timeout=45_000)
        # Give Wix gallery a moment to fully render
        page.wait_for_timeout(3_000)
        html = page.content()
        browser.close()
        return html


def parse_cats(html: str) -> list[dict]:
    """
    Parse cat listings from rendered HTML.

    Strategy (in order):
    1. Look for Wix gallery / repeater items (data-hook attributes).
    2. Look for any block whose text contains an age pattern + a cat name link.
    3. Collect all internal links as fallback candidate IDs (for change detection).
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    cats = []
    seen_ids = set()

    def add(cat_id: str, name: str, age_text: str, url: str) -> None:
        if cat_id in seen_ids:
            return
        seen_ids.add(cat_id)
        age_months = parse_age_months(age_text)
        cats.append(
            {
                "id": cat_id,
                "name": name.strip()[:80],
                "age_text": age_text.strip()[:200],
                "age_months": age_months,
                "url": url,
            }
        )

    # ── Strategy 1: Wix Pro Gallery / Repeater items ──
    # Wix renders gallery items with data-hook="item-container" or
    # individual repeater cells with data-testid containing the item slug.
    for item in soup.select('[data-hook="item-container"], [data-testid*="item"]'):
        text = item.get_text(" ", strip=True)
        age_months = parse_age_months(text)
        link = item.find("a", href=True)
        if link:
            href = link["href"]
            full_url = href if href.startswith("http") else f"https://www.arthuranimalrescue.com{href}"
            add(href, text[:80], text, full_url)

    # ── Strategy 2: Any <a> whose surrounding block has an age pattern ──
    if not cats:
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if any(skip in href for skip in ["#", "mailto:", "tel:", "instagram.com", "facebook.com", "tiktok.com"]):
                continue
            # Look at the parent container text for age info
            container = a.find_parent(["article", "section", "div", "li"]) or a
            text = container.get_text(" ", strip=True)
            if not re.search(r"(\d+\s*[-\s]?months?|\d+\s*[-\s]?years?|kitten)", text, re.I):
                continue
            full_url = href if href.startswith("http") else f"https://www.arthuranimalrescue.com{href}"
            add(href, a.get_text(strip=True)[:80], text, full_url)

    # ── Strategy 3 (change-detection fallback): track all internal links ──
    # If the site structure changes so we can't parse ages, we still track
    # new URLs so we don't silently miss cats (though we can't filter by age).
    if not cats:
        print("[parser] WARNING: no age-annotated listings found. Tracking all internal links.")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("/") or "arthuranimalrescue.com" in href:
                if any(skip in href for skip in ["#", "mailto:", "tel:"]):
                    continue
                full_url = href if href.startswith("http") else f"https://www.arthuranimalrescue.com{href}"
                add(href, a.get_text(strip=True)[:80], "", full_url)

    return cats


# ── Discord notification ──────────────────────────────────────────────────────

def send_notification(new_cats: list[dict]) -> None:
    import requests
    webhook_url = os.environ["DISCORD_WEBHOOK_URL"]

    embeds = []
    for cat in new_cats:
        age_label = f"{cat['age_months']} months" if cat["age_months"] else "age unknown"
        embeds.append({
            "title": cat["name"],
            "url": cat["url"],
            "color": 14711609,  # #E07B39 orange
            "fields": [
                {"name": "Age", "value": age_label, "inline": True},
            ],
        })

    plural = "s" if len(new_cats) > 1 else ""
    payload = {
        "content": f"🐱 **New young cat{plural} at Arthur Animal Rescue! Be quick!**\n{ADOPTABLES_URL}",
        "embeds": embeds,
    }

    resp = requests.post(webhook_url, json=payload, timeout=10)
    resp.raise_for_status()
    print(f"[discord] Notification sent ({len(new_cats)} cat(s))")


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    cfg = load_config()
    max_age = cfg.get("max_age_months", 12)
    use_playwright = os.environ.get("USE_PLAYWRIGHT", "false").lower() == "true"

    if cfg.get("paused", False):
        print("[scraper] Alerts are PAUSED — skipping notifications.")
        append_log(total_on_page=0, alerted=[], paused=True)
        print("[scraper] Log updated (paused run recorded).")
        return

    print(f"[scraper] Fetching {ADOPTABLES_URL} ...")
    if use_playwright:
        html = fetch_html_playwright()
    else:
        html = fetch_html_requests()
        if html is None:
            print("[scraper] requests failed, falling back to Playwright ...")
            html = fetch_html_playwright()

    cats = parse_cats(html)
    print(f"[scraper] Found {len(cats)} listing(s) on page.")

    known = load_known()
    new_matches: list[dict] = []

    for cat in cats:
        if cat["id"] in known:
            continue  # already seen
        # Mark as seen regardless of age — we don't want to re-alert
        known[cat["id"]] = {
            "name": cat["name"],
            "age_months": cat["age_months"],
            "first_seen": __import__("datetime").datetime.utcnow().isoformat(),
        }
        if cat["age_months"] is not None and cat["age_months"] <= max_age:
            new_matches.append(cat)
            print(f"[scraper] NEW young cat: {cat['name']} ({cat['age_months']} months)")
        else:
            age_label = f"{cat['age_months']} months" if cat["age_months"] else "unknown age"
            print(f"[scraper] Skipping {cat['name']} ({age_label}) — too old or age unknown")

    save_known(known)

    if new_matches:
        print(f"[scraper] Sending Discord notification for {len(new_matches)} new cat(s) ...")
        send_notification(new_matches)
    else:
        print("[scraper] No new young cats found. Nothing to send.")

    append_log(total_on_page=len(cats), alerted=new_matches)
    print("[scraper] Log updated.")


if __name__ == "__main__":
    main()

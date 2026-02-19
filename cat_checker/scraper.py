"""
Arthur Animal Rescue — Cat Adoption Alert Scraper
Checks the adoptables page every 15 min and emails when a new cat ≤ 12 months appears.
"""

import json
import os
import re
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
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


# ── Email ────────────────────────────────────────────────────────────────────

def send_email(new_cats: list[dict]) -> None:
    sender = os.environ["EMAIL_USER"]
    password = os.environ["EMAIL_APP_PASSWORD"]

    cfg = load_config()
    recipients = cfg.get("notify_emails") or [
        e.strip() for e in os.environ.get("NOTIFY_EMAILS", "").split(",") if e.strip()
    ]

    subject = f"New young cat(s) available at Arthur Animal Rescue! ({len(new_cats)} found)"

    # Plain-text body
    lines = [
        "Hi! A new cat under 12 months was just posted on Arthur Animal Rescue.",
        "",
        "Adopt page: https://www.arthuranimalrescue.com/adoptables",
        "",
        "─" * 40,
    ]
    for cat in new_cats:
        age_label = f"{cat['age_months']} months" if cat["age_months"] else "age unknown"
        lines += [
            f"Name : {cat['name']}",
            f"Age  : {age_label}",
            f"Link : {cat['url']}",
            "",
        ]
    lines += ["─" * 40, "Good luck! 🐱"]
    text_body = "\n".join(lines)

    # HTML body
    cat_rows = ""
    for cat in new_cats:
        age_label = f"{cat['age_months']} months" if cat["age_months"] else "age unknown"
        cat_rows += f"""
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">{cat['name']}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">{age_label}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">
            <a href="{cat['url']}">View profile</a>
          </td>
        </tr>"""

    html_body = f"""
    <html><body style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#e07b39">New cat(s) at Arthur Animal Rescue!</h2>
      <p>A cat under 12 months was just posted. Be quick!</p>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f5f5f5">
          <th style="padding:8px;text-align:left">Name</th>
          <th style="padding:8px;text-align:left">Age</th>
          <th style="padding:8px;text-align:left">Link</th>
        </tr>
        {cat_rows}
      </table>
      <p><a href="{ADOPTABLES_URL}">View all adoptables →</a></p>
    </body></html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    ctx = ssl.create_default_context()
    with smtplib.SMTP("smtp-mail.outlook.com", 587) as server:
        server.ehlo()
        server.starttls(context=ctx)
        server.login(sender, password)
        server.sendmail(sender, recipients, msg.as_string())

    print(f"[email] Sent to: {', '.join(recipients)}")


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    cfg = load_config()
    max_age = cfg.get("max_age_months", 12)
    use_playwright = os.environ.get("USE_PLAYWRIGHT", "false").lower() == "true"

    if cfg.get("paused", False):
        print("[scraper] Alerts are PAUSED — skipping email notifications.")
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
        print(f"[scraper] Sending email for {len(new_matches)} new cat(s) ...")
        send_email(new_matches)
    else:
        print("[scraper] No new young cats found. Nothing to send.")

    append_log(total_on_page=len(cats), alerted=new_matches)
    print("[scraper] Log updated.")


if __name__ == "__main__":
    main()

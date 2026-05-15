"""
Trading Alert Platform — FastAPI Backend
Handles user auth, alert CRUD, price checking via yfinance, and push notifications.
"""

import os
import json
import logging
import hashlib
import time
from pathlib import Path
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
import yfinance as yf
import jwt
import bcrypt

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_EMAIL = os.getenv("VAPID_EMAIL", "mailto:admin@tradingalerts.dev")
JWT_SECRET = os.getenv("JWT_SECRET", "trading-alert-platform-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("trading-alerts")

# ---------------------------------------------------------------------------
# Local JSON Storage (standalone mode — no Supabase required)
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

USERS_FILE = DATA_DIR / "users.json"
ALERTS_FILE = DATA_DIR / "alerts.json"
PUSH_SUBS_FILE = DATA_DIR / "push_subscriptions.json"


def _load_json(filepath: Path) -> list:
    if filepath.exists():
        try:
            return json.loads(filepath.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def _save_json(filepath: Path, data: list):
    filepath.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


# ---------------------------------------------------------------------------
# Supabase (optional)
# ---------------------------------------------------------------------------
_supabase = None
_use_supabase = False


def _init_supabase():
    global _supabase, _use_supabase
    if (
        not SUPABASE_URL
        or "your_supabase" in SUPABASE_URL
        or not SUPABASE_KEY
        or "your_supabase" in SUPABASE_KEY
    ):
        logger.info("Supabase not configured — using local JSON storage")
        return
    try:
        from supabase import create_client
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        # Quick connectivity test
        _supabase.table("alerts").select("id").limit(1).execute()
        _use_supabase = True
        logger.info("✓ Connected to Supabase")
    except Exception as e:
        logger.warning(f"Supabase connection failed ({e}) — falling back to local storage")
        _supabase = None
        _use_supabase = False


# ---------------------------------------------------------------------------
# Price Data — yfinance with proper caching and retry
# ---------------------------------------------------------------------------
_price_cache: dict = {}  # symbol -> { "data": [...], "ts": time.time(), "period": str }
CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_yf_session():
    """Create a requests Session with proper headers for yfinance."""
    import requests
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    })
    return session


def fetch_history(symbol: str, period: str = "1y", interval: str = "1d") -> list:
    """Fetch OHLC history with caching + fallback."""
    cache_key = f"{symbol}|{period}|{interval}"
    cached = _price_cache.get(cache_key)
    if cached and (time.time() - cached["ts"]) < CACHE_TTL_SECONDS:
        return cached["data"]

    # Try direct Yahoo API first (faster, more reliable), then yfinance as fallback
    data = _fetch_history_yahoo_api(symbol, period, interval)
    if not data:
        data = _fetch_history_yfinance(symbol, period, interval)

    if data:
        _price_cache[cache_key] = {"data": data, "ts": time.time()}
    return data


def _fetch_history_yfinance(symbol: str, period: str, interval: str) -> list:
    """Primary: use yfinance library."""
    try:
        session = _get_yf_session()
        ticker = yf.Ticker(symbol.upper(), session=session)
        hist = ticker.history(period=period, interval=interval)
        if hist.empty:
            return []
        data = []
        for idx, row in hist.iterrows():
            ts = int(idx.timestamp())
            data.append({
                "time": ts,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })
        return data
    except Exception as e:
        logger.warning(f"yfinance failed for {symbol}: {e}")
        return []


def _fetch_history_yahoo_api(symbol: str, period: str, interval: str) -> list:
    """Fallback: direct Yahoo Finance v8 chart API."""
    import requests
    period_map = {
        "1d": "1d", "5d": "5d", "1mo": "1mo", "3mo": "3mo",
        "6mo": "6mo", "1y": "1y", "2y": "2y", "5y": "5y", "max": "max",
    }
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol.upper()}"
        params = {
            "range": period_map.get(period, "1y"),
            "interval": interval,
            "includePrePost": "false",
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        result = resp.json()["chart"]["result"][0]
        timestamps = result["timestamp"]
        quote = result["indicators"]["quote"][0]

        data = []
        for i, ts in enumerate(timestamps):
            o = quote["open"][i]
            h = quote["high"][i]
            l = quote["low"][i]
            c = quote["close"][i]
            v = quote["volume"][i]
            if o is None or h is None or l is None or c is None:
                continue
            data.append({
                "time": int(ts),
                "open": round(float(o), 2),
                "high": round(float(h), 2),
                "low": round(float(l), 2),
                "close": round(float(c), 2),
                "volume": int(v or 0),
            })
        return data
    except Exception as e:
        logger.warning(f"Yahoo API fallback failed for {symbol}: {e}")
        return []


def fetch_current_price(symbol: str) -> Optional[float]:
    """Get current price with multiple strategies."""
    # Strategy 1: get last close from history (uses cache + fast direct API)
    try:
        data = fetch_history(symbol, period="5d", interval="1d")
        if data:
            return data[-1]["close"]
    except Exception:
        pass

    # Strategy 2: yfinance fast_info (slower, may timeout)
    try:
        session = _get_yf_session()
        ticker = yf.Ticker(symbol.upper(), session=session)
        info = ticker.fast_info
        price = info.get("lastPrice") or info.get("last_price")
        if price is not None:
            return float(price)
    except Exception:
        pass

    return None


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Extract user from Authorization header. Returns guest if no token."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"id": "guest", "email": "guest@local", "name": "Guest"}
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    user_id = payload["sub"]

    # Look up user in storage
    users = _load_json(USERS_FILE)
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class AlertCreate(BaseModel):
    symbol: str
    condition: str  # "above" or "below"
    target_price: float


class PushSubscription(BaseModel):
    subscription: dict


# ---------------------------------------------------------------------------
# Price checker / background job
# ---------------------------------------------------------------------------

def check_alerts():
    """Runs every 60 seconds — checks active alerts against live prices."""
    try:
        alerts = _load_json(ALERTS_FILE)
        active_alerts = [a for a in alerts if not a.get("triggered", False)]
        if not active_alerts:
            return

        # Group by symbol to reduce API calls
        symbols = list(set(a["symbol"] for a in active_alerts))
        prices = {}
        for sym in symbols:
            price = fetch_current_price(sym)
            if price is not None:
                prices[sym] = price

        changed = False
        for alert in alerts:
            if alert.get("triggered", False):
                continue
            sym = alert["symbol"]
            if sym not in prices:
                continue
            current_price = prices[sym]
            triggered = False

            if alert["condition"] == "above" and current_price >= alert["target_price"]:
                triggered = True
            elif alert["condition"] == "below" and current_price <= alert["target_price"]:
                triggered = True

            if triggered:
                alert["triggered"] = True
                alert["triggered_at"] = datetime.now(timezone.utc).isoformat()
                alert["trigger_price"] = current_price
                changed = True
                logger.info(
                    f"🔔 Alert triggered: {sym} {alert['condition']} "
                    f"{alert['target_price']} (current: {current_price})"
                )

        if changed:
            _save_json(ALERTS_FILE, alerts)

    except Exception as e:
        logger.error(f"Error in check_alerts: {e}")


# ---------------------------------------------------------------------------
# Scheduler setup
# ---------------------------------------------------------------------------
scheduler = BackgroundScheduler()
scheduler.add_job(check_alerts, "interval", seconds=60, id="check_alerts")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_supabase()
    scheduler.start()
    logger.info("🚀 APScheduler started — checking alerts every 60s")
    yield
    scheduler.shutdown()
    logger.info("Scheduler stopped")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Trading Alert Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Routes ---------------------------------------------------------------

@app.get("/")
def root():
    return {"status": "ok", "message": "Trading Alert Platform API"}


# ── Auth ──────────────────────────────────────────────────────────────────

@app.post("/auth/register")
def register(body: UserRegister):
    """Register a new user account."""
    users = _load_json(USERS_FILE)

    # Check if email already exists
    if any(u["email"].lower() == body.email.lower() for u in users):
        raise HTTPException(status_code=409, detail="Email already registered")

    user = {
        "id": str(uuid4()),
        "name": body.name.strip(),
        "email": body.email.lower().strip(),
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    users.append(user)
    _save_json(USERS_FILE, users)

    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
        },
    }


@app.post("/auth/login")
def login(body: UserLogin):
    """Authenticate and return a JWT token."""
    users = _load_json(USERS_FILE)
    user = next((u for u in users if u["email"].lower() == body.email.lower().strip()), None)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
        },
    }


@app.get("/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    """Get current user info from token."""
    return {
        "id": user["id"],
        "name": user.get("name", "Guest"),
        "email": user.get("email", ""),
    }


# ── Alerts ────────────────────────────────────────────────────────────────

@app.get("/alerts")
def get_alerts(user: dict = Depends(get_current_user)):
    """Fetch all alerts for the current user."""
    alerts = _load_json(ALERTS_FILE)
    user_alerts = [a for a in alerts if a.get("user_id") == user["id"]]
    # Sort by created_at descending
    user_alerts.sort(key=lambda a: a.get("created_at", ""), reverse=True)
    return user_alerts


@app.post("/alerts")
def create_alert(alert: AlertCreate, user: dict = Depends(get_current_user)):
    """Create a new price alert."""
    alerts = _load_json(ALERTS_FILE)
    new_alert = {
        "id": str(uuid4()),
        "user_id": user["id"],
        "symbol": alert.symbol.upper(),
        "condition": alert.condition,
        "target_price": alert.target_price,
        "triggered": False,
        "trigger_price": None,
        "triggered_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    alerts.append(new_alert)
    _save_json(ALERTS_FILE, alerts)
    return new_alert


@app.delete("/alerts/{alert_id}")
def delete_alert(alert_id: str, user: dict = Depends(get_current_user)):
    """Delete an alert by ID."""
    alerts = _load_json(ALERTS_FILE)
    alert = next((a for a in alerts if a["id"] == alert_id and a.get("user_id") == user["id"]), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alerts = [a for a in alerts if a["id"] != alert_id]
    _save_json(ALERTS_FILE, alerts)
    return {"deleted": True}


# ── Push Notifications ────────────────────────────────────────────────────

@app.get("/vapid-public-key")
def get_vapid_key():
    """Return the public VAPID key for the frontend to subscribe."""
    return {"publicKey": VAPID_PUBLIC_KEY}


@app.post("/subscribe")
def subscribe_push(sub: PushSubscription, user: dict = Depends(get_current_user)):
    """Save a push subscription for notifications."""
    subs = _load_json(PUSH_SUBS_FILE)
    # Upsert: replace existing for this user
    subs = [s for s in subs if s.get("user_id") != user["id"]]
    subs.append({
        "id": str(uuid4()),
        "user_id": user["id"],
        "subscription": sub.subscription,
    })
    _save_json(PUSH_SUBS_FILE, subs)
    return {"subscribed": True}


# ── Price & History ───────────────────────────────────────────────────────

@app.get("/price/{symbol}")
def get_price(symbol: str):
    """Get current price for a symbol."""
    price = fetch_current_price(symbol)
    if price is None:
        raise HTTPException(status_code=404, detail="Price not available")
    return {"symbol": symbol.upper(), "price": price}


@app.get("/history/{symbol}")
def get_history(symbol: str, period: str = "1y", interval: str = "1d"):
    """Return OHLC history for Lightweight Charts rendering."""
    data = fetch_history(symbol.upper(), period=period, interval=interval)
    if not data:
        raise HTTPException(status_code=404, detail="No data found — try a different symbol or period")
    return data


# ── Symbol Search ─────────────────────────────────────────────────────────

@app.get("/search/{query}")
def search_symbols(query: str):
    """Search for ticker symbols — tries Yahoo search API, with yfinance fallback."""
    suggestions = []

    # Strategy 1: Yahoo Finance search API
    try:
        import requests as req
        url = "https://query2.finance.yahoo.com/v1/finance/search"
        params = {
            "q": query,
            "quotesCount": 12,
            "newsCount": 0,
            "listsCount": 0,
            "enableFuzzyQuery": True,
        }
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        resp = req.get(url, params=params, headers=headers, timeout=5)
        resp.raise_for_status()
        results = resp.json().get("quotes", [])

        for r in results:
            sym = r.get("symbol", "")
            if not sym:
                continue
            suggestions.append({
                "symbol": sym,
                "name": r.get("shortname") or r.get("longname", ""),
                "type": r.get("quoteType", ""),
                "exchange": r.get("exchange", ""),
            })
    except Exception as e:
        logger.warning(f"Yahoo search API failed: {e}")

    # Strategy 2: If Yahoo API returned nothing, try yfinance search
    if not suggestions:
        try:
            results = yf.search(query, max_results=8)
            if hasattr(results, "quotes"):
                for r in results.quotes:
                    sym = r.get("symbol", "")
                    if sym:
                        suggestions.append({
                            "symbol": sym,
                            "name": r.get("shortname") or r.get("longname", ""),
                            "type": r.get("quoteType", ""),
                            "exchange": r.get("exchange", ""),
                        })
        except Exception:
            pass

    # Strategy 3: If still empty, try the query as a direct symbol
    if not suggestions and len(query) <= 10:
        try:
            session = _get_yf_session()
            ticker = yf.Ticker(query.upper(), session=session)
            info = ticker.fast_info
            if info and (info.get("lastPrice") or info.get("last_price")):
                suggestions.append({
                    "symbol": query.upper(),
                    "name": "",
                    "type": "EQUITY",
                    "exchange": "",
                })
        except Exception:
            pass

    # Prioritize: EQUITY, ETF, CRYPTOCURRENCY first; limit to 8
    priority = {"EQUITY": 0, "ETF": 1, "CRYPTOCURRENCY": 2, "MUTUALFUND": 3}
    suggestions.sort(key=lambda x: priority.get(x.get("type", ""), 5))
    return suggestions[:8]

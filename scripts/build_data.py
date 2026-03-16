"""
Build dashboard data for static GitHub Pages deployment.
Run from repo root: python build_data.py [--out-dir data]
Outputs: data/snapshot.json, data/events.json, data/meta.json, data/charts/*.png
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import time
from datetime import datetime, timedelta
from io import BytesIO

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import requests
import yfinance as yf
from scipy.stats import rankdata

try:
    import investpy
except ImportError:
    investpy = None

# ─── Constants ────────────────────────────────────────────────────────────────

HISTORY_DAYS       = 120   # Total history window to download per ticker
SHORT_WINDOW       = 21    # Used for daily/intra/5d/20d calculations
SMA_PERIOD         = 50    # SMA used for dist_sma50_atr
ATR_PERIOD         = 14    # ATR / RRS period
RRS_ROLLING        = 50    # Rolling window for RRS
RRS_SMA            = 20    # SMA on top of rolling RRS
MAX_WORKERS        = 10    # ThreadPoolExecutor threads for ticker fetching
CRYPTO_API_BASE    = "https://criptoya.com/api"
ARG_DATOS_BASE     = "https://api.argentinadatos.com/v1"

KEY_EVENTS = [
    "Fed", "Federal Reserve", "Interest Rate", "FOMC",
    "ISM Manufacturing", "ISM Non-Manufacturing", "ISM Services", "ISM",
    "CPI", "Consumer Price Index", "Nonfarm Payrolls", "NFP", "Employment",
    "PPI", "Producer Price Index", "PCE", "Core PCE", "Personal Consumption",
    "Retail Sales", "GDP", "Gross Domestic Product", "Unemployment",
    "Jobless Claims", "Initial Claims", "Housing Starts", "Building Permits",
    "Durable Goods", "Factory Orders", "Consumer Confidence", "Michigan Consumer",
    "Trade Balance", "Trade Deficit", "Beige Book", "Fed Minutes",
    "JOLTS", "Job Openings",
]

STOCK_GROUPS: dict[str, list[str]] = {
    "Índices y Cripto (USD)":  ["SPY", "QQQ", "DIA", "IWM", "IBIT", "ETHA"],
    "CEDEARs Índices (ARS)":   ["SPY.BA", "QQQ.BA", "DIA.BA", "IWM.BA", "IBIT.BA", "ETHA.BA"],
    "ADRs (USD)":              ["BBAR", "BMA", "CEPU", "CRESY", "EDN", "GGAL", "IRS", "LOMA",
                                "PAM", "SUPV", "TEO", "TGS", "YPF", "VIST", "GLOB"],
    "Acciones Locales (ARS)":  ["BBAR.BA", "BMA.BA", "CEPU.BA", "CRES.BA", "EDN.BA", "GGAL.BA",
                                "IRSA.BA", "LOMA.BA", "PAMP.BA", "SUPV.BA", "TECO2.BA",
                                "TGSU2.BA", "YPFD.BA", "VIST.BA"],
    "Acciones USA (USD)":      ["UNH", "GOOGL", "TGT", "WMT", "ARCO", "NU", "PEP", "V", "MA",
                                "MSFT", "SBUX", "MELI", "BRK-B", "PFE", "MCD", "PG"],
    "CEDEARs (ARS)":           ["UNH.BA", "GOOGL.BA", "TGT.BA", "WMT.BA", "ARCO.BA", "NU.BA",
                                "PEP.BA", "V.BA", "MA.BA", "MSFT.BA", "SBUX.BA", "MELI.BA",
                                "BRKB.BA", "PFE.BA", "MCD.BA", "PG.BA"],
    "Countries":               ["EZA", "ARGT", "EWA", "THD", "EIDO", "EWC", "GREK", "EWP", "EWG",
                                "EWL", "EUFN", "EWY", "IEUR", "EFA", "ACWI", "IEV", "EWQ", "EWI",
                                "EWJ", "EWW", "ECH", "EWD", "ASHR", "EWS", "KSA", "INDA", "EEM",
                                "EWZ", "TUR", "EWH", "EWT", "MCHI"],
}

LEVERAGED_ETFS: dict[str, dict[str, list[str]]] = {
    "QQQ":   {"long": ["TQQQ"],          "short": ["SQQQ"]},
    "MDY":   {"long": ["MIDU"],          "short": []},
    "IWM":   {"long": ["TNA"],           "short": ["TZA"]},
    "TLT":   {"long": ["TMF"],           "short": ["TMV"]},
    "SPY":   {"long": ["SPXL", "UPRO"],  "short": ["SPXS", "SH"]},
    "ETHA":  {"long": ["ETHU"],          "short": []},
    "XLK":   {"long": ["TECL"],          "short": ["TECS"]},
    "XLI":   {"long": ["DUSL"],          "short": []},
    "XLC":   {"long": ["LTL"],           "short": []},
    "XLF":   {"long": ["FAS"],           "short": ["FAZ"]},
    "XLU":   {"long": ["UTSL"],          "short": []},
    "XLY":   {"long": ["WANT"],          "short": ["SCC"]},
    "XLRE":  {"long": ["DRN"],           "short": ["DRV"]},
    "XLP":   {"long": ["UGE"],           "short": ["SZK"]},
    "XLB":   {"long": ["UYM"],           "short": ["SMN"]},
    "XLE":   {"long": ["ERX"],           "short": ["ERY"]},
    "XLV":   {"long": ["CURE"],          "short": []},
    "SMH":   {"long": ["SOXL"],          "short": ["SOXS"]},
    "ARKK":  {"long": ["TARK"],          "short": ["SARK"]},
    "XTN":   {"long": ["TPOR"],          "short": []},
    "KWEB":  {"long": ["CWEB"],          "short": []},
    "XRT":   {"long": ["RETL"],          "short": []},
    "KRE":   {"long": ["DPST"],          "short": []},
    "DRIV":  {"long": ["EVAV"],          "short": []},
    "XBI":   {"long": ["LABU"],          "short": ["LABD"]},
    "ROBO":  {"long": ["UBOT"],          "short": []},
    "XHB":   {"long": ["NAIL"],          "short": []},
    "FNGS":  {"long": ["FNGB"],          "short": ["FNGD"]},
    "WCLD":  {"long": ["CLDL"],          "short": []},
    "XOP":   {"long": ["GUSH"],          "short": ["DRIP"]},
    "FDN":   {"long": ["WEBL"],          "short": ["WEBS"]},
    "FXI":   {"long": ["YINN"],          "short": ["YANG"]},
    "PEJ":   {"long": ["OOTO"],          "short": []},
    "USO":   {"long": ["UCO"],           "short": ["SCO"]},
    "PPH":   {"long": ["PILL"],          "short": []},
    "ITA":   {"long": ["DFEN"],          "short": []},
    "SLV":   {"long": ["AGQ"],           "short": ["ZSL"]},
    "GLD":   {"long": ["UGL"],           "short": ["GLL"]},
    "UNG":   {"long": ["BOIL"],          "short": ["KOLD"]},
    "GDX":   {"long": ["NUGT", "GDXU"],  "short": ["JDST", "GDXD"]},
    "IBIT":  {"long": ["BITX", "BITU"],  "short": ["SBIT", "BITI"]},
    "MSOS":  {"long": ["MSOX"],          "short": []},
    "REMX":  {"long": [],                "short": []},
    "EWY":   {"long": ["KORU"],          "short": []},
    "IEV":   {"long": ["EURL"],          "short": []},
    "EWJ":   {"long": ["EZJ"],           "short": []},
    "EWW":   {"long": ["MEXX"],          "short": []},
    "ASHR":  {"long": ["CHAU"],          "short": []},
    "INDA":  {"long": ["INDL"],          "short": []},
    "EEM":   {"long": ["EDC"],           "short": ["EDZ"]},
    "EWZ":   {"long": ["BRZU"],          "short": []},
}

SECTOR_COLORS: dict[str, str] = {
    "Information Technology": "#3f51b5",
    "Industrials":            "#333",
    "Emerging Markets":       "#00bcd4",
    "Consumer Discretionary": "#4caf50",
    "Health Care":            "#e91e63",
    "Financials":             "#ff5722",
    "Energy":                 "#795548",
    "Communication Services": "#9c27b0",
    "Real Estate":            "#673ab7",
    "Commodities":            "#8b6914",
    "Materials":              "#ff9800",
    "Utilities":              "#009688",
    "Consumer Staples":       "#8bc34a",
    "Broad Market":           "#9e9e9e",
}

Industries_COLORS: dict[str, str] = {
    "SMH": "#3f51b5", "ARKK": "#3f51b5", "XTN": "#333",    "KWEB": "#00bcd4", "XRT": "#4caf50",
    "KRE": "#ff5722", "ARKF": "#3f51b5", "ARKG": "#e91e63", "BOAT": "#333",   "DRIV": "#4caf50",
    "KBE": "#ff5722", "XES":  "#795548", "XBI":  "#e91e63", "OIH":  "#795548","SOCL": "#9c27b0",
    "ROBO":"#333",    "AIQ":  "#3f51b5", "XHB":  "#4caf50", "FNGS": "#9e9e9e","BLOK": "#3f51b5",
    "LIT": "#ff9800", "WCLD": "#3f51b5", "XOP":  "#795548", "FDN":  "#4caf50","TAN":  "#795548",
    "IBB": "#e91e63", "PAVE": "#333",    "PEJ":  "#4caf50", "KCE":  "#ff5722","XHE":  "#e91e63",
    "IBUY":"#4caf50", "MSOS": "#4caf50", "FCG":  "#795548", "JETS": "#4caf50","IPAY": "#ff5722",
    "SLX": "#ff9800", "IGV":  "#3f51b5", "CIBR": "#3f51b5", "EATZ": "#4caf50","PPH":  "#e91e63",
    "IHI": "#e91e63", "UTES": "#009688", "ICLN": "#795548", "XME":  "#ff9800","IYZ":  "#9c27b0",
    "URA": "#795548", "ITA":  "#333",    "VNQ":  "#673ab7", "SCHH": "#673ab7","KIE":  "#ff5722",
    "REZ": "#673ab7", "CPER": "#8b6914", "PBJ":  "#8bc34a", "SLV":  "#8b6914","GLD":  "#8b6914",
    "SILJ":"#ff9800", "GDX":  "#ff9800", "FXI":  "#00bcd4", "GXC":  "#00bcd4","USO":  "#8b6914",
    "DBA": "#8b6914", "UNG":  "#8b6914", "DBC":  "#8b6914", "WGMI": "#3f51b5","REMX": "#ff9800",
}


def _build_ticker_to_sector() -> dict[str, str]:
    color_to_sector = {c: s for s, c in SECTOR_COLORS.items()}
    return {t: color_to_sector.get(c, "Broad Market") for t, c in Industries_COLORS.items()}


TICKER_TO_SECTOR = _build_ticker_to_sector()

# ─── Event calendar ───────────────────────────────────────────────────────────

def get_upcoming_key_events(days_ahead: int = 7) -> list[dict]:
    """Return high-importance US economic events for the next `days_ahead` days."""
    if investpy is None:
        print("investpy not installed — skipping economic calendar.")
        return []

    today    = datetime.today()
    end_date = today + timedelta(days=days_ahead)
    pattern  = '|'.join(KEY_EVENTS)

    try:
        calendar = investpy.news.economic_calendar(
            time_zone=None,
            time_filter='time_only',
            countries=['united states'],
            importances=['high'],
            from_date=today.strftime('%d/%m/%Y'),
            to_date=end_date.strftime('%d/%m/%Y'),
        )
        if calendar.empty:
            return []

        filtered = calendar[
            calendar['event'].str.contains(pattern, case=False, na=False) &
            (calendar['importance'].str.lower() == 'high')
        ].sort_values(['date', 'time'])

        return filtered[['date', 'time', 'event']].to_dict('records')

    except Exception as e:
        print(f"Economic calendar error: {e}")
        return []

# ─── Technical indicators ─────────────────────────────────────────────────────

def calculate_atr(hist: pd.DataFrame, period: int = ATR_PERIOD) -> float | None:
    """Exponential ATR."""
    try:
        hl = hist['High'] - hist['Low']
        hc = (hist['High'] - hist['Close'].shift()).abs()
        lc = (hist['Low']  - hist['Close'].shift()).abs()
        tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
        return float(tr.ewm(alpha=1 / period, adjust=False).mean().iloc[-1])
    except Exception:
        return None


def calculate_sma(hist: pd.DataFrame, period: int = SMA_PERIOD) -> float | None:
    try:
        return float(hist['Close'].rolling(window=period).mean().iloc[-1])
    except Exception:
        return None


def calculate_ema(hist: pd.DataFrame, period: int = 10) -> float | None:
    try:
        return float(hist['Close'].ewm(span=period, adjust=False).mean().iloc[-1])
    except Exception:
        return None


def calculate_abc_rating(hist: pd.DataFrame) -> str | None:
    """A = all EMAs aligned bullish; B = mixed; C = all bearish."""
    try:
        ema10 = calculate_ema(hist, 10)
        ema20 = calculate_ema(hist, 20)
        sma50 = calculate_sma(hist, 50)
        if None in (ema10, ema20, sma50):
            return None
        if ema10 > ema20 > sma50:
            return "A"
        if ema10 < ema20 < sma50:
            return "C"
        return "B"
    except Exception:
        return None


def calculate_rrs(
    stock_data: pd.DataFrame,
    spy_data: pd.DataFrame,
    atr_length: int = ATR_PERIOD,
    length_rolling: int = RRS_ROLLING,
    length_sma: int = RRS_SMA,
    atr_multiplier: float = 1.0,
) -> pd.DataFrame | None:
    """Relative Rotation Strength against SPY."""
    try:
        merged = pd.merge(
            stock_data[['High', 'Low', 'Close']],
            spy_data[['High', 'Low', 'Close']],
            left_index=True,
            right_index=True,
            suffixes=('_stock', '_spy'),
            how='inner',
        )
        if len(merged) < atr_length + 1:
            return None

        for suffix in ('stock', 'spy'):
            h = merged[f'High_{suffix}']
            l = merged[f'Low_{suffix}']
            c = merged[f'Close_{suffix}']
            tr = pd.concat([(h - l), (h - c.shift()).abs(), (l - c.shift()).abs()], axis=1).max(axis=1)
            merged[f'atr_{suffix}'] = tr.ewm(alpha=1 / atr_length, adjust=False).mean()

        sc     = merged['Close_stock'] - merged['Close_stock'].shift(1)
        spy_c  = merged['Close_spy']   - merged['Close_spy'].shift(1)
        spy_pi = spy_c / merged['atr_spy']
        expected = spy_pi * merged['atr_stock'] * atr_multiplier
        rrs = (sc - expected) / merged['atr_stock']

        rolling_rrs = rrs.rolling(window=length_rolling, min_periods=1).mean()
        rrs_sma     = rolling_rrs.rolling(window=length_sma, min_periods=1).mean()
        return pd.DataFrame({'RRS': rrs, 'rollingRRS': rolling_rrs, 'RRS_SMA': rrs_sma}, index=merged.index)
    except Exception:
        return None

# ─── RS chart ─────────────────────────────────────────────────────────────────

def create_rs_chart_png(rrs_data: pd.DataFrame, ticker: str, charts_dir: str) -> str | None:
    """Render a small bar chart for the RS column and save as PNG."""
    try:
        recent = rrs_data.tail(20)
        if len(recent) == 0:
            return None

        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(8, 2))
        fig.patch.set_facecolor('#1a1a1a')
        ax.set_facecolor('#1a1a1a')

        rolling_rrs = recent['rollingRRS'].values
        rrs_sma     = recent['RRS_SMA'].values
        max_idx     = rolling_rrs.argmax()
        bar_colors  = ['#4ade80' if i == max_idx else '#b0b0b0' for i in range(len(rolling_rrs))]

        ax.bar(range(len(rolling_rrs)), rolling_rrs, color=bar_colors, width=0.8, edgecolor='none')
        ax.plot(range(len(rrs_sma)), rrs_sma, color='yellow', lw=2)
        ax.axhline(y=0, color='#808080', linestyle='--', linewidth=1)

        mn  = min(rolling_rrs.min(), rrs_sma.min() if len(rrs_sma) else 0)
        mx  = max(rolling_rrs.max(), rrs_sma.max() if len(rrs_sma) else 0)
        pad = 0.1 if mn == mx else (mx - mn) * 0.2
        ax.set_ylim(mn - pad, mx + pad)
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)

        fig.tight_layout(pad=0)
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', ticker)
        path      = os.path.join(charts_dir, f"{safe_name}.png")
        fig.savefig(path, format='png', dpi=80, bbox_inches='tight', facecolor='#1a1a1a')
        plt.close(fig)
        return f"data/charts/{safe_name}.png"

    except Exception as e:
        print(f"Chart error [{ticker}]: {e}")
        return None

# ─── Argentina macro ──────────────────────────────────────────────────────────

def get_argentina_macro_data() -> dict:
    """Fetch holidays, inflation history, and riesgo país from argentinadatos.com."""
    macro: dict = {"ipc_history": {}, "riesgo_pais": {}, "holidays": [], "full_holidays": []}

    # Holidays
    try:
        year = datetime.now().year
        resp = requests.get(f"{ARG_DATOS_BASE}/feriados/{year}", timeout=10)
        resp.raise_for_status()
        data       = resp.json()
        today_str  = datetime.now().strftime("%Y-%m-%d")
        cur_month  = datetime.now().strftime("%m")

        macro["full_holidays"] = [f["fecha"] for f in data]
        upcoming = sorted(
            [f for f in data if f.get("fecha", "") >= today_str and f["fecha"][5:7] == cur_month],
            key=lambda x: x["fecha"],
        )
        macro["holidays"] = [
            f"{datetime.strptime(h['fecha'], '%Y-%m-%d').strftime('%d-%m-%Y')} - {h.get('nombre', '')}"
            for h in upcoming
        ]
    except Exception as e:
        print(f"Error fetching holidays: {e}")

    # Inflation (IPC)
    try:
        resp = requests.get(f"{ARG_DATOS_BASE}/finanzas/indices/inflacion", timeout=10)
        resp.raise_for_status()
        items = resp.json()
        macro["ipc_history"] = {
            item["fecha"][:7]: (item["valor"] / 100 if item["valor"] > 1 else item["valor"])
            for item in items
            if item.get("fecha") and item.get("valor") is not None
        }
    except Exception as e:
        print(f"Error fetching inflation: {e}")

    # Riesgo país
    try:
        resp = requests.get(f"{ARG_DATOS_BASE}/finanzas/indices/riesgo-pais", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if len(data) >= 2:
            last, prev = data[-1], data[-2]
            var_pct = ((last["valor"] / prev["valor"]) - 1) * 100 if prev["valor"] else 0
            macro["riesgo_pais"] = {
                "valor":     int(last["valor"]),
                "fecha":     datetime.strptime(last["fecha"][:10], "%Y-%m-%d").strftime("%d-%m-%Y"),
                "variacion": round(var_pct, 2),
            }
    except Exception as e:
        print(f"Error fetching riesgo país: {e}")

    return macro

# ─── Historical fiat ──────────────────────────────────────────────────────────

def get_historical_fiat_data() -> list[dict] | None:
    """
    Build a daily time series of ARS exchange rates (CCL, MEP, Blue,
    Oficial, Mayorista, USDT) from the start of the current year.
    """
    ENDPOINTS = {
        "ccl":       "contadoconliqui",
        "mep":       "bolsa",
        "blue":      "blue",
        "oficial":   "oficial",
        "mayorista": "mayorista",
    }
    cutoff = datetime(datetime.now().year, 1, 1)

    try:
        dfs: list[pd.DataFrame] = []
        for key, path in ENDPOINTS.items():
            try:
                resp = requests.get(f"{ARG_DATOS_BASE}/cotizaciones/dolares/{path}", timeout=10)
                resp.raise_for_status()
                df = pd.DataFrame(resp.json())
                df["fecha"] = pd.to_datetime(df["fecha"])
                df = df[df["fecha"] >= cutoff][["fecha", "venta"]].rename(columns={"venta": key}).set_index("fecha")
                dfs.append(df)
            except Exception as e:
                print(f"  Warning: could not fetch {path}: {e}")

        if not dfs:
            return None

        master = dfs[0]
        for df in dfs[1:]:
            master = master.join(df, how="outer")

        # Ensure all expected columns exist
        for col in ENDPOINTS:
            if col not in master.columns:
                master[col] = np.nan

        # USDT history (persisted across builds)
        history_file  = "data/usdt_history.json"
        usdt_history: dict[str, float] = {}
        if os.path.exists(history_file):
            with open(history_file) as f:
                usdt_history = json.load(f)

        today_str = datetime.now().strftime("%Y-%m-%d")
        try:
            r_crypto = requests.get(f"{CRYPTO_API_BASE}/usdt/ars/0.1", timeout=10)
            r_p2p    = requests.get(f"{CRYPTO_API_BASE}/binancep2p/usdt/ars/0.1", timeout=10)
            max_venta = 0.0
            for ex in ['buenbit', 'fiwind', 'lemoncash', 'tiendacrypto']:
                bid = r_crypto.json().get(ex, {}).get('totalBid', 0)
                if bid > max_venta:
                    max_venta = bid
            p2p_bid = r_p2p.json().get('totalBid', 0)
            if p2p_bid > max_venta:
                max_venta = p2p_bid
            if max_venta > 0:
                usdt_history[today_str] = round(max_venta, 2)
                os.makedirs(os.path.dirname(history_file), exist_ok=True)
                with open(history_file, "w") as f:
                    json.dump(usdt_history, f, indent=2)
        except Exception as e:
            print(f"  Warning: could not update USDT history: {e}")

        df_usdt = (
            pd.DataFrame(list(usdt_history.items()), columns=["fecha", "usdt"])
            .assign(fecha=lambda d: pd.to_datetime(d["fecha"]))
            .pipe(lambda d: d[d["fecha"] >= cutoff])
            .set_index("fecha")
            .resample("D")
            .ffill()
        )

        master = master.join(df_usdt, how="outer").ffill().dropna(subset=["ccl"])

        def _safe(val: object) -> float:
            return round(float(val), 2) if pd.notna(val) else 0.0

        return [
            {
                "date":      date.strftime("%d-%m-%Y"),
                "ccl":       _safe(row.get("ccl")),
                "mep":       _safe(row.get("mep")),
                "blue":      _safe(row.get("blue")),
                "oficial":   _safe(row.get("oficial")),
                "usdt":      _safe(row.get("usdt")),
                "mayorista": _safe(row.get("mayorista")),
            }
            for date, row in master.iterrows()
        ]

    except Exception as e:
        print(f"Error building fiat history: {e}")
        return None

# ─── Stock data ───────────────────────────────────────────────────────────────

# SPY data is fetched once and shared across all ticker calculations.
_spy_history_cache: pd.DataFrame | None = None

def _get_spy_history(start: datetime, end: datetime) -> pd.DataFrame | None:
    global _spy_history_cache
    if _spy_history_cache is None or _spy_history_cache.empty:
        try:
            _spy_history_cache = yf.Ticker("SPY").history(start=start, end=end)
        except Exception as e:
            print(f"Failed to fetch SPY history: {e}")
            _spy_history_cache = pd.DataFrame()
    return _spy_history_cache if not _spy_history_cache.empty else None


def get_stock_data(ticker_symbol: str, charts_dir: str) -> dict | None:
    """Download and compute all required metrics for a single ticker."""
    try:
        end_date   = datetime.now()
        start_date = end_date - timedelta(days=HISTORY_DAYS)

        stock_hist = yf.Ticker(ticker_symbol).history(start=start_date, end=end_date)
        if stock_hist.empty or len(stock_hist) < SMA_PERIOD:
            return None

        hist_short = stock_hist.iloc[-SHORT_WINDOW:] if len(stock_hist) >= SHORT_WINDOW else stock_hist
        hist_60    = stock_hist.iloc[-60:]            if len(stock_hist) >= 60            else stock_hist

        daily_chg  = (hist_short['Close'].iloc[-1] / hist_short['Close'].iloc[-2] - 1) * 100
        intra_chg  = (hist_short['Close'].iloc[-1] / hist_short['Open'].iloc[-1]  - 1) * 100
        five_chg   = (hist_short['Close'].iloc[-1] / hist_short['Close'].iloc[-6] - 1) * 100  if len(hist_short) >= 6  else None
        twenty_chg = (hist_short['Close'].iloc[-1] / hist_short['Close'].iloc[-21]- 1) * 100  if len(hist_short) >= 21 else None

        sma50        = calculate_sma(hist_60)
        atr          = calculate_atr(hist_60)
        current_close = float(hist_60['Close'].iloc[-1])
        atr_pct      = (atr / current_close) * 100 if atr and current_close else None
        dist_sma50   = (100 * (current_close / sma50 - 1) / atr_pct) if (sma50 and atr_pct) else None
        abc_rating   = calculate_abc_rating(hist_60)

        rs_sts      = None
        rrs_data    = None
        spy_hist    = _get_spy_history(start_date, end_date)

        if spy_hist is not None:
            try:
                rrs_data = calculate_rrs(stock_hist, spy_hist)
                if rrs_data is not None and len(rrs_data) >= SHORT_WINDOW:
                    recent   = rrs_data['rollingRRS'].iloc[-SHORT_WINDOW:]
                    ranks    = rankdata(recent, method='average')
                    rs_sts   = ((ranks[-1] - 1) / (len(recent) - 1)) * 100
            except Exception as e:
                print(f"RRS error [{ticker_symbol}]: {e}")

        rs_chart_path = create_rs_chart_png(rrs_data, ticker_symbol, charts_dir) if rrs_data is not None else None
        long_etfs     = LEVERAGED_ETFS.get(ticker_symbol, {}).get("long", [])
        short_etfs    = LEVERAGED_ETFS.get(ticker_symbol, {}).get("short", [])

        def _r(val: float | None, decimals: int = 2) -> float | None:
            return round(val, decimals) if val is not None else None

        return {
            "ticker":       ticker_symbol,
            "price":        _r(current_close),
            "daily":        _r(daily_chg),
            "intra":        _r(intra_chg),
            "5d":           _r(five_chg),
            "20d":          _r(twenty_chg),
            "atr_pct":      _r(atr_pct, 1),
            "dist_sma50_atr": _r(dist_sma50),
            "rs":           _r(rs_sts, 0),
            "rs_chart":     rs_chart_path,
            "long":         long_etfs,
            "short":        short_etfs,
            "abc":          abc_rating,
        }

    except Exception as e:
        print(f"Error processing [{ticker_symbol}]: {e}")
        return None

# ─── Column ranges ────────────────────────────────────────────────────────────

def compute_column_ranges(groups_data: dict[str, list[dict]]) -> dict:
    """Calculate min/max per group for relative bar visualisation."""
    ranges = {}
    for group_name, rows in groups_data.items():
        def _minmax(field: str, default_min: float, default_max: float) -> tuple[float, float]:
            vals = [r[field] for r in rows if r.get(field) is not None]
            return (min(vals) if vals else default_min, max(vals) if vals else default_max)

        ranges[group_name] = {
            "daily": _minmax("daily", -10, 10),
            "intra": _minmax("intra", -10, 10),
            "5d":    _minmax("5d",    -20, 20),
            "20d":   _minmax("20d",   -30, 30),
        }
    return ranges

# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Build dashboard snapshot data.")
    parser.add_argument("--out-dir", default="data", help="Output directory (default: data)")
    args = parser.parse_args()

    out_dir    = args.out_dir
    charts_dir = os.path.join(out_dir, "charts")
    os.makedirs(charts_dir, exist_ok=True)

    print("Fetching economic events...")
    events = get_upcoming_key_events()

    # Pre-fetch SPY once so all tickers can share it
    print("Pre-fetching SPY history...")
    _get_spy_history(datetime.now() - timedelta(days=HISTORY_DAYS), datetime.now())

    print(f"Fetching stock data ({MAX_WORKERS} workers)...")
    groups_data: dict[str, list[dict]] = {g: [] for g in STOCK_GROUPS}
    all_tasks = [(g, t) for g, tickers in STOCK_GROUPS.items() for t in tickers]

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(get_stock_data, ticker, charts_dir): (group, ticker)
                   for group, ticker in all_tasks}

        # Collect in original group order
        ticker_futures: dict[str, concurrent.futures.Future] = {
            ticker: fut for fut, (_, ticker) in futures.items()
        }
        for group_name, tickers in STOCK_GROUPS.items():
            print(f"  [{group_name}] collecting...")
            for ticker in tickers:
                try:
                    row = ticker_futures[ticker].result()
                    if row:
                        groups_data[group_name].append(row)
                except Exception as e:
                    print(f"  Error collecting [{ticker}]: {e}")

    print("Computing column ranges...")
    column_ranges = compute_column_ranges(groups_data)

    print("Fetching Argentina macro data and fiat history...")
    macro_data = get_argentina_macro_data()
    fiat_data  = get_historical_fiat_data()

    snapshot = {
        "built_at":        datetime.utcnow().isoformat() + "Z",
        "groups":          groups_data,
        "column_ranges":   column_ranges,
        "argentina_macro": macro_data,
        "historical_fiat": fiat_data,
    }

    meta = {
        "SECTOR_COLORS":    SECTOR_COLORS,
        "TICKER_TO_SECTOR": TICKER_TO_SECTOR,
        "Industries_COLORS": Industries_COLORS,
        "SECTOR_ORDER":     list(SECTOR_COLORS.keys()),
        "default_symbol":   next(iter(STOCK_GROUPS.values()), ["SPY"])[0],
    }

    paths = {
        "snapshot": os.path.join(out_dir, "snapshot.json"),
        "events":   os.path.join(out_dir, "events.json"),
        "meta":     os.path.join(out_dir, "meta.json"),
    }
    data_to_write = {"snapshot": snapshot, "events": events, "meta": meta}

    for key, path in paths.items():
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data_to_write[key], f, ensure_ascii=False, indent=2)
        print(f"  Wrote {path}")

    print(f"Done. Charts saved to {charts_dir}")


if __name__ == "__main__":
    main()
"""
Build dashboard data for static GitHub Pages deployment.
Run from repo root: python scripts/build_data.py [--out-dir data]
Outputs: data/snapshot.json, data/events.json, data/meta.json, data/charts/*.png
"""
from __future__ import print_function
import argparse
import json
import os
import re
import time
import requests # <--- ¡ESTA ES LA LIBRERÍA NUEVA QUE AGREGAMOS!

import yfinance as yf
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from io import BytesIO
from scipy.stats import rankdata

try:
    import investpy
except ImportError:
    investpy = None

# --- Config: no Liquid Stocks ---
KEY_EVENTS = [
    "Fed", "Federal Reserve", "Interest Rate", "FOMC",
    "ISM Manufacturing", "ISM Non-Manufacturing", "ISM Services", "ISM",
    "CPI", "Consumer Price Index", "Nonfarm Payrolls", "NFP", "Employment",
    "PPI", "Producer Price Index", "PCE", "Core PCE", "Personal Consumption",
    "Retail Sales", "GDP", "Gross Domestic Product", "Unemployment", "Jobless Claims", "Initial Claims",
    "Housing Starts", "Building Permits", "Durable Goods", "Factory Orders",
    "Consumer Confidence", "Michigan Consumer", "Trade Balance", "Trade Deficit",
    "Beige Book", "Fed Minutes", "JOLTS", "Job Openings"
]

STOCK_GROUPS = {
    "Índices y Cripto (USD)": ["SPY", "QQQ", "DIA", "IWM", "IBIT", "ETHA"],
    "CEDEARs Índices (ARS)": ["SPY.BA", "QQQ.BA", "DIA.BA", "IWM.BA", "IBIT.BA", "ETHA.BA"],
    "ADRs (USD)": ["BBAR", "BMA", "CEPU", "CRESY", "EDN", "GGAL", "IRS", "LOMA", "PAM", "SUPV", "TEO", "TGS", "YPF", "VIST", "GLOB"],
    "Acciones Locales (ARS)": ["BBAR.BA", "BMA.BA", "CEPU.BA", "CRES.BA", "EDN.BA", "GGAL.BA", "IRSA.BA", "LOMA.BA", "PAMP.BA", "SUPV.BA", "TECO2.BA", "TGSU2.BA", "YPFD.BA", "VIST.BA"],
    "Acciones USA (USD)": ["UNH", "GOOGL", "TGT", "WMT", "ARCO", "NU", "PEP", "V", "MA", "MSFT", "SBUX", "MELI", "BRK-B", "PFE", "MCD", "PG"],
    "CEDEARs (ARS)": ["UNH.BA", "GOOGL.BA", "TGT.BA", "WMT.BA", "ARCO.BA", "NU.BA", "PEP.BA", "V.BA", "MA.BA", "MSFT.BA", "SBUX.BA", "MELI.BA", "BRKB.BA", "PFE.BA", "MCD.BA", "PG.BA"],
    "Countries": ["EZA", "ARGT", "EWA", "THD", "EIDO", "EWC", "GREK", "EWP", "EWG", "EWL", "EUFN", "EWY", "IEUR", "EFA", "ACWI", "IEV", "EWQ", "EWI", "EWJ", "EWW", "ECH", "EWD", "ASHR", "EWS", "KSA", "INDA", "EEM", "EWZ", "TUR", "EWH", "EWT", "MCHI"]
}

LEVERAGED_ETFS = {
    "QQQ": {"long": ["TQQQ"], "short": ["SQQQ"]},
    "MDY": {"long": ["MIDU"], "short": []},
    "IWM": {"long": ["TNA"], "short": ["TZA"]},
    "TLT": {"long": ["TMF"], "short": ["TMV"]},
    "SPY": {"long": ["SPXL", "UPRO"], "short": ["SPXS", "SH"]},
    "ETHA": {"long": ["ETHU"], "short": []},
    "XLK": {"long": ["TECL"], "short": ["TECS"]},
    "XLI": {"long": ["DUSL"], "short": []},
    "XLC": {"long": ["LTL"], "short": []},
    "XLF": {"long": ["FAS"], "short": ["FAZ"]},
    "XLU": {"long": ["UTSL"], "short": []},
    "XLY": {"long": ["WANT"], "short": ["SCC"]},
    "XLRE": {"long": ["DRN"], "short": ["DRV"]},
    "XLP": {"long": ["UGE"], "short": ["SZK"]},
    "XLB": {"long": ["UYM"], "short": ["SMN"]},
    "XLE": {"long": ["ERX"], "short": ["ERY"]},
    "XLV": {"long": ["CURE"], "short": []},
    "SMH": {"long": ["SOXL"], "short": ["SOXS"]},
    "ARKK": {"long": ["TARK"], "short": ["SARK"]},
    "XTN": {"long": ["TPOR"], "short": []},
    "KWEB": {"long": ["CWEB"], "short": []},
    "XRT": {"long": ["RETL"], "short": []},
    "KRE": {"long": ["DPST"], "short": []},
    "DRIV": {"long": ["EVAV"], "short": []},
    "XBI": {"long": ["LABU"], "short": ["LABD"]},
    "ROBO": {"long": ["UBOT"], "short": []},
    "XHB": {"long": ["NAIL"], "short": []},
    "FNGS": {"long": ["FNGB"], "short": ["FNGD"]},
    "WCLD": {"long": ["CLDL"], "short": []},
    "XOP": {"long": ["GUSH"], "short": ["DRIP"]},
    "FDN": {"long": ["WEBL"], "short": ["WEBS"]},
    "FXI": {"long": ["YINN"], "short": ["YANG"]},
    "PEJ": {"long": ["OOTO"], "short": []},
    "USO": {"long": ["UCO"], "short": ["SCO"]},
    "PPH": {"long": ["PILL"], "short": []},
    "ITA": {"long": ["DFEN"], "short": []},
    "SLV": {"long": ["AGQ"], "short": ["ZSL"]},
    "GLD": {"long": ["UGL"], "short": ["GLL"]},
    "UNG": {"long": ["BOIL"], "short": ["KOLD"]},
    "GDX": {"long": ["NUGT", "GDXU"], "short": ["JDST", "GDXD"]},
    "IBIT": {"long": ["BITX", "BITU"], "short": ["SBIT", "BITI"]},
    "MSOS": {"long": ["MSOX"], "short": []},
    "REMX": {"long": [], "short": []},
    "EWY": {"long": ["KORU"], "short": []},
    "IEV": {"long": ["EURL"], "short": []},
    "EWJ": {"long": ["EZJ"], "short": []},
    "EWW": {"long": ["MEXX"], "short": []},
    "ASHR": {"long": ["CHAU"], "short": []},
    "INDA": {"long": ["INDL"], "short": []},
    "EEM": {"long": ["EDC"], "short": ["EDZ"]},
    "EWZ": {"long": ["BRZU"], "short": []}
}

SECTOR_COLORS = {
    "Information Technology": "#3f51b5", "Industrials": "#333", "Emerging Markets": "#00bcd4",
    "Consumer Discretionary": "#4caf50", "Health Care": "#e91e63", "Financials": "#ff5722",
    "Energy": "#795548", "Communication Services": "#9c27b0", "Real Estate": "#673ab7",
    "Commodities": "#8b6914", "Materials": "#ff9800", "Utilities": "#009688",
    "Consumer Staples": "#8bc34a", "Broad Market": "#9e9e9e",
}

Industries_COLORS = {
    "SMH": "#3f51b5", "ARKK": "#3f51b5", "XTN": "#333", "KWEB": "#00bcd4", "XRT": "#4caf50", "KRE": "#ff5722",
    "ARKF": "#3f51b5", "ARKG": "#e91e63", "BOAT": "#333", "DRIV": "#4caf50", "KBE": "#ff5722", "XES": "#795548",
    "XBI": "#e91e63", "OIH": "#795548", "SOCL": "#9c27b0", "ROBO": "#333", "AIQ": "#3f51b5", "XHB": "#4caf50",
    "FNGS": "#9e9e9e", "BLOK": "#3f51b5", "LIT": "#ff9800", "WCLD": "#3f51b5", "XOP": "#795548", "FDN": "#4caf50",
    "TAN": "#795548", "IBB": "#e91e63", "PAVE": "#333", "PEJ": "#4caf50", "KCE": "#ff5722", "XHE": "#e91e63",
    "IBUY": "#4caf50", "MSOS": "#4caf50", "FCG": "#795548", "JETS": "#4caf50", "IPAY": "#ff5722", "SLX": "#ff9800",
    "IGV": "#3f51b5", "CIBR": "#3f51b5", "EATZ": "#4caf50", "PPH": "#e91e63", "IHI": "#e91e63", "UTES": "#009688",
    "ICLN": "#795548", "XME": "#ff9800", "IYZ": "#9c27b0", "URA": "#795548", "ITA": "#333", "VNQ": "#673ab7",
    "SCHH": "#673ab7", "KIE": "#ff5722", "REZ": "#673ab7", "CPER": "#8b6914", "PBJ": "#8bc34a", "SLV": "#8b6914",
    "GLD": "#8b6914", "SILJ": "#ff9800", "GDX": "#ff9800", "FXI": "#00bcd4", "GXC": "#00bcd4", "USO": "#8b6914",
    "DBA": "#8b6914", "UNG": "#8b6914", "DBC": "#8b6914", "WGMI": "#3f51b5", "REMX": "#ff9800",
}


def get_ticker_to_sector_mapping():
    color_to_sector = {c: s for s, c in SECTOR_COLORS.items()}
    return {t: color_to_sector.get(c, "Broad Market") for t, c in Industries_COLORS.items()}


TICKER_TO_SECTOR = get_ticker_to_sector_mapping()


def get_leveraged_etfs(ticker):
    if ticker in LEVERAGED_ETFS:
        return LEVERAGED_ETFS[ticker].get("long", []), LEVERAGED_ETFS[ticker].get("short", [])
    return [], []


def get_upcoming_key_events(days_ahead=7):
    if investpy is None:
        return []
    today = datetime.today()
    end_date = today + timedelta(days=days_ahead)
    from_date = today.strftime('%d/%m/%Y')
    to_date = end_date.strftime('%d/%m/%Y')
    try:
        calendar = investpy.news.economic_calendar(
            time_zone=None, time_filter='time_only', countries=['united states'],
            importances=['high'], categories=None, from_date=from_date, to_date=to_date
        )
        if calendar.empty:
            return []
        pattern = '|'.join(KEY_EVENTS)
        filtered = calendar[
            (calendar['event'].str.contains(pattern, case=False, na=False)) &
            (calendar['importance'].str.lower() == 'high')
        ]
        if filtered.empty:
            return []
        filtered = filtered.sort_values(['date', 'time'])
        return filtered[['date', 'time', 'event']].to_dict('records')
    except Exception as e:
        print("Economic calendar error:", e)
        return []


def calculate_atr(hist_data, period=14):
    try:
        hl = hist_data['High'] - hist_data['Low']
        hc = (hist_data['High'] - hist_data['Close'].shift()).abs()
        lc = (hist_data['Low'] - hist_data['Close'].shift()).abs()
        tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
        return tr.ewm(alpha=1/period, adjust=False).mean().iloc[-1]
    except Exception:
        return None


def calculate_rrs(stock_data, spy_data, atr_length=14, length_rolling=50, length_sma=20, atr_multiplier=1.0):
    try:
        merged = pd.merge(
            stock_data[['High', 'Low', 'Close']], spy_data[['High', 'Low', 'Close']],
            left_index=True, right_index=True, suffixes=('_stock', '_spy'), how='inner'
        )
        if len(merged) < atr_length + 1:
            return None
        for prefix in ['stock', 'spy']:
            h, l, c = merged[f'High_{prefix}'], merged[f'Low_{prefix}'], merged[f'Close_{prefix}']
            tr = pd.concat([h - l, (h - c.shift()).abs(), (l - c.shift()).abs()], axis=1).max(axis=1)
            merged[f'atr_{prefix}'] = tr.ewm(alpha=1/atr_length, adjust=False).mean()
        sc = merged['Close_stock'] - merged['Close_stock'].shift(1)
        spy_c = merged['Close_spy'] - merged['Close_spy'].shift(1)
        spy_pi = spy_c / merged['atr_spy']
        expected = spy_pi * merged['atr_stock'] * atr_multiplier
        rrs = (sc - expected) / merged['atr_stock']
        rolling_rrs = rrs.rolling(window=length_rolling, min_periods=1).mean()
        rrs_sma = rolling_rrs.rolling(window=length_sma, min_periods=1).mean()
        return pd.DataFrame({'RRS': rrs, 'rollingRRS': rolling_rrs, 'RRS_SMA': rrs_sma}, index=merged.index)
    except Exception:
        return None


def calculate_sma(hist_data, period=50):
    try:
        return hist_data['Close'].rolling(window=period).mean().iloc[-1]
    except Exception:
        return None


def calculate_ema(hist_data, period=10):
    try:
        return hist_data['Close'].ewm(span=period, adjust=False).mean().iloc[-1]
    except Exception:
        return None


def calculate_abc_rating(hist_data):
    try:
        ema10 = calculate_ema(hist_data, 10)
        ema20 = calculate_ema(hist_data, 20)
        sma50 = calculate_sma(hist_data, 50)
        if ema10 is None or ema20 is None or sma50 is None:
            return None
        if ema10 > ema20 and ema20 > sma50:
            return "A"
        if (ema10 > ema20 and ema20 < sma50) or (ema10 < ema20 and ema20 > sma50):
            return "B"
        if ema10 < ema20 and ema20 < sma50:
            return "C"
    except Exception:
        pass
    return None


def create_rs_chart_png(rrs_data, ticker, charts_dir):
    try:
        recent = rrs_data.tail(20)
        if len(recent) == 0:
            return None
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(8, 2))
        fig.patch.set_facecolor('#1a1a1a')
        ax.set_facecolor('#1a1a1a')
        rolling_rrs = recent['rollingRRS'].values
        rrs_sma = recent['RRS_SMA'].values
        max_idx = rolling_rrs.argmax()
        bar_colors = ['#4ade80' if i == max_idx else '#b0b0b0' for i in range(len(rolling_rrs))]
        ax.bar(range(len(rolling_rrs)), rolling_rrs, color=bar_colors, width=0.8, edgecolor='none')
        ax.plot(range(len(rrs_sma)), rrs_sma, color='yellow', lw=2)
        ax.axhline(y=0, color='#808080', linestyle='--', linewidth=1)
        mn = min(rolling_rrs.min(), rrs_sma.min() if len(rrs_sma) else 0)
        mx = max(rolling_rrs.max(), rrs_sma.max() if len(rrs_sma) else 0)
        pad = 0.1 if mn == mx else (mx - mn) * 0.2
        ax.set_ylim(mn - pad, mx + pad)
        ax.set_xticks([])
        ax.set_yticks([])
        for s in ax.spines.values():
            s.set_visible(False)
        fig.tight_layout(pad=0)
        safe = re.sub(r'[^a-zA-Z0-9]', '_', ticker)
        path = os.path.join(charts_dir, f"{safe}.png")
        fig.savefig(path, format='png', dpi=80, bbox_inches='tight', facecolor='#1a1a1a')
        plt.close(fig)
        return f"data/charts/{safe}.png"
    except Exception as e:
        print("Chart error", ticker, e)
        return None

def get_argentina_macro_data():
    macro = {"ipc_history": {}, "riesgo_pais": {}, "holidays": []}
    
    # 1. Feriados
    try:
        year = datetime.now().year
        r_feriados = requests.get(f"https://api.argentinadatos.com/v1/feriados/{year}")
        if r_feriados.status_code == 200:
            data_fer = r_feriados.json()
            macro["full_holidays"] = [f["fecha"] for f in data_fer]
            today_str = datetime.now().strftime("%Y-%m-%d")
            current_month = datetime.now().strftime("%m")
            future_holidays_this_month = [
                f for f in data_fer 
                if f.get("fecha") >= today_str and f.get("fecha")[5:7] == current_month
            ]
            future_holidays_this_month.sort(key=lambda x: x["fecha"])
            macro["holidays"] = [f"{datetime.strptime(h['fecha'], '%Y-%m-%d').strftime('%d-%m-%Y')} - {h.get('nombre', '')}" for h in future_holidays_this_month]
    except Exception as e:
        print("Error feriados:", e)

    # 2. Inflación
    try:
        r_inf = requests.get("https://api.argentinadatos.com/v1/finanzas/indices/inflacion")
        if r_inf.status_code == 200:
            datos_inf = r_inf.json()
            if datos_inf:
                macro["ipc_history"] = {item.get("fecha", "")[:7]: (item.get("valor", 0)/100 if item.get("valor", 0) > 1 else item.get("valor", 0)) for item in datos_inf}
    except Exception as e:
        print("Error inflacion:", e)
        
    # 3. Riesgo País (Con Variación)
    try:
        r_rp = requests.get("https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais")
        if r_rp.status_code == 200:
            data_rp = r_rp.json()
            if len(data_rp) >= 2:
                ultimo = data_rp[-1]
                anterior = data_rp[-2]
                val_u = ultimo['valor']
                val_a = anterior['valor']
                var_pct = ((val_u / val_a) - 1) * 100 if val_a else 0
                macro["riesgo_pais"] = {
                    "valor": int(val_u),
                    "fecha": datetime.strptime(ultimo["fecha"][:10], "%Y-%m-%d").strftime('%d-%m-%Y'),
                    "variacion": round(var_pct, 2)
                }
    except Exception as e:
        print("Error riesgo pais:", e)

    return macro


def get_historical_fiat_data():
    try:
        endpoints = {"ccl": "contadoconliqui", "mep": "bolsa", "blue": "blue", "oficial": "oficial", "mayorista": "mayorista"}
        dfs = []
        cutoff = datetime(datetime.now().year, 1, 1)

        for key, path in endpoints.items():
            r = requests.get(f"https://api.argentinadatos.com/v1/cotizaciones/dolares/{path}")
            if r.status_code == 200:
                df = pd.DataFrame(r.json())
                df['fecha'] = pd.to_datetime(df['fecha'])
                df = df[df['fecha'] >= cutoff][['fecha', 'venta']].rename(columns={'venta': key}).set_index('fecha')
                dfs.append(df)

        if not dfs: return None
        master_df = dfs[0]
        for i in range(1, len(dfs)):
            master_df = master_df.join(dfs[i], how='outer')

        # Proteger columnas faltantes para que no dé error
        for col in ["ccl", "mep", "blue", "oficial", "mayorista"]:
            if col not in master_df.columns:
                master_df[col] = np.nan

        history_file = "data/usdt_history.json"
        usdt_history = {}
        if os.path.exists(history_file):
            with open(history_file, "r") as f:
                usdt_history = json.load(f)

        today_str = datetime.now().strftime("%Y-%m-%d")
        try:
            r_crypto = requests.get("https://criptoya.com/api/usdt/ars/0.1")
            r_p2p = requests.get("https://criptoya.com/api/binancep2p/usdt/ars/0.1")
            max_venta = 0
            if r_crypto.status_code == 200:
                data_c = r_crypto.json()
                for ex in ['buenbit', 'fiwind', 'lemoncash', 'tiendacrypto']:
                    if ex in data_c and data_c[ex].get('totalBid', 0) > max_venta:
                        max_venta = data_c[ex]['totalBid']
            if r_p2p.status_code == 200:
                data_p2p = r_p2p.json()
                if data_p2p.get('totalBid', 0) > max_venta:
                    max_venta = data_p2p['totalBid']
            if max_venta > 0:
                usdt_history[today_str] = round(max_venta, 2)
                with open(history_file, "w") as f:
                    json.dump(usdt_history, f, indent=2)
        except Exception as e:
            pass

        df_usdt = pd.DataFrame(list(usdt_history.items()), columns=['fecha', 'usdt'])
        df_usdt['fecha'] = pd.to_datetime(df_usdt['fecha'])
        df_usdt = df_usdt[df_usdt['fecha'] >= cutoff].set_index('fecha')
        df_usdt = df_usdt.resample('D').ffill()

        master_df = master_df.join(df_usdt, how='outer').ffill().dropna(subset=['ccl'])

        result = []
        for date, row in master_df.iterrows():
            result.append({
                "date": date.strftime("%d-%m-%Y"),
                "ccl": round(row.get('ccl', 0), 2) if pd.notna(row.get('ccl')) else 0,
                "mep": round(row.get('mep', 0), 2) if pd.notna(row.get('mep')) else 0,
                "blue": round(row.get('blue', 0), 2) if pd.notna(row.get('blue')) else 0,
                "oficial": round(row.get('oficial', 0), 2) if pd.notna(row.get('oficial')) else 0,
                "usdt": round(row.get('usdt', 0), 2) if pd.notna(row.get('usdt')) else 0,
                "mayorista": round(row.get('mayorista', 0), 2) if pd.notna(row.get('mayorista')) else 0
            })
        return result
    except Exception as e:
        print("Error generando historial fiat:", e)
        return None
        
def get_stock_data(ticker_symbol, charts_dir):
    try:
        stock = yf.Ticker(ticker_symbol)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=120)
        
        # Single fetch for 120 days
        stock_history = stock.history(start=start_date, end=end_date)
        if stock_history.empty or len(stock_history) < 50:
            return None

        # Slice for the shorter periods
        hist = stock_history.iloc[-21:] if len(stock_history) >= 21 else stock_history
        daily = stock_history.iloc[-60:] if len(stock_history) >= 60 else stock_history

        daily_change = (hist['Close'].iloc[-1] / hist['Close'].iloc[-2] - 1) * 100
        intraday_change = (hist['Close'].iloc[-1] / hist['Open'].iloc[-1] - 1) * 100
        five_day_change = (hist['Close'].iloc[-1] / hist['Close'].iloc[-6] - 1) * 100 if len(hist) >= 6 else None
        twenty_day_change = (hist['Close'].iloc[-1] / hist['Close'].iloc[-21] - 1) * 100 if len(hist) >= 21 else None

        sma50 = calculate_sma(daily)
        atr = calculate_atr(daily)
        current_close = daily['Close'].iloc[-1]
        atr_pct = (atr / current_close) * 100 if atr and current_close else None
        dist_sma50_atr = (100 * (current_close / sma50 - 1) / atr_pct) if (sma50 and atr_pct and atr_pct != 0) else None
        abc_rating = calculate_abc_rating(daily)

        rs_sts = None
        rrs_data = None
        try:
            spy_history = yf.Ticker("SPY").history(start=start_date, end=end_date)
            if not stock_history.empty and spy_history is not None and not spy_history.empty:
                rrs_data = calculate_rrs(stock_history, spy_history, atr_length=14, length_rolling=50, length_sma=20, atr_multiplier=1.0)
                if rrs_data is not None and len(rrs_data) >= 21:
                    recent_21 = rrs_data['rollingRRS'].iloc[-21:]
                    ranks = rankdata(recent_21, method='average')
                    rs_sts = ((ranks[-1] - 1) / (len(recent_21) - 1)) * 100
        except Exception as e:
            print("RRS error", ticker_symbol, e)

        rs_chart_path = create_rs_chart_png(rrs_data, ticker_symbol, charts_dir) if rrs_data is not None and len(rrs_data) > 0 else None
        long_etfs, short_etfs = get_leveraged_etfs(ticker_symbol)

        return {
            "ticker": ticker_symbol,
            "daily": round(daily_change, 2) if daily_change is not None else None,
            "intra": round(intraday_change, 2) if intraday_change is not None else None,
            "5d": round(five_day_change, 2) if five_day_change is not None else None,
            "20d": round(twenty_day_change, 2) if twenty_day_change is not None else None,
            "atr_pct": round(atr_pct, 1) if atr_pct is not None else None,
            "dist_sma50_atr": round(dist_sma50_atr, 2) if dist_sma50_atr is not None else None,
            "rs": round(rs_sts, 0) if rs_sts is not None else None,
            "rs_chart": rs_chart_path,
            "long": long_etfs,
            "short": short_etfs,
            "abc": abc_rating
        }
    except Exception as e:
        print("Error", ticker_symbol, e)
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default="data", help="Output directory (default: data)")
    args = parser.parse_args()
    out_dir = args.out_dir
    charts_dir = os.path.join(out_dir, "charts")
    os.makedirs(charts_dir, exist_ok=True)

    print("Fetching economic events...")
    events = get_upcoming_key_events()

    print("Fetching stock data (no Liquid Stocks) in parallel...")
    groups_data = {}
    all_ticker_data = {}
    
    import concurrent.futures

    tasks = []
    for group_name, tickers in STOCK_GROUPS.items():
        for ticker in tickers:
            tasks.append((group_name, ticker))
            
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        # Launch all tasks
        future_map = {}
        for group_name, ticker in tasks:
            future = executor.submit(get_stock_data, ticker, charts_dir)
            future_map[future] = (group_name, ticker)
            
        # Initialize groups_data with empty lists to preserve insertion order of dict
        groups_data = {g: [] for g in STOCK_GROUPS.keys()}
        
        # Collect results, preserving order via original lists
        for group_name, tickers in STOCK_GROUPS.items():
            print(f"  [{group_name}] Procesando...")
            group_futures = [f for f, (g, t) in future_map.items() if g == group_name]
            for future in group_futures:
                row = future.result()
                if row:
                    groups_data[group_name].append(row)
                    all_ticker_data[row['ticker']] = row

    print("Computing column ranges...")
    column_ranges = {}
    for group_name, rows in groups_data.items():
        daily_v = [r["daily"] for r in rows if r.get("daily") is not None]
        intra_v = [r["intra"] for r in rows if r.get("intra") is not None]
        five_v = [r["5d"] for r in rows if r.get("5d") is not None]
        twenty_v = [r["20d"] for r in rows if r.get("20d") is not None]
        column_ranges[group_name] = {
            "daily": (min(daily_v) if daily_v else -10, max(daily_v) if daily_v else 10),
            "intra": (min(intra_v) if intra_v else -10, max(intra_v) if intra_v else 10),
            "5d": (min(five_v) if five_v else -20, max(five_v) if five_v else 20),
            "20d": (min(twenty_v) if twenty_v else -30, max(twenty_v) if twenty_v else 30),
        }

    print("Fetching Argentina macro and building fiat historical data...")
    macro_data = get_argentina_macro_data()
    fiat_data = get_historical_fiat_data()

    snapshot = {
        "built_at": datetime.utcnow().isoformat() + "Z",
        "groups": groups_data,
        "column_ranges": column_ranges,
        "argentina_macro": macro_data,
        "historical_fiat": fiat_data
    }
    
    meta = {
        "SECTOR_COLORS": SECTOR_COLORS,
        "TICKER_TO_SECTOR": TICKER_TO_SECTOR,
        "Industries_COLORS": Industries_COLORS,
        "SECTOR_ORDER": list(SECTOR_COLORS.keys()),
        "default_symbol": STOCK_GROUPS.get("Índices y Cripto (USD)", ["SPY"])[0]
    }

    snapshot_path = os.path.join(out_dir, "snapshot.json")
    events_path = os.path.join(out_dir, "events.json")
    meta_path = os.path.join(out_dir, "meta.json")

    with open(snapshot_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)
    with open(events_path, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print("Wrote", snapshot_path, events_path, meta_path, "and charts in", charts_dir)

if __name__ == "__main__":
    main()

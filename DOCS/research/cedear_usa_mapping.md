# Mapeo de Cobertura CEDEAR: Estrategia de Endpoints

Este documento centraliza la lógica de conexión para los 402 activos analizados, detallando qué API de Data912 provee la información en Pesos y cuál la información en USD (Wall Street).

## 1. Resumen de Endpoints y Disponibilidad

| Categoría | Cantidad | Info en Pesos (ARS) | Info en USD (Subyacente) |
| :--- | :--- | :--- | :--- |
| **Encontrados (Mirror)** | 279 | [arg_cedears](https://data912.com/live/arg_cedears) | [usa_stocks](https://data912.com/live/usa_stocks) / [usa_adrs](https://data912.com/live/usa_adrs) |
| **Huérfanos (Solo ARS)** | 109 | [arg_cedears](https://data912.com/live/arg_cedears) | No disponible en API |

**Nota:** Se excluyen los ADRs de Argentina (`GGAL, YPF, PAMP, etc.`) de este conteo, ya que poseen su propio mapeo en `arg_stocks_mapping.md`.

---

## 2. Los 279 "Encontrados" (Categorización por API USD)

Para estos activos, el sistema obtiene el **Precio Local** de `arg_cedears` y la **Cotización en USD** de los siguientes endpoints de USA:

### A. Endpoint: usa_stocks (Acciones USA - 215 activos aprox.)
Cubre las acciones nativas de Wall Street.
**Tickers:** `AAPL, MSFT, AMZN, GOOGL, META, TSLA, NVDA, NFLX, PYPL, INTC, AMD, WMT, KO, DIS, V, MA, MMM, ABT, ABBV, ANF, ACN, ADBE, JMIA, AAP, AEG, AEM, ABNB, MO, AMX, AAL, AXP, AIG, AMGN, ADI, AMAT, ARCO, ARM, ASML, ASTS, ALAB, AZN, T, TEAM, ADP, AVY, CAR, BKR, BIOX, BIB, BITF, BB, BX, BKNG, BP, LND, BAK, BMY, AVGO, BNG, AI, CAT, CAH, CCL, CLS, CX, SCHW, CVX, CSCO, C, CDE, COIN, CL, CEG, CRWV, GLW, CAAP, COST, CVS, DHR, DECK, DE, DAL, DEO, DOCU, DOW, DD, EBAY, ECL, EA, LLY, E, EFX, EQNR, ETSY, XOM, FDX, RACE, FSLR, FMX, F, FCX, GRMN, GE, GM, GPRK, GILD, GLOB, GT, PAC, ASR, TV, GSK, HAL, HOG, HMY, HL, HMC, HON, HWM, HPQ, HUT, IFF, IP, ISRG, IREN, IEUR, JPM, JNJ, JCI, KB, KMB, KOC, PHG, KEP, LRCX, LVS, LAR, LAC, LYG, ERIC, LMT, MRVL, MA, MCD, MUX, MDT, MELI, MRK, MU, MSTR, MUFG, MFG, MRNA, MDLZ, MSI, NGG, NTES, NFLX, NEM, NXE, NKE, NIO, NOKA, NMR, NG, NVS, UN, NUE, NVDA, OXY, OKLO, ORCL, ORLY, PCAR, PAGS, PLTR, PANW, PAAS, PYPL, PDD, PSO, PEP, PBR, PFE, PM, PSX, PINS, PBI, PKS, PG, TQQQ, QCOM, RTX, RGTI, RIOT, HOOD, RBLX, RKLB, ROKU, ROST, SPGI, CRM, SATL, SE, NOW, SHOP, SWKS, SNAP, SNA, SNOW, SCCO, SPOT, XYZ, SBUX, STLA, STNE, SUZ, SYY, TEM, TEN, TXR, TSLA, TXN, BK, BA, KO, GS, HSY, HD, MOS, TRVV, DISN, TMO, TIMB, TJX, TMUS, TTE, TM, TCOM, TRIP, TWLO, USB, UBER, PATH, UGP, UL, UNP, UAL, UNH, UPST, URBN, VRSN, VZ, VRTX, SPCE, V, VST, VOD, WMT, WBO, WFC, XROX, XP, XPEV, YELP, ZM, CIBR`

### B. Endpoint: usa_adrs (ADRs Globales - 64 activos aprox.)
Cubre empresas extranjeras que usan el formato ADR en Nueva York.
**Tickers:** `BABA, BBD, BSBR, SAN, BA.C, BCS, BHP, BBV, BIDU, KOFM, SBS, SID, COPX, GGB, GFI, HDB, IBN, INFY, ING, ITUB, JD, LFC, NMR, RIO, SAP, SLB, SONY, TSM, TOT, VALE, VIV, etc.`

---

## 3. Los 109 "Huérfanos" (Solo Pesos / Sin Espejo USD)

Estos activos **SÓLO** se pueden consultar en `https://data912.com/live/arg_cedears`. Al no tener un espejo confiable en las APIs de USA, se operan exclusivamente con el precio local.

### ETFs e Índices (37 activos)
`ARKK, DIA, EEM, ETHA, EWZ, FXI, GDX, GLD, IBB, IBIT, IEMG, ITA, IVE, IVW, IWM, PSQ, QQQ, SH, SLV, SMH, SPXL, SPY, URA, USO, VEA, VIG, XLB, XLC, XLE, XLF, XLI, XLK, XLP, XLRE, XLU, XLV, XLY`

### Otros Activos sin API USD (72 activos)
`ABEV3, ADS, AKOB, ATAD, AUY, B, BAS, BAYN, BBAS3, BBDC3, BPATI, BRFS, BRKB, BSN, CBRD, CS, CSNA3, DESP, DTEA, EBR, ELP, EOAN, ERJ, FMCC, FNMA, HAPV3, HHPD, HNPIY, ITUB3, IWDA, JOYY, LFC, LKOD, LREN3, MBG, MBT, MGLU3, MMC, NATUS, NECT, NLM, NSAN, NTCO, NTCO3, OGZD, ORAN, PCRF, PETR3, PRIO3, PTR, RCTB4, RENT3, S, SBSP3, SDA, SHPW, SIEGY, SMSN, SNP, SUZB3, TEFO, TILAY, TIM, TIMS3, TWTR, VALE3, VIVT3, VXX, WBA, WEGE3, X, YZCA`

---

## 4. Resumen de Hallazgos Técnicos

1.  **Dualidad de Datos:** El sistema opera de forma híbrida. Usa `arg_cedears` para lo que el usuario paga en pesos, pero "salta" a `usa_stocks/adrs` para obtener la cotización de origen del activo.
2.  **ETF Gap:** Es notable que instrumentos tan líquidos como el `SPY` o `QQQ` no figuren en los endpoints de "Live USA" de Data912.
3.  **Filtrado Activo:** Se han purgado los ADRs argentinos de este reporte para evitar duplicidad de datos en el motor de búsqueda.

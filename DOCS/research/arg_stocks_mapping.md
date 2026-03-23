# Mapeo de Cobertura: Acciones Argentinas vs. ADRs

Este documento registra la disponibilidad de precios en USD (ADR) para las acciones del panel líder y general de Argentina, detallando los endpoints de la API Data912 utilizados.

## 1. Resumen de Hallazgos y Endpoints

| Categoría | Cantidad | Descripción | Endpoint Fuente |
| :--- | :--- | :--- | :--- |
| **Acciones Locales (Ticker Local)** | ~73 | Activos operando en BYMA (Pesos). | [arg_stocks](https://data912.com/live/arg_stocks) |
| **Puntales (Ticker ADR USA)** | 13 | Activos con precio limpio en USD. | [usa_adrs](https://data912.com/live/usa_adrs) |
| **Excluidos (Variantes D)** | 23 | Tickers duplicados en MEP/CCL. | [arg_stocks](https://data912.com/live/arg_stocks) (Filtrados) |

---

## 2. Los 13 "Puntales" (Con Conexión USA y Ratios)
Para estos activos, el motor utiliza el precio del ADR obtenido desde el endpoint `usa_adrs`. El **Ratio** es fundamental para calcular el Dólar CCL implícito.

| Ticker Local | Ticker ADR (USA) | Ratio | Estado |
| :--- | :--- | :--- | :--- |
| **BBAR** | BBAR | 3 | ✅ Encontrado |
| **BMA** | BMA | 10 | ✅ Encontrado |
| **CEPU** | CEPU | 10 | ✅ Encontrado |
| **CRES** | CRESY | 10 | ✅ Encontrado |
| **EDN** | EDN | 20 | ✅ Encontrado |
| **GGAL** | GGAL | 10 | ✅ Encontrado |
| **IRSA** | IRS | 10 | ✅ Encontrado |
| **LOMA** | LOMA | 5 | ✅ Encontrado |
| **PAMP** | PAM | 25 | ✅ Encontrado |
| **SUPV** | SUPV | 5 | ✅ Encontrado |
| **TECO2** | TEO | 5 | ✅ Encontrado |
| **TGSU2** | TGS | 5 | ✅ Encontrado |
| **YPFD** | YPF | 1 | ✅ Encontrado |

---

## 3. Cálculo del Dólar CCL Implícito
Para obtener el tipo de cambio implícito (Contado con Liquidación) de cada activo, se utiliza la siguiente fórmula:

> **Formula:** `(Precio local en ARS * Ratio) / Precio ADR en USD = Dólar CCL`

---

## 4. Acciones Solo Locales (Mapeo por Panel)
Estos activos se obtienen exclusivamente del endpoint `arg_stocks`. Sus indicadores técnicos se basan en el precio de **BYMA (Pesos ARS)**.

### Panel Líder (Locales)
Acciones de alta liquidez sin ADR:
`ALUA, BYMA, COME, TGNO4, TRAN, TXAR, VALO`

### Panel General
Resto de los activos del mercado local:
`A3, AGRO, AUSO, BHIP, BOLT, BPAT, CADO, CAPX, CARC, CECO2, CELU, CGPA2, CTIO, CVH, DGCE, DGCU2, DOME, ECOG, EDSH, FERR, FIPL, GAMI, GARO, GBAN, GCDI, GCLA, GRIM, HARG, HAVA, HSAT, IEB, INAG, INTR, INVJ, IRS2W, LEDE, LONG, METR, MIRG, MOLA, MOLI, MORI, OEST, PATA, POLL, RAGH, REGE, RICH, RIGO, ROSE, SAMI, SEMI`

---

## 4. Tickers Excluidos (Variantes D)
Aunque aparecen en el endpoint `arg_stocks`, se **excluyen** de los cálculos técnicos por ser variantes del activo operando en MEP/CCL vía BYMA:

**Listado de Exclusión:**
`ALUAD, BBARD, BMA.D, BYMAD, CEPUD, COMED, CRESD, CVHD, ECOGD, EDND, GGALD, IRSAD, LOMAD, METRD, PAMPD, SUPVD, TECOD, TGN4D, TGSUD, TRAND, TXARD, VALOD, YPFDD`

---

## 5. Lógica de Sourcing (Resumen Técnico)
1.  **Entrada Principal:** El sistema consulta `arg_stocks` para obtener el universo local.
2.  **Mapeo ADR:** Si el ticker (ej. GGAL) coincide con la lista de "Puntales", el sistema busca su precio "mirror" en `usa_adrs` para obtener la cotización en dólares.
3.  **Filtrado de Ruido:** El sistema descarta automáticamente cualquier ticker del endpoint local que termine en `D` o `.D`.

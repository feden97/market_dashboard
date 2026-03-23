# Cobertura de Dólar CCL Implícito (Endpoint Research)

Este documento detalla los activos disponibles en el endpoint de cálculo de CCL en tiempo real proporcionado por Data912.

**Endpoint:** `https://data912.com/live/ccl`

---

## 1. Resumen de Cobertura Total

| Categoría | Cantidad | Descripción |
| :--- | :--- | :--- |
| **Total Activos con CCL** | 254 | Cobertura total del endpoint. |
| **CEDEARs (Mirrors USA)** | 241 | Activos con espejo directo en Wall Street. |
| **Acciones Argentinas (ADRs)** | 13 | Las 13 líderes con cotización en Nueva York. |

---

## 2. Acciones Argentinas (Las 13 Líderes)
El 100% de nuestras acciones "Puntales" detectadas anteriormente tienen cálculo de CCL en vivo:

`BBAR, BMA, CEPU, CRES, EDN, GGAL, IRSA, LOMA, PAMP, SUPV, TECO2, TGSU2, YPFD`

---

## 3. Análisis Diferencial (CCL vs. 279 Mirrors originales)

Al comparar los 279 CEDEARs que mapeamos anteriormente con los activos disponibles en este endpoint, se hallaron las siguientes diferencias:

### A. Activos NUEVOS en la API de CCL (No estaban en los 279)
El endpoint de CCL incluye **5 activos** que no teníamos en el listado original de espejos puros:
*   **VIST (Vista Energy):** Importante hallazgo. No estaba en los 279 (probablemente por su naturaleza mixta Argentina/México), pero la API provee su CCL.
*   **Correcciones/Variantes:** `BIIB` (Biogen), `KGC` (Kinross), `NU` (Nu Holdings), `TGT` (Target). *Nota: En nuestro mapeo anterior usábamos los tickers de ratio; la API usa el ticker directo de USA.*

### B. Activos FALTANTES en la API de CCL (Están en los 279 pero no aquí)
Existen **43 activos** de alta relevancia que **NO** tienen cálculo de CCL en este endpoint específico. Para estos, seguiremos dependiendo de nuestro cálculo manual:
`ALAB, ARM, ASML, ASTS, AZN, CAR, COIN, COST, CRWV, DECK, DISN, DOCU, ECL, ETSY, HAL, HOOD, HUT, IEUR, IREN, KOC, KOFM, LAR, MA, NOKA, NOW, OKLO, PAAS, PATH, PDD, PKS, PSO, RGTI, RKLB, SHOP, SPOT, TEAM, TEM, TEN, TOT, TQQQ, TRVV, TXR, UN, UNP, VRTX, VST, WBO, XPEV, XROX, XYZ, ZM`

---

## 4. CEDEARs Cubiertos (241 activos)
*(Resumen del listado disponible en la API)*
`AAPL, AMZN, MSFT, GOOGL, META, TSLA, NVDA, NFLX, PYPL, INTC, AMD, WMT, KO, DIS, V, MA, BABA, BBD, SAN, JD, TSM, VALE, TOT, etc.`

---

## 5. Campos Disponibles por Activo
Para cada uno de estos 254 activos, la API provee:
*   **CCL_bid / CCL_ask:** Precios de compra y venta implícitos.
*   **CCL_mark:** Precio promedio (punto medio).
*   **ars_volume:** Volumen operado en pesos (indicador de liquidez para el cálculo).
*   **volume_rank:** Ranking de prioridad por liquidez.

---

## 5. Conclusión de la Investigación
El endpoint de CCL es la herramienta definitiva para unificar el dashboard. Permite:
1.  Validar si el ratio aplicado en el motor es correcto.
2.  Mostrar el "Dólar CEDEAR" o "Dólar ADR" por activo individual, enriqueciendo la pestaña de Renta Variable y la de Tasas/Dólares.
3.  Utilizar el `volume_rank` para priorizar qué activos usar como referencia de "CCL Promedio".

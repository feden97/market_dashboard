# Documentación de la API Data912 (Uso Personal)

Esta nota resume el funcionamiento y los endpoints disponibles en **https://data912.com/**. Es una fuente excelente de datos financieros gratuitos, especialmente para el mercado argentino.

## Información General
- **Base URL**: `https://data912.com`
- **Autenticación**: Ninguna (Acceso libre).
- **Actualización**: Aproximadamente cada 20 segundos.
- **Autor**: Milton Casco Data Center Inc. (Proyecto educativo).

---

## Endpoints Principales

### 1. Precios en Vivo (Live)
Devuelven el estado actual de los activos.
- `GET /live/mep`: Valor implícito del dólar MEP.
- `GET /live/ccl`: Valor implícito del dólar Contado con Liqui.
- `GET /live/arg_stocks`: Acciones líderes y del panel general (BYMA).
- `GET /live/arg_cedears`: CEDEARs argentinos.
- `GET /live/arg_bonds`: Bonos soberanos argentinos.
- `GET /live/arg_options`: Cadena de opciones (lotes) locales.
- `GET /live/usa_stocks`: Acciones del mercado de EE.UU.
- `GET /live/usa_adrs`: ADRs de empresas argentinas en Nueva York.

### 2. Datos Históricos (Velas OHLC)
- `GET /historical/stocks/{ticker}`
- `GET /historical/cedears/{ticker}`
- `GET /historical/bonds/{ticker}`
- **Campos devueltos**: Fecha, Apertura, Máximo, Mínimo, Cierre, Volumen, Retorno Diario y Volatilidad.

### 3. Análisis Avanzado (EOD)
Datos procesados al cierre del mercado (especialmente USA).
- `GET /eod/volatilities/{ticker}`: Métricas de volatilidad implícita e histórica.
- `GET /eod/option_chain/{ticker}`: Cadena de opciones completa con **Griegas** (Delta, Gamma, Theta, Vega).

---

## Notas de Integración para el Dashboard

1. **Facilidad**: No necesitas API Keys, lo que hace que el fetching desde `app.js` sea muy directo.
2. **Cálculos**: La API ya entrega el MEP y CCL calculados, ahorrándote lógica de procesamiento en el frontend.
3. **Límites**: El límite es de ~120 peticiones por minuto, suficiente para un dashboard de uso personal.
4. **Confiabilidad**: Al ser un proyecto personal (hobby), es recomendable tener un "fallback" o manejo de errores por si el sitio cae temporalmente.

> [!TIP]
> Puedes usar esta API para reemplazar fuentes manuales de datos de bonos o acciones argentinas que actualmente no tengas automatizadas.

# Investigación: APIs de Renta Variable y Data912

## 1. API Actual en Renta Variable

Actualmente **no** se hacen llamadas a una API en tiempo real desde el navegador (frontend) para la tabla de Renta Variable. 
En su lugar, se utiliza un script de Python (`scripts/build_data.py`) que se ejecuta en el backend (servidores de GitHub) usando la librería **`yfinance` (Yahoo Finance)**.

### Columnas y Cálculos
El script descarga unos 120 días de historia para cada ticker y calcula las siguientes columnas internamente:
*   **Daily, Intra, 5d, 20d**: Variaciones porcentuales (Diaria, Intradiaria, de 5 y 20 días).
*   **ATR %**: Rango Verdadero Promedio (volatilidad) en porcentaje.
*   **Dist SMA50 / ATR**: Qué tan lejos está el precio actual de la media móvil de 50 días, medido en múltiplos de ATR.
*   **RS (Relative Strength)**: Fuerza relativa contra el índice SPY (usa cálculo rodante y ranking).
*   **ABC**: Calificación de tendencia basada en la alineación de las medias móviles exponenciales (10, 20) y simple (50).

### Frecuencia de Actualización
*   **Frecuencia**: **1 vez al día**.
*   **Mecanismo**: Mediante GitHub Actions (`.github/workflows/refresh_data.yml`). Se dispara automáticamente a las 16:30 (hora del este de EE.UU., post-cierre de mercado). Los resultados se guardan en el archivo `data/snapshot.json` que es lo que lee tu navegador.

---

## 2. Viabilidad de Migrar a Data912

El archivo `DOCS/API_Data912.md` indica que Data912 es una excelente fuente gratuita (120 peticiones por minuto) con datos en vivo cada 20 segundos y datos históricos.

### Análisis de Viabilidad

**A) Reemplazo total en Frontend (App.js en tiempo real): ❌ Poca Viabilidad**
Si intentas calcular el *ATR, RS, SMA50*, etc., directamente cuando abres la web, tendrías que pedir la historia de los ~130 tickers que tienes configurados. Al hacer `/historical/{ticker}` 130 veces casi en simultáneo, superarías el límite de 120 peticiones/minuto al instante, resultando en un bloqueo (HTTP 429).

**B) Reemplazo de yfinance en el Backend (Python / GitHub Actions): ✅ Viable**
Podrías modificar `build_data.py` para que en vez de descargar de Yahoo Finance, use los endpoints `/historical/` de Data912. 
*   **Estrategia Óptima**: Como el script corre en un servidor, se le puede programar una pequeña pausa (`time.sleep(0.5)`) entre cada ticker para no saturar el límite de 120 peticiones por minuto. Seguiría actualizándose 1 vez al día.

**C) Estrategia Híbrida (Ideal para el Dashboard): 🚀 Muy Viable**
1.  **Backend (1 vez al día)**: Mantener el cálculo pesado (SMA, ATR, RS, ABC) en el script de Python una vez al día (ya sea con Yahoo o Data912) y guardarlo en `snapshot.json`.
2.  **Frontend (En vivo)**: Usar los endpoints agrupados de Data912 (ej. `/live/usa_stocks` o `/live/arg_cedears`) directamente en `app.js` cada 1 o 5 minutos mientras tienes la web abierta. Esto requiere solo 1 o 2 llamadas en total (muy por debajo del límite de 120) y te permitiría actualizar dinámicamente las columnas de **Precio Actual**, **Daily** e **Intra** sin perder el rastro técnico pesado que se calculó la noche anterior.

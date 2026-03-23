# Arquitectura del Módulo "Renta Variable"

Este documento explica cómo funcionaba el módulo de Renta Variable en el proyecto `market_dashboard`. Está pensado para poder replicar o reutilizar esta lógica en el futuro en otros proyectos.

El sistema se divide en dos componentes principales:
1. **El Backend Estático (Python `build_data.py`)**: Se encarga de descargar la información histórica, efectuar cálculos técnicos, generar minigráficos como imágenes estáticas y volcar todo en archivos JSON.
2. **El Frontend (HTML, JavaScript, CSS)**: Consume ese JSON de manera asíncrona, renderiza las tablas agrupadas dinámicamente y maneja el gráfico interactivo de TradingView.

---

## 1. Backend: Recolección y Cálculos (Python)

El script `build_data.py` (ejecutado por GitHub Actions de forma periódica) se encargaba de obtener los precios y calcular métricas técnicas usando la librería `yfinance`. Todo se ejecuta de manera concurrente mediante `ThreadPoolExecutor` para acelerar la descarga.

### Datos Recopilados y Constantes
Se agrupaban los tickets a consultar en diccionarios estáticos como `STOCK_GROUPS` (ej: Acciones USA, CEDEARs, ADRs).

El ciclo para un ticker dado era:
1. Descarga del historial de los últimos `120` días.
2. En base a esos precios históricos, se aplicaban los siguientes indicadores con ventanas cortas (`21` días), medias (`50` días) y promedios móviles exponenciales.

### Indicadores Calculados
- **Variaciones de Precio (%, Absolutas):**
  - Diario
  - Intradiario (Último Cierre vs Apertura)
  - Semanal (5 días)
  - Mensual (20 días mín.)
- **ATR (Average True Range):** 
  - Usado para medir la volatilidad histórica promedio (por defecto ventana de `14` días). Se calcula un porcentaje respecto del precio para facilitar comparaciones cruzadas (`ATR% = (ATR / Cierre) * 100`).
- **ATRx (Distancia a SMA50 en términos de ATR):** 
  - Mide qué tan "lejos" está el precio actual de su media móvil de 50 días (`SMA50`). La distancia luego se divide por el % del ATR.
  - Indicaba sobrecompra `> +3` o sobreventa `< -3`.
- **Tendencia ABC:**
  - Evaluaba el cruce y estado de las EMA (10 y 20) vs la SMA50.
  - Generaba una etiqueta: `A` (Alcista: EMA10 > EMA20 > SMA50), `C` (Bajista: EMA10 < EMA20 < SMA50), u `B` (Mixta).
- **RRS (Relative Rotation Strength):**
  - Se comparaba el comportamiento de un ticker individual contra el SPY midiendo la volatilidad ajustada para determinar la Fuerza Relativa en un período iterativo (`RRS`, `rollingRRS`, `RRS_SMA`). 

### Gráficos Generados (`create_rs_chart_png`)
Se tomaban los datos rodantes del _Rolling RRS_ vs su _SMA_ (20 observaciones recientes) y se dibujaba un gráfico de tipo "barra combinada con línea" usando `matplotlib`.
El fondo se generaba color oscuro (`#1a1a1a`), sin ejes visibles y tamaño minúsculo. El archivo final se guardaba como PNG normal en `data/charts/`.

### Json Final (`snapshot.json`)
Todas las métricas por cada activo se procesaban e inyectaban en un array, agrupadas por jerarquía. El output formaba parte de `snapshot.json`. Asimismo se calculaban valores límites (`column_ranges`) globales (máximo y mínimo general) útiles para que la barra de visualización frontal tuviese un rango equitativo a todo el grupo.

---

## 2. Frontend: Renderizado (JavaScript + HTML)

Una vez que se carga `app.js`, se solicita `data/snapshot.json`. Cuando obtenía los datos, el flujo continuaba en:

### Tablas y Listados
- La función `renderGroups()` tomaba el JSON y construía código HTML iterando a través de cada grupo del objeto de datos.
- Las tablas contaban con `<th class="sortable" data-sort-by="...">` permitiendo ordenamiento tabular numérico/alfabético usando delegación de clics.
- Las variaciones porcentuales (Daily, 5D, 20D) se mostraban usando una barra visual que crecía a la izquierda (roja) o derecha (verde) del centro, usando los rangos precalculados (`vizWidth()`).

### Delegación de Eventos y Navegación
- **TradingView Widget**: Al hacer click en cualquier fila, se rescataba el atributo `data-symbol="TICKER"`. Este gatillaba `updateChart(ticker, rowElement)`. Solo reiniciaba el script de TradingView apuntando al nuevo ticker actualizando así el gráfico central.
- **Manejo por Teclado:** Un EventListener escuchaba a las teclas `ArrowUp` y `ArrowDown`. Controlaban un puntero `currentIndex` que leía cual era el ticker siguiente en la matriz global `allTickerRows` permitiendo navegación tipo terminal.
- **Scroll Inteligente:** `scrollToGroup(groupName)` permitía saltar en un listado muy grande al grupo específico clickeando arriba.

---

## Estructura HTML y CSS

La vista se armó mediante CSS Grid / Flexbox: Un gran layout que tenía el menú a la izquierda (`ticker-list`) y a la derecha un contendor grande fijo para el gráfico (`chart-container`).
A cada fila en las tablas se le sumaba funcionalidad interactiva, cambios de colores semánticos a través de tags de tendencias condicionales.

El uso exhaustivo de variables y atributos `data-*` resultaba ideal para independizar el motor frontal del origen de datos, manteniendo consistencia visual.

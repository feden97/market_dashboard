/**
 * Market Dashboard — app.js
 * Refactored: fixed Promise error handling, extracted helpers,
 * eliminated duplicate logic, cleaned up global namespace.
 */

// ─── Theme ───────────────────────────────────────────────────────────────────

function applyChartThemeOverrides() {
    if (window._renderSpreadChart && window._lastHistoricalFiat) {
        if (window.spreadChartInstance) {
            window.spreadChartInstance.destroy();
            window.spreadChartInstance = null;
        }
        window._renderSpreadChart(window._lastHistoricalFiat);
    }
    if (window._renderBandasChart && window._lastHistoricalFiat) {
        window._renderBandasChart(window._lastHistoricalFiat);
    }
    if (window.inflationChartInstance) {
        window.inflationChartInstance.update();
    }
    if (window.tradingviewWidget) {
        const sym = document.querySelector('#tab-renta .ticker-row.active')?.getAttribute('data-symbol')
            || window._lastChartSymbol;
        if (sym) window.initChart(sym);
    }
}

function updateThemeIcon(theme) {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    if (!sunIcon || !moonIcon) return;
    sunIcon.style.display = theme === 'dark' ? 'none' : 'block';
    moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme-preference', next);
    updateThemeIcon(next);
    applyChartThemeOverrides();
}

// Apply theme before first paint to avoid flash
(function initTheme() {
    const saved = localStorage.getItem('theme-preference');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved ?? (system ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('theme-preference')) return; // user override takes priority
        const t = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', t);
        updateThemeIcon(t);
        applyChartThemeOverrides();
    });
})();

// ─── Navigation ──────────────────────────────────────────────────────────────

function switchTab(tabId, btnElement) {
    document.querySelectorAll('#tab-resumen, #tab-argentina, #tab-tasas, #tab-renta')
        .forEach(el => el.classList.remove('active'));
    btnElement.closest('.nav-container').querySelectorAll('.nav-tab')
        .forEach(el => el.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    btnElement.classList.add('active');

    const submenu = document.getElementById('sub-tabs-tasas');
    if (submenu) submenu.style.display = tabId === 'tab-tasas' ? 'flex' : 'none';
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function switchTasasTab(subId, btnElement) {
    ['tasas-pesos', 'tasas-cripto'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    btnElement.parentElement.querySelectorAll('.sub-tab').forEach(el => el.classList.remove('active'));
    document.getElementById(subId).style.display = 'block';
    btnElement.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatDate(dStr) {
    if (!dStr) return '';
    const parts = dStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
}

function formatLimit(v) {
    if (!v) return null;
    return v >= 1_000_000
        ? `$${(v / 1_000_000).toFixed(0)} M`
        : `$${(v / 1_000).toFixed(0)} K`;
}

/** Renders a green/red % badge. Returns '-' when value is missing. */
function formatVar(v) {
    if (v == null) return '-';
    const cls = v >= 0 ? 'badge-green' : 'badge-red';
    const sign = v > 0 ? '+' : '';
    return `<span class="${cls}">${sign}${v.toFixed(2)}%</span>`;
}

/** Renders a spread % badge relative to a base price. */
function calcBrecha(val, basePrice) {
    if (!basePrice || !val) return '-';
    const pct = ((val / basePrice) - 1) * 100;
    const cls = pct >= 0 ? 'badge-green' : 'badge-red';
    const sign = pct > 0 ? '+' : '';
    return `<span class="${cls}">${sign}${pct.toFixed(2)}%</span>`;
}

const QUESTION_MARK_SVG = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`;

/** Builds a tooltip container HTML string. */
function buildTooltipHtml(text, dir = '') {
    if (!text) return '';
    return `
        <div class="tooltip-container ${dir}" style="margin-left:4px; color:var(--text-muted); cursor:help;">
            ${QUESTION_MARK_SVG}
            <div class="tooltip-text" style="font-weight:600; text-align:left; min-width:200px;">${text}</div>
        </div>`;
}

/**
 * Resolves a brand icon for an entity name by checking window.iconMapExt
 * with progressively simpler keys.
 */
function getIcon(name) {
    const map = window.iconMapExt || {};
    const low = name.toLowerCase().trim();
    if (map[low]) return map[low];

    const noBank = low.replace(/^banco\s+(de\s+la\s+)?/i, '').trim();
    if (map[noBank]) return map[noBank];

    const first = noBank.split(' ')[0];
    return map[first] || null;
}

/**
 * Injects a brand icon into the `.radar-card-icon` closest to `anchorId`,
 * clearing the tinted background to avoid colour bleed.
 */
function setRadarIcon(anchorId, iconHtml) {
    if (!iconHtml) return;
    const el = document.getElementById(anchorId)
        ?.closest('.radar-card')
        ?.querySelector('.radar-card-icon');
    if (!el) return;
    el.innerHTML = iconHtml;
    el.style.background = 'transparent';
    el.style.padding = '0';
}

// ─── Terminal row builder ─────────────────────────────────────────────────────

/**
 * Returns HTML for a single terminal-style row (used in Tasas › Pesos).
 *
 * @param {string}   name
 * @param {string}   tna          Formatted rate string, e.g. "34.50%"
 * @param {string}   subLabel     Secondary descriptor below the name
 * @param {string[]} metaPills    Optional badge texts
 * @param {boolean}  isBest       Highlight as top-ranked entry
 * @param {string}   dateInfo     Optional footnote text
 * @param {string}   tooltipText  Optional tooltip content (HTML allowed)
 */
function buildTerminalRow(name, tna, subLabel, metaPills = [], isBest = false, dateInfo = '', tooltipText = '') {
    const icon = getIcon(name);
    const renderIcon = icon
        ? icon.replace('width: 28px;', 'width: 24px;').replace('height: 28px;', 'height: 24px;')
        : `<span>${name.charAt(0).toUpperCase()}</span>`;

    const tooltipHtml = buildTooltipHtml(tooltipText);

    const pillsHtml = metaPills
        .filter(Boolean)
        .map(p => {
            let cls = 'terminal-meta-pill';
            if (p.includes('Límite')) cls += ' pill-limit';
            if (p.includes('Liquidez')) cls += ' pill-liquidity';
            return `<span class="${cls}">${p}</span>`;
        })
        .join('');

    return `
        <div class="terminal-row${isBest ? ' terminal-highlight' : ''}">
            <div class="terminal-entity">
                <div class="terminal-logo">${renderIcon}</div>
                <div style="min-width:0; flex:1;">
                    <div class="terminal-name" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        ${name} ${tooltipHtml}
                    </div>
                    <div class="terminal-sub-label">${subLabel}</div>
                    ${pillsHtml ? `<div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">${pillsHtml}</div>` : ''}
                </div>
            </div>
            <div class="terminal-data">
                <div class="terminal-rate-container">
                    <div class="mono-rate">${tna}</div>
                    <div class="terminal-rate-label">TNA</div>
                </div>
            </div>
            ${dateInfo ? `<div style="width:100%; text-align:right; font-size:11px; color:var(--text-muted); margin-top:6px; opacity:0.8;">${dateInfo}</div>` : ''}
        </div>`;
}

function buildSimpleList(items) {
    return items
        .map((item, idx) => {
            const dateStr = item.date ? `TNA vigente desde el ${formatDate(item.date)}` : '';
            const rate = (parseFloat(item.rate) * 100).toFixed(2) + '%';
            return buildTerminalRow(item.name, rate, 'Plazo Fijo', [], idx === 0, dateStr);
        })
        .join('');
}

// ─── Fiat table builder ───────────────────────────────────────────────────────

/**
 * Rebuilds the fiat dolar comparison table and the spread chart summary.
 * Extracted to a standalone function so pill changes and live ticks can
 * both call it without duplicating the HTML template.
 */
function updateFiatTable() {
    const fiatData = window._cachedFiatData;
    const maxVenta = window._cachedMaxVenta;
    const usdt_var = window._cachedUsdtVar || 0;

    if (!fiatData || !maxVenta) return;

    const activePill = document.querySelector('#base-currency-pills .base-pill.active');
    const baseCurrency = activePill?.getAttribute('data-val') ?? 'usdt';
    const basePrice = baseCurrency === 'usdt' ? maxVenta : fiatData[baseCurrency].price;

    const usdtTooltip = buildTooltipHtml(
        'Es el dólar cripto que cotiza las 24 horas TODOS los días. ' +
        'Es el precio para comprar USDT en Binance p2p más aproximado posible ' +
        'sin la opción "comerciantes verificados"',
        'tooltip-right'
    );

    let rows = ['ccl', 'mep', 'oficial', 'blue'].map(f => `
        <tr>
            <td style="color:var(--text-muted); text-transform:uppercase;">${f}</td>
            <td style="font-weight:bold;">$${fiatData[f].price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td>${formatVar(fiatData[f].var)}</td>
            <td>${f === baseCurrency ? '-' : calcBrecha(fiatData[f].price, basePrice)}</td>
        </tr>`).join('');

    rows += `
        <tr>
            <td style="color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                USDT ${usdtTooltip}
            </td>
            <td style="font-weight:bold;">$${maxVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td>${formatVar(usdt_var)}</td>
            <td>${baseCurrency === 'usdt' ? '-' : calcBrecha(maxVenta, basePrice)}</td>
        </tr>`;

    const fiatTable = document.getElementById('fiat-table-body');
    if (fiatTable) fiatTable.innerHTML = rows;

    /* Removing automatic chart re-render from here to avoid flicker.
       It's now handled smoothly in _updateFiatDataAndBandas or fully on pill switch. */
}

// ─── Tasas data ───────────────────────────────────────────────────────────────

async function loadTasasData() {
    if (window.tasasLoaded) return;
    window.tasasLoaded = true;

    const API = 'https://api.argentinadatos.com/v1/finanzas';

    try {
        const [pfData, remuData, rendData, fciUltimo, fciPenultimo] = await Promise.all([
            fetch(`${API}/tasas/plazoFijo`).then(r => r.json()),
            fetch(`${API}/fci/otros/ultimo`).then(r => r.json()),
            fetch(`${API}/rendimientos`).then(r => r.json()),
            fetch(`${API}/fci/mercadoDinero/ultimo`).then(r => r.json()),
            fetch(`${API}/fci/mercadoDinero/penultimo`).then(r => r.json()),
        ]);

        _processPlazosFijos(pfData);
        _processCuentasRemuneradas(remuData);
        _processFCI(fciUltimo, fciPenultimo);
        _processYieldMatrix(rendData);

    } catch (err) {
        console.error('Error loading tasas data:', err);
    }
}

function _processPlazosFijos(pfData) {
    const ALLOWED = ['NACION', 'PROVINCIA', 'CIUDAD', 'SANTANDER', 'GALICIA',
        'BBVA', 'MACRO', 'BRUBANK', 'DEL SOL', 'UALA', 'SUPERVIELLE'];

    const NAME_MAP = {
        NACION: 'Banco Nación',
        PROVINCIA: 'Banco Provincia',
        CIUDAD: 'Banco Ciudad',
        SANTANDER: 'Banco Santander',
        'GALICIA MAS': 'Banco Galicia Más (ex HSBC)',
        HSBC: 'Banco Galicia Más (ex HSBC)',
        GALICIA: 'Banco Galicia',
        BBVA: 'BBVA',
        MACRO: 'Banco Macro',
        BRUBANK: 'Brubank',
        'DEL SOL': 'Banco del Sol',
        UALA: 'Ualá',
        SUPERVIELLE: 'Banco Supervielle',
    };

    const seen = new Set();
    const unique = [];

    for (const p of pfData) {
        const upper = (p.entidad || '').toUpperCase();
        if (!ALLOWED.some(a => upper.includes(a))) continue;

        let cleanName = p.entidad.replace('BANCO ', '').replace(' DE LA ', ' ').substring(0, 25);
        for (const [key, val] of Object.entries(NAME_MAP)) {
            if (upper.includes(key)) { cleanName = val; break; }
        }

        if (!seen.has(cleanName)) {
            seen.add(cleanName);
            unique.push({ name: cleanName, rate: p.tnaClientes, date: p.fecha });
        }
    }

    unique.sort((a, b) => (b.rate || 0) - (a.rate || 0));
    document.getElementById('ars-pf-list').innerHTML = buildSimpleList(unique);

    if (unique.length > 0) {
        document.getElementById('best-pf-name').innerText = unique[0].name;
        document.getElementById('best-pf-val').innerText = (unique[0].rate * 100).toFixed(2) + '%';
        setRadarIcon('best-pf-name', getIcon(unique[0].name));
    }
}

function _processCuentasRemuneradas(remuData) {
    const FILTER_NAMES = ['CARREFOUR', 'FIWIND', 'NARANJA', 'UALA'];

    const NAME_OVERRIDES = {
        'UALA PLUS 2': 'Ualá Plus 2',
        'UALA PLUS 1': 'Ualá Plus 1',
        'UALA': 'Ualá',
        'NARANJA X': 'Naranja X',
        'FIWIND': 'Fiwind',
        'CARREFOUR': 'Carrefour Banco',
    };

    const TOOLTIPS = {
        'Ualá Plus 1': 'Acumulá $250.000 entre inversiones, consumos con tarjeta y cobros con Ualá Bis para acceder a la tasa Plus 1 el próximo mes.',
        'Ualá Plus 2': 'Acumulá $500.000 entre inversiones, consumos con tarjeta y cobros con Ualá Bis para acceder a la tasa Plus 2 el próximo mes.',
    };

    const filtered = remuData
        .filter(e => FILTER_NAMES.some(f => e.fondo.toUpperCase().includes(f)))
        .sort((a, b) => (b.tna || 0) - (a.tna || 0));

    const html = filtered.map((acc, idx) => {
        const rawUpper = acc.fondo.toUpperCase().trim();
        const name = Object.entries(NAME_OVERRIDES).find(([k]) => rawUpper.includes(k))?.[1]
            ?? acc.fondo.replace('BANCO', '').trim();
        const tna = (acc.tna * 100).toFixed(2) + '%';

        let limitTxt = null;
        if (name === 'Fiwind') limitTxt = 'Límite: $750 K';
        else if (name === 'Carrefour Banco') limitTxt = 'Sin Límites';
        else if (acc.tope) limitTxt = `Límite: ${formatLimit(acc.tope)}`;

        const subLabel = rawUpper.includes('FIWIND') ? 'Billetera Virtual' : 'Cuenta Remunerada';
        const dateStr = acc.fecha ? `TNA vigente desde el ${formatDate(acc.fecha)}` : '';
        const tooltip = acc.condicionesCorto || TOOLTIPS[name] || '';

        return buildTerminalRow(name, tna, subLabel, limitTxt ? [limitTxt] : [], idx === 0, dateStr, tooltip);
    }).join('');

    document.getElementById('ars-accounts-container').innerHTML = html;

    if (filtered.length > 0) {
        const rawUpper = filtered[0].fondo.toUpperCase().trim();
        const yieldName = Object.entries({
            'UALA PLUS 2': 'Ualá Plus 2',
            'UALA PLUS 1': 'Ualá Plus 1',
            'UALA': 'Ualá',
            'NARANJA': 'Naranja X',
            'FIWIND': 'Fiwind',
            'CARREFOUR': 'Carrefour Banco',
        }).find(([k]) => rawUpper.includes(k))?.[1] ?? 'Carrefour Banco';

        document.getElementById('best-yield-name').innerText = yieldName;
        document.getElementById('best-yield-val').innerText = (filtered[0].tna * 100).toFixed(2) + '%';
        setRadarIcon('best-yield-name', getIcon(yieldName));
    }
}

function _processFCI(fciUltimo, fciPenultimo) {
    const ALLOWED_FCI = [
        { key: 'PREX', name: 'Prex', desc: 'Allaria Ahorro - Clase E' },
        { key: 'PERSONAL', name: 'Personal Pay', desc: 'Delta Pesos - Clase X' },
        { key: 'UALA', name: 'Ualá', desc: 'Ualintec Ahorro Pesos - Clase A' },
        { key: 'CLARO', name: 'Claro Pay', desc: 'SBS Ahorro Pesos - Clase A' },
        { key: 'MERCADO', name: 'Mercado Pago', desc: 'Mercado Fondo - Clase A' },
        { key: 'LEMON', name: 'Lemon', desc: 'Fima Premium - Clase P' },
        { key: 'FIWIND', name: 'Fiwind', desc: 'Delta Pesos - Clase A' },
    ];

    const items = ALLOWED_FCI.flatMap(f => {
        const ult = fciUltimo.find(i => i.fondo?.toUpperCase() === f.desc.toUpperCase());
        const pen = fciPenultimo.find(i => i.fondo?.toUpperCase() === f.desc.toUpperCase());
        if (!ult?.vcp || !pen?.vcp) return [];

        const days = (new Date(ult.fecha) - new Date(pen.fecha)) / 86_400_000;
        if (days <= 0) return [];

        const tna = ((ult.vcp / pen.vcp - 1) / days) * 365;
        const dateStr = `Entre ${formatDate(pen.fecha)} y ${formatDate(ult.fecha)}`;
        return [{ name: f.name, desc: f.desc, dateStr, rate: tna }];
    });

    items.sort((a, b) => b.rate - a.rate);

    const html = items.length
        ? items.map((f, i) => buildTerminalRow(
            f.name, (f.rate * 100).toFixed(2) + '%', f.desc, [], i === 0, f.dateStr
        )).join('')
        : '<div style="text-align:center; color:var(--text-muted); padding:40px;">No hay rendimientos disponibles.</div>';

    document.getElementById('ars-fci-container').innerHTML = html;
}

function _processYieldMatrix(rendData) {
    const ENTITIES = ['Fiwind', 'LB', 'Belo', 'LemonCash', 'Vesseo'];
    const DISPLAY = { LemonCash: 'Lemon' };
    const API_KEY = { Fiwind: 'fiwind', LB: 'letsbit', Belo: 'belo', LemonCash: 'lemoncash', Vesseo: 'vesseo' };
    const COINS = ['USDT', 'USDC', 'DAI'];

    // Build rate map
    const rateMap = {};
    const tiersMap = {};

    for (const ent of ENTITIES) {
        rateMap[ent] = {};
        tiersMap[ent] = {};
        const provider = rendData.find(d => d.entidad.toLowerCase() === API_KEY[ent].toLowerCase());

        for (const coin of COINS) {
            tiersMap[ent][coin] = false;
            if (!provider) { rateMap[ent][coin] = null; continue; }

            const matches = provider.rendimientos.filter(r => r.moneda.toUpperCase() === coin && r.apy > 0);
            if (!matches.length) { rateMap[ent][coin] = null; continue; }

            const best = matches.reduce((a, b) => a.apy > b.apy ? a : b);
            rateMap[ent][coin] = best.apy;

            const uniqueRates = new Set(matches.map(r => r.apy));
            if (uniqueRates.size > 1) {
                tiersMap[ent][coin] = ent !== 'LemonCash' || coin === 'USDT';
            }
            // Always show tooltip for Lemon USDT
            if (ent === 'LemonCash' && coin === 'USDT') tiersMap[ent][coin] = true;
        }
    }

    // Best rate per coin (for heatmap highlight)
    const bestPerCoin = {};
    for (const coin of COINS) {
        const best = ENTITIES.reduce((max, ent) => Math.max(max, rateMap[ent][coin] ?? -1), -1);
        bestPerCoin[coin] = best > 0 ? best : null;
    }

    // Build table HTML
    const headerCols = ENTITIES.map(ent => {
        const name = DISPLAY[ent] || ent;
        const icon = window.iconMapExt?.[ent.toLowerCase()] ?? '';
        return `
            <th>
                <div class="matrix-exchange-header">
                    <div class="matrix-exchange-icon">${icon}</div>
                    <span>${name}</span>
                </div>
            </th>`;
    }).join('');

    const bodyRows = COINS.map(coin => {
        const coinIcon = window.iconMapExt?.[coin.toLowerCase()] ?? '';
        const cells = ENTITIES.map((ent, entIdx) => {
            const rate = rateMap[ent][coin];
            const isBest = rate !== null && rate === bestPerCoin[coin];
            const cls = rate !== null ? (isBest ? 'yield-cell best-yield' : 'yield-cell') : 'yield-na hide-mobile';
            const dir = entIdx >= 3 ? 'tooltip-left' : 'tooltip-right';
            const name = DISPLAY[ent] || ent;
            const entIcon = window.iconMapExt?.[ent.toLowerCase()] ?? '';

            let displayRate = '—';
            if (rate !== null) {
                let tooltipHtml = '';
                if (ent === 'LemonCash' && coin === 'USDT') {
                    tooltipHtml = buildTooltipHtml(
                        `Interés sujeto a cada nivel.<br>Hasta 1000 ${coin}: ${rate.toFixed(2)}%<br>Más de 1000 ${coin}: 2.75%`,
                        dir
                    );
                } else if (tiersMap[ent][coin]) {
                    tooltipHtml = buildTooltipHtml(
                        'Tasa máxima detectada.<br>El rendimiento varía según condiciones de la plataforma.',
                        dir
                    );
                }
                const containerCls = tooltipHtml ? 'apy-container has-tooltip' : 'apy-container';
                displayRate = `<div class="${containerCls}"><span class="apy-value">${rate.toFixed(2)}%</span>${tooltipHtml}</div>`;
            }

            return `
                <td class="${cls}" data-exchange="${name}">
                    <div class="exchange-label-mobile">
                        <div class="matrix-exchange-icon">${entIcon}</div>
                        <span>${name}</span>
                    </div>
                    ${displayRate}
                </td>`;
        }).join('');

        return `
            <tr>
                <td>
                    <div class="matrix-coin-cell">
                        <div class="matrix-coin-icon">${coinIcon}</div>
                        <span>${coin}</span>
                    </div>
                </td>
                ${cells}
            </tr>`;
    }).join('');

    document.getElementById('yield-matrix-wrapper').innerHTML = `
        <table class="yield-matrix">
            <thead><tr><th>Criptomoneda</th>${headerCols}</tr></thead>
            <tbody>${bodyRows}</tbody>
        </table>`;

    // Update Resumen Crypto card
    let bestRate = -1, bestExchange = '...', bestCoin = 'USDT', bestEntKey = '';
    for (const ent of ENTITIES) {
        for (const coin of COINS) {
            const r = rateMap[ent][coin];
            if (r !== null && r > bestRate) {
                bestRate = r; bestExchange = DISPLAY[ent] || ent; bestCoin = coin; bestEntKey = ent;
            }
        }
    }
    if (bestRate > 0) {
        document.getElementById('best-crypto-name').innerText = bestExchange;
        document.getElementById('best-crypto-val').innerText = bestRate.toFixed(2) + '%';

        const coinIcon = window.iconMapExt?.[bestCoin.toLowerCase()] ?? '';
        const detailEl = document.getElementById('best-crypto-detail');
        if (detailEl) detailEl.innerHTML = `<span class="radar-detail-coin">${coinIcon}<span>${bestCoin}</span></span>`;
        setRadarIcon('best-crypto-name', getIcon(bestExchange));
    }
}

// ─── Main app IIFE ────────────────────────────────────────────────────────────

(function () {
    // ── State ────────────────────────────────────────────────────────────────
    let chartWidget = null;
    let snapshot = null;
    let datosBandas = [];
    let allTickerRows = [];
    let currentIndex = 0;
    let currentSortStates = {};
    let meta = null;
    let nextUpdateSecs = 60;
    let progressInterval = null;

    // ── Utilities ────────────────────────────────────────────────────────────

    function safeGroupId(name) {
        return name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    function vizWidth(value, minVal, maxVal) {
        if (value == null || minVal >= maxVal) return 0;
        if (value >= 0) return minVal < maxVal ? Math.min(100, Math.max(0, (value / (maxVal || 1)) * 100)) : 0;
        if (minVal >= 0) return 0;
        return Math.min(100, Math.max(0, (Math.abs(value) / Math.abs(minVal)) * 100));
    }

    // ── Renta Variable rendering ──────────────────────────────────────────────

    function renderGroups() {
        if (!snapshot?.groups) return;

        let html = '';
        for (const [groupName, rows] of Object.entries(snapshot.groups)) {
            if (!rows?.length) continue;
            const safeId = safeGroupId(groupName);
            const ranges = snapshot.column_ranges?.[groupName] ?? {
                daily: [-10, 10], intra: [-10, 10], '5d': [-20, 20], '20d': [-30, 30],
            };

            let legendHtml = '';
            if (meta?.SECTOR_COLORS && groupName.toLowerCase().includes('industr')) {
                const spans = Object.entries(meta.SECTOR_COLORS)
                    .map(([s, c]) => `<span class="rv-legend-item" style="background-color:${c}">${s}</span>`)
                    .join('');
                legendHtml = `<div class="rv-legend" onclick="event.stopPropagation()">${spans}</div>`;
            }

            const makeBar = (val, w) => {
                if (val == null) return '<td>-</td>';
                const cls = val >= 0 ? 'positive' : 'negative';
                const sign = val >= 0 ? '+' : '';
                const color = val >= 0 ? 'var(--green)' : 'var(--red)';
                return `
                    <td>
                        <div class="value-visualization">
                            <div class="value-bar ${cls}" style="width:${w}%"></div>
                            <span class="value-text" style="color:${color}">${sign}${val.toFixed(2)}%</span>
                        </div>
                    </td>`;
            };

            const tableRows = rows.map((r, i) => {
                const { daily, '5d': five, '20d': twenty, abc = '', ticker } = r;
                const labelClass = (groupName === 'Industries' && meta?.Industries_COLORS?.[ticker])
                    ? `rv-ticker-label-${ticker}`
                    : 'rv-ticker-label';

                return `
                    <tr class="ticker-row"
                        onclick="updateChart('${ticker}', this)"
                        data-symbol="${ticker}"
                        data-group="${groupName.replace(/"/g, '&quot;')}"
                        data-daily="${daily || 0}"
                        data-5d="${five || 0}"
                        data-20d="${twenty || 0}"
                        data-atr_pct="${r.atr_pct || 0}"
                        data-dist_sma50_atr="${r.dist_sma50_atr || 0}"
                        data-rs="${r.rs || 0}"
                        data-abc="${abc}"
                        data-index="${i}">
                        <td><span class="${labelClass}">${ticker}</span></td>
                        <td>${abc ? `<span class="abc-rating abc-${abc.toLowerCase()}">${abc}</span>` : '-'}</td>
                        <td class="price-cell">${r.price != null ? r.price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                        ${makeBar(daily, vizWidth(daily, ranges.daily?.[0] ?? -10, ranges.daily?.[1] ?? 10))}
                        ${makeBar(five, vizWidth(five, ranges['5d']?.[0] ?? -20, ranges['5d']?.[1] ?? 20))}
                        ${makeBar(twenty, vizWidth(twenty, ranges['20d']?.[0] ?? -30, ranges['20d']?.[1] ?? 30))}
                        <td>${r.atr_pct != null ? r.atr_pct.toFixed(1) + '%' : '-'}</td>
                        <td>${r.dist_sma50_atr != null ? r.dist_sma50_atr.toFixed(2) : '-'}</td>
                        <td>${r.rs != null ? Math.round(r.rs) + '%' : '-'}</td>
                        <td>${r.dist_sma50_atr != null ? r.dist_sma50_atr.toFixed(2) : '-'}</td>
                        <td>${r.rs != null ? Math.round(r.rs) + '%' : '-'}</td>
                    </tr>`;
            }).join('');

            html += `
                <div class="group-container" id="group-${safeId}">
                    <div class="group-header" onclick="scrollToGroup('${groupName.replace(/'/g, "\\'")}')">
                        <span>${groupName}</span>
                        ${legendHtml}
                    </div>
                    <table class="ticker-table" data-group="${groupName.replace(/"/g, '&quot;')}">
                        <thead>
                            <tr>
                                <th class="sortable" data-sort-by="symbol">Ticker</th>
                                <th class="sortable" data-sort-by="abc">Tendencia</th>
                                <th class="sortable" data-sort-by="price">Precio</th>
                                <th class="sortable" data-sort-by="daily">Daily</th>
                                <th class="sortable" data-sort-by="5d">5D</th>
                                <th class="sortable" data-sort-by="20d">20D</th>
                                <th class="sortable" data-sort-by="atr_pct">ATR%</th>
                                <th class="sortable" data-sort-by="dist_sma50_atr">ATRx</th>
                                <th class="sortable" data-sort-by="rs">1M-VARS</th>
                            </tr>
                        </thead>
                        <tbody id="${safeId}-body">${tableRows}</tbody>
                    </table>
                </div>`;
        }

        document.getElementById('groups-container').innerHTML = html;

        // Inject Industry colour styles
        if (meta?.Industries_COLORS) {
            const css = Object.entries(meta.Industries_COLORS)
                .map(([t, c]) => `.rv-ticker-label-${t}{display:inline-block;padding:2px 8px;border-radius:10px;background-color:${c};color:white;font-weight:600;font-size:12px;letter-spacing:0.3px}`)
                .join(' ');
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }

        initRentaApp();
    }

    function initRentaApp() {
        allTickerRows = [...document.querySelectorAll('#tab-renta .ticker-row')];

        document.querySelectorAll('#tab-renta .ticker-table').forEach(table => {
            const g = table.getAttribute('data-group');
            currentSortStates[g] = { sortBy: null, direction: 1, count: 0 };
        });

        // Column guide toggle
        const guideContainer = document.getElementById('column-guide-container');
        document.getElementById('column-guide-toggle')?.addEventListener('click', () => {
            guideContainer?.classList.add('active');
        });
        document.getElementById('column-guide-close')?.addEventListener('click', e => {
            e.stopPropagation();
            guideContainer?.classList.remove('active');
        });

        // Sort delegation on the ticker list
        const listEl = document.querySelector('#tab-renta .ticker-list');
        if (listEl && !listEl._sortDelegate) {
            listEl._sortDelegate = true;
            listEl.addEventListener('click', e => {
                const th = e.target.closest('th.sortable');
                const table = th?.closest('table.ticker-table');
                if (!th || !table) return;
                window.sortGroup(table.getAttribute('data-group'), th.getAttribute('data-sort-by'));
            });
        }

        const defaultSymbol = meta?.default_symbol ?? 'SPY';
        initChart(defaultSymbol);
        if (allTickerRows.length > 0) allTickerRows[0].classList.add('active');

        document.addEventListener('keydown', e => {
            if (!document.getElementById('tab-renta').classList.contains('active')) return;
            if (e.key === 'ArrowDown' && currentIndex < allTickerRows.length - 1) {
                e.preventDefault();
                currentIndex++;
                updateChart(allTickerRows[currentIndex].getAttribute('data-symbol'), allTickerRows[currentIndex]);
            }
            if (e.key === 'ArrowUp' && currentIndex > 0) {
                e.preventDefault();
                currentIndex--;
                updateChart(allTickerRows[currentIndex].getAttribute('data-symbol'), allTickerRows[currentIndex]);
            }
        });
    }

    window.scrollToGroup = function (groupName) {
        document.getElementById('group-' + safeGroupId(groupName))?.scrollIntoView({ behavior: 'smooth' });
    };

    window.sortGroup = function (group, sortBy) {
        const table = [...document.querySelectorAll('#tab-renta .ticker-table')]
            .find(t => t.getAttribute('data-group') === group);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        const rows = [...tbody.querySelectorAll('.ticker-row')];
        const state = currentSortStates[group] ??= { sortBy: null, direction: 1, count: 0 };

        table.querySelectorAll('th, td').forEach(el => el.classList.remove('sort-asc', 'sort-desc', 'sorted-column'));

        if (state.sortBy === sortBy) {
            state.count++;
            if (state.count >= 3) {
                Object.assign(state, { sortBy: null, direction: 1, count: 0 });
                rows.sort((a, b) => +a.dataset.index - +b.dataset.index);
                tbody.replaceChildren(...rows);
                allTickerRows = [...document.querySelectorAll('#tab-renta .ticker-row')];
                return;
            }
        } else {
            state.count = 1;
        }

        state.sortBy = sortBy;
        if (state.count === 2) state.direction *= -1; else state.direction = 1;

        const COL_MAP = { symbol: 0, abc: 1, daily: 2, '5d': 3, '20d': 4, atr_pct: 5, dist_sma50_atr: 6, rs: 7 };
        const hi = COL_MAP[sortBy] ?? 7;
        const header = table.querySelectorAll('th')[hi];
        if (header) header.classList.add(state.direction === 1 ? 'sort-asc' : 'sort-desc', 'sorted-column');
        rows.forEach(row => row.querySelectorAll('td')[hi]?.classList.add('sorted-column'));

        rows.sort((a, b) => {
            if (sortBy === 'symbol') return a.dataset.symbol.toLowerCase().localeCompare(b.dataset.symbol.toLowerCase()) * state.direction;
            if (sortBy === 'abc') return (a.dataset.abc ?? '').localeCompare(b.dataset.abc ?? '') * state.direction;
            return (parseFloat(a.dataset[sortBy]) - parseFloat(b.dataset[sortBy])) * state.direction;
        });

        tbody.replaceChildren(...rows);
        allTickerRows = [...document.querySelectorAll('#tab-renta .ticker-row')];
        const activeRow = document.querySelector('#tab-renta .ticker-row.active');
        if (activeRow) currentIndex = allTickerRows.indexOf(activeRow);
    };

    // ── TradingView chart ─────────────────────────────────────────────────────

    function initChart(symbol) {
        chartWidget?.remove();
        chartWidget = null;
        window._lastChartSymbol = symbol;

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const isMobile = window.innerWidth <= 768;

        chartWidget = new TradingView.widget({
            allow_symbol_change: !isMobile,
            calendar: false,
            details: !isMobile,
            hide_side_toolbar: isMobile,
            hide_top_toolbar: false,
            hide_legend: false,
            hide_volume: true,
            hotlist: false,
            interval: 'D',
            locale: 'es',
            save_image: false,
            style: '1',
            theme: isLight ? 'light' : 'dark',
            toolbar_bg: isLight ? '#f8fafc' : '#09090b',
            backgroundColor: isLight ? '#f8fafc' : '#09090b',
            gridColor: isLight ? 'rgba(226, 232, 240, 1)' : 'rgba(63, 63, 70, 0.4)',
            symbol,
            timezone: 'America/Argentina/Buenos_Aires',
            studies: ['STD;MA%Ribbon'],
            autosize: true,
            enable_publishing: false,
            container_id: 'tradingview-chart',
            withdateranges: true,
        });
        window.tradingviewWidget = chartWidget;
    }

    window.initChart = initChart;

    window.updateChart = function (symbol, element) {
        document.querySelectorAll('#tab-renta .ticker-row').forEach(r => r.classList.remove('active'));
        const row = element ?? [...document.querySelectorAll('#tab-renta .ticker-row')]
            .find(r => r.getAttribute('data-symbol') === symbol);
        if (row) {
            row.classList.add('active');
            currentIndex = allTickerRows.indexOf(row);
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        initChart(symbol);
    };

    // ── Macro / inflation rendering ───────────────────────────────────────────

    function renderMacro(macro) {
        if (!macro) return;

        // Holidays
        const holidaysEl = document.getElementById('feriados-list');
        if (holidaysEl) {
            const fallback = '<li style="list-style:none; color:#9ca3af; margin-left:-20px;">Sin feriados restantes este mes</li>';
            holidaysEl.innerHTML = macro.holidays?.length
                ? macro.holidays.map(h => `<li>${h}</li>`).join('')
                : fallback;
        }

        // IPC history (merge live data if available)
        const ipcSource = { ...(macro.ipc_history || {}) };
        window._liveInflation?.forEach(item => {
            ipcSource[item.fecha.substring(0, 7)] = item.valor / 100;
        });

        if (!Object.keys(ipcSource).length) return;

        const MONTH_NAMES = {
            '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
            '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
        };

        const last12Keys = Object.keys(ipcSource).sort().slice(-12);
        const labels = [], dataPoints = [], years = [];
        let acum = 1, sum = 0;

        for (const key of last12Keys) {
            const [y, m] = key.split('-');
            const val = ipcSource[key];
            labels.push(MONTH_NAMES[m] || m);
            years.push(y);
            dataPoints.push(parseFloat((val * 100).toFixed(1)));
            acum *= (1 + val);
            sum += val;
        }

        const lastMonthVal = dataPoints[dataPoints.length - 1];
        const avg12m = (sum / last12Keys.length) * 100;
        const acum12m = (acum - 1) * 100;

        document.querySelectorAll('.inf-kpi-label')[0].innerText =
            `ÚLTIMO MES (${labels[labels.length - 1].toUpperCase()})`;
        document.getElementById('inf-last-month').innerText =
            lastMonthVal.toFixed(1).replace('.', ',') + '%';
        document.getElementById('inf-avg-12m').innerText =
            avg12m.toFixed(1).replace('.', ',') + '%';
        document.getElementById('inf-acum-12m').innerText =
            acum12m.toFixed(1).replace('.', ',') + '%';

        const currentValue = 10_000 * acum;
        const formatted = new Intl.NumberFormat('es-AR', {
            style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
        }).format(currentValue);
        document.getElementById('inf-purchasing-power').innerHTML =
            `Algo que costaba $10.000 hace un año, hoy cuesta <strong>${formatted}</strong>.`;

        // Chart.js
        const ctxEl = document.getElementById('inflationChart');
        if (!ctxEl) return;

        window.inflationChartInstance?.destroy();

        const bgColors = dataPoints.map((_, i) =>
            i === dataPoints.length - 1 ? '#475569' : '#64748b'
        );

        window.inflationChartInstance = new Chart(ctxEl, {
            type: 'bar',
            data: {
                labels,
                datasets: [{ data: dataPoints, backgroundColor: bgColors, borderRadius: 4, barPercentage: 0.8 }],
            },
            plugins: [
                {
                    id: 'inflationDatalabels',
                    afterDatasetsDraw(chart) {
                        const ctx = chart.ctx;
                        const textColor = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || '#ffffff';
                        const isMobile = window.innerWidth < 500;
                        chart.data.datasets.forEach((dataset, i) => {
                            chart.getDatasetMeta(i).data.forEach((el, idx) => {
                                ctx.fillStyle = textColor;
                                ctx.font = `bold ${isMobile ? '9px' : '10px'} Inter, sans-serif`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.fillText(dataset.data[idx].toFixed(1).replace('.', ',') + '%', el.x, el.y - 4);
                            });
                        });
                    },
                },
                {
                    id: 'yearGroupingPlugin',
                    afterDraw(chart) {
                        const ctx = chart.ctx;
                        const xAxis = chart.scales.x;

                        // Build year groups
                        const yearGroups = [];
                        let curYear = years[0], curStart = 0;
                        for (let i = 1; i <= years.length; i++) {
                            if (i === years.length || years[i] !== curYear) {
                                yearGroups.push({ year: curYear, startIdx: curStart, endIdx: i - 1 });
                                if (i < years.length) { curYear = years[i]; curStart = i; }
                            }
                        }

                        const tickW = xAxis.getPixelForTick(1) - xAxis.getPixelForTick(0);
                        const yPos = xAxis.bottom + 10;
                        ctx.save();
                        ctx.strokeStyle = '#6b7280';
                        ctx.lineWidth = 1;
                        ctx.font = 'bold 11px Inter, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        for (const grp of yearGroups) {
                            const startX = xAxis.getPixelForTick(grp.startIdx) - tickW / 2;
                            const endX = xAxis.getPixelForTick(grp.endIdx) + tickW / 2;
                            const centerX = (startX + endX) / 2;
                            const textW = ctx.measureText(grp.year).width + 10;

                            ctx.beginPath();
                            ctx.moveTo(startX + 5, yPos); ctx.lineTo(centerX - textW / 2, yPos); ctx.stroke();
                            ctx.beginPath();
                            ctx.moveTo(centerX + textW / 2, yPos); ctx.lineTo(endX - 5, yPos); ctx.stroke();
                            ctx.beginPath();
                            ctx.moveTo(startX + 5, yPos - 3); ctx.lineTo(startX + 5, yPos); ctx.stroke();
                            ctx.beginPath();
                            ctx.moveTo(endX - 5, yPos - 3); ctx.lineTo(endX - 5, yPos); ctx.stroke();

                            ctx.fillStyle = '#6b7280';
                            ctx.beginPath();
                            ctx.roundRect(centerX - textW / 2 + 2, yPos - 8, textW - 4, 16, 8);
                            ctx.fill();
                            ctx.fillStyle = '#ffffff';
                            ctx.fillText(grp.year, centerX, yPos + 1);
                        }
                        ctx.restore();
                    },
                },
            ],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 20, bottom: 25 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#94a3b8', bodyColor: '#fff',
                        borderColor: '#334155', borderWidth: 1, displayColors: false,
                        callbacks: { label: ctx => ctx.parsed.y.toFixed(1) + '%' },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: '#64748b', font: { size: 10, weight: 'bold' }, padding: 5 },
                    },
                    y: {
                        display: true, beginAtZero: true,
                        grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
                        ticks: {
                            color: '#64748b', padding: 5, font: { size: 11 },
                            callback: v => Number.isInteger(v) ? v + '%' : v.toFixed(1) + '%',
                        },
                        max: Math.ceil(Math.max(...dataPoints)) + 1,
                    },
                },
            },
        });

        // Generate bandas data after macro is available
        _generateDatosBandas(macro);
    }

    // ── Bandas calculation ────────────────────────────────────────────────────

    function _generateDatosBandas(macro) {
        datosBandas = [];
        const dStart = new Date(2026, 0, 1);
        const dEnd = new Date();
        dEnd.setDate(dEnd.getDate() + 30);

        let currentInf = 916.275;
        let currentSup = 1526.596;

        const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
        const getIPCForMonth = (y, m) => {
            let tM = m - 2, tY = y;
            if (tM < 0) { tM += 12; tY -= 1; }
            const key = `${tY}-${String(tM + 1).padStart(2, '0')}`;
            return parseFloat(macro?.ipc_history?.[key] ?? '0.02');
        };

        for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
            const m = d.getMonth(), y = d.getFullYear();
            const ipc = getIPCForMonth(y, m);
            const days = getDaysInMonth(y, m);
            currentSup *= Math.pow(1 + ipc, 1 / days);
            currentInf *= Math.pow(1 - ipc, 1 / days);

            datosBandas.push({
                date: `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`,
                inf: +currentInf.toFixed(2),
                sup: +currentSup.toFixed(2),
            });
        }
    }

    function _getBandaForToday() {
        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        return datosBandas.find(b => b.date === todayStr)
            ?? [...datosBandas].reverse().find(b => {
                const [dd, mm, yyyy] = b.date.split('-');
                return new Date(+yyyy, +mm - 1, +dd) <= today;
            })
            ?? datosBandas[0]
            ?? null;
    }

    // ── Spread chart ──────────────────────────────────────────────────────────

    function updateSpreadSummary(chart, baseCurrency) {
        if (!chart?.data.datasets[0].data) return;
        let cclWins = 0, baseWins = 0;
        chart.data.datasets[0].data.forEach(v => { if (v > 0) cclWins++; else if (v < 0) baseWins++; });
        document.getElementById('ccl-wins').innerText = `${cclWins} Días`;
        document.getElementById('base-wins').innerText = `${baseWins} Días`;
        document.getElementById('base-name-summary').innerText =
            baseCurrency === 'oficial' ? 'Oficial' : baseCurrency === 'blue' ? 'Blue' : baseCurrency.toUpperCase();
    }

    function renderSpreadChart(historicalData) {
        if (!historicalData?.length) return;
        window._lastHistoricalFiat = historicalData;
        window._renderSpreadChart = renderSpreadChart;

        const activePill = document.querySelector('#base-currency-pills .base-pill.active');
        const baseCurrency = activePill?.getAttribute('data-val') ?? 'usdt';
        const titleEl = document.getElementById('chart-title');
        if (titleEl) titleEl.innerText = `Spread CCL vs ${baseCurrency.toUpperCase()} (YTD)`;

        const labels = [], data = [];
        historicalData.forEach(d => {
            const target = d.ccl, base = d[baseCurrency];
            if (target && base && base > 0) { labels.push(d.date); data.push(((target / base) - 1) * 100); }
        });

        // Inject live data point
        if (window._cachedFiatData && window._cachedMaxVenta) {
            const basePrice = baseCurrency === 'usdt' ? window._cachedMaxVenta : window._cachedFiatData[baseCurrency].price;
            if (basePrice > 0 && window._cachedFiatData.ccl.price > 0) {
                const liveSpread = ((window._cachedFiatData.ccl.price / basePrice) - 1) * 100;
                const now = new Date();
                const nowStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
                if (labels.at(-1) === nowStr) data[data.length - 1] = liveSpread;
                else { labels.push(nowStr); data.push(liveSpread); }
            }
        }

        /* 
           Crucial: We don't destroy the chart unless theme changes or base currency changes.
           If we just want to re-fill data (e.g. pill switch), we update the existing instance.
        */
        if (window.spreadChartInstance) {
            window.spreadChartInstance.data.labels = labels;
            window.spreadChartInstance.data.datasets[0].data = data;
            window.spreadChartInstance.options.plugins.legend.display = false;
            window.spreadChartInstance.update('none');
            updateSpreadSummary(window.spreadChartInstance, baseCurrency);
            return;
        }

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
        const textColor = isLight ? '#64748b' : '#aaaaaa';

        const zonesPlugin = {
            id: 'zonesPlugin',
            beforeDraw(chart) {
                if (baseCurrency !== 'usdt') return;
                const { ctx, chartArea, scales: { y } } = chart;
                const lt = document.documentElement.getAttribute('data-theme') === 'light';
                ctx.save();
                const drawZone = (yMin, yMax, color, text, isExtreme = false) => {
                    const top = y.getPixelForValue(yMax);
                    const bottom = y.getPixelForValue(yMin);
                    const dTop = Math.max(top, chartArea.top);
                    const dBot = Math.min(bottom, chartArea.bottom);
                    if (dTop >= dBot) return;
                    ctx.fillStyle = color;
                    ctx.fillRect(chartArea.left, dTop, chartArea.width, dBot - dTop);
                    if (text && window.innerWidth >= 768) {
                        ctx.fillStyle = lt ? `rgba(0,0,0,${isExtreme ? 0.35 : 0.22})` : `rgba(255,255,255,${isExtreme ? 0.35 : 0.22})`;
                        ctx.font = `bold ${isExtreme ? '24px' : '18px'} sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(text, chartArea.left + chartArea.width / 2, dTop + (dBot - dTop) / 2);
                    }
                };
                drawZone(2.0, y.max, 'rgba(239,68,68,0.15)', 'VENDER CEDEARs - COMPRAR USDT', true);
                drawZone(1.0, 2.0, 'rgba(239,68,68,0.05)', 'Oportunidad de venta CEDEARs o compra USDT');
                drawZone(-2.0, -1.0, 'rgba(16,185,129,0.05)', 'Oportunidad de venta USDT o compra CEDEARs');
                drawZone(y.min, -2.0, 'rgba(16,185,129,0.15)', 'VENDER USDT - COMPRAR CEDEARs', true);
                ctx.restore();
            },
        };

        const zeroLinePlugin = {
            id: 'zeroLine',
            afterDraw(chart) {
                const yScale = chart.scales.y;
                if (!yScale) return;
                const yPx = yScale.getPixelForValue(0);
                if (yPx < yScale.top || yPx > yScale.bottom) return;
                const lt = document.documentElement.getAttribute('data-theme') === 'light';
                chart.ctx.save();
                chart.ctx.beginPath();
                chart.ctx.moveTo(chart.chartArea.left, yPx);
                chart.ctx.lineTo(chart.chartArea.right, yPx);
                chart.ctx.lineWidth = 1.5;
                chart.ctx.strokeStyle = lt ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.3)';
                chart.ctx.stroke();
                chart.ctx.restore();
            },
        };

        window.spreadChartInstance = new Chart(
            document.getElementById('spreadChart').getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data,
                    borderWidth: 3,
                    pointRadius: ctx => ctx.dataIndex === ctx.dataset.data.length - 1 ? 4 : 0,
                    pointBackgroundColor: ctx => ctx.dataset.data[ctx.dataIndex] >= 0
                        ? 'rgba(16,185,129,1)' : 'rgba(239,68,68,1)',
                    pointHoverRadius: 5,
                    fill: false,
                    tension: 0.1,
                    segment: {
                        borderColor: ctx => ctx.p0?.parsed?.y >= 0
                            ? 'rgba(16,185,129,1)' : 'rgba(239,68,68,1)',
                    },
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: c => `Spread: ${c.parsed.y.toFixed(2)}%` } },
                },
                scales: {
                    x: { display: true, offset: true, ticks: { color: textColor, maxTicksLimit: 6 }, grid: { color: gridColor } },
                    y: { display: true, ticks: { color: textColor }, grid: { color: gridColor } },
                },
                interaction: { mode: 'index', intersect: false },
            },
            plugins: [zonesPlugin, zeroLinePlugin],
        }
        );

        updateSpreadSummary(window.spreadChartInstance, baseCurrency);
    }

    // ── Bandas chart ──────────────────────────────────────────────────────────

    function renderBandasChart(historicalFiat) {
        if (!historicalFiat) return;
        window._renderBandasChart = renderBandasChart;

        const mayoristaMap = Object.fromEntries(
            historicalFiat.filter(d => d.mayorista).map(d => [d.date, d.mayorista])
        );

        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        const fullHolidays = snapshot?.argentina_macro?.full_holidays ?? [];

        const labels = [], dataSup = [], dataInf = [], dataMay = [];

        for (const b of datosBandas) {
            const [dd, mm, yyyy] = b.date.split('-');
            const bDate = new Date(+yyyy, +mm - 1, +dd);
            const isWknd = bDate.getDay() === 0 || bDate.getDay() === 6;
            const isHoliday = fullHolidays.includes(`${yyyy}-${mm}-${dd}`);
            if (bDate > today && b.date !== todayStr) continue;
            if ((isWknd || isHoliday) && bDate < today && b.date !== todayStr) continue;
            labels.push(b.date); dataSup.push(b.sup); dataInf.push(b.inf); dataMay.push(mayoristaMap[b.date] ?? null);
        }

        // Build table (newest first)
        const tableHtml = [...labels].reverse().map((lbl, i) => {
            const ri = labels.length - 1 - i;
            return `<tr>
                <td style="color:var(--text-muted); font-weight:600;">${lbl}</td>
                <td style="color:var(--green); font-weight:bold;">${dataMay[ri] ? `$${dataMay[ri].toFixed(2)}` : '-'}</td>
                <td style="color:var(--orange); font-weight:bold;">$${dataSup[ri].toFixed(2)}</td>
                <td style="color:var(--red); font-weight:bold;">$${dataInf[ri].toFixed(2)}</td>
            </tr>`;
        }).join('');
        document.getElementById('bandas-table-wrapper-body').innerHTML = tableHtml;

        // Inject live mayorista
        if (window._cachedMayoristaVal > 0) {
            const bandaHoy = _getBandaForToday();
            if (bandaHoy) {
                if (labels.at(-1) === todayStr) dataMay[dataMay.length - 1] = window._cachedMayoristaVal;
                else { labels.push(todayStr); dataSup.push(bandaHoy.sup); dataInf.push(bandaHoy.inf); dataMay.push(window._cachedMayoristaVal); }
            }
        }

        window.bandasChartInstance?.destroy();

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
        const textColor = isLight ? '#64748b' : '#aaaaaa';

        window.bandasChartInstance = new Chart(
            document.getElementById('bandasChart').getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Banda Superior', data: dataSup, borderColor: '#f97316', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.2 },
                    { label: 'Banda Inferior', data: dataInf, borderColor: '#ef4444', borderWidth: 2, pointRadius: 0, fill: '-1', tension: 0.2, backgroundColor: 'rgba(249,115,22,0.05)' },
                    { label: 'Mayorista', data: dataMay, borderColor: '#10b981', borderWidth: 3, pointRadius: 0, pointHoverRadius: 5, fill: false, tension: 0.2 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: textColor, usePointStyle: true, boxWidth: 8 } } },
                scales: {
                    x: { ticks: { color: textColor, maxTicksLimit: 6 } },
                    y: { ticks: { color: textColor }, grid: { color: gridColor } },
                },
                interaction: { mode: 'index', intersect: false },
            },
        }
        );
    }

    window.toggleBandasView = function (view) {
        const chartView = document.getElementById('bandas-chart-view');
        const tableView = document.getElementById('bandas-table-view');
        const btnChart = document.getElementById('btn-bandas-chart');
        const btnTable = document.getElementById('btn-bandas-table');
        const isChart = view === 'chart';

        chartView.style.display = isChart ? 'block' : 'none';
        tableView.style.display = isChart ? 'none' : 'block';
        btnChart.style.backgroundColor = isChart ? 'var(--bg-card-hover)' : 'transparent';
        btnChart.style.color = isChart ? 'var(--text-main)' : 'var(--text-muted)';
        btnChart.style.fontWeight = isChart ? '600' : '500';
        btnTable.style.backgroundColor = isChart ? 'transparent' : 'var(--bg-card-hover)';
        btnTable.style.color = isChart ? 'var(--text-muted)' : 'var(--text-main)';
        btnTable.style.fontWeight = isChart ? '500' : '600';
    };

    // ── Live crypto & fiat fetch ──────────────────────────────────────────────

    async function fetchLiveCryptoAndFiat() {
        try {
            const [cryptoData, p2pData, criptoYaDolar, rpRes, rpHistRes] = await Promise.all([
                fetch('https://criptoya.com/api/usdt/ars/0.1').then(r => r.json()),
                fetch('https://criptoya.com/api/binancep2p/usdt/ars/0.1').then(r => r.json()),
                fetch('https://criptoya.com/api/dolar').then(r => r.json()),
                fetch('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo').catch(() => null),
                fetch('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais').catch(() => null),
            ]);

            _updateRiesgoPais(rpRes, rpHistRes);
            _updateUsdtTable(cryptoData, p2pData);
            _updateFiatDataAndBandas(criptoYaDolar, cryptoData, p2pData);
            _updateProgressBar();
        } catch (err) {
            console.error('fetchLiveCryptoAndFiat error:', err);
            const el = document.getElementById('last-updated-time');
            if (el) el.innerText = 'Error conexión';
        }
    }

    async function _updateRiesgoPais(rpRes, rpHistRes) {
        if (!rpRes?.ok) return;
        const rpData = await rpRes.json();
        const rpValEl = document.getElementById('rp-val');
        if (!rpData?.valor || !rpValEl) return;

        rpValEl.innerText = `${Math.round(rpData.valor)} pts`;

        if (rpHistRes?.ok) {
            const hist = await rpHistRes.json();
            if (hist?.length > 1) {
                const prev = hist[hist.length - 2].valor;
                const pct = ((rpData.valor - prev) / prev) * 100;
                const cls = pct > 0 ? 'badge-red' : pct < 0 ? 'badge-green' : '';
                const sign = pct > 0 ? '+' : '';
                const el = document.getElementById('rp-var');
                if (el) el.innerHTML = `<span class="${cls}">${sign}${pct.toFixed(2)}%</span>`;
            }
        }

        const rpDateEl = document.getElementById('rp-date');
        if (rpDateEl) {
            const parts = rpData.fecha.split('T')[0].split('-');
            rpDateEl.innerText = `(Ref: ${parts[2]}/${parts[1]}/${parts[0]})`;
        }
    }

    function _updateUsdtTable(cryptoData, p2pData) {
        const EX_ORDER = ['fiwind', 'lemoncash', 'bybitp2p', 'letsbit'];
        const NAME_MAP = { bybitp2p: 'BybitP2P', letsbit: 'LB Finanzas' };
        const ICONS = {
            fiwind: `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" style="width:20px;height:20px;border-radius:4px;"><rect width="18" height="18" style="fill:rgb(10,10,10);"></rect><g><path d="M7.92,9.58h-1.57c-.2,0-.36-.16-.36-.36s.16-.36.36-.36h1.57c.2,0,.36.16.36.36s-.16.36-.36.36ZM6.36,7.96c-.2,0-.36-.16-.36-.36s.16-.36.36-.36h2.05c.2,0,.36.16.36.36s-.16.36-.36.36h-2.05ZM8.7,11.48c-.19-.06-.3-.26-.24-.45l1.1-3.61c.06-.19.26-.3.45-.24.19.06.3.26.24.45l-1.1,3.61c-.06.19-.26.3-.45.24ZM11.89,7.63l-1.1,3.61c-.06.19-.26.3-.45.24-.19-.06-.3-.26-.24-.45l1.1-3.61c.06-.19.26-.3.45-.24.19.06.3.26.24.45Z" style="fill:rgb(239,180,29);"></path><path d="M9,14.01c-2.76,0-5-2.25-5-5.01s2.24-5.01,5-5.01,5,2.25,5,5.01-2.24,5.01-5,5.01ZM9,4.62c-2.41,0-4.37,1.96-4.37,4.37s1.96,4.37,4.37,4.37,4.37-1.96,4.37-4.37-1.96-4.37-4.37-4.37Z" style="fill:rgb(239,180,29);"></path></g></svg>`,
            lemoncash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" style="width:20px;height:20px;border-radius:4px;"><rect width="18" height="18" style="fill:rgb(10,10,10);"></rect><path d="M9,4c-2.74,0-5,2.26-5,5s2.26,5,5,5,5-2.26,5-5h0c0-2.74-2.26-5-5-5h0ZM11.63,9.24s-.07.05-.11.07c-.04.02-.09.03-.14.04-.11.02-.22.02-.33,0-.24-.05-.48-.15-.69-.28-.22-.14-.43-.29-.62-.47-.1-.09-.19-.18-.28-.28-.09-.1-.18-.21-.26-.31-.02-.03-.05-.04-.08-.04-.02,0-.04,0-.06.02-.05.03-.07.1-.03.15.07.12.16.23.24.35.09.12.17.22.27.33.19.21.4.41.63.58.24.18.5.32.79.42.1.03.2.05.3.06.04,0,.07.04.07.08,0,.01,0,.02-.01.03-.17.28-.37.53-.6.76-.63.66-1.49,1.05-2.4,1.08-.34,0-.68-.06-.99-.21l-.07-.03s-.05-.01-.07,0l-.06.04c-.11.07-.23.11-.35.11-.1,0-.2-.03-.28-.1-.13-.18-.13-.43,0-.61l.04-.07s.01-.05,0-.07l-.04-.07c-.35-.66-.32-1.52.03-2.32.01-.03.04-.05.07-.05.01,0,.02,0,.03,0,.02,0,.03.02.04.04.06.17.15.33.24.48.16.24.34.45.55.65.1.1.21.2.31.28.1.09.22.18.33.26.02,0,.04.01.05.01.06,0,.11-.05.11-.11,0-.03,0-.05-.03-.07-.1-.09-.2-.18-.29-.27-.09-.1-.18-.2-.27-.29-.17-.2-.32-.42-.44-.65-.12-.22-.2-.46-.24-.7-.02-.11-.02-.22,0-.33,0-.04.02-.09.04-.13,0-.01.02-.03.02-.04.07-.09.15-.17.23-.25,1.04-1.04,2.46-1.37,3.46-.83l.07.04s.06.02.08,0l.07-.05c.19-.15.45-.15.64,0,.15.2.14.47-.02.66l-.05.07s-.02.05,0,.07l.03.07c.26.6.28,1.28.05,1.9h0Z" style="fill:rgb(0,240,104);"></path></svg>`,
            p2p: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;background:#fcd535;border-radius:4px;padding:2px;"><path d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm4.6366-4.6366L24 12l-2.7394 2.7154-2.7383-2.7154 2.7383-2.7164zM7.3783 9.2836L12 4.6241l4.6217 4.6595 2.7175-2.7154-7.3392-7.353-7.353 7.352 2.7314 2.7164zm-4.6366 4.6366L0 12l2.7416-2.7164 2.7186 2.7164L2.7416 13.9202zM12 15.1772l-3.179-3.1772L12 8.8228l3.179 3.1772L12 15.1772z" fill="#1e2026"/></svg>`,
            bybitp2p: `<img src="assets/bybit.png" style="width:20px;height:20px;border-radius:4px;object-fit:contain;background:#000;">`,
            letsbit: `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" style="width:20px;height:20px;border-radius:4px;"><rect width="18" height="18" style="fill:#522398;"/><g><path d="M6.71,7.77l.39.49c.52.64,1.11.96,1.75.96,1.19,0,2.27-1.12,2.39-1.31,0,.02,0,0,.03-.05-1.45-.92-2.89-1.84-4.33-2.77-.24-.15-.48-.23-.72-.05-.24.19-.22.43-.14.7.22.68.43,1.35.63,2.03Z" style="fill:#fff;"/><path d="M12,9.11c0,.36-.2.7-.51.88-1.47.95-2.96,1.89-4.43,2.84-.07.05-.14.09-.22.14-.18.14-.44.14-.62,0-.19-.14-.26-.39-.18-.61.11-.4.23-.79.36-1.19.18-.57.38-1.12.5-1.7.07-.3.07-.61,0-.91,2.11,2.59,4.69-.36,4.59-.43.34.22.51.53.51.98Z" style="fill:#fff;"/></g></svg>`,
        };

        // Determine maxOthersVenta (excluding potential Bybit outlier)
        let maxOthersVenta = 0;
        for (const ex of EX_ORDER.filter(e => e !== 'bybitp2p')) {
            if (cryptoData[ex]?.totalBid > maxOthersVenta) maxOthersVenta = cryptoData[ex].totalBid;
        }
        if (p2pData?.totalBid > maxOthersVenta) maxOthersVenta = p2pData.totalBid;

        let minCompra = Infinity, maxVenta = 0;
        const exList = [];

        for (const ex of EX_ORDER) {
            const d = cryptoData[ex];
            if (!d) continue;
            const isOutlier = ex === 'bybitp2p' && d.totalBid > maxOthersVenta * 1.015;
            if (d.totalAsk < minCompra) minCompra = d.totalAsk;
            if (!isOutlier && d.totalBid > maxVenta) maxVenta = d.totalBid;
            exList.push({ id: ex, name: NAME_MAP[ex] ?? (ex.charAt(0).toUpperCase() + ex.slice(1)), compra_a: d.totalAsk, venta_a: d.totalBid, isOutlier });
        }
        if (p2pData) {
            if (p2pData.totalAsk < minCompra) minCompra = p2pData.totalAsk;
            if (p2pData.totalBid > maxVenta) maxVenta = p2pData.totalBid;
            exList.push({ id: 'p2p', name: 'BinanceP2P', compra_a: p2pData.totalAsk, venta_a: p2pData.totalBid });
        }
        if (!maxVenta) maxVenta = maxOthersVenta;

        const rows = exList.map(e => {
            const isMin = e.compra_a === minCompra;
            const isMax = e.venta_a === maxVenta && !e.isOutlier;
            return `<tr>
                <td><div style="display:flex; align-items:center; gap:8px;">${ICONS[e.id] ?? ''}<span style="font-weight:500;">${e.name}</span></div></td>
                <td style="text-align:center;"><span class="${isMin ? 'text-highlight-green' : ''}">$${e.compra_a.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                <td style="text-align:center; position:relative;">
                    <span class="${isMax ? 'text-highlight-green' : ''}" style="${e.isOutlier ? 'opacity:0.5;' : ''}">
                        $${e.venta_a.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    ${e.isOutlier ? '<span style="position:absolute; bottom:1px; left:50%; transform:translateX(-50%); font-size:8px; color:var(--red); font-weight:600; white-space:nowrap; line-height:1;">(No Representativo)</span>' : ''}
                </td>
            </tr>`;
        }).join('');

        const usdtTable = document.getElementById('usdt-table-body');
        if (usdtTable) usdtTable.innerHTML = rows;

        window._cachedMaxVenta = maxVenta;
        window._cachedExList = exList;
    }

    function _updateFiatDataAndBandas(criptoYaDolar, cryptoData, p2pData) {
        const getDolarData = (obj) => {
            if (!obj) return { price: 0, var: 0 };
            const src = obj.al30?.['24hs'] ?? obj.al30?.ci ?? obj;
            return { price: src.price ?? src.ask ?? 0, var: src.variation ?? 0 };
        };

        const fiatData = {
            ccl: getDolarData(criptoYaDolar.ccl),
            mep: getDolarData(criptoYaDolar.mep),
            oficial: getDolarData(criptoYaDolar.oficial),
            blue: getDolarData(criptoYaDolar.blue),
        };

        let usdt_var = criptoYaDolar.cripto?.usdt?.variation ?? 0;

        // Cheapest dollar
        let minFiatName = '', minFiatVal = Infinity;
        for (const f of ['ccl', 'mep', 'oficial', 'blue']) {
            if (fiatData[f].price > 0 && fiatData[f].price < minFiatVal) {
                minFiatVal = fiatData[f].price;
                minFiatName = f;
            }
        }
        const maxVenta = window._cachedMaxVenta ?? 0;
        if (maxVenta > 0 && maxVenta < minFiatVal) { minFiatVal = maxVenta; minFiatName = 'usdt'; }

        document.getElementById('cheapest-dollar-name').innerText = minFiatName.toUpperCase();
        document.getElementById('cheapest-dollar-val').innerText = `$${minFiatVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

        window._cachedFiatData = fiatData;
        window._cachedUsdtVar = usdt_var;

        updateFiatTable();

        // Spread chart update (live point)
        if (window.spreadChartInstance && window._lastHistoricalFiat) {
            const activePill = document.querySelector('#base-currency-pills .base-pill.active');
            const baseCurrency = activePill?.getAttribute('data-val') ?? 'usdt';
            const basePrice = baseCurrency === 'usdt' ? maxVenta : fiatData[baseCurrency].price;
            if (basePrice > 0 && fiatData.ccl.price > 0) {
                const spread = ((fiatData.ccl.price / basePrice) - 1) * 100;
                const chart = window.spreadChartInstance;
                const now = new Date();
                const nowStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
                if (chart.data.labels.at(-1) === nowStr) {
                    chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1] = spread;
                } else {
                    chart.data.labels.push(nowStr);
                    chart.data.datasets[0].data.push(spread);
                }
                chart.update('none'); // Smooth transition
                updateSpreadSummary(chart, baseCurrency);
            }
        }

        // Bandas & velocímetro
        const may = getDolarData(criptoYaDolar.mayorista).price;
        window._cachedMayoristaVal = may;
        _updateBandasVelocimetro(may, fiatData);
    }

    function _updateBandasVelocimetro(may, fiatData) {
        const bandaHoy = _getBandaForToday();
        if (!bandaHoy) return;

        const { inf, sup } = bandaHoy;
        const rango = Math.max(1, sup - inf);

        const fmt = n => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        document.getElementById('velocimetro-inf').innerText = fmt(inf);
        document.getElementById('velocimetro-mid').innerText = fmt(inf + rango / 2);
        document.getElementById('velocimetro-sup').innerText = fmt(sup);

        const c25 = inf + rango * 0.25;
        const c75 = inf + rango * 0.75;
        const c90 = inf + rango * 0.90;

        document.getElementById('r-fav-min').innerText = fmt(inf); document.getElementById('r-fav-max').innerText = fmt(c25);
        document.getElementById('r-int-min').innerText = fmt(c25); document.getElementById('r-int-max').innerText = fmt(c75);
        document.getElementById('r-pre-min').innerText = fmt(c75); document.getElementById('r-pre-max').innerText = fmt(c90);
        document.getElementById('r-cri-min').innerText = fmt(c90); document.getElementById('r-cri-max').innerText = fmt(sup);

        if (may > 0) {
            const posPct = Math.max(0, Math.min(100, ((may - inf) / rango) * 100));
            document.getElementById('gauge-needle').style.transform = `translateX(-50%) rotate(${(posPct / 100) * 180 - 90}deg)`;

            const box = document.getElementById('gauge-mayorista-box');
            box.innerText = fmt(may);
            const [bg, color] = posPct <= 25 ? ['#10b981', '#fff']
                : posPct <= 75 ? ['#facc15', '#111b21']
                    : posPct <= 90 ? ['#f97316', '#fff']
                        : ['#ef4444', '#fff'];
            box.style.backgroundColor = bg;
            box.style.color = color;

            const dS = sup - may, pS = (dS / may) * 100;
            const dI = may - inf, pI = (dI / may) * 100;
            document.getElementById('diff-sup').innerHTML =
                `El dólar debería subir <span class="badge-green" style="margin-left:4px;">${fmt(dS)} (+${pS.toFixed(2)}%)</span> para llegar a la banda superior`;
            document.getElementById('diff-inf').innerHTML =
                `El dólar debería bajar <span class="badge-red" style="margin-left:4px;">${fmt(Math.abs(dI))} (-${Math.abs(pI).toFixed(2)}%)</span> para llegar a la banda inferior`;

            if (window.bandasChartInstance) {
                const bChart = window.bandasChartInstance;
                const today = new Date();
                const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                const mData = bChart.data.datasets[2].data;
                const bLabels = bChart.data.labels;
                if (bLabels.at(-1) === todayStr) mData[mData.length - 1] = may;
                else { bLabels.push(todayStr); bChart.data.datasets[0].data.push(sup); bChart.data.datasets[1].data.push(inf); mData.push(may); }
                bChart.update('none');
            }
        }

        const now = new Date();
        const timeEl = document.getElementById('last-updated-time');
        if (timeEl) timeEl.innerText = `Act: ${now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`;
        nextUpdateSecs = 60;
    }

    function _updateProgressBar() {
        if (progressInterval) return;
        progressInterval = setInterval(() => {
            nextUpdateSecs = Math.max(0, nextUpdateSecs - 1);
            const el = document.getElementById('update-progress-bar');
            if (el) el.style.width = ((nextUpdateSecs / 60) * 100) + '%';
        }, 1_000);
    }

    // ── Base-currency pill listeners ──────────────────────────────────────────

    function initPillListeners() {
        document.querySelectorAll('#base-currency-pills .base-pill').forEach(pill => {
            pill.addEventListener('click', function () {
                if (this.classList.contains('active')) return;
                document.querySelectorAll('#base-currency-pills .base-pill').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                updateFiatTable();
                
                // Trigger a clean re-render of the chart with the new base currency
                if (window.spreadChartInstance) {
                    window.spreadChartInstance.destroy();
                    window.spreadChartInstance = null;
                }
                if (window._lastHistoricalFiat) {
                    renderSpreadChart(window._lastHistoricalFiat);
                }
            });
        });
    }

    // ── Main data load ────────────────────────────────────────────────────────

    function loadData() {
        Promise.all([
            fetch('data/snapshot.json').then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('data/meta.json').then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion').then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([snap, m, liveInflation]) => {
            snapshot = snap;
            meta = m;
            window._liveInflation = liveInflation;

            renderGroups();

            if (snapshot?.argentina_macro) renderMacro(snapshot.argentina_macro);
            if (snapshot?.historical_fiat) {
                renderSpreadChart(snapshot.historical_fiat);
                renderBandasChart(snapshot.historical_fiat);
            }

            fetchLiveCryptoAndFiat();
            setInterval(fetchLiveCryptoAndFiat, 60_000);
            
            // Start Data912 Live Polling for CEDEARs
            setInterval(fetchData912Cedears, 3_000);
        }).catch(err => {
            console.error('Critical error in loadData:', err);
            fetchLiveCryptoAndFiat();
        });
    }

    // ── Data912 Live Polling ──────────────────────────────────────────────────

    async function fetchData912Cedears() {
        // Only run if Renta Variable tab is active
        if (!document.getElementById('tab-renta')?.classList.contains('active')) return;

        try {
            const res = await fetch('https://data912.com/live/arg_cedears');
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            
            // Build a map of symbol -> data for quick lookup
            const liveMap = new Map();
            for (const item of data) {
                liveMap.set(item.symbol, item);
            }

            // Iterate over ALL CEDEAR rows in the DOM
            // The groups are "CEDEARs Índices (ARS)" and "CEDEARs (ARS)", etc.
            // We can target rows by checking if their group contains "CEDEAR"
            const rows = document.querySelectorAll('#tab-renta .ticker-row');
            
            rows.forEach(row => {
                const group = row.getAttribute('data-group');
                if (!group || !group.toUpperCase().includes('CEDEAR')) return;

                const tickerBA = row.getAttribute('data-symbol'); // e.g. AAPL.BA
                if (!tickerBA) return;

                // Strip .BA for Data912 symbol matching
                const baseSymbol = tickerBA.replace('.BA', '');

                const liveData = liveMap.get(baseSymbol);
                if (liveData) {
                    // Update Price Cell
                    const priceCell = row.querySelector('.price-cell');
                    if (priceCell) {
                        const newPrice = liveData.c; // or px_ask/px_bid depending on API
                        const currentPriceStr = priceCell.innerText.replace(/[^0-9,-]+/g, '').replace(',', '.');
                        const currentPrice = currentPriceStr ? parseFloat(currentPriceStr) : null;

                        if (newPrice && newPrice !== currentPrice) {
                            priceCell.innerText = newPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            // Trigger flash animation
                            const flashClass = currentPrice && newPrice > currentPrice ? 'flash-up' : 'flash-down';
                            priceCell.classList.remove('flash-up', 'flash-down');
                            // Force reflow
                            void priceCell.offsetWidth;
                            priceCell.classList.add(flashClass);
                        }
                    }

                    // Update Daily % Cell
                    const dailyCell = row.querySelector('td:nth-child(4) .value-visualization'); // 4th column is Daily
                    if (dailyCell && liveData.pct_change != null) {
                        const val = liveData.pct_change;
                        const bar = dailyCell.querySelector('.value-bar');
                        const txt = dailyCell.querySelector('.value-text');
                        
                        const cls = val >= 0 ? 'positive' : 'negative';
                        const sign = val >= 0 ? '+' : '';
                        const color = val >= 0 ? 'var(--green)' : 'var(--red)';
                        
                        // We need the range to calculate the width. For simplicity, assume -10 to 10 for daily.
                        const w = Math.min(100, Math.max(0, (Math.abs(val) / 10) * 100)); // Simplified vizWidth

                        if (bar) {
                            bar.className = `value-bar ${cls}`;
                            bar.style.width = `${w}%`;
                        }
                        if (txt) {
                            txt.style.color = color;
                            txt.innerText = `${sign}${val.toFixed(2)}%`;
                        }
                    }
                }
            });

        } catch (err) {
            console.error('Error fetching Data912 live data:', err);
        }
    }

    // ── DOM ready ─────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        updateThemeIcon(theme);

        // Tab navigation
        document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
        document.getElementById('tab-resumen-btn')?.addEventListener('click', e => switchTab('tab-resumen', e.currentTarget));
        document.getElementById('tab-argentina-btn')?.addEventListener('click', e => switchTab('tab-argentina', e.currentTarget));
        document.getElementById('tab-tasas-btn')?.addEventListener('click', e => switchTab('tab-tasas', e.currentTarget));
        document.getElementById('tab-renta-btn')?.addEventListener('click', e => switchTab('tab-renta', e.currentTarget));

        // Tasas sub-tabs
        document.getElementById('tasas-pesos-btn')?.addEventListener('click', e => switchTasasTab('tasas-pesos', e.currentTarget));
        document.getElementById('tasas-cripto-btn')?.addEventListener('click', e => switchTasasTab('tasas-cripto', e.currentTarget));

        // Bandas view toggle
        document.getElementById('btn-bandas-chart')?.addEventListener('click', () => window.toggleBandasView('chart'));
        document.getElementById('btn-bandas-table')?.addEventListener('click', () => window.toggleBandasView('table'));

        initPillListeners();
        loadData();
        loadTasasData();
    });
})();
        // --- THEME LOGIC ---
        function applyChartThemeOverrides() {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
            const textColor = isLight ? '#64748b' : '#aaaaaa';

            // Fully recreate charts on theme change.
            // renderSpreadChart / renderBandasChart are exposed via window inside the IIFE.
            if (window.spreadChartInstance && window._lastHistoricalFiat) {
                window._renderSpreadChart(window._lastHistoricalFiat);
            }
            if (window.bandasChartInstance && window._lastHistoricalFiat) {
                window._renderBandasChart(window._lastHistoricalFiat);
            }
            if (window.inflationChartInstance) {
                window.inflationChartInstance.update();
            }
            if (window.tradingviewWidget) {
                if (document.querySelector('.ticker-row.active')) {
                    const sym = document.querySelector('.ticker-row.active').getAttribute('data-symbol');
                    window.initChart(sym);
                } else if (window._lastChartSymbol) {
                    window.initChart(window._lastChartSymbol);
                }
            }
        }

        function updateThemeIcon(theme) {
            const lightIcon = document.getElementById("sun-icon");
            const darkIcon = document.getElementById("moon-icon");
            if (lightIcon && darkIcon) {
                lightIcon.style.display = theme === "dark" ? "none" : "block";
                darkIcon.style.display = theme === "dark" ? "block" : "none";
            }
        }

        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme-preference", newTheme);
            updateThemeIcon(newTheme);
            applyChartThemeOverrides();
        }

        (function () {
            // Check system preference & localStorage
            const savedTheme = localStorage.getItem("theme-preference");
            const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const initialTheme = savedTheme ? savedTheme : (systemPrefersDark ? "dark" : "light");
            document.documentElement.setAttribute("data-theme", initialTheme);

            // Listen for system theme changes if not explicitly overridden by user
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
                if (!localStorage.getItem("theme-preference")) {
                    const newTheme = event.matches ? "dark" : "light";
                    document.documentElement.setAttribute("data-theme", newTheme);
                    updateThemeIcon(newTheme);
                    applyChartThemeOverrides();
                }
            });

            // Wait for DOM to load before setting initial icon
            console.log("Market Dashboard App v1.2.1 - Enhanced Stablecoins UI");
document.addEventListener('DOMContentLoaded', () => {
                updateThemeIcon(initialTheme);

                // --- EVENT LISTENERS ---
                // Theme Toggle
                document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

                // Main Tabs
                document.getElementById('tab-resumen-btn')?.addEventListener('click', (e) => switchTab('tab-resumen', e.currentTarget));
                document.getElementById('tab-argentina-btn')?.addEventListener('click', (e) => switchTab('tab-argentina', e.currentTarget));
                document.getElementById('tab-tasas-btn')?.addEventListener('click', (e) => switchTab('tab-tasas', e.currentTarget));
                document.getElementById('tab-renta-btn')?.addEventListener('click', (e) => switchTab('tab-renta', e.currentTarget));

                // Tasas Sub-Tabs
                document.getElementById('tasas-pesos-btn')?.addEventListener('click', (e) => switchTasasTab('tasas-pesos', e.currentTarget));
                document.getElementById('tasas-cripto-btn')?.addEventListener('click', (e) => switchTasasTab('tasas-cripto', e.currentTarget));

                // Bandas View Toggle (if elements exist)
                document.getElementById('btn-bandas-chart')?.addEventListener('click', () => toggleBandasView('chart'));
                document.getElementById('btn-bandas-table')?.addEventListener('click', () => toggleBandasView('table'));
            });
        })();
        // -------------------

        function switchTab(tabId, btnElement) {
            document.querySelectorAll('#tab-resumen, #tab-argentina, #tab-tasas, #tab-renta').forEach(el => el.classList.remove('active'));
            // Remove active purely from top nav buttons
            btnElement.closest('.nav-container').querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            btnElement.classList.add('active');

            // Toggle submenu
            const submenu = document.getElementById('sub-tabs-tasas');
            if (submenu) {
                submenu.style.display = (tabId === 'tab-tasas') ? 'flex' : 'none';
            }
            // Reset scroll to top when switching main tabs
            window.scrollTo({ top: 0, behavior: 'instant' });
        }

        function switchTasasTab(subId, btnElement) {
            document.getElementById('tasas-pesos').style.display = 'none';
            document.getElementById('tasas-cripto').style.display = 'none';
            // Remove active from child pills
            btnElement.parentElement.querySelectorAll('.sub-tab').forEach(el => el.classList.remove('active'));
            document.getElementById(subId).style.display = 'block';
            btnElement.classList.add('active');
            // Reset scroll to top when switching sub-tabs
            window.scrollTo({ top: 0, behavior: 'instant' });

            // Trigger fetch only if switching back to Pesos (which might need a refresh) or simply rely on initial load
            if (subId === 'tasas-pesos' && !window.tasasLoaded) {
                loadTasasData();
            }
        }

        async function loadTasasData() {
            window.tasasLoaded = true;

            

            const getIcon = (name) => {
                const lowName = name.toLowerCase().trim();
                // 1. Coincidencia exacta
                if (window.iconMapExt[lowName]) return window.iconMapExt[lowName];

                // 2. Sin prefijo "banco " o "banco de la "
                const cleanBank = lowName.replace(/^banco\s+(de\s+la\s+)?/i, '').trim();
                if (window.iconMapExt[cleanBank]) return window.iconMapExt[cleanBank];

                // 3. Primera palabra (para casos como "Ualá Plus" -> "uala")
                const firstWord = cleanBank.split(' ')[0];
                if (window.iconMapExt[firstWord]) return window.iconMapExt[firstWord];

                return null;
            };

            // Injects brand icon and clears the tinted container background to avoid colour bleed
            const setRadarIcon = (anchorId, iconHtml) => {
                if (!iconHtml) return;
                const card = document.getElementById(anchorId)?.closest('.radar-card');
                if (!card) return;
                const el = card.querySelector('.radar-card-icon');
                if (!el) return;
                el.innerHTML = iconHtml;
                el.style.background = 'transparent';
                el.style.padding = '0';
            };

            const formatDate = (dStr) => {
                if (!dStr) return '';
                let p = dStr.split('-');
                if (p.length !== 3) return dStr;
                return p[2] + '/' + p[1] + '/' + p[0];
            };

            const formatLimit = (v) => {
                if (!v) return null;
                if (v >= 1000000) return `$${(v / 1000000).toFixed(0)} M`;
                return `$${(v / 1000).toFixed(0)} K`;
            };

            const formatTerminalRow = (name, tna, subLabel, metaPills = [], isBest = false, dateInfo = '', tooltipText = '') => {
                let init = name.charAt(0).toUpperCase();
                let exactIcon = getIcon(name);
                let renderIcon = exactIcon
                    ? exactIcon.replace('width: 28px;', 'width: 24px;').replace('height: 28px;', 'height: 24px;')
                    : `<span>${init}</span>`;

                let tooltipHtml = '';
                if (tooltipText) {
                    tooltipHtml = `
                        <div class="tooltip-container">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            <div class="tooltip-text">${tooltipText}</div>
                        </div>
                    `;
                }

                let pillsHtml = metaPills.filter(p => p).map(p => {
                    let cls = 'terminal-meta-pill';
                    if (p.includes('Límite')) cls += ' pill-limit';
                    if (p.includes('Liquidez')) cls += ' pill-liquidity';
                    return `<span class="${cls}">${p}</span>`;
                }).join('');

                return `
                    <div class="terminal-row${isBest ? ' terminal-highlight' : ''}">
                        <div class="terminal-entity" style="flex: 1; min-width: 0;">
                            <div class="terminal-logo">${renderIcon}</div>
                            <div style="min-width: 0; flex: 1;">
                                <div class="terminal-name" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                    ${name} ${tooltipHtml}
                                </div>
                                <div class="terminal-sub-label">${subLabel}</div>
                                ${pillsHtml ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">${pillsHtml}</div>` : ''}
                            </div>
                        </div>
                        <div class="terminal-data">
                            <div class="terminal-rate-container">
                                <div class="mono-rate">${tna}</div>
                                <div class="terminal-rate-label">TNA</div>
                            </div>
                        </div>
                        ${dateInfo ? `<div style="width: 100%; text-align: right; font-size: 11px; color: var(--text-muted); margin-top: 6px; padding-top: 6px; border-top: none; opacity: 0.8;">${dateInfo}</div>` : ''}
                    </div>`;
            };

            const formatSimpleList = (items) => {
                let html = '';
                items.forEach((i, idx) => {
                    let dateStr = i.date ? `TNA vigente desde el ${formatDate(i.date)}` : '';
                    html += formatTerminalRow(i.name, (parseFloat(i.rate) * 100).toFixed(2) + '%', 'Plazo Fijo', [], idx === 0, dateStr);
                });
                return html;
            };

            try {
                Promise.all([
                    fetch("https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo").then(r => r.json()),
                    fetch("https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo").then(r => r.json()),
                    fetch("https://api.argentinadatos.com/v1/finanzas/rendimientos").then(r => r.json()),
                    fetch("https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo").then(r => r.json()),
                    fetch("https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/penultimo").then(r => r.json())
                ]).then(([pfData, remuData, rendData, fciUltimo, fciPenultimo]) => {
                    // 1. Plazos Fijos
                    let allowedPf = ['NACION', 'PROVINCIA', 'CIUDAD', 'SANTANDER', 'GALICIA', 'BBVA', 'MACRO', 'BRUBANK', 'DEL SOL', 'UALA', 'SUPERVIELLE'];
                    let filteredPf = pfData.filter(e => {
                        let entUpperCase = (e.entidad || "").toUpperCase();
                        return allowedPf.some(a => entUpperCase.includes(a));
                    });

                    let uniquePf = [];
                    let seenPf = new Set();
                    for (let p of filteredPf) {
                        let entUpperCase = p.entidad.toUpperCase();
                        let cleanName = p.entidad.replace("BANCO ", "").replace(" DE LA ", " ").substring(0, 25);

                        if (entUpperCase.includes('NACION')) cleanName = 'Banco Nación';
                        else if (entUpperCase.includes('PROVINCIA')) cleanName = 'Banco Provincia';
                        else if (entUpperCase.includes('CIUDAD')) cleanName = 'Banco Ciudad';
                        else if (entUpperCase.includes('SANTANDER')) cleanName = 'Banco Santander';
                        else if (entUpperCase.includes('GALICIA MAS') || entUpperCase.includes('HSBC')) cleanName = 'Banco Galicia Más (ex HSBC)';
                        else if (entUpperCase.includes('GALICIA')) cleanName = 'Banco Galicia';
                        else if (entUpperCase.includes('BBVA')) cleanName = 'BBVA';
                        else if (entUpperCase.includes('MACRO')) cleanName = 'Banco Macro';
                        else if (entUpperCase.includes('BRUBANK')) cleanName = 'Brubank';
                        else if (entUpperCase.includes('DEL SOL')) cleanName = 'Banco del Sol';
                        else if (entUpperCase.includes('UALA')) cleanName = 'Ualá';
                        else if (entUpperCase.includes('SUPERVIELLE')) cleanName = 'Banco Supervielle';

                        if (!seenPf.has(cleanName)) {
                            seenPf.add(cleanName);
                            uniquePf.push({
                                name: cleanName,
                                rate: p.tnaClientes,
                                logo: p.logo,
                                date: p.fecha
                            });
                        }
                    }

                    uniquePf.sort((a, b) => (b.rate || 0) - (a.rate || 0));
                    document.getElementById('ars-pf-list').innerHTML = formatSimpleList(uniquePf);

                    // Update Resumen PF
                    if (uniquePf.length > 0) {
                        document.getElementById('best-pf-name').innerText = uniquePf[0].name;
                        document.getElementById('best-pf-val').innerText = (uniquePf[0].rate * 100).toFixed(2) + '%';
                        let pfIcon = getIcon(uniquePf[0].name);
                        setRadarIcon('best-pf-name', pfIcon);
                    }

                    // 2. Cuentas Remuneradas / Uala Plus, etc.
                    let filterNames = ['CARREFOUR', 'FIWIND', 'NARANJA', 'UALA']; // Removed BELO
                    let filtered = remuData.filter(e => filterNames.some(f => e.fondo.toUpperCase().includes(f)));
                    filtered.sort((a, b) => (b.tna || 0) - (a.tna || 0));

                    let remuHtml = '';
                    filtered.forEach((acc, idx) => {
                        let rawName = acc.fondo;
                        let name = rawName.replace('BANCO', '').trim();
                        if (name === 'UALA') name = 'Ualá';
                        if (name === 'UALA PLUS 1') name = 'Ualá Plus 1';
                        if (name === 'UALA PLUS 2') name = 'Ualá Plus 2';
                        if (name === 'NARANJA X') name = 'Naranja X';
                        if (name === 'FIWIND') name = 'Fiwind';
                        if (name === 'CARREFOUR') name = 'Carrefour Banco';

                        let tnaVal = acc.tna;
                        let tna = (tnaVal * 100).toFixed(2) + '%';

                        let limitTxt = null;
                        if (name === 'Fiwind') limitTxt = `Límite: $750 K`;
                        else if (name === 'Carrefour Banco') limitTxt = `Sin Límites`;
                        else if (acc.tope) limitTxt = `Límite: ${formatLimit(acc.tope)}`;
                        else if (acc.condiciones && acc.condiciones.includes('4.161.600')) limitTxt = 'Límite: $4.1 M';

                        let subLabel = (rawName.includes('FIWIND')) ? 'Billetera Virtual' : 'Cuenta Remunerada';
                        let features = [];
                        if (limitTxt) features.push(limitTxt);

                        let dateStr = acc.fecha ? `TNA vigente desde el ${formatDate(acc.fecha)}` : '';
                        let tooltip = acc.condicionesCorto || '';
                        // Fallback for special info if API is missing it but user expects it
                        if (name === 'Ualá Plus 1' && !tooltip) tooltip = 'Acumulá $250.000 entre inversiones, consumos con tarjeta y cobros con Ualá Bis para acceder a la tasa Plus 1 el próximo mes.';
                        if (name === 'Ualá Plus 2' && !tooltip) tooltip = 'Acumulá $500.000 entre inversiones, consumos con tarjeta y cobros con Ualá Bis para acceder a la tasa Plus 2 el próximo mes.';

                        remuHtml += formatTerminalRow(name, tna, subLabel, features, idx === 0, dateStr, tooltip);
                    });
                    document.getElementById('ars-accounts-container').innerHTML = remuHtml;

                    // Update Resumen Accounts
                    if (filtered.length > 0) {
                        // Use the already-normalized name from the loop above
                        let rawFondo = filtered[0].fondo.toUpperCase().trim();
                        let yieldName = 'Carrefour Banco';
                        if (rawFondo.includes('UALA PLUS 2')) yieldName = 'Ualá Plus 2';
                        else if (rawFondo.includes('UALA PLUS 1')) yieldName = 'Ualá Plus 1';
                        else if (rawFondo.includes('UALA')) yieldName = 'Ualá';
                        else if (rawFondo.includes('NARANJA')) yieldName = 'Naranja X';
                        else if (rawFondo.includes('FIWIND')) yieldName = 'Fiwind';
                        else if (rawFondo.includes('CARREFOUR')) yieldName = 'Carrefour Banco';
                        document.getElementById('best-yield-name').innerText = yieldName;
                        document.getElementById('best-yield-val').innerText = (filtered[0].tna * 100).toFixed(2) + '%';
                        let yieldIcon = getIcon(yieldName);
                        setRadarIcon('best-yield-name', yieldIcon);
                    }

                    // 3. Fondos Comunes de Inversión (FCI)
                    let allowedFci = [
                        { key: 'PREX', name: 'Prex', desc: 'Allaria Ahorro - Clase E' },
                        { key: 'PERSONAL', name: 'Personal Pay', desc: 'Delta Pesos - Clase X' },
                        { key: 'UALA', name: 'Ualá', desc: 'Ualintec Ahorro Pesos - Clase A' },
                        { key: 'CLARO', name: 'Claro Pay', desc: 'SBS Ahorro Pesos - Clase A' },
                        { key: 'MERCADO', name: 'Mercado Pago', desc: 'Mercado Fondo - Clase A' },
                        { key: 'LEMON', name: 'Lemon', desc: 'Fima Premium - Clase P' },
                        { key: 'FIWIND', name: 'Fiwind', desc: 'Delta Pesos - Clase A' }
                    ];

                    let fciItems = [];

                    allowedFci.forEach(f => {
                        let ultNode = fciUltimo.find(item => item.fondo && item.fondo.toUpperCase() === f.desc.toUpperCase());
                        let penNode = fciPenultimo.find(item => item.fondo && item.fondo.toUpperCase() === f.desc.toUpperCase());

                        if (ultNode && penNode && ultNode.vcp && penNode.vcp) {
                            let yieldPeriod = (ultNode.vcp / penNode.vcp) - 1;

                            let tUlt = new Date(ultNode.fecha);
                            let tPen = new Date(penNode.fecha);

                            let days = (tUlt - tPen) / (1000 * 60 * 60 * 24);
                            if (days > 0) {
                                let dailyYield = yieldPeriod / days;
                                let tna = dailyYield * 365;

                                let dateStr = `Entre ${formatDate(penNode.fecha)} y ${formatDate(ultNode.fecha)}`;

                                fciItems.push({
                                    name: f.name,
                                    descText: f.desc,
                                    dateStr: dateStr,
                                    rate: tna
                                });
                            }
                        }
                    });

                    fciItems.sort((a, b) => b.rate - a.rate);
                    let fciHtml = ''; let fciIdx = 0;
                    fciItems.forEach(f => {
                        let subLabel = f.descText;
                        let dateStr = f.dateStr ? f.dateStr : '';
                        fciHtml += formatTerminalRow(
                            f.name,
                            (f.rate * 100).toFixed(2) + '%',
                            subLabel,
                            [],
                            fciIdx === 0,
                            dateStr
                        );
                        fciIdx++;
                    });

                    if (fciHtml === '') fciHtml = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">No hay rendimientos disponibles.</div>';
                    document.getElementById('ars-fci-container').innerHTML = fciHtml;

                    // 4. Yield Matrix (Stablecoins)
                    let entities = ['Fiwind', 'LB', 'Belo', 'LemonCash', 'Vesseo'];
                    let entityDisplayName = { 'LemonCash': 'Lemon' };
                    let entityKeyMap = { 'Fiwind': 'fiwind', 'LB': 'letsbit', 'Belo': 'belo', 'LemonCash': 'lemoncash', 'Vesseo': 'vesseo' };
                    let coins = ['USDT', 'USDC', 'DAI'];

                    let rateMap = {};
                    let hasTiersMap = {}; // Tracks if a coin in an exchange has multiple APY rates

                    entities.forEach(ent => {
                        let apiKey = entityKeyMap[ent];
                        rateMap[ent] = {};
                        hasTiersMap[ent] = {};

                        coins.forEach(coin => {
                            let val = null;
                            hasTiersMap[ent][coin] = false;

                            if (false) { // Removed Binance logic entirely
                                val = 8.30;
                            } else {
                                let providerData = rendData.find(d => d.entidad.toLowerCase() === apiKey.toLowerCase());
                                if (providerData) {
                                    // Filter all matching coins for this exchange
                                    let matchingRates = providerData.rendimientos.filter(r => r.moneda.toUpperCase() === coin && r.apy > 0);
                                    
                                    if (matchingRates.length > 0) {
                                        // Find the highest APY among the available options
                                        let maxRateMatch = matchingRates.reduce((prev, current) => (prev.apy > current.apy) ? prev : current);
                                        val = maxRateMatch.apy;
                                        
                                        // Flag if there are multiple DIFFERENT rates for the same coin
                                        let uniqueRates = new Set(matchingRates.map(r => r.apy));
                                        if (uniqueRates.size > 1) {
                                            // As per user request, Lemon Cash only has conditional tiers for USDT
                                            if (ent === 'LemonCash') {
                                                if (coin === 'USDT') hasTiersMap[ent][coin] = true;
                                            } else {
                                                hasTiersMap[ent][coin] = true;
                                            }
                                        }
                                        // Force LemonCash USDT to show the tooltip regardless of the API response having multiple rates currently
                                        if (ent === 'LemonCash' && coin === 'USDT') {
                                            hasTiersMap[ent][coin] = true;
                                        }
                                    }
                                }
                            }
                            rateMap[ent][coin] = val;
                        });
                    });

                    // Find best rate per coin for heatmap/winner glow
                    let bestPerCoin = {};
                    coins.forEach(coin => {
                        let best = -1;
                        entities.forEach(ent => {
                            if (rateMap[ent][coin] !== null && rateMap[ent][coin] > best) best = rateMap[ent][coin];
                        });
                        bestPerCoin[coin] = best > 0 ? best : null;
                    });

                    // Build Matrix HTML
                    let matrixHtml = `
                        <table class="yield-matrix">
                            <thead>
                                <tr>
                                    <th>Criptomoneda</th>
                                    ${entities.map(ent => {
                        let displayName = entityDisplayName[ent] || ent;
                        let entIcon = window.iconMapExt[ent.toLowerCase()] || window.iconMapExt[ent.split(' ')[0].toLowerCase()] || '';
                        return `
                                            <th>
                                                <div class="matrix-exchange-header">
                                                    <div class="matrix-exchange-icon">${entIcon}</div>
                                                    <span>${displayName}</span>
                                                </div>
                                            </th>`;
                    }).join('')}
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    coins.forEach(coin => {
                        let coinIcon = window.iconMapExt[coin.toLowerCase()] || '';
                        matrixHtml += `<tr>
                            <td>
                                <div class="matrix-coin-cell">
                                    <div class="matrix-coin-icon">${coinIcon}</div>
                                    <span>${coin}</span>
                                </div>
                            </td>`;

                        entities.forEach(ent => {
                            let rate = rateMap[ent][coin];
                            let isBest = rate !== null && bestPerCoin[coin] !== null && rate === bestPerCoin[coin];
                            let cellClass = rate !== null ? (isBest ? 'yield-cell best-yield' : 'yield-cell') : 'yield-na hide-mobile';
                            
                            let displayRate = '—';
                            if (rate !== null) {
                                let tooltipHtml = '';
                                
                                // SVG for the "?" icon exactly as used in the Dólares tab (line 1281)
                                let questionMarkSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

                                // Decide tooltip direction based on screen edge
                                // Exchanges at the end of the lists (Lemon, Vesseo) should expand left
                                let entIdx = entities.indexOf(ent);
                                let tooltipDir = entIdx >= 3 ? 'tooltip-left' : 'tooltip-right';

                                // Special CriptoYa Tooltip for Lemon Cash high tier
                                if (ent === 'LemonCash' && coin === 'USDT') {
                                    let tooltipText = `Interés sujeto a cada nivel.<br>Hasta 1000 ${coin}: ${rate.toFixed(2)}%<br>Más de 1000 ${coin}: 2.75%`;
                                    
                                    tooltipHtml = `<div class="tooltip-container ${tooltipDir}" style="margin-left: 4px; color:var(--text-muted); cursor:help;">
                                        ${questionMarkSvg}
                                        <div class="tooltip-text" style="font-weight:600; text-align:left; min-width: 200px;">${tooltipText}</div>
                                    </div>`;
                                } else if (hasTiersMap[ent][coin]) {
                                    // Generic tooltip for other platforms with tiers
                                    let tooltipText = "Tasa máxima detectada.<br>El rendimiento varía según condiciones de la plataforma.";
                                    tooltipHtml = `<div class="tooltip-container ${tooltipDir}" style="display:inline-flex; align-items:center; vertical-align:middle; margin-left:4px; color:var(--text-muted);">
                                        ${questionMarkSvg}
                                        <div class="tooltip-text" style="font-weight:600; text-align:left;">${tooltipText}</div>
                                    </div>`;
                                }

                                displayRate = `<div class="apy-container" style="display:flex; align-items:center; justify-content:center; width:100%; position:relative; overflow:visible;">${tooltipHtml}<span class="apy-value">${rate.toFixed(2)}%</span></div>`;
                            }

                            let entIcon = window.iconMapExt[ent.toLowerCase()] || window.iconMapExt[ent.split(' ')[0].toLowerCase()] || '';
                            let displayName = entityDisplayName[ent] || ent;
                            
                            matrixHtml += `<td class="${cellClass}" data-exchange="${displayName}">
                                <div class="exchange-label-mobile">
                                    <div class="matrix-exchange-icon">${entIcon}</div>
                                    <span>${displayName}</span>
                                </div>
                                ${displayRate}
                            </td>`;
                        });
                        matrixHtml += `</tr>`;
                    });

                    matrixHtml += `</tbody></table>`;
                    document.getElementById('yield-matrix-wrapper').innerHTML = matrixHtml;

                    // Update Resumen Crypto — find BEST across all coins and exchanges
                    let bestCryptoRate = -1, bestCryptoExchange = '...', bestCryptoCoin = 'USDT', bestCryptoEntKey = '';
                    entities.forEach(ent => {
                        coins.forEach(coin => {
                            let r = rateMap[ent][coin];
                            if (r !== null && r > bestCryptoRate) {
                                bestCryptoRate = r;
                                bestCryptoExchange = entityDisplayName[ent] || ent;
                                bestCryptoCoin = coin;
                                bestCryptoEntKey = ent;
                            }
                        });
                    });
                    if (bestCryptoRate > 0) {
                        document.getElementById('best-crypto-name').innerText = bestCryptoExchange;
                        document.getElementById('best-crypto-val').innerText = bestCryptoRate.toFixed(2) + '%';
                        // Show coin icon + label in detail row
                        let coinIconSvg = window.iconMapExt[bestCryptoCoin.toLowerCase()] || '';
                        let detailEl = document.getElementById('best-crypto-detail');
                        if (detailEl) {
                            detailEl.innerHTML = `<span class="radar-detail-coin">${coinIconSvg}<span>${bestCryptoCoin}</span></span>`;
                        }
                        // Replace icon with exchange logo
                        let cryptoIcon = getIcon(bestCryptoExchange);
                        setRadarIcon('best-crypto-name', cryptoIcon);
                    }

                }).catch(e => console.error("Error in fetching rates concurrently:", e));

            } catch (error) {
                console.error("Error loading rates:", error);
            }
        }

        // Trigger load initially
        setTimeout(() => loadTasasData(), 500);

        (function () {
            let chartWidget = null;
            let snapshot = null;
            let datosBandas = [];

            let allTickerRows = [];
            let currentIndex = 0;
            let currentSortStates = {};
            let meta = null;

            function safeGroupId(name) { return name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

            function vizWidth(value, minVal, maxVal) {
                if (value == null) return 0;
                if (minVal >= maxVal) return 0;
                if (value >= 0) { if (maxVal <= 0) return 0; return Math.min(100, Math.max(0, (value / maxVal) * 100)); }
                if (minVal >= 0) return 0;
                return Math.min(100, Math.max(0, (Math.abs(value) / Math.abs(minVal)) * 100));
            }

            function getGroupLabelClass(groupName, ticker) {
                if (groupName === 'Industries' && meta && meta.Industries_COLORS && meta.Industries_COLORS[ticker])
                    return 'rv-ticker-label-' + ticker;
                return '';
            }

            function renderGroups() {
                if (!snapshot || !snapshot.groups) return;
                let html = '';
                const groupOrder = Object.keys(snapshot.groups);

                for (const groupName of groupOrder) {
                    const rows = snapshot.groups[groupName];
                    if (!rows || rows.length === 0) continue;
                    const safeId = safeGroupId(groupName);
                    const ranges = (snapshot.column_ranges && snapshot.column_ranges[groupName]) || { 
                        daily: [-10, 10], 
                        intra: [-10, 10], 
                        '5d': [-20, 20], 
                        '20d': [-30, 30] 
                    };

                    let legendHtml = '';
                    if (meta && meta.SECTOR_COLORS && (groupName === 'Industries' || groupName.toLowerCase().includes('industr'))) {
                        let sectorSpans = '';
                        for (const s in meta.SECTOR_COLORS) {
                            sectorSpans += `<span class="rv-legend-item" style="background-color:${meta.SECTOR_COLORS[s]}">${s}</span>`;
                        }
                        legendHtml = `<div class="rv-legend" onclick="event.stopPropagation()">${sectorSpans}</div>`;
                    }

                    let tableRows = '';
                    rows.forEach((r, i) => {
                        const { daily, '5d': five, '20d': twenty, abc = '', ticker } = r;
                        const dailyW = vizWidth(daily, ranges.daily?.[0] ?? -10, ranges.daily?.[1] ?? 10);
                        const fiveW = vizWidth(five, ranges['5d']?.[0] ?? -20, ranges['5d']?.[1] ?? 20);
                        const twentyW = vizWidth(twenty, ranges['20d']?.[0] ?? -30, ranges['20d']?.[1] ?? 30);
                        
                        const labelClass = getGroupLabelClass(groupName, ticker);
                        const extraCls = labelClass || 'rv-ticker-label';

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

                        tableRows += `
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
                                <td><span class="${extraCls}">${ticker}</span></td>
                                <td>${abc ? `<span class="abc-rating abc-${abc.toLowerCase()}">${abc}</span>` : '-'}</td>
                                ${makeBar(daily, dailyW)}
                                ${makeBar(five, fiveW)}
                                ${makeBar(twenty, twentyW)}
                                <td>${r.atr_pct != null ? r.atr_pct.toFixed(1) + '%' : '-'}</td>
                                <td>${r.dist_sma50_atr != null ? r.dist_sma50_atr.toFixed(2) : '-'}</td>
                                <td>${r.rs != null ? Math.round(r.rs) + '%' : '-'}</td>
                            </tr>`;
                    });

                    html += `
                        <div class="group-container" id="group-${safeId}">
                            <div class="group-header" onclick="scrollToGroup('${groupName.replace(/'/g, "\\'")}')">
                                <span>${groupName}</span>
                                ${legendHtml}
                            </div>
                            <table class="ticker-table" data-group="${groupName.replace(/"/g, '&quot;')}">
                                <thead>
                                    <tr>
                                        <th class="sortable" data-sort-by="symbol" title="Símbolo del activo">Ticker</th>
                                        <th class="sortable" data-sort-by="abc" title="Calificación Técnica">Tendencia</th>
                                        <th class="sortable" data-sort-by="daily" title="Variación porcentual del día">Daily</th>
                                        <th class="sortable" data-sort-by="5d" title="Variación últimos 5 días hábiles">5D</th>
                                        <th class="sortable" data-sort-by="20d" title="Variación últimos 20 días hábiles">20D</th>
                                        <th class="sortable" data-sort-by="atr_pct" title="Volatilidad (21d)">ATR%</th>
                                        <th class="sortable" data-sort-by="dist_sma50_atr" title="Distancia a SMA50">ATRx</th>
                                        <th class="sortable" data-sort-by="rs" title="Fuerza Relativa">1M-VARS</th>
                                    </tr>
                                </thead>
                                <tbody id="${safeId}-body">
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>`;
                }
                document.getElementById('groups-container').innerHTML = html;

                // Inject dynamic styles for Industries ticker colors
                if (meta && meta.Industries_COLORS) {
                    var style = document.createElement('style');
                    var css = '';
                    for (var t in meta.Industries_COLORS)
                        css += '.rv-ticker-label-' + t + '{display:inline-block;padding:2px 8px;border-radius:10px;background-color:' + meta.Industries_COLORS[t] + ';color:white;font-weight:600;font-size:12px;letter-spacing:0.3px} ';
                    style.textContent = css;
                    document.head.appendChild(style);
                }

                initRentaApp();
            }

            function initRentaApp() {
                allTickerRows = [].slice.call(document.querySelectorAll('#tab-renta .ticker-row'));
                document.querySelectorAll('#tab-renta .ticker-table').forEach(function (table) {
                    var g = table.getAttribute('data-group');
                    currentSortStates[g] = { sortBy: null, direction: 1, count: 0 };
                });

                // Sort delegation
                // Column Guide Toggle Logic
                const guideContainer = document.getElementById('column-guide-container');
                const guideToggle = document.getElementById('column-guide-toggle');
                const guideClose = document.getElementById('column-guide-close');

                if (guideToggle && guideContainer) {
                    guideToggle.addEventListener('click', () => {
                        guideContainer.classList.add('active');
                    });
                }
                if (guideClose && guideContainer) {
                    guideClose.addEventListener('click', (e) => {
                        e.stopPropagation();
                        guideContainer.classList.remove('active');
                    });
                }

                var listEl = document.querySelector('#tab-renta .ticker-list');
                if (listEl && !listEl._sortDelegate) {
                    listEl._sortDelegate = true;
                    listEl.addEventListener('click', function (ev) {
                        var th = ev.target.closest('th.sortable');
                        if (!th) return;
                        var table = th.closest('table.ticker-table');
                        if (!table) return;
                        var group = table.getAttribute('data-group');
                        var sortBy = th.getAttribute('data-sort-by');
                        if (group && sortBy) window.sortGroup(group, sortBy);
                    });
                }

                var defaultSymbol = (meta && meta.default_symbol) ? meta.default_symbol : 'SPY';
                initChart(defaultSymbol);
                if (allTickerRows.length > 0) allTickerRows[0].classList.add('active');

                // Keyboard navigation
                document.addEventListener('keydown', function (e) {
                    // Only when renta tab is visible
                    if (document.getElementById('tab-renta').style.display === 'none') return;
                    if (e.key === 'ArrowDown') { e.preventDefault(); if (currentIndex < allTickerRows.length - 1) { currentIndex++; updateChart(allTickerRows[currentIndex].getAttribute('data-symbol'), allTickerRows[currentIndex]); } }
                    if (e.key === 'ArrowUp') { e.preventDefault(); if (currentIndex > 0) { currentIndex--; updateChart(allTickerRows[currentIndex].getAttribute('data-symbol'), allTickerRows[currentIndex]); } }
                });
            }

            window.scrollToGroup = function (groupName) {
                var el = document.getElementById('group-' + safeGroupId(groupName));
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            };

            window.sortGroup = function (group, sortBy) {
                var tables = document.querySelectorAll('#tab-renta .ticker-table');
                var table = null;
                for (var t = 0; t < tables.length; t++) { if (tables[t].getAttribute('data-group') === group) { table = tables[t]; break; } }
                if (!table) return;
                var tbody = table.querySelector('tbody');
                var rows = [].slice.call(tbody.querySelectorAll('.ticker-row'));
                var state = currentSortStates[group] || { sortBy: null, direction: 1, count: 0 };
                currentSortStates[group] = state;

                table.querySelectorAll('th, td').forEach(function (el) { el.classList.remove('sort-asc', 'sort-desc', 'sorted-column'); });

                if (state.sortBy === sortBy) {
                    state.count++;
                    if (state.count >= 3) {
                        state.sortBy = null; state.direction = 1; state.count = 0;
                        rows.sort(function (a, b) { return parseInt(a.getAttribute('data-index')) - parseInt(b.getAttribute('data-index')); });
                        tbody.innerHTML = ''; rows.forEach(function (r) { tbody.appendChild(r); });
                        allTickerRows = [].slice.call(document.querySelectorAll('#tab-renta .ticker-row'));
                        return;
                    }
                } else state.count = 1;
                state.sortBy = sortBy;
                if (state.count === 2) state.direction *= -1; else state.direction = 1;

                var colMap = { symbol: 0, abc: 1, daily: 2, '5d': 3, '20d': 4, atr_pct: 5, dist_sma50_atr: 6, rs: 7 };
                var hi = colMap[sortBy] !== undefined ? colMap[sortBy] : 7;
                var headerIndices = [hi];
                headerIndices.forEach(function (idx) {
                    var h = table.querySelectorAll('th')[idx];
                    if (h) h.classList.add(state.direction === 1 ? 'sort-asc' : 'sort-desc', 'sorted-column');
                });
                rows.forEach(function (row) {
                    var cells = row.querySelectorAll('td');
                    headerIndices.forEach(function (idx) { if (cells[idx]) cells[idx].classList.add('sorted-column'); });
                });

                rows.sort(function (a, b) {
                    if (sortBy === 'symbol') return (a.getAttribute('data-symbol').toLowerCase().localeCompare(b.getAttribute('data-symbol').toLowerCase())) * state.direction;
                    if (sortBy === 'abc') return ((a.getAttribute('data-abc') || '').localeCompare(b.getAttribute('data-abc') || '')) * state.direction;
                    return (parseFloat(a.getAttribute('data-' + sortBy)) - parseFloat(b.getAttribute('data-' + sortBy))) * state.direction;
                });
                tbody.innerHTML = ''; rows.forEach(function (r) { tbody.appendChild(r); });
                allTickerRows = [].slice.call(document.querySelectorAll('#tab-renta .ticker-row'));
                var ar = document.querySelector('#tab-renta .ticker-row.active');
                if (ar) currentIndex = allTickerRows.indexOf(ar);
            };

            window.initChart = function (symbol) {
                if (chartWidget) { chartWidget.remove(); chartWidget = null; }
                window._lastChartSymbol = symbol;
                const isLight = document.documentElement.getAttribute("data-theme") === "light";
                const isMobile = window.innerWidth <= 768;

                chartWidget = new TradingView.widget({
                    allow_symbol_change: !isMobile, calendar: false, details: !isMobile,
                    hide_side_toolbar: isMobile, hide_top_toolbar: false,
                    hide_legend: false, hide_volume: true, hotlist: false,
                    interval: 'D', locale: 'es', save_image: false, style: '1',
                    theme: isLight ? 'light' : 'dark',
                    toolbar_bg: isLight ? '#f8fafc' : '#09090b',
                    backgroundColor: isLight ? '#f8fafc' : '#09090b',
                    gridColor: isLight ? 'rgba(226, 232, 240, 1)' : 'rgba(63, 63, 70, 0.4)',
                    symbol: symbol, timezone: 'America/Argentina/Buenos_Aires',
                    studies: ['STD;MA%Ribbon', 'Volume@tv-basicstudies'],
                    autosize: true, enable_publishing: false, container_id: 'tradingview-chart',
                    withdateranges: true
                });
                window.tradingviewWidget = chartWidget;
            };


            window.updateChart = function (symbol, element) {
                document.querySelectorAll('#tab-renta .ticker-row').forEach(row => row.classList.remove('active'));
                if (element) {
                    element.classList.add('active');
                    currentIndex = allTickerRows.indexOf(element);
                } else {
                    var row = [].slice.call(document.querySelectorAll('#tab-renta .ticker-row')).filter(function (r) { return r.getAttribute('data-symbol') === symbol; })[0];
                    if (row) { row.classList.add('active'); currentIndex = allTickerRows.indexOf(row); }
                }
                initChart(symbol);

                var activeRow = document.querySelector('#tab-renta .ticker-row.active');
                if (activeRow) activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            };

            function renderMacro(macro) {
                if (!macro) return;
                // Riesgo País removed as per user request
                if (macro.holidays && macro.holidays.length > 0) {
                    let html = '';
                    macro.holidays.forEach(h => html += `<li>${h}</li>`);
                    document.getElementById('feriados-list').innerHTML = html;
                } else {
                    document.getElementById('feriados-list').innerHTML = '<li style="list-style:none; color:#9ca3af; margin-left:-20px;">Sin feriados restantes este mes</li>';
                }
                let ipcSource = macro.ipc_history || {};
                
                // If we have API data, we prefer it or merge it
                if (window._liveInflation && window._liveInflation.length > 0) {
                    window._liveInflation.forEach(item => {
                        // date is YYYY-MM-DD, we need YYYY-MM
                        let monthKey = item.fecha.substring(0, 7);
                        ipcSource[monthKey] = item.valor / 100; // API returns 2.9 meaning 2.9%, local expects 0.029
                    });
                }

                if (ipcSource && Object.keys(ipcSource).length > 0) {
                    const monthsNames = { '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic' };
                    
                    // 1. Sort chronologically and exact last 12
                    let allKeys = Object.keys(ipcSource).sort();
                    let last12Keys = allKeys.slice(-12);
                    
                    let labels = [];
                    let dataPoints = [];
                    let years = []; // Keep track of the year for each data point
                    let acum = 1;
                    let sum = 0;
                    
                    last12Keys.forEach(key => {
                        let y = key.split('-')[0];
                        let m = key.split('-')[1];
                        let val = ipcSource[key]; // This is already in decimal
                        
                        labels.push(monthsNames[m] || m);
                        years.push(y);
                        dataPoints.push(parseFloat((val * 100).toFixed(1)));
                        
                        acum *= (1 + val);
                        sum += val;
                    });
                    
                    // KPIs
                    let lastMonthVal = dataPoints[dataPoints.length - 1];
                    let avg12m = (sum / last12Keys.length) * 100;
                    let acum12m = (acum - 1) * 100;
                    
                    document.querySelectorAll('.inf-kpi-label')[0].innerText = 'ÚLTIMO MES (' + labels[labels.length - 1].toUpperCase() + ')';
                    document.getElementById('inf-last-month').innerText = lastMonthVal.toFixed(1).replace('.', ',') + '%';
                    document.getElementById('inf-avg-12m').innerText = avg12m.toFixed(1).replace('.', ',') + '%';
                    document.getElementById('inf-acum-12m').innerText = acum12m.toFixed(1).replace('.', ',') + '%';
                    
                    // Purchasing Power Footer
                    let baseValue = 10000;
                    let currentValue = baseValue * acum;
                    let formattedCurrent = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(currentValue);
                    document.getElementById('inf-purchasing-power').innerHTML = `Algo que costaba $10.000 hace un año, hoy cuesta <strong>${formattedCurrent}</strong>.`;
                    
                    // Chart.js Setup
                    const ctxInflacion = document.getElementById('inflationChart');
                    if (ctxInflacion) {
                        if (window.inflationChartInstance) {
                            window.inflationChartInstance.destroy();
                        }
                        
                        let bgColors = dataPoints.map((_, index) => {
                            if (index === dataPoints.length - 1) return '#475569'; // Dark Slate for last month
                            return '#64748b'; // Slate for others to match screenshot
                        });
                        
                        window.inflationChartInstance = new Chart(ctxInflacion, {
                            type: 'bar',
                            data: {
                                labels: labels,
                                datasets: [{
                                    data: dataPoints,
                                    backgroundColor: bgColors,
                                    borderRadius: 4,
                                    barPercentage: 0.8
                                }]
                            },
                            plugins: [
                                {
                                    id: 'inflationDatalabels',
                                    afterDatasetsDraw: function(chart) {
                                        const ctx = chart.ctx;
                                        // Fetch theme color instead of hardcoding white
                                        const textColor = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || '#ffffff';
                                        
                                        chart.data.datasets.forEach((dataset, i) => {
                                            const meta = chart.getDatasetMeta(i);
                                            if (!meta.hidden) {
                                                meta.data.forEach((element, index) => {
                                                    const dataStr = dataset.data[index].toFixed(1).replace('.', ',') + '%';
                                                    
                                                    ctx.fillStyle = textColor; 
                                                    // Reduce font size further on mobile to prevent overlapping percentages
                                                    const isMobile = window.innerWidth < 500;
                                                    ctx.font = `bold ${isMobile ? '9px' : '10px'} Inter, sans-serif`; 
                                                    ctx.textAlign = 'center';
                                                    ctx.textBaseline = 'bottom';
                                                    ctx.fillText(dataStr, element.x, element.y - 4);
                                                });
                                            }
                                        });
                                    }
                                },
                                {
                                    id: 'yearGroupingPlugin',
                                    afterDraw: function(chart) {
                                        const ctx = chart.ctx;
                                        const xAxis = chart.scales.x;
                                        const yAxis = chart.scales.y;
                                        
                                        // Find where the year changes
                                        let yearGroups = [];
                                        let currentYear = years[0];
                                        let currentGroupStart = 0;
                                        
                                        for (let i = 1; i <= years.length; i++) {
                                            if (i === years.length || years[i] !== currentYear) {
                                                yearGroups.push({
                                                    year: currentYear,
                                                    startIdx: currentGroupStart,
                                                    endIdx: i - 1
                                                });
                                                if (i < years.length) {
                                                    currentYear = years[i];
                                                    currentGroupStart = i;
                                                }
                                            }
                                        }
                                        
                                        // Draw the groups
                                        const yPosition = xAxis.bottom + 10;
                                        ctx.save();
                                        ctx.fillStyle = '#9ca3af';
                                        ctx.strokeStyle = '#6b7280';
                                        ctx.lineWidth = 1;
                                        ctx.font = 'bold 11px Inter, sans-serif';
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'middle';
                                        
                                        yearGroups.forEach(group => {
                                            const startX = xAxis.getPixelForTick(group.startIdx) - (xAxis.getPixelForTick(1) - xAxis.getPixelForTick(0)) / 2;
                                            const endX = xAxis.getPixelForTick(group.endIdx) + (xAxis.getPixelForTick(1) - xAxis.getPixelForTick(0)) / 2;
                                            const centerX = (startX + endX) / 2;
                                            
                                            // Draw line with gap for text
                                            const textWidth = ctx.measureText(group.year).width + 10;
                                            
                                            ctx.beginPath();
                                            ctx.moveTo(startX + 5, yPosition);
                                            ctx.lineTo(centerX - textWidth/2, yPosition);
                                            ctx.stroke();
                                            
                                            ctx.beginPath();
                                            ctx.moveTo(centerX + textWidth/2, yPosition);
                                            ctx.lineTo(endX - 5, yPosition);
                                            ctx.stroke();

                                            // Draw short vertical brackets
                                            ctx.beginPath();
                                            ctx.moveTo(startX + 5, yPosition - 3);
                                            ctx.lineTo(startX + 5, yPosition);
                                            ctx.stroke();

                                            ctx.beginPath();
                                            ctx.moveTo(endX - 5, yPosition - 3);
                                            ctx.lineTo(endX - 5, yPosition);
                                            ctx.stroke();
                                            
                                            // Draw year pill
                                            ctx.fillStyle = '#6b7280';
                                            ctx.beginPath();
                                            ctx.roundRect(centerX - textWidth/2 + 2, yPosition - 8, textWidth - 4, 16, 8);
                                            ctx.fill();
                                            
                                            ctx.fillStyle = '#ffffff';
                                            ctx.fillText(group.year, centerX, yPosition + 1);
                                        });
                                        ctx.restore();
                                    }
                                }
                            ],
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                layout: {
                                    padding: { top: 20, bottom: 25 } // Room for top labels and bottom year grouping
                                },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        titleColor: '#94a3b8',
                                        bodyColor: '#fff',
                                        borderColor: '#334155',
                                        borderWidth: 1,
                                        displayColors: false,
                                        callbacks: {
                                            label: function(context) { return context.parsed.y.toFixed(1) + '%'; }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        grid: { display: false, drawBorder: false },
                                        ticks: { 
                                            color: '#64748b', 
                                            font: { size: 10, weight: 'bold' },
                                            padding: 5
                                        }
                                    },
                                    y: {
                                        display: true, 
                                        beginAtZero: true,
                                        grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
                                        ticks: {
                                            color: '#64748b',
                                            padding: 5,
                                            font: { size: 11 },
                                            stepSize: 1,
                                            callback: function(value) {
                                                // Prevent excessive decimals on Y axis like "4.625%"
                                                if (Number.isInteger(value)) {
                                                    return value + '%';
                                                }
                                                return value.toFixed(1) + '%';
                                            }
                                        },
                                        max: Math.ceil(Math.max(...dataPoints)) + 1 // Give breathing room for labels, keeping pure integer boundaries
                                    }
                                }
                            }
                        });
                    }
                }

                // --- NOW GENERATE DATOS BANDAS DYNAMICALLY ---
                // We do it here because `macro` is now defined and populated
                datosBandas = [];
                const dStart = new Date(2026, 0, 1);
                let dEnd = new Date();
                dEnd.setDate(dEnd.getDate() + 30);

                let currentInf = 916.275; // mathematically exact true Dec 31 anchor
                let currentSup = 1526.596; // mathematically exact true Dec 31 anchor

                const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
                const getIPCForMonth = (year, month) => {
                    let targetM = month - 2;
                    let targetY = year;
                    if (targetM < 0) { targetM += 12; targetY -= 1; }
                    const mStr = String(targetM + 1).padStart(2, '0');
                    const key = `${targetY}-${mStr}`;
                    if (macro && macro.ipc_history && macro.ipc_history[key]) {
                        return parseFloat(macro.ipc_history[key]);
                    }
                    return 0.02; // default 2%
                };

                for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
                    let m = d.getMonth();
                    let y = d.getFullYear();
                    let daysInM = getDaysInMonth(y, m);
                    let ipc = getIPCForMonth(y, m);

                    let factorSup = Math.pow(1 + ipc, 1 / daysInM);
                    let factorInf = Math.pow(1 - ipc, 1 / daysInM);

                    currentInf *= factorInf;
                    currentSup *= factorSup;

                    let dStr = String(d.getDate()).padStart(2, '0') + '-' +
                        String(d.getMonth() + 1).padStart(2, '0') + '-' +
                        d.getFullYear();

                    // Solo redondeamos para mostrar al final
                    datosBandas.push({ date: dStr, inf: Number(currentInf.toFixed(2)), sup: Number(currentSup.toFixed(2)) });
                }
            }

            let nextUpdateSecs = 60;
            let progressInterval = null;

            function updateSpreadSummary(chart, baseCurrency) {
                if (!chart || !chart.data.datasets[0].data) return;
                let cclWins = 0, baseWins = 0;
                chart.data.datasets[0].data.forEach(val => {
                    if (val > 0) cclWins++; else if (val < 0) baseWins++;
                });
                document.getElementById('ccl-wins').innerText = `${cclWins} Días`;
                document.getElementById('base-name-summary').innerText = baseCurrency === 'oficial' ? 'Oficial' : baseCurrency === 'blue' ? 'Blue' : baseCurrency.toUpperCase();
                document.getElementById('base-wins').innerText = `${baseWins} Días`;
            }

            function renderSpreadChart(historicalData) {
                if (!historicalData || historicalData.length === 0) return;
                window._lastHistoricalFiat = historicalData;
                window._renderSpreadChart = renderSpreadChart;
                // Get value from pills instead of select
                var activePill = document.querySelector('#base-currency-pills .base-pill.active');
                var baseCurrency = activePill ? activePill.getAttribute('data-val') : 'usdt';
                document.getElementById('chart-title').innerText = `Spread CCL vs ${baseCurrency.toUpperCase()} (YTD)`;

                var labels = []; var data = [];
                historicalData.forEach(d => {
                    var targetVal = d.ccl; var baseVal = d[baseCurrency];
                    if (targetVal && baseVal && baseVal > 0) { labels.push(d.date); data.push(((targetVal / baseVal) - 1) * 100); }
                });

                // Inject today's live data point to the arrays BEFORE creating the chart to avoid animation glitches
                if (window._cachedFiatData && window._cachedMaxVenta) {
                    let liveBaseCurrency = baseCurrency;
                    let liveBasePrice = liveBaseCurrency === 'usdt' ? window._cachedMaxVenta : window._cachedFiatData[liveBaseCurrency].price;
                    if (liveBasePrice > 0 && window._cachedFiatData.ccl.price > 0) {
                        let liveSpread = ((window._cachedFiatData.ccl.price / liveBasePrice) - 1) * 100;
                        let dNow = new Date(); let nowStr = String(dNow.getDate()).padStart(2, '0') + '-' + String(dNow.getMonth() + 1).padStart(2, '0') + '-' + dNow.getFullYear();

                        if (labels.length > 0 && labels[labels.length - 1] === nowStr) {
                            data[data.length - 1] = liveSpread;
                        } else {
                            labels.push(nowStr);
                            data.push(liveSpread);
                        }
                    }
                }

                if (window.spreadChartInstance) window.spreadChartInstance.destroy();
                var ctx = document.getElementById('spreadChart').getContext('2d');

                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
                const textColor = isLight ? '#64748b' : '#aaaaaa';

                // Plugin to draw background zones and labels (Only for USDT)
                const zonesPlugin = {
                    id: 'zonesPlugin',
                    beforeDraw(chart) {
                        if (baseCurrency !== 'usdt') return;
                        const { ctx, chartArea, scales: { y: yScale } } = chart;
                        const isLt = document.documentElement.getAttribute('data-theme') === 'light';
                        ctx.save();

                        const drawZone = (yMin, yMax, color, text, isExtreme = false) => {
                            const top = yScale.getPixelForValue(yMax);
                            const bottom = yScale.getPixelForValue(yMin);
                            const drawTop = Math.max(top, chartArea.top);
                            const drawBottom = Math.min(bottom, chartArea.bottom);

                            if (drawTop < drawBottom) {
                                ctx.fillStyle = color;
                                ctx.fillRect(chartArea.left, drawTop, chartArea.width, drawBottom - drawTop);
                                if (text && window.innerWidth >= 768) {
                                    const opacity = isExtreme ? 0.35 : 0.22;
                                    ctx.fillStyle = isLt ? `rgba(0,0,0,${opacity})` : `rgba(255,255,255,${opacity})`;
                                    ctx.font = `bold ${isExtreme ? '24px' : '18px'} sans-serif`;
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.fillText(text, chartArea.left + chartArea.width / 2, drawTop + (drawBottom - drawTop) / 2);
                                }
                            }
                        };

                        // 1. VENDER CEDEARs - COMPRAR USDT (> 2%)
                        drawZone(2.0, yScale.max, 'rgba(239, 68, 68, 0.15)', 'VENDER CEDEARs - COMPRAR USDT', true);
                        // 2. Oportunidad de venta CEDEARs (1% a 2%)
                        drawZone(1.0, 2.0, 'rgba(239, 68, 68, 0.05)', 'Oportunidad de venta CEDEARs o compra USDT');
                        // 3. Oportunidad de venta USDT (-2% a -1%)
                        drawZone(-2.0, -1.0, 'rgba(16, 185, 129, 0.05)', 'Oportunidad de venta USDT o compra CEDEARs');
                        // 4. VENDER USDT - COMPRAR CEDEARs (< -2%)
                        drawZone(yScale.min, -2.0, 'rgba(16, 185, 129, 0.15)', 'VENDER USDT - COMPRAR CEDEARs', true);

                        ctx.restore();
                    }
                };

                // Zero-line plugin: draws a solid line at y=0 directly on canvas
                const zeroLinePlugin = {
                    id: 'zeroLine',
                    afterDraw(chart) {
                        const yScale = chart.scales.y;
                        if (!yScale) return;
                        const yPixel = yScale.getPixelForValue(0);
                        if (yPixel < yScale.top || yPixel > yScale.bottom) return;
                        const ctx = chart.ctx;
                        const lt = document.documentElement.getAttribute('data-theme') === 'light';
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(chart.chartArea.left, yPixel);
                        ctx.lineTo(chart.chartArea.right, yPixel);
                        ctx.lineWidth = 1.5;
                        ctx.strokeStyle = lt ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.3)';
                        ctx.stroke();
                        ctx.restore();
                    }
                };

                window.spreadChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: { labels: labels, datasets: [{ data: data, borderWidth: 3, pointRadius: function (ctx) { return ctx.dataIndex === ctx.dataset.data.length - 1 ? 4 : 0; }, pointBackgroundColor: function (ctx) { var val = ctx.dataset.data[ctx.dataIndex]; return val >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'; }, pointHoverRadius: 5, fill: false, tension: 0.1, segment: { borderColor: function (ctx) { return (ctx.p0 && ctx.p0.parsed && ctx.p0.parsed.y >= 0) ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'; } } }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return 'Spread: ' + c.parsed.y.toFixed(2) + '%'; } } } }, scales: { x: { display: true, offset: true, ticks: { color: textColor, maxTicksLimit: 6 }, grid: { color: gridColor } }, y: { display: true, ticks: { color: textColor }, grid: { color: gridColor } } }, interaction: { mode: 'index', intersect: false } },
                    plugins: [zonesPlugin, zeroLinePlugin]
                });

                updateSpreadSummary(window.spreadChartInstance, baseCurrency);
            }

            function renderBandasChart(historicalFiat) {
                if (!historicalFiat) return;
                window._renderBandasChart = renderBandasChart;
                const mayoristaMap = {};
                historicalFiat.forEach(d => { if (d.mayorista) mayoristaMap[d.date] = d.mayorista; });

                let labels = [], dataSup = [], dataInf = [], dataMay = [];
                let dToday = new Date(); let todayStr = String(dToday.getDate()).padStart(2, '0') + '-' + String(dToday.getMonth() + 1).padStart(2, '0') + '-' + dToday.getFullYear();

                // Preparar datos para el GRÁFICO (Cronológico: Antiguo -> Nuevo)
                datosBandas.forEach(b => {
                    let parts = b.date.split('-');
                    let bDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    let isWeekend = (bDate.getDay() === 0 || bDate.getDay() === 6);
                    let apiHolidayFormat = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    let isHoliday = snapshot && snapshot.argentina_macro && snapshot.argentina_macro.full_holidays && snapshot.argentina_macro.full_holidays.includes(apiHolidayFormat);

                    if (bDate <= dToday || b.date === todayStr) {
                        if ((isWeekend || isHoliday) && bDate < dToday && b.date !== todayStr) return;
                        let mayVal = mayoristaMap[b.date] || null;
                        labels.push(b.date); dataSup.push(b.sup); dataInf.push(b.inf); dataMay.push(mayVal);
                    }
                });

                // Preparar datos para la TABLA (Inverso: Nuevo -> Antiguo, desde ayer si hoy es día en curso)
                let tableHtml = '';
                // Copia del array filtrado
                let tableLabels = [...labels].reverse();
                let tableSup = [...dataSup].reverse();
                let tableInf = [...dataInf].reverse();
                let tableMay = [...dataMay].reverse();

                for (let i = 0; i < tableLabels.length; i++) {
                    let displayMay = tableMay[i] ? `$${tableMay[i].toFixed(2)}` : '-';
                    tableHtml += `<tr>
                        <td style="color: var(--text-muted); font-weight: 600;">${tableLabels[i]}</td>
                        <td style="color: var(--green); font-weight: bold;">${displayMay}</td>
                        <td style="color: var(--orange); font-weight: bold;">$${tableSup[i].toFixed(2)}</td>
                        <td style="color: var(--red); font-weight: bold;">$${tableInf[i].toFixed(2)}</td>
                    </tr>`;
                }

                document.getElementById('bandas-table-wrapper-body').innerHTML = tableHtml;

                // Inyectar el dato en vivo de hoy ANTES de crear el gráfico (para que resista el cambio de tema)
                if (window._cachedMayoristaVal > 0) {
                    let liveMay = window._cachedMayoristaVal;
                    // Buscar la banda proyectada de hoy
                    let dTodayB = new Date(); let todayStrB = String(dTodayB.getDate()).padStart(2, '0') + '-' + String(dTodayB.getMonth() + 1).padStart(2, '0') + '-' + dTodayB.getFullYear();
                    let bandaHoy = datosBandas.find(b => b.date === todayStrB);
                    if (!bandaHoy) {
                        let pastBands = datosBandas.filter(b => {
                            let parts = b.date.split('-');
                            return new Date(parts[2], parts[1] - 1, parts[0]) <= dTodayB;
                        });
                        bandaHoy = pastBands.length > 0 ? pastBands[pastBands.length - 1] : (datosBandas.length > 0 ? datosBandas[0] : null);
                    }
                    if (bandaHoy) {
                        if (labels.length > 0 && labels[labels.length - 1] === todayStrB) {
                            dataMay[dataMay.length - 1] = liveMay;
                        } else {
                            labels.push(todayStrB);
                            dataSup.push(bandaHoy.sup);
                            dataInf.push(bandaHoy.inf);
                            dataMay.push(liveMay);
                        }
                    }
                }

                if (window.bandasChartInstance) window.bandasChartInstance.destroy();
                var ctx = document.getElementById('bandasChart').getContext('2d');

                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
                const textColor = isLight ? '#64748b' : '#aaaaaa';

                window.bandasChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            { label: 'Banda Superior', data: dataSup, borderColor: '#f97316', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.2 },
                            { label: 'Banda Inferior', data: dataInf, borderColor: '#ef4444', borderWidth: 2, pointRadius: 0, fill: '-1', backgroundColor: 'rgba(249, 115, 22, 0.05)', tension: 0.2 },
                            { label: 'Mayorista', data: dataMay, borderColor: '#10b981', borderWidth: 3, pointRadius: 0, pointHoverRadius: 5, fill: false, tension: 0.2 }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: textColor, usePointStyle: true, boxWidth: 8 } } }, scales: { x: { ticks: { color: textColor, maxTicksLimit: 6 } }, y: { ticks: { color: textColor }, grid: { color: gridColor } } }, interaction: { mode: 'index', intersect: false } }
                });
            }

            window.toggleBandasView = function (view) {
                const chartView = document.getElementById('bandas-chart-view');
                const tableView = document.getElementById('bandas-table-view');
                const btnChart = document.getElementById('btn-bandas-chart');
                const btnTable = document.getElementById('btn-bandas-table');
                if (view === 'chart') {
                    chartView.style.display = 'block';
                    tableView.style.display = 'none';
                    btnChart.style.backgroundColor = 'var(--bg-card-hover)';
                    btnChart.style.color = 'var(--text-main)';
                    btnChart.style.fontWeight = '600';
                    btnTable.style.backgroundColor = 'transparent';
                    btnTable.style.color = 'var(--text-muted)';
                    btnTable.style.fontWeight = '500';
                } else {
                    chartView.style.display = 'none';
                    tableView.style.display = 'block';
                    btnTable.style.backgroundColor = 'var(--bg-card-hover)';
                    btnTable.style.color = 'var(--text-main)';
                    btnTable.style.fontWeight = '600';
                    btnChart.style.backgroundColor = 'transparent';
                    btnChart.style.color = 'var(--text-muted)';
                    btnChart.style.fontWeight = '500';
                }
            };

            async function fetchLiveCryptoAndFiat() {
                try {
                    const [resCrypto, resP2P, resCriptoYaDolar, resRP, resRPHist] = await Promise.all([
                        fetch("https://criptoya.com/api/usdt/ars/0.1"),
                        fetch("https://criptoya.com/api/binancep2p/usdt/ars/0.1"),
                        fetch("https://criptoya.com/api/dolar"),
                        fetch("https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo").catch(() => null),
                        fetch("https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais").catch(() => null)
                    ]);
                    const cryptoData = await resCrypto.json();
                    const p2pData = await resP2P.json();
                    const criptoYaDolar = await resCriptoYaDolar.json();

                    if (resRP && resRP.ok) {
                        const rpData = await resRP.json();
                        const rpValEl = document.getElementById('rp-val');
                        if (rpData && rpData.valor && rpValEl) {
                            rpValEl.innerText = Math.round(rpData.valor) + ' pts';

                            // Calculate variation if history is available
                            if (resRPHist && resRPHist.ok) {
                                const rpHist = await resRPHist.json();
                                if (rpHist && rpHist.length > 1) {
                                    const last = rpData.valor;
                                    const prev = rpHist[rpHist.length - 2].valor;
                                    const diff = last - prev;
                                    const pct = (diff / prev) * 100;

                                    const cls = pct > 0 ? 'badge-red' : (pct < 0 ? 'badge-green' : '');
                                    const sign = pct > 0 ? '+' : '';
                                    const rpVarEl = document.getElementById('rp-var');
                                    if (rpVarEl) rpVarEl.innerHTML = `<span class="${cls}">${sign}${pct.toFixed(2)}%</span>`;
                                }
                            }

                            let formatDate = (d) => {
                                let parts = d.split('T')[0].split('-');
                                return `${parts[2]}/${parts[1]}/${parts[0]}`;
                            };
                            const rpDateEl = document.getElementById('rp-date');
                            if (rpDateEl) rpDateEl.innerText = `(Ref: ${formatDate(rpData.fecha)})`;
                        }
                    }

                    // --- FUNCIÓN NATIVA DE CRIPTOYA PARA VARIACIÓN ---
                    const formatVar = (v) => {
                        if (v === undefined || v === null) return "-";
                        return `<span class="badge-${v >= 0 ? 'green' : 'red'}">${v > 0 ? '+' : ''}${v.toFixed(2)}%</span>`;
                    };

                    let minCompra = Infinity; let maxVenta = 0; let exList = [];
                    let displayNameMap = { 'bybitp2p': 'BybitP2P', 'letsbit': 'LB Finanzas' };

                    ['fiwind', 'lemoncash', 'bybitp2p', 'letsbit'].forEach(ex => {
                        if (cryptoData[ex]) {
                            if (cryptoData[ex].totalAsk < minCompra) minCompra = cryptoData[ex].totalAsk;
                            if (cryptoData[ex].totalBid > maxVenta) maxVenta = cryptoData[ex].totalBid;
                            
                            let name = displayNameMap[ex] || (ex.charAt(0).toUpperCase() + ex.slice(1));
                            exList.push({ id: ex, name: name, compra_a: cryptoData[ex].totalAsk, venta_a: cryptoData[ex].totalBid });
                        }
                    });
                    if (p2pData) {
                        if (p2pData.totalAsk < minCompra) minCompra = p2pData.totalAsk;
                        if (p2pData.totalBid > maxVenta) maxVenta = p2pData.totalBid;
                        exList.push({ id: 'p2p', name: 'BinanceP2P', compra_a: p2pData.totalAsk, venta_a: p2pData.totalBid });
                    }

                    let exIcons = {
                        fiwind: `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" style="width: 20px; height: 20px; border-radius: 4px;"><rect width="18" height="18" style="fill: rgb(10, 10, 10);"></rect><g><path d="M7.92,9.58h-1.57c-.2,0-.36-.16-.36-.36s.16-.36.36-.36h1.57c.2,0,.36.16.36.36s-.16.36-.36.36ZM6.36,7.96c-.2,0-.36-.16-.36-.36s.16-.36.36-.36h2.05c.2,0,.36.16.36.36s-.16.36-.36.36h-2.05ZM8.7,11.48c-.19-.06-.3-.26-.24-.45l1.1-3.61c.06-.19.26-.3.45-.24.19.06.3.26.24.45l-1.1,3.61c-.06.19-.26.3-.45.24ZM11.89,7.63l-1.1,3.61c-.06.19-.26.3-.45.24-.19-.06-.3-.26-.24-.45l1.1-3.61c.06-.19.26-.3.45-.24.19.06.3.26.24.45Z" style="fill: rgb(239, 180, 29);"></path><path d="M9,14.01c-2.76,0-5-2.25-5-5.01s2.24-5.01,5-5.01,5,2.25,5,5.01-2.24,5.01-5,5.01ZM9,4.62c-2.41,0-4.37,1.96-4.37,4.37s.196,4.37,4.37,4.37,4.37-1.96,4.37-4.37-1.96-4.37-4.37-4.37Z" style="fill: rgb(239, 180, 29);"></path></g></svg>`,
                        lemoncash: `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" style="width: 20px; height: 20px; border-radius: 4px;"><rect width="18" height="18" style="fill: rgb(10, 10, 10);"></rect><path d="M9,4c-2.74,0-5,2.26-5,5s2.26,5,5,5,5-2.26,5-5h0c0-2.74-2.26-5-5-5h0ZM11.63,9.24s-.07.05-.11.07c-.04.02-.09.03-.14.04-.11.02-.22.02-.33,0-.24-.05-.48-.15-.69-.28-.22-.14-.43-.29-.62-.47-.1-.09-.19-.18-.28-.28-.09-.1-.18-.21-.26-.31-.02-.03-.05-.04-.08-.04-.02,0-.04,0-.06.02-.05.03-.07.1-.03.15.07.12.16.23.24.35.09.12.17.22.27.33.19.21.4.41.63.58.24.18.5.32.79.42.1.03.2.05.3.06.04,0,.07.04.07.08,0,.01,0,.02-.01.03-.17.28-.37.53-.6.76-.63.66-1.49,1.05-2.4,1.08-.34,0-.68-.06-.99-.21l-.07-.03s-.05-.01-.07,0l-.06.04c-.11.07-.23.11-.35.11-.1,0-.2-.03-.28-.1-.13-.18-.13-.43,0-.61l.04-.07s.01-.05,0-.07l-.04-.07c-.35-.66-.32-1.52.03-2.32.01-.03.04-.05.07-.05.01,0,.02,0,.03,0,.02,0,.03.02.04.04.06.17.15.33.24.48.16.24.34.45.55.65.1.1.21.2.31.28.1.09.22.18.33.26.02,0,.04.01.05.01.06,0,.11-.05.11-.11,0-.03,0-.05-.03-.07-.1-.09-.2-.18-.29-.27-.09-.1-.18-.2-.27-.29-.17-.2-.32-.42-.44-.65-.12-.22-.2-.46-.24-.7-.02-.11-.02-.22,0-.33,0-.04.02-.09.04-.13,0-.01.02-.03.02-.04.07-.09.15-.17.23-.25,1.04-1.04,2.46-1.37,3.46-.83l.07.04s.06.02.08,0l.07-.05c.19-.15.45-.15.64,0,.15.2.14.47-.02.66l-.05.07s-.02.05,0,.07l.03.07c.26.6.28,1.28.05,1.9h0Z" style="fill: rgb(0, 240, 104);"></path></svg>`,
                        p2p: `<svg viewBox="0 0 24 24" style="width: 20px; height: 20px; background:#fcd535; border-radius: 4px; padding:2px;"><path d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm4.6366-4.6366L24 12l-2.7394 2.7154-2.7383-2.7154 2.7383-2.7164zM7.3783 9.2836L12 4.6241l4.6217 4.6595 2.7175-2.7154-7.3392-7.353-7.353 7.352 2.7314 2.7164zm-4.6366 4.6366L0 12l2.7416-2.7164 2.7186 2.7164L2.7416 13.9202zM12 15.1772l-3.179-3.1772L12 8.8228l3.179 3.1772L12 15.1772z" fill="#1e2026"/></svg>`,
                        bybitp2p: `<img src="assets/bybit.png" style="width: 20px; height: 20px; border-radius: 4px; object-fit: contain; background: #000;">`,
                        letsbit: `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" style="width: 20px; height: 20px; border-radius: 4px;"><rect width="18" height="18" style="fill: #522398;"/><g><path d="M6.71,7.77l.39.49c.52.64,1.11.96,1.75.96,1.19,0,2.27-1.12,2.39-1.31,0,.02,0,0,.03-.05-1.45-.92-2.89-1.84-4.33-2.77-.24-.15-.48-.23-.72-.05-.24.19-.22.43-.14.7.22.68.43,1.35.63,2.03Z" style="fill: #fff;"/><path d="M12,9.11c0,.36-.2.7-.51.88-1.47.95-2.96,1.89-4.43,2.84-.07.05-.14.09-.22.14-.18.14-.44.14-.62,0-.19-.14-.26-.39-.18-.61.11-.4.23-.79.36-1.19.18-.57.38-1.12.5-1.7.07-.3.07-.61,0-.91,2.11,2.59,4.69-.36,4.59-.43.34.22.51.53.51.98Z" style="fill: #fff;"/></g></svg>`
                    };

                    let exchangeRows = '';
                    exList.forEach(e => {
                        let isMin = e.compra_a === minCompra; let isMax = e.venta_a === maxVenta;
                        let iconSvg = exIcons[e.id] || '';
                        exchangeRows += `<tr><td><div style="display:flex; align-items:center; gap:8px;">${iconSvg}<span style="font-weight: 500;">${e.name}</span></div></td><td style="text-align: center;"><span class="${isMin ? 'text-highlight-green' : ''}">$${e.compra_a.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td><td style="text-align: center;"><span class="${isMax ? 'text-highlight-green' : ''}">$${e.venta_a.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td></tr>`;
                    });
                    const usdtTable = document.getElementById('usdt-table-body');
                    if (usdtTable) usdtTable.innerHTML = exchangeRows;

                    // NUEVO CAZADOR EXACTO (Caza el precio y la variación nativa)
                    const getDolarData = (obj) => {
                        if (!obj) return { price: 0, variation: 0 };
                        let p = 0, v = 0;
                        if (obj.al30) {
                            if (obj.al30['24hs']) { p = obj.al30['24hs'].price; v = obj.al30['24hs'].variation; }
                            else if (obj.al30.ci) { p = obj.al30.ci.price; v = obj.al30.ci.variation; }
                        } else {
                            p = obj.ask || obj.price || 0;
                            v = obj.variation || 0;
                        }
                        return { price: p, var: v };
                    };

                    const fiatData = {
                        ccl: getDolarData(criptoYaDolar.ccl),
                        mep: getDolarData(criptoYaDolar.mep),
                        oficial: getDolarData(criptoYaDolar.oficial),
                        blue: getDolarData(criptoYaDolar.blue)
                    };

                    let usdt_var = 0;
                    if (criptoYaDolar.cripto && criptoYaDolar.cripto.usdt) usdt_var = criptoYaDolar.cripto.usdt.variation;

                    // Cálculo del más barato
                    let minFiatName = ""; let minFiatVal = Infinity;
                    for (let f of ['ccl', 'mep', 'oficial', 'blue']) {
                        if (fiatData[f].price > 0 && fiatData[f].price < minFiatVal) { minFiatVal = fiatData[f].price; minFiatName = f; }
                    }
                    if (maxVenta > 0 && maxVenta < minFiatVal) { minFiatVal = maxVenta; minFiatName = 'usdt'; }

                    const cNameEl = document.getElementById('cheapest-dollar-name');
                    const cValEl = document.getElementById('cheapest-dollar-val');
                    if (cNameEl) cNameEl.innerText = minFiatName.toUpperCase();
                    if (cValEl) cValEl.innerText = `$${minFiatVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

                    // --- Cache data for instant brecha recalculation ---
                    window._cachedFiatData = fiatData;
                    window._cachedMaxVenta = maxVenta;
                    window._cachedUsdtVar = usdt_var;
                    window._cachedExList = exList;

                    var activePill = document.querySelector('#base-currency-pills .base-pill.active');
                    var baseCurrency = activePill ? activePill.getAttribute('data-val') : 'usdt';
                    var basePrice = baseCurrency === 'usdt' ? maxVenta : fiatData[baseCurrency].price;

                    const calcBrecha = (val) => {
                        if (!basePrice || !val) return "-";
                        const pct = ((val / basePrice) - 1) * 100; return `<span class="badge-${pct >= 0 ? 'green' : 'red'}">${pct > 0 ? '+' : ''}${pct.toFixed(2)}%</span>`;
                    };

                    let fiatRows = '';
                    ['ccl', 'mep', 'oficial', 'blue'].forEach(f => {
                        fiatRows += `<tr><td style="color:var(--text-muted); text-transform: uppercase;">${f}</td><td style="font-weight:bold;">$${fiatData[f].price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td><td>${formatVar(fiatData[f].var)}</td><td>${f === baseCurrency ? '-' : calcBrecha(fiatData[f].price)}</td></tr>`;
                    });

                    fiatRows += `<tr><td style="color:var(--text-muted); display:flex; align-items:center;">USDT <div class="tooltip-container tooltip-right"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><div class="tooltip-text">Es el dólar cripto que cotiza las 24 horas TODOS los días. Es el precio para comprar USDT en Binance p2p más aproximado posible sin la opción "comerciantes verificados"</div></div></td><td style="font-weight:bold;">$${maxVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td><td>${formatVar(usdt_var)}</td><td>${baseCurrency === 'usdt' ? '-' : calcBrecha(maxVenta)}</td></tr>`;
                    const fiatTable = document.getElementById('fiat-table-body');
                    if (fiatTable) fiatTable.innerHTML = fiatRows;

                    if (window.spreadChartInstance && basePrice > 0 && fiatData.ccl.price > 0) {
                        let currentSpread = ((fiatData.ccl.price / basePrice) - 1) * 100;
                        let chart = window.spreadChartInstance;
                        let dToday = new Date(); let todayStr = String(dToday.getDate()).padStart(2, '0') + '-' + String(dToday.getMonth() + 1).padStart(2, '0') + '-' + dToday.getFullYear();
                        if (chart.data.labels[chart.data.labels.length - 1] === todayStr) { chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1] = currentSpread; }
                        else { chart.data.labels.push(todayStr); chart.data.datasets[0].data.push(currentSpread); }
                        chart.update('none');
                        updateSpreadSummary(chart, baseCurrency);
                    }

                    // --- CALCULAR BANDAS Y VELOCÍMETRO ---
                    let dTodayB = new Date(); let todayStrB = String(dTodayB.getDate()).padStart(2, '0') + '-' + String(dTodayB.getMonth() + 1).padStart(2, '0') + '-' + dTodayB.getFullYear();
                    let bandaHoy = datosBandas.find(b => b.date === todayStrB);
                    if (!bandaHoy) {
                        let pastBands = datosBandas.filter(b => {
                            let parts = b.date.split('-');
                            return new Date(parts[2], parts[1] - 1, parts[0]) <= dTodayB;
                        });
                        bandaHoy = pastBands.length > 0 ? pastBands[pastBands.length - 1] : datosBandas[0];
                    }
                    if (!bandaHoy) {
                        console.warn("No hay banda para hoy.");
                        return;
                    }
                    let inf = bandaHoy.inf || 0; let sup = bandaHoy.sup || 0; let rango = Math.max(1, sup - inf);
                    let c25 = inf + (rango * 0.25); let c75 = inf + (rango * 0.75); let c90 = inf + (rango * 0.90);

                    const fmt = (num) => `$${num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    document.getElementById('velocimetro-inf').innerText = fmt(inf);
                    document.getElementById('velocimetro-mid').innerText = fmt(inf + (rango / 2));
                    document.getElementById('velocimetro-sup').innerText = fmt(sup);

                    document.getElementById('r-fav-min').innerText = fmt(inf); document.getElementById('r-fav-max').innerText = fmt(c25);
                    document.getElementById('r-int-min').innerText = fmt(c25); document.getElementById('r-int-max').innerText = fmt(c75);
                    document.getElementById('r-pre-min').innerText = fmt(c75); document.getElementById('r-pre-max').innerText = fmt(c90);
                    document.getElementById('r-cri-min').innerText = fmt(c90); document.getElementById('r-cri-max').innerText = fmt(sup);

                    let may = getDolarData(criptoYaDolar.mayorista).price;
                    window._cachedMayoristaVal = may; // Cache for theme transitions

                    if (may > 0) {
                        let posPct = Math.max(0, Math.min(100, ((may - inf) / rango) * 100));
                        document.getElementById('gauge-needle').style.transform = `translateX(-50%) rotate(${(posPct / 100 * 180) - 90}deg)`;

                        let box = document.getElementById('gauge-mayorista-box');
                        box.innerText = fmt(may);
                        if (posPct <= 25) { box.style.backgroundColor = '#10b981'; box.style.color = '#fff'; }
                        else if (posPct <= 75) { box.style.backgroundColor = '#facc15'; box.style.color = '#111b21'; }
                        else if (posPct <= 90) { box.style.backgroundColor = '#f97316'; box.style.color = '#fff'; }
                        else { box.style.backgroundColor = '#ef4444'; box.style.color = '#fff'; }

                        let dS = sup - may; let pS = (dS / may) * 100;
                        let dI = may - inf; let pI = (dI / may) * 100;
                        document.getElementById('diff-sup').innerHTML = `El dólar debería subir <span class="badge-green" style="margin-left: 4px;">${fmt(dS)} (+${pS.toFixed(2)}%)</span> para llegar a la banda superior`;
                        document.getElementById('diff-inf').innerHTML = `El dólar debería bajar <span class="badge-red" style="margin-left: 4px;">${fmt(Math.abs(dI))} (-${Math.abs(pI).toFixed(2)}%)</span> para llegar a la banda inferior`;

                        if (window.bandasChartInstance) {
                            // Already handled by initial load and theme change, BUT for every 60s tick, we STILL need to push into the live chart if it exists:
                            let bChart = window.bandasChartInstance; let mData = bChart.data.datasets[2].data; let blabels = bChart.data.labels;
                            if (blabels.length > 0 && blabels[blabels.length - 1] === todayStrB) { mData[mData.length - 1] = may; }
                            else if (blabels.length > 0) { blabels.push(todayStrB); bChart.data.datasets[0].data.push(sup); bChart.data.datasets[1].data.push(inf); mData.push(may); }
                            bChart.update('none');
                        }
                    }

                    const now = new Date();
                    const lastUpdated = document.getElementById('last-updated-time');
                    if (lastUpdated) lastUpdated.innerText = `Act: ${now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`;
                    nextUpdateSecs = 60;
                    if (!progressInterval) {
                        progressInterval = setInterval(() => {
                            nextUpdateSecs = Math.max(0, nextUpdateSecs - 1);
                            document.getElementById('update-progress-bar').style.width = ((nextUpdateSecs / 60) * 100) + '%';
                        }, 1000);
                    }
                } catch (error) { 
                    console.error("Error", error); 
                    const lastUpdated = document.getElementById('last-updated-time');
                    if (lastUpdated) lastUpdated.innerText = "Error conexión"; 
                }
            }

            function loadData() {
                Promise.all([
                    fetch('data/snapshot.json').then(res => res.ok ? res.json() : null).catch(() => null),
                    fetch('data/meta.json').then(res => res.ok ? res.json() : null).catch(() => null),
                    fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion').then(res => res.ok ? res.json() : null).catch(() => null)
                ]).then(results => {
                    snapshot = results[0]; 
                    meta = results[1];
                    window._liveInflation = results[2]; // Save live inflation for renderMacro

                    renderGroups();
                    if (snapshot && snapshot.argentina_macro) {
                        renderMacro(snapshot.argentina_macro);
                        updateBestRates(snapshot.argentina_macro);
                    }
                    if (snapshot && snapshot.historical_fiat) { renderSpreadChart(snapshot.historical_fiat); renderBandasChart(snapshot.historical_fiat); }
                    fetchLiveCryptoAndFiat(); setInterval(fetchLiveCryptoAndFiat, 60000);
                }).catch(err => {
                    console.error("Critical error in loadData:", err);
                    fetchLiveCryptoAndFiat(); // Try to at least load live data
                });
                // Re-bind Pill Buttons events
                var basePills = document.querySelectorAll('#base-currency-pills .base-pill');
                if (basePills.length > 0) {
                    basePills.forEach(pill => {
                        pill.addEventListener('click', function () {
                            if (this.classList.contains('active')) return;

                            // Switch active class
                            basePills.forEach(p => p.classList.remove('active'));
                            this.classList.add('active');

                            // Recalculate everything synchronously
                            if (window._cachedFiatData && window._cachedMaxVenta) {
                                var baseCurrency = this.getAttribute('data-val');
                                var basePrice = baseCurrency === 'usdt' ? window._cachedMaxVenta : window._cachedFiatData[baseCurrency].price;
                                var fiatData = window._cachedFiatData;
                                var maxVenta = window._cachedMaxVenta;
                                var usdt_var = window._cachedUsdtVar || 0;

                                const formatVar = (v) => {
                                    if (v === undefined || v === null) return "-";
                                    return `<span class="badge-${v >= 0 ? 'green' : 'red'}">${v > 0 ? '+' : ''}${v.toFixed(2)}%</span>`;
                                };
                                const calcBrecha = (val) => {
                                    if (!basePrice || !val) return "-";
                                    const pct = ((val / basePrice) - 1) * 100;
                                    return `<span class="badge-${pct >= 0 ? 'green' : 'red'}">${pct > 0 ? '+' : ''}${pct.toFixed(2)}%</span>`;
                                };

                                let fiatRows = '';
                                ['ccl', 'mep', 'oficial', 'blue'].forEach(f => {
                                    fiatRows += `<tr><td style="color:var(--text-muted); text-transform: uppercase;">${f}</td><td style="font-weight:bold;">$${fiatData[f].price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td><td>${formatVar(fiatData[f].var)}</td><td>${f === baseCurrency ? '-' : calcBrecha(fiatData[f].price)}</td></tr>`;
                                });
                                fiatRows += `<tr><td style="color:var(--text-muted); display:flex; align-items:center;">USDT <div class="tooltip-container tooltip-right"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><div class="tooltip-text">Es el dólar cripto que cotiza las 24 horas TODOS los días. Es el precio para comprar USDT en Binance p2p más aproximado posible sin la opción "comerciantes verificados"</div></div></td><td style="font-weight:bold;">$${maxVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td><td>${formatVar(usdt_var)}</td><td>${baseCurrency === 'usdt' ? '-' : calcBrecha(maxVenta)}</td></tr>`;
                                document.getElementById('fiat-table-body').innerHTML = fiatRows;
                            }
                            if (snapshot && snapshot.historical_fiat) renderSpreadChart(snapshot.historical_fiat);
                        });
                    });
                }
            }
            loadData();
        })();

        function updateBestRates(macro) {
            // This is a placeholder since loadTasasData now handles the live sync 
            // but we can use it to populate from snapshot if API fails or for initial state
            if (!macro || !macro.tasas) return;
            // Additional logic for snapshot-based best rates could go here if needed.
        }

window.chartConfigs = [
    { id: 'method', title: 'Annual Offenses by Detection Method' },
    { id: 'jurisdiction', title: 'Annual Offenses by Jurisdiction' },
    { id: 'location', title: 'Annual Offenses by Location (%)' },
    { id: 'age', title: 'Annual Offenses by Age Group' },
    { id: 'normalized', title: 'Jurisdiction (Normalized by License Holders)' }
];

window.buildDashboardGrid = function() {
    const grid = document.getElementById("dashboard-grid");
    if(!grid) return;
    
    grid.style.display = 'block'; 
    grid.innerHTML = ''; 

    const topRowHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 20px; width: 100%; margin-bottom: 20px;">
            <div class="chart-card" style="flex: 0 0 170px; min-width: 155px; display: flex; flex-direction: column; margin: 0; padding: 8px; box-sizing: border-box;">
                <style>
                    #offenseLevelKpiContainer { display: flex !important; flex-direction: column !important; gap: 12px !important; justify-content: center !important; align-items: center !important; width: 100% !important; box-sizing: border-box !important; }
                    #offenseLevelKpiContainer > div { width: 100% !important; padding: 8px 4px !important; box-sizing: border-box !important; text-align: center !important; }
                    #offenseLevelKpiContainer h1, #offenseLevelKpiContainer h2, #offenseLevelKpiContainer .value, #offenseLevelKpiContainer p, #offenseLevelKpiContainer strong, #offenseLevelKpiContainer div[style*="font-size"], #offenseLevelKpiContainer span[style*="font-size"] { font-size: 16px !important; font-weight: 700 !important; line-height: 1.2 !important; text-align: center !important; margin: 0 auto 3px auto !important; white-space: normal !important; display: block !important; }
                    #offenseLevelKpiContainer h3, #offenseLevelKpiContainer h4, #offenseLevelKpiContainer h5, #offenseLevelKpiContainer h6, #offenseLevelKpiContainer .label, #offenseLevelKpiContainer .kpi-label, #offenseLevelKpiContainer span:not([style*="font-size"]) { font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.3px !important; line-height: 1.2 !important; text-align: center !important; margin: 0 auto !important; font-weight: 600 !important; display: block !important; opacity: 0.85; white-space: normal !important;}
                </style>
                <div class="chart-header" style="padding: 4px 0 8px 0; border-bottom: 1px solid #eee; justify-content: center;">
                    <h3 style="font-size: 13px; margin: 0; text-align: center; font-weight: 600;">Summary</h3>
                </div>
                <div class="canvas-container" id="offenseLevelKpiContainer" style="flex-grow: 1; padding: 8px 0 0 0; display: flex; flex-direction: column; justify-content: center; overflow: hidden; box-sizing: border-box; position: relative;"></div>
            </div>
            <div class="chart-card" style="flex: 1 1 0%; min-width: 280px; display: flex; flex-direction: column; margin: 0;">
                <div class="chart-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Annual Offenses by Location (%)</h3>
                    <div style="display: flex; gap: 4px;">
                        <button class="enlarge-btn" title="View Data" onclick="window.openDataTableModal('location')">&#x25A6;</button>
                        <button class="enlarge-btn" title="Enlarge Chart" onclick="window.openModal('location')">&#x2922;</button>
                    </div>
                </div>
                <div class="canvas-container" style="position: relative; flex-grow: 1; min-height: 250px;">
                    <canvas id="chart-location"></canvas>
                </div>
            </div>
            <div class="chart-card" style="flex: 1 1 0%; min-width: 280px; display: flex; flex-direction: column; margin: 0;">
                <div class="chart-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Annual Offenses by Detection Method</h3>
                    <div style="display: flex; gap: 4px;">
                        <button class="enlarge-btn" title="View Data" onclick="window.openDataTableModal('method')">&#x25A6;</button>
                        <button class="enlarge-btn" title="Enlarge Chart" onclick="window.openModal('method')">&#x2922;</button>
                    </div>
                </div>
                <div class="canvas-container" style="position: relative; flex-grow: 1; min-height: 250px;">
                    <canvas id="chart-method"></canvas>
                </div>
            </div>
        </div>
    `;

    let bottomRowHtml = `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%;">`;
    const bottomCharts = ['jurisdiction', 'age', 'normalized'];
    
    bottomCharts.forEach(id => {
        const conf = window.chartConfigs.find(c => c.id === id);
        bottomRowHtml += `
            <div class="chart-card" style="margin: 0; display: flex; flex-direction: column; min-width: 0;">
                <div class="chart-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">${conf.title}</h3>
                    <div style="display: flex; gap: 4px;">
                        <button class="enlarge-btn" title="View Data" onclick="window.openDataTableModal('${conf.id}')">&#x25A6;</button>
                        <button class="enlarge-btn" title="Enlarge Chart" onclick="window.openModal('${conf.id}')">&#x2922;</button>
                    </div>
                </div>
                <div class="canvas-container" style="position: relative; flex-grow: 1; min-height: 300px;">
                    <canvas id="chart-${conf.id}"></canvas>
                </div>
            </div>
        `;
    });
    bottomRowHtml += `</div>`;
    grid.innerHTML = topRowHtml + bottomRowHtml;
};

window.injectDataTableModal = function() {
    if (document.getElementById('data-table-modal')) return;
    const modalHtml = `
        <div id="data-table-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9999; justify-content: center; align-items: center; backdrop-filter: blur(2px);">
            <div style="background: white; width: 90%; max-width: 1000px; height: 80%; max-height: 800px; display: flex; flex-direction: column; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                    <h2 id="data-table-title" style="margin: 0; font-size: 18px; color: #333; font-weight: 600;">Data Table</h2>
                    <button onclick="document.getElementById('data-table-modal').style.display='none'" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; line-height: 1; padding: 0;">&times;</button>
                </div>
                <div id="data-table-content" style="padding: 0; overflow: auto; flex-grow: 1; background: #fff;"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.openDataTableModal = function(chartId) {
    const config = window.chartConfigs.find(c => c.id === chartId);
    let data = [];
    const filters = window.getActiveFilters();
    
    if (chartId === 'method') data = window.getFilteredData(window.rawDatasets.detection, filters);
    else if (chartId === 'jurisdiction' || chartId === 'normalized') data = window.getFilteredData(window.rawDatasets.jurisdiction, filters);
    else if (chartId === 'location') data = window.getFilteredData(window.rawDatasets.location, filters);
    else if (chartId === 'age') data = window.getFilteredData(window.rawDatasets.age, filters);

    if (!data || data.length === 0) {
        document.getElementById('data-table-title').innerText = config ? config.title : 'Data Table';
        document.getElementById('data-table-content').innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #64748b; font-weight: bold; font-size: 15px;">
                No data available for the selected filters.
            </div>`;
        document.getElementById('data-table-modal').style.display = 'flex';
        return;
    }

    const headers = Object.keys(data[0]);
    let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; white-space: nowrap;">
            <thead style="position: sticky; top: 0; z-index: 10;">
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                    ${headers.map(h => `<th style="padding: 12px 15px; font-weight: 600; color: #334155; border-right: 1px solid #e2e8f0;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.map((row, index) => `
                    <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                        ${headers.map(h => `<td style="padding: 10px 15px; color: #475569; border-right: 1px solid #e2e8f0;">${row[h] !== undefined ? row[h] : ''}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('data-table-title').innerText = config ? config.title + ' (Raw Data)' : 'Data Table';
    document.getElementById('data-table-content').innerHTML = tableHtml;
    document.getElementById('data-table-modal').style.display = 'flex';
};

window.openModal = function(chartId) {
    document.getElementById('chart-modal').style.display = 'flex';
    const config = window.chartConfigs.find(c => c.id === chartId);
    document.getElementById('modal-title').innerText = config ? config.title : 'Chart View';
    document.getElementById('modal-chart-container').innerHTML = `<canvas id="modal-canvas"></canvas>`;
    
    if (!window.rawDatasets.jurisdiction) return;

    const filters = window.getActiveFilters();
    const fJurisdiction = window.getFilteredData(window.rawDatasets.jurisdiction, filters);
    const fDetection = window.getFilteredData(window.rawDatasets.detection, filters);
    const fLocation = window.getFilteredData(window.rawDatasets.location, filters);
    const fAge = window.getFilteredData(window.rawDatasets.age, filters);
    const fLicense = window.getFilteredData(window.rawDatasets.license, filters);

    if (chartId === 'method') {
        if(window.checkDataAndToggle('modal-canvas', fDetection) && typeof renderDetectionChart === 'function') renderDetectionChart('modal-canvas', fDetection);
    } else if (chartId === 'jurisdiction') {
        if(window.checkDataAndToggle('modal-canvas', fJurisdiction) && typeof renderJurisdictionChart === 'function') renderJurisdictionChart('modal-canvas', fJurisdiction);
    } else if (chartId === 'location') {
        if(window.checkDataAndToggle('modal-canvas', fLocation) && typeof renderLocationChart === 'function') renderLocationChart('modal-canvas', fLocation);
    } else if (chartId === 'age') {
        if(window.checkDataAndToggle('modal-canvas', fAge) && typeof renderAgeGroupChart === 'function') renderAgeGroupChart('modal-canvas', fAge);
    } else if (chartId === 'normalized') {
        if(window.checkDataAndToggle('modal-canvas', fJurisdiction) && typeof renderNormalizedChart === 'function') renderNormalizedChart('modal-canvas', fJurisdiction, fLicense);
    }

    setTimeout(window.enforceInteractiveHighlight, 150);
};

window.fillSelect = function(elementId, items) {
    let select = document.getElementById(elementId);
    if (!select) return;

    if (select.tagName === 'SELECT') {
        const div = document.createElement('div');
        div.id = elementId;
        div.className = select.className;
        select.parentNode.replaceChild(div, select);
        select = div;
    }

    select.className = 'custom-checkbox-dropdown';
    select.style.position = 'relative';
    select.style.width = '100%';
    select.style.minWidth = '160px';
    select.style.userSelect = 'none';

    select.innerHTML = `
        <div class="dropdown-header" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #334155;">
            <span class="dropdown-text" style="font-weight: 500;">All</span>
            <span style="font-size: 9px; color: #64748b;">▼</span>
        </div>
        <div class="dropdown-list" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-top: none; max-height: 220px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 4px 0; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px;">
            <label style="display: flex; align-items: center; padding: 6px 12px; margin: 0; cursor: pointer; font-size: 13px; color: #1e293b; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                <input type="checkbox" class="filter-checkbox-all" value="all" checked style="margin-right: 8px; cursor: pointer;">
                <strong>All</strong>
            </label>
            ${items.map(item => {
                // if (!item || item === 'Unknown') return '';
                return `
                    <label style="display: flex; align-items: center; padding: 6px 12px; margin: 0; cursor: pointer; font-size: 13px; color: #334155;">
                        <input type="checkbox" class="filter-checkbox-item" value="${item}" style="margin-right: 8px; cursor: pointer;">
                        <span>${item}</span>
                    </label>
                `;
            }).join('')}
        </div>
    `;

    const header = select.querySelector('.dropdown-header');
    const list = select.querySelector('.dropdown-list');
    const allCheckbox = select.querySelector('.filter-checkbox-all');
    const itemCheckboxes = select.querySelectorAll('.filter-checkbox-item');
    const textSpan = select.querySelector('.dropdown-text');

    header.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown-list').forEach(l => {
            if (l !== list) l.style.display = 'none';
        });
        list.style.display = list.style.display === 'none' ? 'block' : 'none';
    });

    list.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    allCheckbox.addEventListener('change', () => {
        if (allCheckbox.checked) {
            itemCheckboxes.forEach(cb => cb.checked = false);
        } else {
            const anyChecked = Array.from(itemCheckboxes).some(i => i.checked);
            if (!anyChecked) allCheckbox.checked = true;
        }
        updateHeaderText();
        if (typeof window.renderDashboardCharts === 'function') window.renderDashboardCharts();
    });

    itemCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) {
                allCheckbox.checked = false;
            } else {
                const anyChecked = Array.from(itemCheckboxes).some(i => i.checked);
                if (!anyChecked) allCheckbox.checked = true;
            }
            updateHeaderText();
            if (typeof window.renderDashboardCharts === 'function') window.renderDashboardCharts();
        });
    });

    function updateHeaderText() {
        if (allCheckbox.checked) {
            textSpan.innerText = 'All';
        } else {
            const checkedItems = Array.from(itemCheckboxes).filter(i => i.checked).map(i => i.value);
            if (checkedItems.length === 0) {
                textSpan.innerText = 'All';
            } else if (checkedItems.length <= 2) {
                textSpan.innerText = checkedItems.join(', ');
            } else {
                textSpan.innerText = `${checkedItems.length} Selected`;
            }
        }
    }
};
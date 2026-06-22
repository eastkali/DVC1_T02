window.chartConfigs = [ // Central configuration array ensuring IDs and titles match consistently across modules
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
    grid.style.gridTemplateColumns = 'none';
    grid.innerHTML = ''; 

    // Generate Top Row HTML (KPIs, Location, Detection Method)
    const topRowHtml = `
        <div class="top-row-grid">
            <div class="chart-card" style="margin: 0; padding: 0; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <div class="chart-header" style="padding: 15px; margin: 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: center; align-items: center; background: #fff;">
                    <h3 style="margin: 0; font-size: 13px; color: #1e293b; text-align: center;">Summary for data from available filters</h3>
                </div>
                <div class="canvas-container" id="offenseLevelKpiContainer" style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; background: #fff;"></div>
            </div>
            
            <div class="chart-card" style="margin: 0; display: flex; flex-direction: column; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <div class="chart-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 14px; color: #1e293b;">Annual Offenses by Location (%)</h3>
                    <div style="display: flex; gap: 4px;">
                        <button class="enlarge-btn" title="View Data" onclick="window.openDataTableModal('location')" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size: 16px;">&#x25A6;</button>
                        <button class="enlarge-btn" title="Enlarge Chart" onclick="window.openModal('location')" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size: 16px;">&#x2922;</button>
                    </div>
                </div>
                <div class="canvas-container" style="position: relative; flex-grow: 1; min-height: 300px;">
                    <canvas id="chart-location"></canvas>
                </div>
            </div>

            <div class="chart-card" style="margin: 0; display: flex; flex-direction: column; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <div class="chart-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 14px; color: #1e293b;">Annual Offenses by Detection Method</h3>
                    <div style="display: flex; gap: 4px;">
                        <button class="enlarge-btn" title="View Data" onclick="window.openDataTableModal('method')" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size: 16px;">&#x25A6;</button>
                        <button class="enlarge-btn" title="Enlarge Chart" onclick="window.openModal('method')" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size: 16px;">&#x2922;</button>
                    </div>
                </div>
                <div class="canvas-container" style="position: relative; flex-grow: 1; min-height: 300px;">
                    <canvas id="chart-method"></canvas>
                </div>
            </div>
        </div>
    `;

    // Generate Bottom Row HTML dynamically from config array (Jurisdiction, Age, Normalized)
    let bottomRowHtml = `<div class="bottom-row-grid">`;
    const bottomCharts = ['jurisdiction', 'age', 'normalized'];
    
    bottomCharts.forEach(id => {
        const conf = window.chartConfigs.find(c => c.id === id);
        bottomRowHtml += `
            <div class="chart-card" style="margin: 0; display: flex; flex-direction: column; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <div class="chart-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 14px; color: #1e293b;">${conf.title}</h3>
                    <div style="display: flex; gap: 4px;">
                        <button class="enlarge-btn" title="View Data" onclick="window.openDataTableModal('${conf.id}')" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size: 16px;">&#x25A6;</button>
                        <button class="enlarge-btn" title="Enlarge Chart" onclick="window.openModal('${conf.id}')" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size: 16px;">&#x2922;</button>
                    </div>
                </div>
                <div class="canvas-container" style="position: relative; flex-grow: 1; min-height: 300px;">
                    <canvas id="chart-${conf.id}"></canvas>
                </div>
            </div>
        `;
    });
    bottomRowHtml += `</div>`;
    
    // Inject constructed HTML back into the DOM
    grid.innerHTML = topRowHtml + bottomRowHtml;
};

window.ensureModalsExist = function() {
    // Generate Data Table Modal if missing
    if (!document.getElementById('data-table-modal')) {
        const dataModalHtml = `
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
        document.body.insertAdjacentHTML('beforeend', dataModalHtml);
    }
    
    // Generate Enlarged Chart Modal if missing
    if (!document.getElementById('chart-modal')) {
        const chartModalHtml = `
            <div id="chart-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(30, 41, 59, 0.7); z-index: 9999; justify-content: center; align-items: center; backdrop-filter: blur(2px);">
                <div style="background: white; width: 85%; max-width: 1200px; height: 85%; max-height: 800px; display: flex; flex-direction: column; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; padding: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                        <h2 id="modal-title" style="margin: 0; font-size: 22px; color: #1e293b; font-weight: 700;">Chart View</h2>
                        <button onclick="document.getElementById('chart-modal').style.display='none'" style="background: none; border: none; font-size: 32px; cursor: pointer; color: #94a3b8; line-height: 1; padding: 0; margin-top: -5px;">&times;</button>
                    </div>
                    <div id="modal-chart-container" style="flex-grow: 1; position: relative; width: 100%; height: 100%;"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chartModalHtml);
    }
};

// Ensure modals are built as soon as the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ensureModalsExist();
});

window.openDataTableModal = function(chartId) {
    window.ensureModalsExist();
    const config = window.chartConfigs.find(c => c.id === chartId);
    let data = [];
    const filters = window.getActiveFilters();
    
    // Select correct dataset sub-module based on the requesting chart
    if (chartId === 'method') data = window.getFilteredData(window.rawDatasets.main, filters);
    else if (chartId === 'jurisdiction' || chartId === 'normalized') data = window.getFilteredData(window.rawDatasets.main, filters);
    else if (chartId === 'location') data = window.getFilteredData(window.rawDatasets.loc_age, filters);
    else if (chartId === 'age') data = window.getFilteredData(window.rawDatasets.loc_age, filters);

    // Provide friendly fallback if filters yield no results
    if (!data || data.length === 0) {
        document.getElementById('data-table-title').innerText = config ? config.title : 'Data Table';
        document.getElementById('data-table-content').innerHTML = `<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #64748b; font-weight: bold; font-size: 15px;">No data available for the selected filters.</div>`;
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
    window.ensureModalsExist();
    const modal = document.getElementById('chart-modal');
    modal.style.display = 'flex';
    
    const config = window.chartConfigs.find(c => c.id === chartId);
    document.getElementById('modal-title').innerText = config ? config.title : 'Chart View';
    
    // Inject clean canvas directly into modal
    const container = document.getElementById('modal-chart-container');
    container.innerHTML = `<canvas id="modal-canvas" style="display:none;"></canvas>`;
    
    if (!window.rawDatasets || !window.rawDatasets.main) return;

    const filters = window.getActiveFilters();
    const yearsWithLocAge = [...new Set(window.rawDatasets.loc_age.map(d => d.YEAR))].sort((a,b)=>b-a);
    const masterYearsSetWithLocAge = new Set(yearsWithLocAge);

    const fJurisdiction = window.getFilteredData(window.rawDatasets.main, filters);
    const fDetection = window.getFilteredData(window.rawDatasets.main, filters);
    const fLicense = window.getFilteredData(window.rawDatasets.license, filters);
    
    let fLocation, fAge;
    // Cross-reference data existence prior to rendering
    if (filters.year.includes('all') || filters.year.every(y => masterYearsSetWithLocAge.has(y))){
        fLocation = window.getFilteredData(window.rawDatasets.loc_age, filters);
        fAge = window.getFilteredData(window.rawDatasets.loc_age, filters);
    } else {
        fLocation = window.getFilteredData(window.rawDatasets.loc_age, {year: ["0"]});
        fAge = window.getFilteredData(window.rawDatasets.loc_age, {year: ["0"]});
    }

    // Delay execution slightly to ensure CSS Grid finishes resizing container before D3 math applies
    setTimeout(() => {
        if (chartId === 'method' && typeof renderDetectionChart === 'function') renderDetectionChart('modal-canvas', fDetection);
        if (chartId === 'jurisdiction' && typeof renderJurisdictionChart === 'function') renderJurisdictionChart('modal-canvas', fJurisdiction);
        if (chartId === 'location' && typeof renderLocationChart === 'function') renderLocationChart('modal-canvas', fLocation);
        if (chartId === 'age' && typeof renderAgeGroupChart === 'function') renderAgeGroupChart('modal-canvas', fAge);
        if (chartId === 'normalized' && typeof renderNormalizedChart === 'function') renderNormalizedChart('modal-canvas', fLicense);
    }, 50);
};

window.fillSelect = function(elementId, items) {
    let select = document.getElementById(elementId);
    if (!select) return;

    // Convert standard <select> node into <div> block to allow rich HTML injection
    if (select.tagName === 'SELECT') {
        const div = document.createElement('div'); div.id = elementId; div.className = select.className;
        select.parentNode.replaceChild(div, select); select = div;
    }

    select.className = 'custom-checkbox-dropdown';
    select.style.position = 'relative'; select.style.width = '100%'; select.style.minWidth = '160px'; select.style.userSelect = 'none';

    // Inject complex dropdown UI containing header and togglable list
    select.innerHTML = `
        <div class="dropdown-header" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #334155;">
            <span class="dropdown-text" style="font-weight: 500;">All</span><span style="font-size: 9px; color: #64748b;">▼</span>
        </div>
        <div class="dropdown-list" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-top: none; max-height: 220px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 4px 0; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px;">
            <label style="display: flex; align-items: center; padding: 6px 12px; margin: 0; cursor: pointer; font-size: 13px; color: #1e293b; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                <input type="checkbox" class="filter-checkbox-all" value="all" checked style="margin-right: 8px; cursor: pointer;"><strong>All</strong>
            </label>
            ${items.map(item => `
                <label style="display: flex; align-items: center; padding: 6px 12px; margin: 0; cursor: pointer; font-size: 13px; color: #334155;">
                    <input type="checkbox" class="filter-checkbox-item" value="${item}" style="margin-right: 8px; cursor: pointer;"><span>${item}</span>
                </label>
            `).join('')}
        </div>
    `;

    // Map DOM elements for interaction logic
    const header = select.querySelector('.dropdown-header'); const list = select.querySelector('.dropdown-list');
    const allCheckbox = select.querySelector('.filter-checkbox-all'); const itemCheckboxes = select.querySelectorAll('.filter-checkbox-item'); const textSpan = select.querySelector('.dropdown-text');

    // UI Event Listeners
    header.addEventListener('click', (e) => { e.stopPropagation(); document.querySelectorAll('.dropdown-list').forEach(l => { if (l !== list) l.style.display = 'none'; }); list.style.display = list.style.display === 'none' ? 'block' : 'none'; });
    list.addEventListener('click', (e) => { e.stopPropagation(); });
    document.addEventListener('click', () => { list.style.display = 'none'; });

    // State update handler triggered when any checkbox changes state
    const handleChange = () => {
        updateHeaderText();
        if (typeof window.renderDashboardCharts === 'function') window.renderDashboardCharts();
    };

    // Auto-toggles sub-items if 'All' is manually manipulated
    allCheckbox.addEventListener('change', () => {
        if (allCheckbox.checked) itemCheckboxes.forEach(cb => cb.checked = false);
        else { const anyChecked = Array.from(itemCheckboxes).some(i => i.checked); if (!anyChecked) allCheckbox.checked = true; }
        handleChange();
    });

    // Auto-toggles 'All' if sub-items are manually manipulated
    itemCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) allCheckbox.checked = false;
            else { const anyChecked = Array.from(itemCheckboxes).some(i => i.checked); if (!anyChecked) allCheckbox.checked = true; }
            handleChange();
        });
    });

    function updateHeaderText() {
        if (allCheckbox.checked) { textSpan.innerText = 'All'; } 
        else {
            const checkedItems = Array.from(itemCheckboxes).filter(i => i.checked).map(i => i.value);
            if (checkedItems.length === 0) { textSpan.innerText = 'All'; allCheckbox.checked = true; } 
            else if (checkedItems.length <= 2) { textSpan.innerText = checkedItems.join(', '); } 
            else { textSpan.innerText = `${checkedItems.length} Selected`; }
        }
    }
};
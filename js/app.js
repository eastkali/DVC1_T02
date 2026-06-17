window.currentTopic = ''; 
window.rawDatasets = {};

window.okabeItoColors = ['#009E73', '#E69F00', '#D55E00', '#0072B2', '#CC79A7', '#F0E442', '#000000'];
window.pointShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot'];

if (typeof Chart !== 'undefined') {
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 12; 
}

window.checkDataAndToggle = function(chartId, data) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return false;
    console.log(chartId)
    const container = canvas.parentElement;
    let noDataMsg = container.querySelector('.no-data-overlay');
    
    if (!noDataMsg) {
        noDataMsg = document.createElement('div');
        noDataMsg.className = 'no-data-overlay';
        noDataMsg.style.position = 'absolute';
        noDataMsg.style.top = '0';
        noDataMsg.style.left = '0';
        noDataMsg.style.width = '100%';
        noDataMsg.style.height = '100%';
        noDataMsg.style.display = 'flex';
        noDataMsg.style.justifyContent = 'center';
        noDataMsg.style.alignItems = 'center';
        noDataMsg.style.background = '#ffffff'; 
        noDataMsg.style.color = '#64748b';
        noDataMsg.style.fontWeight = 'bold';
        noDataMsg.style.fontSize = '14px';
        noDataMsg.style.zIndex = '10';
        noDataMsg.style.textAlign = 'center';
        noDataMsg.style.padding = '20px';
        noDataMsg.style.boxSizing = 'border-box';
        if (chartId == "chart-normalized") {
            noDataMsg.innerText = 'No data available for the selected filters. Jurisdiction data normalized by license holders is can only be filtered by years and jurisdiction.';
        }
        else 
            {
            noDataMsg.innerText = 'No data available for the selected filters. Location and age group data is only available for years after 2023.';
        }

        
        container.appendChild(noDataMsg);
    }

    if (!data || data.length === 0) {
        noDataMsg.style.display = 'flex';
        canvas.style.display = 'none'; 
        if (typeof Chart !== 'undefined') {
            const existingChart = Chart.getChart(chartId);
            if (existingChart) existingChart.destroy();
        }
        return false;
    } else {
        noDataMsg.style.display = 'none';
        canvas.style.display = 'block';
        return true;
    }
};

document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-list').forEach(list => {
        list.style.display = 'none';
    });
});

window.toggleDatasetHighlight = function(chart, datasetIndex) {
    if (!chart || !chart.data || !chart.data.datasets || chart.data.datasets.length <= 1) return;

    if (chart._highlightedIndex === datasetIndex) datasetIndex = null;
    chart._highlightedIndex = datasetIndex;

    chart.data.datasets.forEach((dataset, idx) => {
        if (dataset._origBorderColor === undefined) dataset._origBorderColor = dataset.borderColor;
        if (dataset._origBgColor === undefined) dataset._origBgColor = dataset.backgroundColor;
        if (dataset._origPointBgColor === undefined) dataset._origPointBgColor = dataset.pointBackgroundColor || dataset.backgroundColor;
        if (dataset._origPointBorderColor === undefined) dataset._origPointBorderColor = dataset.pointBorderColor || dataset.borderColor;

        if (datasetIndex === null || idx === datasetIndex) {
            dataset.borderColor = dataset._origBorderColor;
            dataset.backgroundColor = dataset._origBgColor;
            dataset.pointBackgroundColor = dataset._origPointBgColor;
            dataset.pointBorderColor = dataset._origPointBorderColor;
        } else {
            dataset.borderColor = 'rgba(200, 200, 200, 1)'; 
            dataset.backgroundColor = 'rgba(200, 200, 200, 0.25)';
            dataset.pointBackgroundColor = 'rgba(200, 200, 200, 1)';
            dataset.pointBorderColor = 'rgba(200, 200, 200, 1)';
        }
    });
    chart.update();
};

window.enforceInteractiveHighlight = function() {
    if (typeof Chart === 'undefined') return;
    Object.values(Chart.instances).forEach(chart => {
        if (chart.data && chart.data.datasets && chart.data.datasets.length > 1) {
            if (chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.onClick = function(e, legendItem, legend) {
                    window.toggleDatasetHighlight(legend.chart, legendItem.datasetIndex);
                };
            }
            chart.options.onClick = function(e, elements, chartInstance) {
                const activeElements = chartInstance.getElementsAtEventForMode(e, 'nearest', { intersect: false }, true);
                if (activeElements && activeElements.length > 0) {
                    window.toggleDatasetHighlight(chartInstance, activeElements[0].datasetIndex);
                } else {
                    window.toggleDatasetHighlight(chartInstance, null); 
                }
            };
        }
    });
};

window.getActiveFilters = function() {
    function getSelectedValues(id) {
        const el = document.getElementById(id);
        if (!el) return ['all'];
        
        const allCheckbox = el.querySelector('.filter-checkbox-all');
        if (allCheckbox && allCheckbox.checked) return ['all'];

        const allItems = el.querySelectorAll('.filter-checkbox-item');
        const checkedItems = el.querySelectorAll('.filter-checkbox-item:checked');
        if (allItems.length > 0 && allItems.length === checkedItems.length) {
            return ['all'];
        }
        
        const values = Array.from(checkedItems).map(cb => cb.value);
        
        return values.length === 0 ? ['all'] : values;
    }

    return {
        year: getSelectedValues('filter-year'),
        jurisdiction: getSelectedValues('filter-jurisdiction'),
        location: getSelectedValues('filter-location'),
        age: getSelectedValues('filter-age'),
        method: getSelectedValues('filter-method')
    };
};

window.getFilteredData = function(dataArray, filters) {
    
    if (!dataArray || !Array.isArray(dataArray)) return dataArray;
    
    
    return dataArray.filter(row => {
        const keys = Object.keys(row);
        
        const yearKey = keys.find(k => k.toLowerCase() === 'year');
        const jurisKey = keys.find(k => k.toLowerCase() === 'jurisdiction');
        const locKey = keys.find(k => k.toLowerCase() === 'location');
        const ageKey = keys.find(k => k.toLowerCase().includes('age'));
        const methodKey = keys.find(k => k.toLowerCase().includes('method') || k.toLowerCase().includes('detect'));

        if (filters.year && !filters.year.includes('all')) {
            if (!yearKey || !filters.year.includes(row[yearKey].toString().trim())) return false;
        }
        if (filters.jurisdiction && !filters.jurisdiction.includes('all')) {
            if (!jurisKey || !filters.jurisdiction.includes(row[jurisKey].toString().trim())) return false;
        }
        if (filters.location && !filters.location.includes('all')) {
            if (!locKey || !filters.location.includes(row[locKey].toString().trim())) return false;
        }
        if (filters.age && !filters.age.includes('all')) {
            if (!ageKey || !filters.age.includes(row[ageKey].toString().trim())) return false;
        }
        if (filters.method && !filters.method.includes('all')) {
            if (!methodKey || !filters.method.includes(row[methodKey].toString().trim())) return false;
        }
        
        return true;
    });
};

window.loadTopicData = function(topic) {
    if (!topic || topic === 'home') return;

    let prefix = topic; 
    if (topic.includes('seatbelt') || topic === 's') prefix = 's';
    if (topic.includes('mobile') || topic === 'mp') prefix = 'mp';

    Promise.all([
        d3.csv(`data/${prefix}_license.csv`),
        d3.csv(`data/${prefix}_main.csv`),
        d3.csv(`data/${prefix}_loc_age.csv`)  
    ]).then(([license, main, loc_age]) => {
        
        window.rawDatasets = { license, main, loc_age };
        if(typeof window.populateDynamicDropdowns === 'function') window.populateDynamicDropdowns();
        window.renderDashboardCharts();
    }).catch(err => {
        console.error("Data Load Error:", err);
    });
};

window.populateDynamicDropdowns = function() {
    const ds = window.rawDatasets;
    if (!ds.main) return;

    const years = [...new Set(ds.main.map(d => d.YEAR))].sort((a,b)=>b-a);
    const locations = [...new Set(ds.loc_age.map(d => d.LOCATION))].sort();
    const ages = [...new Set(ds.loc_age.map(d => d.AGE_GROUP))].sort();
    const methods = [...new Set(ds.main.map(d => d.DETECTION_METHOD))].sort();
    const jurisdictions = [...new Set(ds.main.map(d => d.JURISDICTION))].sort();
    
    if(typeof window.fillSelect === 'function') {
        window.fillSelect('filter-year', years);
        window.fillSelect('filter-location', locations);
        window.fillSelect('filter-age', ages);
        window.fillSelect('filter-method', methods);
        window.fillSelect('filter-jurisdiction', jurisdictions);
    }
};

window.renderDashboardCharts = function() {
    if (!window.rawDatasets.main) return;

    const filters = window.getActiveFilters();
    const fJurisdiction = window.getFilteredData(window.rawDatasets.main, filters);
    const fDetection = window.getFilteredData(window.rawDatasets.main, filters);
    const fLocation = window.getFilteredData(window.rawDatasets.loc_age, filters);
    const fAge = window.getFilteredData(window.rawDatasets.loc_age, filters);
    const fLicense = window.getFilteredData(window.rawDatasets.license, filters);

    if (window.checkDataAndToggle('chart-method', fDetection) && typeof renderDetectionChart === 'function') renderDetectionChart('chart-method', fDetection);
    if (window.checkDataAndToggle('chart-jurisdiction', fJurisdiction) && typeof renderJurisdictionChart === 'function') renderJurisdictionChart('chart-jurisdiction', fJurisdiction);
    if (window.checkDataAndToggle('chart-location', fLocation) && typeof renderLocationChart === 'function') renderLocationChart('chart-location', fLocation);
    if (window.checkDataAndToggle('chart-age', fAge) && typeof renderAgeGroupChart === 'function') renderAgeGroupChart('chart-age', fAge);
    if (window.checkDataAndToggle('chart-normalized', fLicense) && typeof renderNormalizedChart === 'function') renderNormalizedChart('chart-normalized', fLicense);
    
    const kpiContainer = document.getElementById('offenseLevelKpiContainer');
    if (kpiContainer) {
        let activeKpiData = [];
        
        if (fJurisdiction && fJurisdiction.length > 0) activeKpiData = fJurisdiction;
        else if (fLocation && fLocation.length > 0) activeKpiData = fLocation;
        else if (fAge && fAge.length > 0) activeKpiData = fAge;
        else if (fDetection && fDetection.length > 0) activeKpiData = fDetection;

        if (activeKpiData.length === 0) {
            kpiContainer.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#64748b; font-weight:bold; font-size:14px; text-align:center; padding: 20px;">No data available for the selected filters.</div>';
        } else {
            if (typeof renderOffenseLevelKpi === 'function') {
                renderOffenseLevelKpi('offenseLevelKpiContainer', activeKpiData);
                kpiContainer.innerHTML = kpiContainer.innerHTML.replace(/\$/g, '');
            }
        }
    }

    setTimeout(window.enforceInteractiveHighlight, 150);
};

window.onload = function() {
    if(typeof window.buildDashboardGrid === 'function') window.buildDashboardGrid(); 
    if(typeof window.injectDataTableModal === 'function') window.injectDataTableModal(); 

    document.getElementById('topic-menu').addEventListener('click', (e) => {
        if (!e.target.classList.contains('nav-btn')) return;
        document.querySelectorAll('#topic-menu .nav-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const topic = e.target.getAttribute('data-topic');
        if (topic === 'home') {
            document.getElementById('home-view').style.display = 'flex';
            document.getElementById('dashboard-view').style.display = 'none';
        } else {
            document.getElementById('home-view').style.display = 'none';
            document.getElementById('dashboard-view').style.display = 'block';
            
            document.querySelectorAll('.custom-checkbox-dropdown').forEach(dropdown => {
                const allCb = dropdown.querySelector('.filter-checkbox-all');
                const items = dropdown.querySelectorAll('.filter-checkbox-item');
                const text = dropdown.querySelector('.dropdown-text');
                if (allCb) allCb.checked = true;
                items.forEach(i => i.checked = false);
                if (text) text.innerText = 'All';
            });

            window.currentTopic = topic;
            window.loadTopicData(window.currentTopic);
        }
    });

    document.getElementById('reset-view-btn').addEventListener('click', () => {
        document.querySelectorAll('.custom-checkbox-dropdown').forEach(dropdown => {
            const allCb = dropdown.querySelector('.filter-checkbox-all');
            const items = dropdown.querySelectorAll('.filter-checkbox-item');
            const text = dropdown.querySelector('.dropdown-text');
            if (allCb) allCb.checked = true;
            items.forEach(i => i.checked = false);
            if (text) text.innerText = 'All';
        });
        window.renderDashboardCharts();
    });

    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('chart-modal').style.display = 'none';
    });
};
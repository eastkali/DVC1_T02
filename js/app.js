window.currentTopic = ''; 
window.rawDatasets = {};

// Standard accessibility-friendly color and shape palettes
window.okabeItoColors = ['#009E73', '#E69F00', '#D55E00', '#0072B2', '#CC79A7', '#F0E442', '#000000'];
window.pointShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot'];

if (typeof Chart !== 'undefined') {
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 12; 
}

window.checkDataAndToggle = function(chartId, data) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return false;

    const container = canvas.parentElement;
    let noDataMsg = container.querySelector('.no-data-overlay');
    
    // Create the overlay dynamically if it doesn't exist
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
        noDataMsg.innerText = 'No data available for the selected filters';
                
        container.appendChild(noDataMsg);
    }

    // Toggle visibility based on data presence
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

// Global listener to close custom dropdowns when clicking outside
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
    if (typeof chart.update === 'function') chart.update();
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
        // If all sub-items are manually checked, treat it as "all"
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
        
        // Dynamically find correct object keys handling capitalization mismatches
        const yearKey = keys.find(k => k.toLowerCase() === 'year');
        const jurisKey = keys.find(k => k.toLowerCase() === 'jurisdiction');
        const locKey = keys.find(k => k.toLowerCase() === 'location');
        const ageKey = keys.find(k => k.toLowerCase().includes('age'));
        const methodKey = keys.find(k => k.toLowerCase().includes('method') || k.toLowerCase().includes('detect'));

        // Apply strict intersection filtering (must pass ALL rules to be included)
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

    // Parse topic to match file naming conventions
    let prefix = topic; 
    if (topic.includes('seatbelt') || topic === 's') prefix = 's';
    if (topic.includes('mobile') || topic === 'mp') prefix = 'mp';

    Promise.all([
        d3.csv(`data/${prefix}_license.csv`),
        d3.csv(`data/${prefix}_main.csv`),
        d3.csv(`data/${prefix}_loc_age.csv`)  
    ]).then(([license, main, loc_age]) => {
        // Cache datasets globally to avoid refetching on filter changes
        window.rawDatasets = { license, main, loc_age };

        // Generate filter UI and draw initial charts
        if(typeof window.populateDynamicDropdowns === 'function') window.populateDynamicDropdowns();
        window.renderDashboardCharts();
    }).catch(err => {
        console.error("Data Load Error:", err);
    });
};

window.populateDynamicDropdowns = function() {
    const ds = window.rawDatasets;
    if (!ds.main) return;

    // Utilize Sets to ensure all values are unique, then sort appropriately
    const years = [...new Set(ds.main.map(d => d.YEAR))].sort((a,b)=>b-a);
    const locations = [...new Set(ds.loc_age.map(d => d.LOCATION))].sort();
    const ages = [...new Set(ds.loc_age.map(d => d.AGE_GROUP))].sort();
    const methods = [...new Set(ds.main.map(d => d.DETECTION_METHOD))].sort();
    const jurisdictions = [...new Set(ds.main.map(d => d.JURISDICTION))].sort();
    
    // Pass extracted arrays to the UI generator
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
    const yearsWithLocAge = [...new Set(window.rawDatasets.loc_age.map(d => d.YEAR))].sort((a,b)=>b-a);
    const masterYearsSetWithLocAge = new Set(yearsWithLocAge);

    // Apply active filters to specific data modules
    const fJurisdiction = window.getFilteredData(window.rawDatasets.main, filters);
    const fDetection = window.getFilteredData(window.rawDatasets.main, filters);
    const fLicense = window.getFilteredData(window.rawDatasets.license, filters);
    
    let fLocation = [];
    let fAge = [];
    
    // Prevent location/age charts from breaking if a year is selected that doesn't exist in their specific sub-dataset
    if (filters.year.includes('all') || filters.year.every(y => masterYearsSetWithLocAge.has(y))){
        fLocation = window.getFilteredData(window.rawDatasets.loc_age, filters);
        fAge = window.getFilteredData(window.rawDatasets.loc_age, filters);
    } else {
        // Feed empty data to trigger the clean "No Data" overlay
        fLocation = window.getFilteredData(window.rawDatasets.loc_age, {year: "0"});
        fAge = window.getFilteredData(window.rawDatasets.loc_age, {year: "0"});
    }

    // Trigger explicit D3 render calls safely
    if (window.checkDataAndToggle('chart-method', fDetection) && typeof renderDetectionChart === 'function') renderDetectionChart('chart-method', fDetection);
    if (window.checkDataAndToggle('chart-jurisdiction', fJurisdiction) && typeof renderJurisdictionChart === 'function') renderJurisdictionChart('chart-jurisdiction', fJurisdiction);
    if (window.checkDataAndToggle('chart-location', fLocation) && typeof renderLocationChart === 'function') renderLocationChart('chart-location', fLocation);
    if (window.checkDataAndToggle('chart-age', fAge) && typeof renderAgeGroupChart === 'function') renderAgeGroupChart('chart-age', fAge);
    if (window.checkDataAndToggle('chart-normalized', fLicense) && typeof renderNormalizedChart === 'function') renderNormalizedChart('chart-normalized', fLicense);
    
    // Update top KPI widgets
    const kpiContainer = document.getElementById('offenseLevelKpiContainer');
    if (kpiContainer) {
        
        let activeKpiData = [];

        // Determine which dataset is the most "populated" to use for accurate KPI summation
        if (fJurisdiction && fJurisdiction.length > 0) activeKpiData = fJurisdiction;
        else if (fDetection && fDetection.length > 0) activeKpiData = fDetection;
        else if (fLocation && fLocation.length > 0) activeKpiData = fLocation;
        else if (fAge && fAge.length > 0) activeKpiData = fAge;

        if (activeKpiData.length === 0) {
            kpiContainer.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#64748b; font-weight:bold; font-size:14px; text-align:center; padding: 20px;">No data available for the selected filters.</div>';
        } else {
            if (typeof renderOffenseLevelKpi === 'function') {
                renderOffenseLevelKpi('offenseLevelKpiContainer', activeKpiData);
                // Regex cleanup to remove any stray currency symbols that may have leaked from standard formatting
                kpiContainer.innerHTML = kpiContainer.innerHTML.replace(/\$/g, '');
            }
        }
    }

    // Delay interaction enforcement slightly to allow D3 transitions to initialize
    setTimeout(window.enforceInteractiveHighlight, 150);
};

// --- INITIALIZATION AND EVENT BINDING ---
window.onload = function() {
    // Generate dashboard UI and hidden modals upon load
    if(typeof window.buildDashboardGrid === 'function') window.buildDashboardGrid(); 
    if(typeof window.injectDataTableModal === 'function') window.injectDataTableModal(); 

    const topicMenu = document.getElementById('topic-menu');
    
    if (topicMenu) {
        
        // Main Navigation Routing Logic
        topicMenu.addEventListener('click', (e) => {
            if (!e.target.classList.contains('nav-btn')) return;
            document.querySelectorAll('#topic-menu .nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const topic = e.target.getAttribute('data-topic');

            if (topic === 'home') {
                const homeView = document.getElementById('home-view');
                const dashView = document.getElementById('dashboard-view');

                if (homeView) homeView.style.display = 'flex';
                if (dashView) dashView.style.display = 'none';
            } else {
                // Switch to active dashboard view
                const homeView = document.getElementById('home-view');
                const dashView = document.getElementById('dashboard-view');
                if (homeView) homeView.style.display = 'none';
                if (dashView) dashView.style.display = 'block';
                
                // Clear all filters when switching to a completely new topic
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
    }

    // Bind main rendering engine to any filter state changes
    const filtersContainer = document.querySelector('.filters-container');
    filtersContainer.addEventListener('change', (event) => {
        window.renderDashboardCharts();
    });
    
    // Bind Reset button logic
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

    // document.getElementById('close-modal-btn').addEventListener('click', () => {
    //     document.getElementById('chart-modal').style.display = 'none';
    // });
};

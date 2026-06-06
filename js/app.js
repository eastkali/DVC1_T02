let currentTopic = ''; 
let rawDatasets = {};
let activeChartInstances = {};

window.okabeItoColors = ['#56B4E9', '#009E73', '#E69F00', '#D55E00', '#0072B2', '#CC79A7', '#F0E442'];
window.pointShapes = ['circle', 'rect', 'triangle', 'rectRot', 'star', 'cross', 'dash'];

const chartConfigs = [
    { id: 'year', title: 'Violations by Year', type: 'bar' },
    { id: 'location', title: 'Violations by Location', type: 'pie' },
    { id: 'age', title: 'Age Group Distribution', type: 'bar' },
    { id: 'method', title: 'Method of Detection', type: 'doughnut' },
    { id: 'jurisdiction', title: 'Jurisdiction Comparison', type: 'bar' },
    { id: 'trend', title: 'Trend Over Time', type: 'line' }
];

function buildDashboardGrid() {
    const grid = document.getElementById("dashboard-grid");
    if(!grid) return;
    grid.innerHTML = ''; 

    chartConfigs.forEach(conf => {
        grid.innerHTML += `
            <div class="chart-card">
                <div class="chart-header">
                    <h3>${conf.title}</h3>
                    <button class="enlarge-btn" onclick="openModal('${conf.id}')">&#x2922;</button>
                </div>
                <div class="canvas-container">
                    <canvas id="chart-${conf.id}"></canvas>
                </div>
            </div>
        `;
    });
}

window.getActiveFilters = function() {
    return {
        year: document.getElementById('filter-year') ? document.getElementById('filter-year').value : 'all',
        jurisdiction: document.getElementById('filter-jurisdiction') ? document.getElementById('filter-jurisdiction').value : 'all',
        location: document.getElementById('filter-location') ? document.getElementById('filter-location').value : 'all',
        age: document.getElementById('filter-age') ? document.getElementById('filter-age').value : 'all',
        method: document.getElementById('filter-method') ? document.getElementById('filter-method').value : 'all'
    };
}

function loadTopicData(topic) {
    if (!topic || topic === 'home') return;

    Promise.all([
        d3.csv(`data/${topic}_jurisdiction.csv`),
        d3.csv(`data/${topic}_location.csv`),
        d3.csv(`data/${topic}_age.csv`),
        d3.csv(`data/${topic}_detection.csv`)
    ]).then(([jurisdiction, location, age, detection]) => {
        
        rawDatasets = { jurisdiction, location, age, detection };
        populateDynamicDropdowns();
        renderDashboardCharts();
        
    }).catch(err => {
        alert("CRITICAL ERROR: Failed to load CSV data.\n\nMake sure you are running a Local Server (like Live Server in VS Code) and your files are named correctly (.csv).");
        console.error("Data Load Error:", err);
    });
}

function populateDynamicDropdowns() {
    const ds = rawDatasets;
    const years = [...new Set(ds.jurisdiction.map(d => d.YEAR))].sort((a,b)=>b-a);
    const locations = [...new Set(ds.location.map(d => d.LOCATION))].sort();
    const ages = [...new Set(ds.age.map(d => d.AGE_GROUP))].sort();
    const methods = [...new Set(ds.detection.map(d => d.DETECTION_METHOD))].sort();

    fillSelect('filter-year', years);
    fillSelect('filter-location', locations);
    fillSelect('filter-age', ages);
    fillSelect('filter-method', methods);
    fillSelect('filter-jurisdiction', ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']);
}

function fillSelect(elementId, items) {
    const select = document.getElementById(elementId);
    if(!select) return;
    select.innerHTML = `<option value="all">All</option>`;
    items.forEach(item => {
        if(item && item !== 'Unknown') select.innerHTML += `<option value="${item}">${item}</option>`;
    });
}

window.renderDashboardCharts = function() {
    if (!rawDatasets.jurisdiction) return;
    const filters = getActiveFilters();

    // call modular charts
    if (typeof renderYearChartDynamic === 'function') renderYearChartDynamic('chart-year', rawDatasets.jurisdiction);
    if (typeof renderLocationChartDynamic === 'function') renderLocationChartDynamic('chart-location', rawDatasets.location);
    if (typeof renderAgeGroupChartDynamic === 'function') renderAgeGroupChartDynamic('chart-age', rawDatasets.age);

    drawStandardChart('chart-method', 'doughnut', rawDatasets.detection, 'DETECTION_METHOD', window.okabeItoColors, { 
        plugins: { legend: { position: 'right' } } 
    });
    
    drawStandardChart('chart-jurisdiction', 'bar', rawDatasets.jurisdiction, 'JURISDICTION', window.okabeItoColors[0], { 
        indexAxis: 'y', scales: { x: { beginAtZero: true } } 
    });
    
    drawStandardChart('chart-trend', 'line', rawDatasets.jurisdiction, 'YEAR', window.okabeItoColors[3], { 
        fill: true, backgroundColor: 'rgba(213, 94, 0, 0.15)', // Vermilion with opacity for area effect
        interaction: { mode: 'index', intersect: false },
        scales: { y: { beginAtZero: true } }
    });
}

function drawStandardChart(canvasId, type, dataset, groupKey, colors, extraOptions = {}) {
    if (!dataset) return;
    const filters = getActiveFilters();
    let filtered = dataset.filter(row => {
        if (filters.year !== 'all' && row['YEAR'] && row['YEAR'] !== filters.year) return false;
        return true;
    });

    const grouped = {}; // Group data by selected key
    filtered.forEach(row => {
        const key = row[groupKey];
        if (!key || key === 'Unknown') return;
        const val = parseFloat(row['Sum(OFFENSES_SUM)']) || parseFloat(row['OFFENSES_SUM (Sum)']) || 0;
        grouped[key] = (grouped[key] || 0) + val;
    });

    const labels = Object.keys(grouped).sort();
    const values = labels.map(l => grouped[l]);

    const ctx = document.getElementById(canvasId).getContext('2d');
    if (activeChartInstances[canvasId]) activeChartInstances[canvasId].destroy();

    activeChartInstances[canvasId] = new Chart(ctx, {
        type: type,
        data: { 
            labels: labels, 
            datasets: [{ 
                label: 'Violations', 
                data: values, 
                backgroundColor: type === 'pie' || type === 'doughnut' ? colors : colors, 
                borderColor: type === 'line' ? colors : (type === 'pie' || type === 'doughnut' ? '#fff' : 'transparent'), 
                tension: 0.3,
                pointStyle: window.pointShapes[0],
                pointRadius: 5
            }] 
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: (type === 'pie' || type === 'doughnut') } }, 
            ...extraOptions 
        }
    });
}

window.openModal = function(chartId) {
    document.getElementById('chart-modal').style.display = 'flex';
    const config = chartConfigs.find(c => c.id === chartId);
    document.getElementById('modal-title').innerText = config.title;
    document.getElementById('modal-chart-container').innerHTML = `<canvas id="modal-canvas"></canvas>`;
    
    if (!rawDatasets.jurisdiction) return;

    if (chartId === 'year') renderYearChartDynamic('modal-canvas', rawDatasets.jurisdiction);
    else if (chartId === 'location') renderLocationChartDynamic('modal-canvas', rawDatasets.location);
    else if (chartId === 'age') renderAgeGroupChartDynamic('modal-canvas', rawDatasets.age);
    else if (chartId === 'method') drawStandardChart('modal-canvas', 'doughnut', rawDatasets.detection, 'DETECTION_METHOD', window.okabeItoColors, { plugins: { legend: { position: 'right' } }});
    else if (chartId === 'jurisdiction') drawStandardChart('modal-canvas', 'bar', rawDatasets.jurisdiction, 'JURISDICTION', window.okabeItoColors[0], { indexAxis: 'y', scales: { x: { beginAtZero: true } } });
    else if (chartId === 'trend') drawStandardChart('modal-canvas', 'line', rawDatasets.jurisdiction, 'YEAR', window.okabeItoColors[3], { fill: true, backgroundColor: 'rgba(213, 94, 0, 0.15)', interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true } } });
};

window.onload = function() {
    buildDashboardGrid(); 

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
            
            document.querySelectorAll('.chart-filter').forEach(select => select.value = 'all');
            currentTopic = topic;
            loadTopicData(currentTopic);
        }
    });

    // re-render charts when filters change
    document.querySelectorAll('.chart-filter').forEach(select => {
        select.addEventListener('change', renderDashboardCharts);
    });

    document.getElementById('reset-view-btn').addEventListener('click', () => {
        document.querySelectorAll('.chart-filter').forEach(select => select.value = 'all');
        renderDashboardCharts();
    });

    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('chart-modal').style.display = 'none';
    });
};
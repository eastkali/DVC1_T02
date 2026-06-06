function renderAgeGroupChart(arg1, arg2) {
    let canvasId = 'ageChart';
    let dataset = arg1;
    if (arg2 !== undefined) { canvasId = arg1; dataset = arg2; }

    // ensure valid dataset
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;

    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="age"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    // Retrieve global filters
    const filters = window.getActiveFilters ? window.getActiveFilters() : {};

    const firstRow = dataset[0] || {};
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const jurisKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'jurisdiction') || 'JURISDICTION';
    const ageKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('age')) || 'AGE_GROUP';

    const activeYear = filters.year || ['all'];
    const activeJurisdiction = filters.jurisdiction || ['all'];
    const activeAge = filters.age || filters.age_group || filters.ageGroup || ['all'];

    let filteredDataset = dataset.filter(row => {
        if (!activeYear.includes('all') && row[yearKey] && !activeYear.includes(row[yearKey].toString())) return false;
        if (!activeJurisdiction.includes('all') && row[jurisKey] && !activeJurisdiction.includes(row[jurisKey].toString().trim())) return false;
        if (!activeAge.includes('all') && ageKey && row[ageKey] && !activeAge.includes(row[ageKey].toString().trim())) return false;
        return true;
    });

    let uniqueAges = [...new Set(filteredDataset.map(row => row[ageKey]).filter(Boolean))].map(a => a.toString().trim()).sort();
    let years = [...new Set(filteredDataset.map(row => row[yearKey]).filter(Boolean))].map(Number).sort((a, b) => a - b);

    const getValue = (row) => {
        const keys = Object.keys(row);
        const k = keys.find(key => {
            const l = key.toLowerCase();
            return l.includes('offen') || l.includes('total') || l.includes('count') || l.includes('fine');
        });
        return k ? (parseFloat(row[k]) || 1) : 1;
    };

    const targetColors = window.okabeItoColors || ['#009E73', '#E69F00', '#D55E00', '#0072B2', '#CC79A7', '#F0E442', '#000000'];
    const targetShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot'];
    
    const isSingleYear = years.length === 1;

    const datasets = uniqueAges.map((age, index) => {
        const dataPoints = years.map(year => {
            const matches = filteredDataset.filter(row => row[ageKey] && row[ageKey].toString().trim() === age && row[yearKey] == year);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });
        
        const color = targetColors[index % targetColors.length];
        const shape = targetShapes[index % targetShapes.length];
        
        return { 
            label: age, 
            data: dataPoints, 
            borderColor: color, 
            backgroundColor: color, 
            pointBackgroundColor: 'transparent', 
            pointBorderColor: color,
            pointStyle: shape, 
            pointRadius: 4,                  
            pointHoverRadius: 6, 
            pointBorderWidth: 2, 
            fill: false, 
            tension: 0.1 
        };
    });

    new Chart(ctx, {
        type: isSingleYear ? 'bar' : 'line',
        data: { labels: years, datasets: datasets },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { 
                legend: { display: true, position: 'right', labels: { font: { size: 10 }, boxWidth: 12 } } 
            },
            scales: { 
                x: { 
                    title: { display: true, text: 'Year', font: { weight: 'bold' }, color: '#333' } 
                },
                y: { 
                    beginAtZero: true, 
                    title: { display: true, text: 'Total Offenses', font: { weight: 'bold' }, color: '#333' } 
                } 
            }
        }
    });
}
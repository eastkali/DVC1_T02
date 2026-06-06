function renderNormalizedChart(arg1, arg2, arg3) {
    let canvasId = 'normalizedChart';
    let dataset = null;

    if (typeof arg1 === 'string') {
        canvasId = arg1;
        dataset = arg3 || arg2; 
    } else {
        dataset = arg2 || arg1;
    }

    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;

    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="normalized"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    const filters = window.getActiveFilters ? window.getActiveFilters() : {};

    const firstRow = dataset[0] || {};
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const jurisKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'jurisdiction') || 'JURISDICTION';
    const ageKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('age')) || 'AGE_GROUP';
    const normKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('10k') || k.toLowerCase().includes('count')) || 'COUNT_PER_10K';

    const activeYear = filters.year || ['all'];
    const activeJurisdiction = filters.jurisdiction || ['all'];
    const activeAge = filters.age || filters.age_group || filters.ageGroup || ['all'];

    let filteredDataset = dataset.filter(row => {
        if (!activeYear.includes('all') && row[yearKey] && !activeYear.includes(row[yearKey].toString())) return false;
        if (!activeJurisdiction.includes('all') && row[jurisKey] && !activeJurisdiction.includes(row[jurisKey].toString().trim())) return false;
        if (!activeAge.includes('all') && ageKey && row[ageKey] && !activeAge.includes(row[ageKey].toString().trim())) return false;
        return true;
    });

    let uniqueJurisdictions = [...new Set(filteredDataset.map(row => row[jurisKey]).filter(Boolean))].map(j => j.toString().trim()).sort();
    let years = [...new Set(filteredDataset.map(row => row[yearKey]).filter(Boolean))].map(y => y.toString()).sort();

    const targetColors = window.okabeItoColors || ['#009E73', '#E69F00', '#D55E00', '#0072B2', '#CC79A7', '#F0E442', '#000000'];
    const targetShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot'];
    
    const isSingleYear = years.length === 1;

    const datasets = uniqueJurisdictions.map((juris, index) => {
        const dataPoints = years.map(year => {
            const matches = filteredDataset.filter(row => row[jurisKey] && row[jurisKey].toString().trim() === juris && row[yearKey] == year);
            return matches.reduce((sum, row) => sum + (parseFloat(row[normKey]) || 0), 0);
        });
        
        const color = targetColors[index % targetColors.length];
        const shape = targetShapes[index % targetShapes.length];
        
        return { 
            label: juris, 
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
                    title: { display: true, text: 'Offenses per 10,000 Licenses', font: { weight: 'bold' }, color: '#333' } 
                } 
            } 
        }
    });
}
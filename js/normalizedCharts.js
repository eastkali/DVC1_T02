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

    const filters = window.getActiveFilters ? window.getActiveFilters() : { year: ['all'], jurisdiction: ['all'], age: ['all'] };

    const firstRow = dataset[0] || {};
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const jurisKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'jurisdiction') || 'JURISDICTION';
    const ageKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('age')) || 'AGE_GROUP';
    const normKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('10k') || k.toLowerCase().includes('count')) || 'COUNT_PER_10K';

    let filteredDataset = dataset.filter(row => {
        if (filters.year && !filters.year.includes('all') && row[yearKey] && !filters.year.includes(row[yearKey].toString().trim())) return false;
        if (filters.jurisdiction && !filters.jurisdiction.includes('all') && row[jurisKey] && !filters.jurisdiction.includes(row[jurisKey].toString().trim())) return false;
        
        let activeAge = filters.age || filters.ageGroup || filters.age_group;
        if (activeAge && !activeAge.includes('all') && row[ageKey] && !activeAge.includes(row[ageKey].toString().trim())) return false;
        
        return true;
    });

    let uniqueJurisdictions = [...new Set(filteredDataset.map(row => row[jurisKey] ? row[jurisKey].toString().trim() : '').filter(Boolean))].sort();
    let years = [...new Set(filteredDataset.map(row => row[yearKey] ? row[yearKey].toString().trim() : '').filter(Boolean))].sort();

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const targetShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot', 'rectRounded'];
    
    const activeYearFilter = filters.year || ['all'];
    const isSingleYear = (activeYearFilter.length === 1 && activeYearFilter[0] !== 'all') || years.length === 1;
    
    const activeJurisFilter = filters.jurisdiction || ['all'];
    const isSingleJurisdiction = (activeJurisFilter.length === 1 && activeJurisFilter[0] !== 'all') || uniqueJurisdictions.length === 1;
    
    const useBarChart = isSingleYear || isSingleJurisdiction;

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        chartLabels = uniqueJurisdictions;
        const activeYearVal = years.length === 1 ? years[0] : activeYearFilter[0];

        const dataPoints = uniqueJurisdictions.map(juris => {
            const matches = filteredDataset.filter(row => row[jurisKey] && row[jurisKey].toString().trim() === juris && row[yearKey] && row[yearKey].toString().trim() === activeYearVal);
            return matches.reduce((sum, row) => sum + (parseFloat(row[normKey]) || 0), 0);
        });

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: uniqueJurisdictions.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4
        }];
    } else if (isSingleJurisdiction) {
        chartLabels = years;
        const activeJurisVal = uniqueJurisdictions.length === 1 ? uniqueJurisdictions[0] : activeJurisFilter[0];

        const dataPoints = years.map(year => {
            const matches = filteredDataset.filter(row => row[jurisKey] && row[jurisKey].toString().trim() === activeJurisVal && row[yearKey] && row[yearKey].toString().trim() === year);
            return matches.reduce((sum, row) => sum + (parseFloat(row[normKey]) || 0), 0);
        });

        chartDatasets = [{
            label: activeJurisVal,
            data: dataPoints,
            backgroundColor: targetColors[0],
            borderRadius: 4
        }];
    } else {
        chartLabels = years;
        chartDatasets = uniqueJurisdictions.map((juris, index) => {
            const dataPoints = years.map(year => {
                const matches = filteredDataset.filter(row => row[jurisKey] && row[jurisKey].toString().trim() === juris && row[yearKey] && row[yearKey].toString().trim() === year);
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
    }

    new Chart(ctx, {
        type: useBarChart ? 'bar' : 'line',
        data: { labels: chartLabels, datasets: chartDatasets },
        plugins: [{
            id: 'topLabels',
            afterDatasetsDraw(chart) {
                if (chart.config.type !== 'bar') return;
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    const total = dataset.data.reduce((a, b) => a + (parseFloat(b) || 0), 0);
                    meta.data.forEach((bar, index) => {
                        const data = dataset.data[index];
                        if (data) {
                            ctx.save();
                            ctx.fillStyle = '#475569';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                            ctx.font = 'bold 11px sans-serif';
                            const percentStr = total > 0 ? ((data / total) * 100).toFixed(1) + '%' : '0%';
                            ctx.fillText(percentStr, bar.x, bar.y - 4);
                            ctx.restore();
                        }
                    });
                });
            }
        }],
        options: { 
            layout: { padding: { top: useBarChart ? 25 : 0 } },
            responsive: true, maintainAspectRatio: false, 
            plugins: { 
                legend: { 
                    display: !useBarChart, 
                    position: 'right', 
                    labels: { font: { size: 10 }, boxWidth: 12 } 
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            let labelStr = useBarChart && isSingleYear ? context.label : context.dataset.label;
                            return `${labelStr}: ${context.raw.toFixed(2)}`;
                        }
                    }
                }
            }, 
            scales: { 
                x: { 
                    title: { display: true, text: isSingleYear ? 'Jurisdiction' : 'Year', font: { weight: 'bold' }, color: '#333' } 
                },
                y: { 
                    beginAtZero: true, 
                    title: { display: true, text: 'Offenses per 10,000 Licenses', font: { weight: 'bold' }, color: '#333' } 
                } 
            } 
        }
    });
}
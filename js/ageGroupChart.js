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
    const filters = window.getActiveFilters ? window.getActiveFilters() : { year: ['all'], jurisdiction: ['all'], age: ['all'] };

    const firstRow = dataset[0] || {};
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const jurisKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'jurisdiction') || 'JURISDICTION';
    const ageKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('age')) || 'AGE_GROUP';

    const activeYearFilter = (filters.year || ['all']).map(v => v.toString().trim());
    const activeJurisFilter = (filters.jurisdiction || ['all']).map(v => v.toString().trim());
    
    let activeAge = filters.age || filters.ageGroup || filters.age_group || ['all'];
    const activeAgeFilter = activeAge.map(v => v.toString().trim());

    let filteredDataset = dataset.filter(row => {
        if (!activeYearFilter.includes('all') && row[yearKey] && !activeYearFilter.includes(row[yearKey].toString().trim())) return false;
        if (!activeJurisFilter.includes('all') && row[jurisKey] && !activeJurisFilter.includes(row[jurisKey].toString().trim())) return false;
        if (!activeAgeFilter.includes('all') && ageKey && row[ageKey] && !activeAgeFilter.includes(row[ageKey].toString().trim())) return false;
        return true;
    });

    let uniqueAges = [...new Set(filteredDataset.map(row => row[ageKey] ? row[ageKey].toString().trim() : '').filter(Boolean))].sort();
    let years = [...new Set(filteredDataset.map(row => row[yearKey] ? row[yearKey].toString().trim() : '').filter(Boolean))].sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''));
        const numB = parseInt(b.replace(/\D/g, ''));
        return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
    });

    const getValue = (row) => {
        const keys = Object.keys(row);
        const k = keys.find(key => {
            const l = key.toLowerCase();
            return l.includes('offen') || l.includes('total') || l.includes('count') || l.includes('fine');
        });
        return k ? (parseFloat(row[k]) || 1) : 1;
    };

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const targetShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot', 'rectRounded'];
    
    const isSingleYear = (activeYearFilter.length === 1 && activeYearFilter[0] !== 'all') || years.length === 1;
    const isSingleAge = (activeAgeFilter.length === 1 && activeAgeFilter[0] !== 'all') || uniqueAges.length === 1;
    const useBarChart = isSingleYear || isSingleAge;

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        chartLabels = uniqueAges;
        const activeYearVal = years.length === 1 ? years[0] : activeYearFilter[0];

        const dataPoints = uniqueAges.map(age => {
            const matches = filteredDataset.filter(row => row[ageKey] && row[ageKey].toString().trim() === age && row[yearKey] && row[yearKey].toString().trim() === activeYearVal);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: uniqueAges.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4
        }];
    } else if (isSingleAge) {
        chartLabels = years;
        const activeAgeVal = uniqueAges.length === 1 ? uniqueAges[0] : activeAgeFilter[0];

        const dataPoints = years.map(year => {
            const matches = filteredDataset.filter(row => row[ageKey] && row[ageKey].toString().trim() === activeAgeVal && row[yearKey] && row[yearKey].toString().trim() === year);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });

        chartDatasets = [{
            label: activeAgeVal,
            data: dataPoints,
            backgroundColor: targetColors[0],
            borderRadius: 4
        }];
    } else {
        chartLabels = years;
        chartDatasets = uniqueAges.map((age, index) => {
            const dataPoints = years.map(year => {
                const matches = filteredDataset.filter(row => row[ageKey] && row[ageKey].toString().trim() === age && row[yearKey] && row[yearKey].toString().trim() === year);
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
    }

    const barLabelPlugin = {
        id: 'topLabels',
        afterDatasetsDraw(chart) {
            if (chart.config.type !== 'bar') return;
            const ctx = chart.ctx;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((bar, index) => {
                    const data = dataset.data[index];
                    if (data !== undefined && data !== null) {
                        ctx.save();
                        ctx.fillStyle = '#475569';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.font = 'bold 11px sans-serif';
                        const textStr = data % 1 !== 0 ? data.toFixed(2) : data.toLocaleString();
                        ctx.fillText(textStr, bar.x, bar.y - 4);
                        ctx.restore();
                    }
                });
            });
        }
    };

    new Chart(ctx, {
        type: useBarChart ? 'bar' : 'line',
        data: { labels: chartLabels, datasets: chartDatasets },
        plugins: useBarChart ? [barLabelPlugin] : [], 
        options: { 
            interaction: { mode: 'index', intersect: true },
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
                            return `${labelStr}: ${context.raw % 1 !== 0 ? context.raw.toFixed(2) : context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: { 
                x: { 
                    title: { display: true, text: isSingleYear ? 'Age Group' : 'Year', font: { weight: 'bold' }, color: '#333' } 
                },
                y: { 
                    beginAtZero: true, 
                    title: { display: true, text: 'Total Offenses', font: { weight: 'bold' }, color: '#333' } 
                } 
            }
        }
    });
}
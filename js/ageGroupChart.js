function renderAgeGroupChart(canvasId, dataset) {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;

    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="age"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    const firstRow = dataset[0] || {};
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const jurisKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'jurisdiction') || 'JURISDICTION';
    const ageKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('age')) || 'AGE_GROUP';

    let selectedAges = [...new Set(dataset.map(row => row[ageKey] ? row[ageKey].toString().trim() : '').filter(Boolean))].sort();
    let allAges = [...new Set(window.rawDatasets.loc_age.map(row => row[ageKey] ? row[ageKey].toString().trim() : '').filter(Boolean))].sort();
    let years = [...new Set(dataset.map(row => row[yearKey] ? row[yearKey].toString().trim() : '').filter(Boolean))].sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
    });

    const getValue = (row) => {
        const keys = Object.keys(row);
        const k = keys.find(key => {
            const l = key.toLowerCase();
            return l.includes('offenses');
        });
        return k ? (parseFloat(row[k]) || 1) : 1;
    };

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const targetShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot', 'rectRounded'];
    
    const isSingleYear = years.length === 1;
    const isSingleAge = selectedAges.length === 1;
    const useBarChart = isSingleYear || isSingleAge;

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        chartLabels = allAges;
        const activeYearVal = years[0];

        const dataPoints = allAges.map(age => {
            const matches = dataset.filter(row => row[ageKey] && row[ageKey].toString().trim() === age && row[yearKey] && row[yearKey].toString().trim() === activeYearVal);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: selectedAges.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4
        }];
    } else if (isSingleAge) {
        chartLabels = years;
        const activeAgeVal = selectedAges.length === 1 ? selectedAges[0] : activeAgeFilter[0];

        const dataPoints = years.map(year => {
            const matches = dataset.filter(row => row[ageKey] && row[ageKey].toString().trim() === activeAgeVal && row[yearKey] && row[yearKey].toString().trim() === year);
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
        
        selectedAges.forEach(age => {
            const color = targetColors[allAges.indexOf(age) % targetColors.length];
            const shape = targetShapes[allAges.indexOf(age) % targetShapes.length];

           const dataPoints = years.map(year => {
                return dataset
                    .filter(row => row[ageKey] && row[ageKey].toString().trim() === age && row[yearKey] && row[yearKey].toString().trim() === year)
                   .reduce((sum, row) => sum + getValue(row), 0)
            });

            chartDatasets.push({
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
            });
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
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        ctx.font = 'bold 11px sans-serif';
                        const textStr = data % 1 !== 0 ? data.toFixed(2) : data.toLocaleString();
                         ctx.translate(bar.x, bar.y);
                        ctx.rotate(-Math.PI / 2);
                        ctx.fillText(textStr, 6, 0);
                        ctx.restore();
                    }
                });
            });
        }
    };

    Chart.Tooltip.positioners.cursor = function(elements, eventPosition) {
        if (!eventPosition || eventPosition.x === undefined || eventPosition.y === undefined) {
            return false;
        }

        return {
            x: eventPosition.x,
            y: eventPosition.y
        };
    };

    new Chart(ctx, {
        type: useBarChart ? 'bar' : 'line',
        data: { labels: chartLabels, datasets: chartDatasets },
        plugins: useBarChart ? [barLabelPlugin] : [], 
        options: { 
            interaction: { mode: 'index', intersect: false },
            layout: { padding: { top: useBarChart ? 25 : 0 } },
            responsive: true, maintainAspectRatio: false, 
            plugins: { 
                legend: { 
                    display: !useBarChart, 
                    position: 'right', 
                    labels: { font: { size: 10 }, boxWidth: 12 } 
                },
                tooltip: {
                    position: 'cursor',
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
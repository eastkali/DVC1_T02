function renderDetectionChart(arg1, arg2) {
    let canvasId = 'detectionChart';
    let dataset = arg1;
    if (arg2 !== undefined) { canvasId = arg1; dataset = arg2; }
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;

    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="method"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    const filters = window.getActiveFilters ? window.getActiveFilters() : { year: ['all'], method: ['all'] };
    
    const firstRow = dataset[0];
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const methodKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('detect') || k.toLowerCase().includes('method')) || 'DETECTION_METHOD';

    let filteredData = dataset.filter(row => {
        if (filters.year && !filters.year.includes('all') && row[yearKey] && !filters.year.includes(row[yearKey].toString().trim())) return false;
        if (filters.method && !filters.method.includes('all') && row[methodKey] && !filters.method.includes(row[methodKey].toString().trim())) return false;
        return true;
    });

    let uniqueMethods = [...new Set(filteredData.map(row => row[methodKey] ? row[methodKey].toString().trim() : '').filter(m => m !== ''))].sort();
    let years = [...new Set(filteredData.map(row => row[yearKey] ? row[yearKey].toString().trim() : '').filter(y => y !== ''))].sort();

    const getValue = (row) => {
        const keys = Object.keys(row);
        const k = keys.find(key => {
            const l = key.toLowerCase();
            return l.includes('offen') || l.includes('total') || l.includes('count') || l.includes('fine');
        });
        return k ? (parseFloat(row[k]) || 1) : 1;
    };

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];

    const activeYear = filters.year || ['all'];
    const isSingleYear = (activeYear.length === 1 && activeYear[0] !== 'all') || (years.length === 1);
    const isSingleMethod = uniqueMethods.length === 1;
    const useBarChart = isSingleYear || isSingleMethod;

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        chartLabels = uniqueMethods;
        const activeYearVal = (activeYear.length === 1 && activeYear[0] !== 'all') ? activeYear[0] : years[0];

        const dataPoints = uniqueMethods.map(method => {
            const matches = filteredData.filter(row => row[methodKey] && row[methodKey].toString().trim() === method && row[yearKey] && row[yearKey].toString().trim() === activeYearVal);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: uniqueMethods.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4
        }];
    } else if (isSingleMethod) {
        chartLabels = years;
        const activeMethod = uniqueMethods[0];

        const dataPoints = years.map(year => {
            const matches = filteredData.filter(row => row[methodKey] && row[methodKey].toString().trim() === activeMethod && row[yearKey] && row[yearKey].toString().trim() === year);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });

        chartDatasets = [{
            label: activeMethod,
            data: dataPoints,
            backgroundColor: targetColors[0],
            borderRadius: 4
        }];
    } else {
        chartLabels = years;
        chartDatasets = uniqueMethods.map((method, index) => {
            const dataPoints = years.map(year => {
                const matches = filteredData.filter(row => row[methodKey] && row[methodKey].toString().trim() === method && row[yearKey] && row[yearKey].toString().trim() === year);
                return matches.reduce((sum, row) => sum + getValue(row), 0);
            });
            const color = targetColors[index % targetColors.length];
            return {
                label: method,
                data: dataPoints,
                borderColor: color,
                backgroundColor: color,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4,
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
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: !useBarChart, 
                    position: 'right',
                    labels: { font: { size: 10 }, boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            let labelStr = isSingleYear ? context.label : (context.dataset.label || "Offenses");
                            return `${labelStr}: ${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: !useBarChart },
                y: { stacked: !useBarChart, beginAtZero: true }
            }
        }
    });
}
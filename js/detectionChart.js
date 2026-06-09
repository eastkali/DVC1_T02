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
        if (filters.year && !filters.year.includes('all') && row[yearKey] && !filters.year.includes(row[yearKey].toString())) return false;
        if (filters.method && !filters.method.includes('all') && row[methodKey] && !filters.method.includes(row[methodKey].toString())) return false;
        return true;
    });

    let uniqueMethods = [...new Set(filteredData.map(row => row[methodKey]).filter(Boolean))].map(m => m.toString().trim()).sort();
    let years = [...new Set(filteredData.map(row => row[yearKey]).filter(Boolean))].map(y => y.toString()).sort();

    const getValue = (row) => {
        const keys = Object.keys(row);
        const k = keys.find(key => {
            const l = key.toLowerCase();
            return l.includes('offen') || l.includes('total') || l.includes('count') || l.includes('fine');
        });
        return k ? (parseFloat(row[k]) || 1) : 1;
    };

    const targetColors = ['#009E73', '#E69F00', '#D55E00', '#0072B2', '#CC79A7', '#F0E442', '#000000'];

    const isSingleYear = years.length === 1;
    const isSingleMethod = uniqueMethods.length === 1;
    const useBarChart = isSingleYear || isSingleMethod;

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        // Case A: 1 Year selected -> X-axis shows Method names directly
        chartLabels = uniqueMethods;
        const activeYear = years[0];

        const dataPoints = uniqueMethods.map(method => {
            const matches = filteredData.filter(row => row[methodKey] && row[methodKey].toString().trim() === method && row[yearKey] == activeYear);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: uniqueMethods.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4
        }];
    } else if (isSingleMethod) {
        // Case B: 1 Method selected -> X-axis shows Years timeline
        chartLabels = years;
        const activeMethod = uniqueMethods[0];

        const dataPoints = years.map(year => {
            const matches = filteredData.filter(row => row[methodKey] && row[methodKey].toString().trim() === activeMethod && row[yearKey] == year);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });

        chartDatasets = [{
            label: activeMethod,
            data: dataPoints,
            backgroundColor: targetColors[0],
            borderRadius: 4
        }];
    } else {
        // Case C: Multi-year & Multi-method -> Stacked Area Line Chart
        chartLabels = years;
        chartDatasets = uniqueMethods.map((method, index) => {
            const dataPoints = years.map(year => {
                const matches = filteredData.filter(row => row[methodKey] && row[methodKey].toString().trim() === method && row[yearKey] == year);
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
        options: {
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
                // Switch from stacked area to bars if a single year is selected
                x: { stacked: !useBarChart },
                y: { stacked: !useBarChart, beginAtZero: true }
            }
        }
    });
}
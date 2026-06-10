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

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const solidGray = '#D4D4D8'; 

    const filters = window.getActiveFilters ? window.getActiveFilters() : { year: ['all'], method: ['all'] };
    
    const firstRow = dataset[0];
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const methodKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('detect') || k.toLowerCase().includes('method')) || 'DETECTION_METHOD';
    const offenseKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('offense') || k.toLowerCase().includes('total') || k.toLowerCase().includes('count')) || 'OFFENSES';

    let filteredData = dataset.filter(row => {
        if (filters.year && !filters.year.includes('all') && row[yearKey] && !filters.year.includes(row[yearKey].toString().trim())) return false;
        if (filters.method && !filters.method.includes('all') && row[methodKey] && !filters.method.includes(row[methodKey].toString().trim())) return false;
        return true;
    });

    const uniqueMethods = [...new Set(filteredData.map(row => row[methodKey]?.toString().trim()))].filter(Boolean).sort();
    const uniqueYears = [...new Set(filteredData.map(row => row[yearKey]?.toString().trim()))].filter(Boolean).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''));
        const numB = parseInt(b.replace(/\D/g, ''));
        return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
    });

    const allMethodsEver = [...new Set(dataset.map(row => row[methodKey]?.toString().trim()))].filter(Boolean).sort();
    const activeYearFilter = (filters.year || ['all']).map(v => v.toString().trim());
    const isSingleYear = activeYearFilter.length === 1 && activeYearFilter[0] !== 'all';
    
    const isSingleMethod = uniqueMethods.length === 1; 
    
    const useBarChart = isSingleYear || isSingleMethod;

    if (typeof window.selectedDetectionMethod === 'undefined') {
        window.selectedDetectionMethod = null;
    }
    if (window.selectedDetectionMethod && !uniqueMethods.includes(window.selectedDetectionMethod)) {
        window.selectedDetectionMethod = null;
    }

    let chartLabels = [];
    let chartDatasets = [];

    if (useBarChart) {
        if (isSingleYear && !isSingleMethod) {
            chartLabels = uniqueMethods;
            const dataValues = uniqueMethods.map(method => {
                return filteredData
                    .filter(row => row[methodKey]?.toString().trim() === method)
                    .reduce((sum, row) => sum + (parseFloat(row[offenseKey]) || 0), 0);
            });

            const barColors = uniqueMethods.map(method => {
                return targetColors[allMethodsEver.indexOf(method) % targetColors.length];
            });

            chartDatasets.push({
                type: 'bar',
                label: 'Offenses',
                data: dataValues,
                backgroundColor: barColors,
                borderColor: barColors,
                borderWidth: 1,
                borderRadius: 4
            });
        } else {
            chartLabels = uniqueYears;
            const method = uniqueMethods[0];
            const color = targetColors[allMethodsEver.indexOf(method) % targetColors.length];

            const dataValues = uniqueYears.map(year => {
                return filteredData
                    .filter(row => row[yearKey]?.toString().trim() === year)
                    .reduce((sum, row) => sum + (parseFloat(row[offenseKey]) || 0), 0);
            });

            chartDatasets.push({
                type: 'bar',
                label: method,
                data: dataValues,
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
                borderRadius: 4
            });
        }
    } else {
        chartLabels = uniqueYears;

        uniqueMethods.forEach(method => {
            const baseColor = targetColors[allMethodsEver.indexOf(method) % targetColors.length];
            let displayColor = baseColor;
            if (window.selectedDetectionMethod) {
                displayColor = (window.selectedDetectionMethod === method) ? baseColor : solidGray;
            }

            const dataValues = uniqueYears.map(year => {
                return filteredData
                    .filter(row => row[yearKey]?.toString().trim() === year && row[methodKey]?.toString().trim() === method)
                    .reduce((sum, row) => sum + (parseFloat(row[offenseKey]) || 0), 0);
            });

            chartDatasets.push({
                type: 'line',
                label: method,
                data: dataValues,
                fill: 'stack',
                backgroundColor: displayColor,
                borderColor: displayColor,
                pointBackgroundColor: displayColor,
                pointBorderColor: displayColor,
                tension: 0.1,
                pointRadius: 3,
                pointHoverRadius: 6
            });
        });
    }

    const barLabelPlugin = {
        id: 'barLabelPlugin',
        afterDatasetsDraw(chart) {
            if (!useBarChart) return;
            const { ctx, data } = chart;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((bar, index) => {
                    const dataVal = dataset.data[index];
                    if (dataVal !== undefined && dataVal !== null && dataVal > 0) {
                        ctx.save();
                        ctx.fillStyle = '#333333';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.font = 'bold 11px sans-serif';
                        const textStr = dataVal % 1 !== 0 ? dataVal.toFixed(2) : dataVal.toLocaleString();
                        ctx.fillText(textStr, bar.x, bar.y - 4);
                        ctx.restore();
                    }
                });
            });
        }
    };

    new Chart(ctx, {
        data: { labels: chartLabels, datasets: chartDatasets },
        plugins: useBarChart ? [barLabelPlugin] : [],
        options: {
            layout: { padding: { top: useBarChart ? 25 : 0 } },
            responsive: true,
            maintainAspectRatio: false,
            onClick: (evt, elements, chart) => {
                if (useBarChart) return;

                const points = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                if (points.length > 0) {
                    const datasetIndex = points[0].datasetIndex;
                    const clickedMethod = chart.data.datasets[datasetIndex].label;

                    window.selectedDetectionMethod = (window.selectedDetectionMethod === clickedMethod) ? null : clickedMethod;
                    chart.data.datasets.forEach(ds => {
                        const baseColor = targetColors[allMethodsEver.indexOf(ds.label) % targetColors.length];
                        const isHigh = window.selectedDetectionMethod === null || window.selectedDetectionMethod === ds.label;
                        ds.borderColor = isHigh ? baseColor : solidGray;
                        ds.backgroundColor = isHigh ? baseColor : solidGray;
                        ds.pointBackgroundColor = isHigh ? baseColor : solidGray;
                        ds.pointBorderColor = isHigh ? baseColor : solidGray;
                    });
                    chart.update();
                }
            },
            plugins: { 
                legend: { 
                    display: !useBarChart, 
                    position: 'right',
                    labels: { font: { size: 10 }, boxWidth: 12 },
                    onClick: (evt, legendItem, legend) => {
                        if (useBarChart) return;

                        const clickedMethod = legendItem.text;
                        const chart = legend.chart;

                        window.selectedDetectionMethod = (window.selectedDetectionMethod === clickedMethod) ? null : clickedMethod;

                        chart.data.datasets.forEach(ds => {
                            const baseColor = targetColors[allMethodsEver.indexOf(ds.label) % targetColors.length];
                            const isHigh = window.selectedDetectionMethod === null || window.selectedDetectionMethod === ds.label;
                            ds.borderColor = isHigh ? baseColor : solidGray;
                            ds.backgroundColor = isHigh ? baseColor : solidGray;
                            ds.pointBackgroundColor = isHigh ? baseColor : solidGray;
                            ds.pointBorderColor = isHigh ? baseColor : solidGray;
                        });
                        chart.update();
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            let labelStr = useBarChart && isSingleYear && !isSingleMethod ? context.label : context.dataset.label;
                            return `${labelStr}: ${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    stacked: !useBarChart,
                    title: { display: true, text: useBarChart && isSingleYear && !isSingleMethod ? 'Detection Method' : 'Year', font: { weight: 'bold' }, color: '#333' }
                },
                y: { 
                    stacked: !useBarChart, 
                    beginAtZero: true,
                    title: { display: true, text: 'Total Offenses', font: { weight: 'bold' }, color: '#333' }
                }
            }
        }
    });
}
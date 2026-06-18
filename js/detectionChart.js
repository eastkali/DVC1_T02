function renderDetectionChart(canvasId, dataset) {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;

    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="method"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const solidGray = '#D4D4D8'; 
    
    const firstRow = dataset[0];
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const methodKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('detect') || k.toLowerCase().includes('method')) || 'DETECTION_METHOD';
    const offenseKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('offense') || k.toLowerCase().includes('total') || k.toLowerCase().includes('count')) || 'OFFENSES';
    const finesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('fines'));
    const arrestsKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('arrests'));
    const chargesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('charges'));



    const selectedMethods = [...new Set(dataset.map(row => row[methodKey]?.toString().trim()))].filter(Boolean).sort();
    const allMethods = [...new Set(window.rawDatasets.main.map(row => row[methodKey]?.toString().trim()))].filter(Boolean).sort();

    const selectedYears = [...new Set(dataset.map(row => row[yearKey]?.toString().trim()))].filter(Boolean).sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
    });

    const isSingleYear = selectedYears.length === 1;
    const isSingleMethod = selectedMethods.length === 1; 
    
    const useBarChart = isSingleYear || isSingleMethod;

    if (typeof window.selectedDetectionMethod === 'undefined') {
        window.selectedDetectionMethod = null;
    }
    if (window.selectedDetectionMethod && !selectedMethods.includes(window.selectedDetectionMethod)) {
        window.selectedDetectionMethod = null;
    }

    let chartLabels = [];
    let chartDatasets = [];

    if (useBarChart) {
        if (isSingleYear && !isSingleMethod) {
            chartLabels = allMethods;
            const dataValues = allMethods.map(method => {
                return dataset
                    .filter(row => row[methodKey]?.toString().trim() === method)
                    .reduce((sum, row) => sum + (parseFloat(row[offenseKey]) || 0), 0);
            });

            const finesValues = allMethods.map(method => {
                return dataset
                    .filter(row => row[methodKey]?.toString().trim() === method)
                    .reduce((sum, row) => sum + (parseFloat(row[finesKey]) || 0), 0);
            });

            const arrestsValues = allMethods.map(method => {
                return dataset
                    .filter(row => row[methodKey]?.toString().trim() === method)
                    .reduce((sum, row) => sum + (parseFloat(row[arrestsKey]) || 0), 0);
            });

            const chargesValues = allMethods.map(method => {
                return dataset
                    .filter(row => row[methodKey]?.toString().trim() === method)
                    .reduce((sum, row) => sum + (parseFloat(row[chargesKey]) || 0), 0);
            });
            

            const barColors = selectedMethods.map(method => {
                return targetColors[allMethods.indexOf(method) % targetColors.length];
            });

            chartDatasets.push({
                type: 'bar',
                label: 'Offenses',
                data: dataValues,
                backgroundColor: barColors,
                borderColor: barColors,
                borderWidth: 1,
                borderRadius: 4,
                fines: finesValues,
                arrests: arrestsValues,
                charges: chargesValues,
            });
        } else {
            chartLabels = selectedYears;
            const method = selectedMethods[0];
            const color = targetColors[allMethods.indexOf(method) % targetColors.length];

            const dataValues = selectedYears.map(year => {
                return dataset
                    .filter(row => row[yearKey]?.toString().trim() === year)
                    .reduce((sum, row) => sum + (parseFloat(row[offenseKey]) || 0), 0);
            });

            const finesValues = selectedYears.map(year => {
                return dataset
                    .filter(row => row[yearKey]?.toString().trim() === year)
                    .reduce((sum, row) => sum + (parseFloat(row[finesKey]) || 0), 0);
            });

            const arrestsValues = selectedYears.map(year => {
                return dataset
                    .filter(row => row[yearKey]?.toString().trim() === year)
                    .reduce((sum, row) => sum + (parseFloat(row[arrestsKey]) || 0), 0);
            });

            const chargesValues = selectedYears.map(year => {
                return dataset
                    .filter(row => row[yearKey]?.toString().trim() === year)
                    .reduce((sum, row) => sum + (parseFloat(row[chargesKey]) || 0), 0);
            });
            

            chartDatasets.push({
                type: 'bar',
                label: method,
                data: dataValues,
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
                borderRadius: 4,
                fines: finesValues,
                arrests: arrestsValues,
                charges: chargesValues,
            });
        }
    } else {
        chartLabels = selectedYears;

        selectedMethods.forEach(method => {
            const baseColor = targetColors[allMethods.indexOf(method) % targetColors.length];
            let displayColor = baseColor;
            if (window.selectedDetectionMethod) {
                displayColor = (window.selectedDetectionMethod === method) ? baseColor : solidGray;
            }

            const dataValues = selectedYears.map(year => {
                return dataset
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
                    if (dataVal !== undefined && dataVal !== null && dataVal >= 0) {
                        ctx.save();
                        ctx.fillStyle = '#333333';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        ctx.font = 'bold 11px sans-serif';
                        const textStr = dataVal % 1 !== 0 ? dataVal.toFixed(2) : dataVal.toLocaleString();
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
        data: { labels: chartLabels, datasets: chartDatasets },
        plugins: useBarChart ? [barLabelPlugin] : [],
        options: {
            interaction: {
                mode: useBarChart ? 'x' : 'index',
                intersect: false
            },
            layout: { padding: { top: useBarChart ? 25 : 0 } },
            responsive: true,
            maintainAspectRatio: false,
            onClick: (evt, elements, chart) => {
                if (useBarChart) return;

                const points = chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
                if (points.length > 0) {
                    const datasetIndex = points[0].datasetIndex;
                    const clickedMethod = chart.data.datasets[datasetIndex].label;

                    window.selectedDetectionMethod = (window.selectedDetectionMethod === clickedMethod) ? null : clickedMethod;
                    chart.data.datasets.forEach(ds => {
                        const baseColor = targetColors[allMethods.indexOf(ds.label) % targetColors.length];
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
                            const baseColor = targetColors[allMethods.indexOf(ds.label) % targetColors.length];
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
                    position: 'cursor',
                    callbacks: {
                        label: (context) => {
                            let labelStr = useBarChart && isSingleYear && !isSingleMethod ? context.label : context.dataset.label;

                            if (useBarChart) {
                                const datasetObj = context.dataset;
                                const index = context.dataIndex; 

                                const fines = (datasetObj.fines?.[index] || 0).toLocaleString();
                                const arrests = (datasetObj.arrests?.[index] || 0).toLocaleString();
                                const charges = (datasetObj.charges?.[index] || 0).toLocaleString();

                                return [
                                    `${labelStr}: ${context.raw.toLocaleString()}`,
                                    `  • Fines Collected: ${fines}`,
                                    `  • Total Arrests: ${arrests}`,
                                    `  • Charges Filed: ${charges}`
                                ];
                            } else {
                                return `${labelStr}: ${context.raw.toLocaleString()}`;
                            }
                           
                        }
                    }
                }
            },
            scales: {
                x: { 
                    stacked: !useBarChart, 
                    title: { display: true, text: useBarChart && isSingleYear && !isSingleMethod ? 'Detection Method' : 'Year', font: { weight: 'bold' }, color: '#333' },
                    display: true,
                    grid: {
                        display: true,         
                        drawOnChartArea: true,  
                        drawTicks: true,       
                        offset: useBarChart  
                    },
                    ticks: {
                        autoSkip: true       
                    }
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
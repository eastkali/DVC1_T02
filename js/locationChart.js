function renderLocationChart(canvasId, dataset) {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;

    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="location"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    const firstRow = dataset[0];
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const locKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('loc')) || 'LOCATION';
    const finesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('fines'));
    const arrestsKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('arrests'));
    const chargesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('charges'));

    let selectedYears = [...new Set(dataset.map(row => row[yearKey] ? row[yearKey].toString().trim() : '').filter(y => y !== ''))].sort();

    let selectedLocations = [...new Set(dataset.map(row => row[locKey] ? row[locKey].toString().trim() : '').filter(l => l !== ''))];

    const getValue = (row) => {
        const keys = Object.keys(row);
        const k = keys.find(key => {
            const l = key.toLowerCase();
            return l.includes('offenses') ;
        });
        return (parseFloat(row[k]))? (parseFloat(row[k])) : 0;
    };

    // Sort locations from biggest to smallest
    const locTotals = {};
    selectedLocations.forEach(loc => {
        locTotals[loc] = dataset
            .filter(row => row[locKey] && row[locKey].toString().trim() === loc)
            .reduce((sum, row) => sum + getValue(row), 0);
    });
    selectedLocations.sort((a, b) => locTotals[b] - locTotals[a]);

    const yearlyTotals = {};
    selectedYears.forEach(year => {
        yearlyTotals[year] = dataset
            .filter(row => row[yearKey] && row[yearKey].toString().trim() === year)
            .reduce((sum, row) => sum + getValue(row), 0) || 1;
    });

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];

    const formatLegendLabel = (loc) => {
        if (loc === 'Major Cities of Australia') return ['Major Cities', 'of Australia'];
        if (loc.endsWith(' Australia') && loc !== 'Australia') {
            return [loc.replace(' Australia', ''), ' Australia'];
        }
        return loc;
    };

    const isSingleYear = selectedYears.length === 1;
    const isSingleLocation = selectedLocations.length === 1;
    const useBarChart = isSingleYear || isSingleLocation;
    const showPercentage = !isSingleLocation; 

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        chartLabels = selectedLocations.map(loc => formatLegendLabel(loc));
        const activeYearVal = selectedYears[0];
        
        const dataPoints = selectedLocations.map(loc => {
            const matches = dataset.filter(row => row[yearKey] && row[yearKey].toString().trim() === activeYearVal && row[locKey] && row[locKey].toString().trim() === loc);
            const sum = matches.reduce((s, row) => s + getValue(row), 0);
            return (sum / yearlyTotals[activeYearVal]) * 100;
        });

        const finesValues = selectedLocations.map(loc => {
                return dataset
                    .filter(row => row[locKey]?.toString().trim() === loc && row[yearKey]?.toString().trim() === activeYearVal)
                    .reduce((sum, row) => sum + (parseFloat(row[finesKey]) || 0), 0);
            });

            const arrestsValues = selectedLocations.map(loc => {
                return dataset
                    .filter(row => row[locKey]?.toString().trim() === loc && row[yearKey]?.toString().trim() === activeYearVal)
                    .reduce((sum, row) => sum + (parseFloat(row[arrestsKey]) || 0), 0);
            });

            const chargesValues = selectedLocations.map(loc => {
                return dataset
                    .filter(row => row[locKey]?.toString().trim() === loc && row[yearKey]?.toString().trim() === activeYearVal)
                    .reduce((sum, row) => sum + (parseFloat(row[chargesKey]) || 0), 0);
            });
            

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: selectedLocations.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4,
            fines: finesValues,
            arrests: arrestsValues,
            charges: chargesValues,            
        }];
    } else if (isSingleLocation) {
        chartLabels = selectedYears;
        const activeLoc = selectedLocations[0];

        const dataPoints = selectedYears.map(year => {
            const matches = dataset.filter(row => row[yearKey] && row[yearKey].toString().trim() === year && row[locKey] && row[locKey].toString().trim() === activeLoc);
            return matches.reduce((s, row) => s + getValue(row), 0);
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

        chartDatasets = [{
            label: Array.isArray(formatLegendLabel(activeLoc)) ? formatLegendLabel(activeLoc).join(' ') : formatLegendLabel(activeLoc),
            data: dataPoints,
            backgroundColor: targetColors[0],
            borderRadius: 4,
            fines: finesValues,
            arrests: arrestsValues,
            charges: chargesValues,
        }];
    } else {
        chartLabels = selectedYears;
        chartDatasets = selectedLocations.map((loc, index) => {
            const dataPoints = selectedYears.map(year => {
                const matches = dataset.filter(row => row[yearKey] && row[yearKey].toString().trim() === year && row[locKey] && row[locKey].toString().trim() === loc);
                const sum = matches.reduce((s, row) => s + getValue(row), 0);
                return (sum / yearlyTotals[year]) * 100;
            });

            return {
                label: formatLegendLabel(loc),
                data: dataPoints,
                backgroundColor: targetColors[index % targetColors.length],
                borderRadius: 0
            };
        });
    }
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
        type: 'bar',
        data: { labels: chartLabels, datasets: chartDatasets },
        plugins: [{
            id: 'topLabels',
            afterDatasetsDraw(chart) {
                if (!useBarChart) return;
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

                            const labelValue = showPercentage ? data.toFixed(1) + '%' : data.toLocaleString();
                            
                            ctx.fillText(labelValue, bar.x, bar.y - 4);
                            ctx.restore();
                        }
                    });
                });
            }
        }],
        options: {
            interaction: {
                mode: useBarChart ? 'x' : 'index',
                intersect: false
            },
            layout: { padding: { top: useBarChart ? 25 : 0 } },
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: !useBarChart, 
                    position: 'right',
                    labels: { font: { size: 10 }, boxWidth: 12, padding: 8 }
                },
                tooltip: { 
                    position: 'cursor',
                    callbacks: { 
                        label: (context) => {
                            let labelStr = "";
                            if (useBarChart) {
                                labelStr = Array.isArray(context.label) ? context.label.join(' ') : context.label;

                                const datasetObj = context.dataset;
                                const index = context.dataIndex; 

                                
                                const fines = datasetObj.fines?.[index] || 0;
                                const arrests = datasetObj.arrests?.[index] || 0;
                                const charges = datasetObj.charges?.[index] || 0;
                                const sum = fines + arrests +charges;

                                const finesStr = fines.toLocaleString();
                                const arrestsStr = arrests.toLocaleString();
                                const chargesStr = charges.toLocaleString();
                                const sumStr = sum.toLocaleString();

                                return [
                                    `${labelStr}: ${sumStr}`,
                                    `  • Fines Collected: ${finesStr}`,
                                    `  • Total Arrests: ${arrestsStr}`,
                                    `  • Charges Filed: ${chargesStr}`
                                ];

                            } else {
                                labelStr = context.dataset.label || "Value";
                                return showPercentage ? `${labelStr}: ${context.raw.toFixed(1)}%` : `${labelStr}: ${context.raw.toLocaleString()}`;
                        }
                        } 
                    } 
                }
            },
            scales: {
                x: { 
                    stacked: !useBarChart,
                    grid: {
                        display: true,         
                        drawOnChartArea: true,  
                        drawTicks: true,       
                        offset: useBarChart  
                    },
                    ticks: {
                        autoSkip: false       
                    }
                },
                y: { 
                    stacked: !useBarChart, 
                    max: showPercentage && !useBarChart ? 100 : undefined, 
                    ticks: { callback: v => showPercentage ? v + '%' : v.toLocaleString() } 
                }
            }
        }
    });
}
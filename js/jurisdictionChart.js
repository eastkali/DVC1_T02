function renderJurisdictionChart(canvasId, dataset) {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;

    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="jurisdiction"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    const firstRow = dataset[0] || {};
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const jurisKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'jurisdiction') || 'JURISDICTION';
    const finesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('fines'));
    const arrestsKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('arrests'));
    const chargesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('charges'));

    const selectedJurisdictions = [...new Set(dataset.map(row => row[jurisKey] ? row[jurisKey].toString().trim() : '').filter(Boolean))].sort();
    const allJurisdictions = [...new Set(window.rawDatasets.main.map(row => row[jurisKey] ? row[jurisKey].toString().trim() : '').filter(Boolean))].sort();

    const selectedYears = [...new Set(dataset.map(row => row[yearKey]?.toString().trim()))].filter(Boolean).sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
    });

    const getValue = (row) => {
        const keys = Object.keys(row);
        const k = keys.find(key => {
            const l = key.toLowerCase();
            return l.includes('offenses') ;
        });
        return (parseFloat(row[k]))? (parseFloat(row[k])) : 0;
    };

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const targetShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot', 'rectRounded'];
    
    const isSingleYear = selectedYears.length === 1;
    const isSingleJurisdiction = selectedJurisdictions.length === 1;
    const useBarChart = isSingleYear || isSingleJurisdiction;

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        chartLabels = selectedJurisdictions;
        const activeYearVal = selectedYears[0];

        const dataPoints = selectedJurisdictions.map(juris => {
            const matches = dataset.filter(row => row[jurisKey] && row[jurisKey].toString().trim() === juris && row[yearKey] && row[yearKey].toString().trim() === activeYearVal);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });

        const finesValues = selectedJurisdictions.map(juris => {
            return dataset
                .filter(row => row[jurisKey]?.toString().trim() === juris)
                .reduce((sum, row) => sum + (parseFloat(row[finesKey]) || 0), 0);
        });

        const arrestsValues = selectedJurisdictions.map(juris => {
            return dataset
                .filter(row => row[jurisKey]?.toString().trim() === juris)
                .reduce((sum, row) => sum + (parseFloat(row[arrestsKey]) || 0), 0);
        });

        const chargesValues = selectedJurisdictions.map(juris => {
            return dataset
                .filter(row => row[jurisKey]?.toString().trim() === juris)
                .reduce((sum, row) => sum + (parseFloat(row[chargesKey]) || 0), 0);
        });

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: selectedJurisdictions.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4,
            fines: finesValues,
            arrests: arrestsValues,
            charges: chargesValues,
        }];
    } else if (isSingleJurisdiction) {
        chartLabels = selectedYears;
        const activeJurisVal = selectedJurisdictions[0];
        const color = targetColors[allJurisdictions.indexOf(activeJurisVal) % targetColors.length];

        const dataPoints = selectedYears.map(year => {
            const matches = dataset.filter(row => row[jurisKey] && row[jurisKey].toString().trim() === activeJurisVal && row[yearKey] && row[yearKey].toString().trim() === year);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
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
            label: activeJurisVal,
            data: dataPoints,
            backgroundColor: color,
            borderRadius: 4,
            fines: finesValues,
            arrests: arrestsValues,
            charges: chargesValues,
        }];
    } else {
        chartLabels = selectedYears;

        selectedJurisdictions.forEach(jurisdiction => {
            const color = targetColors[allJurisdictions.indexOf(jurisdiction) % targetColors.length];
            const shape = targetShapes[allJurisdictions.indexOf(jurisdiction) % targetShapes.length];

            const dataPoints = selectedYears.map(year => {
                return dataset
                    .filter(row => row[jurisKey] && row[jurisKey].toString().trim() === jurisdiction && row[yearKey] && row[yearKey].toString().trim() === year)
                    .reduce((sum, row) => sum + getValue(row), 0);
            });

            chartDatasets.push({
                label: jurisdiction, 
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
                    if (data) {
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
            interaction: {
                mode: useBarChart ? 'x' : 'index',
                intersect: false
            },
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
                            return `${labelStr}: ${context.raw % 1 !== 0 ? context.raw.toFixed(2) : context.raw.toLocaleString()}`;
                            }
                        }
                    }
                }
            }, 
            scales: { 
                x: { 
                    title: { display: true, text: isSingleYear ? 'Jurisdiction' : 'Year', font: { weight: 'bold' }, color: '#333' } ,
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
                    beginAtZero: true, 
                    title: { display: true, text: 'Total Offenses', font: { weight: 'bold' }, color: '#333' } 
                } 
            } 
        }
    });
}
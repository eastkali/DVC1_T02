function renderAgeGroupChart(canvasId, dataset) {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;

    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="age"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    const firstRow = dataset[0] || {};
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const ageKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('age')) || 'AGE_GROUP';
    const finesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('fines'));
    const arrestsKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('arrests'));
    const chargesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('charges'));

    let selectedAges = [...new Set(dataset.map(row => row[ageKey] ? row[ageKey].toString().trim() : '').filter(Boolean))].sort();
    let allAges = [...new Set(window.rawDatasets.loc_age.map(row => row[ageKey] ? row[ageKey].toString().trim() : '').filter(Boolean))].sort();
    let selectedYears = [...new Set(dataset.map(row => row[yearKey] ? row[yearKey].toString().trim() : '').filter(Boolean))].sort((a, b) => {
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
        return (parseFloat(row[k]))? (parseFloat(row[k])) : 0;
    };

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const targetShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot', 'rectRounded'];
    
    const isSingleYear = selectedYears.length === 1;
    const isSingleAge = selectedAges.length === 1;
    const useBarChart = isSingleYear || isSingleAge;

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        chartLabels = selectedAges;
        const activeYearVal = selectedYears[0];

        const dataPoints = selectedAges.map(age => {
            const matches = dataset.filter(row => row[ageKey] && row[ageKey].toString().trim() === age && row[yearKey] && row[yearKey].toString().trim() === activeYearVal);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });

        const finesValues = selectedAges.map(age => {
            return dataset
                .filter(row => row[ageKey]?.toString().trim() === age)
                .reduce((sum, row) => sum + (parseFloat(row[finesKey]) || 0), 0);
        });

        const arrestsValues = selectedAges.map(age => {
            return dataset
                .filter(row => row[ageKey]?.toString().trim() === age)
                .reduce((sum, row) => sum + (parseFloat(row[arrestsKey]) || 0), 0);
        });

        const chargesValues = selectedAges.map(age => {
            return dataset
                .filter(row => row[ageKey]?.toString().trim() === age)
                .reduce((sum, row) => sum + (parseFloat(row[chargesKey]) || 0), 0);
        });
     

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: selectedAges.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4,
            fines: finesValues,
            arrests: arrestsValues,
            charges: chargesValues,
        }];
    } else if (isSingleAge) {
        chartLabels = selectedYears;
        const activeAgeVal = selectedAges[0];

        const dataPoints = selectedYears.map(year => {
            const matches = dataset.filter(row => row[ageKey] && row[ageKey].toString().trim() === activeAgeVal && row[yearKey] && row[yearKey].toString().trim() === year);
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
            label: activeAgeVal,
            data: dataPoints,
            backgroundColor: targetColors[0],
            borderRadius: 4,
            fines: finesValues,
            arrests: arrestsValues,
            charges: chargesValues,
        }];
    } else {
        chartLabels = selectedYears;
        
        selectedAges.forEach(age => {
            const color = targetColors[allAges.indexOf(age) % targetColors.length];
            const shape = targetShapes[allAges.indexOf(age) % targetShapes.length];

           const dataPoints = selectedYears.map(year => {
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
                    title: { display: true, text: isSingleYear ? 'Age Group' : 'Year', font: { weight: 'bold' }, color: '#333' },
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
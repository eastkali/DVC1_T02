function renderNormalizedChart(canvasId, dataset) {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;


    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="normalized"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    // const filters = window.getActiveFilters ? window.getActiveFilters() : { year: ['all'], jurisdiction: ['all'], age: ['all'] };

    const firstRow = dataset[0] || {};
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const jurisKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'jurisdiction') || 'JURISDICTION';
    const ageKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('age')) || 'AGE_GROUP';
    const normKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('10k') || k.toLowerCase().includes('count')) || 'COUNT_PER_10K';
    const finesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('fines'));
    const arrestsKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('arrests'));
    const chargesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('charges'));
    const licenseHoldersKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('total'));

    // const activeYearFilter = (filters.year || ['all']).map(v => v.toString().trim());
    // const activeJurisFilter = (filters.jurisdiction || ['all']).map(v => v.toString().trim());
    
    // let activeAge = filters.age || filters.ageGroup || filters.age_group || ['all'];
    // const activeAgeFilter = activeAge.map(v => v.toString().trim());

    // let dataset = dataset.filter(row => {
    //     if (!activeYearFilter.includes('all') && row[yearKey] && !activeYearFilter.includes(row[yearKey].toString().trim())) return false;
    //     if (!activeJurisFilter.includes('all') && row[jurisKey] && !activeJurisFilter.includes(row[jurisKey].toString().trim())) return false;
    //     if (!activeAgeFilter.includes('all') && ageKey && row[ageKey] && !activeAgeFilter.includes(row[ageKey].toString().trim())) return false;
    //     return true;
    // });

    let selectedJurisdictions = [...new Set(dataset.map(row => row[jurisKey] ? row[jurisKey].toString().trim() : '').filter(Boolean))].sort();
    let allJurisdictions = [...new Set(window.rawDatasets.main.map(row => row[jurisKey] ? row[jurisKey].toString().trim() : '').filter(Boolean))].sort();
    let years = [...new Set(dataset.map(row => row[yearKey] ? row[yearKey].toString().trim() : '').filter(Boolean))].sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''));
        const numB = parseInt(b.replace(/\D/g, ''));
        return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
    });
    console.log(dataset)
    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const targetShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot', 'rectRounded'];
    
    const isSingleYear = years.length === 1;
    const isSingleJurisdiction = selectedJurisdictions.length === 1;
    const useBarChart = isSingleYear || isSingleJurisdiction;

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        chartLabels = selectedJurisdictions;
        const activeYearVal = years.length === 1 ? years[0] : activeYearFilter[0];

        const dataPoints = selectedJurisdictions.map(juris => {
            const matches = dataset.filter(row => row[jurisKey] && row[jurisKey].toString().trim() === juris && row[yearKey] && row[yearKey].toString().trim() === activeYearVal);
            return matches.reduce((sum, row) => sum + (parseFloat(row[normKey]) || 0), 0);
        });

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: selectedJurisdictions.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4
        }];
    } else if (isSingleJurisdiction) {
        chartLabels = years;
        const activeJurisVal = selectedJurisdictions[0];
        const color = targetColors[allJurisdictions.indexOf(activeJurisVal) % targetColors.length];

        const dataPoints = years.map(year => {
            const matches = dataset.filter(row => row[jurisKey] && row[jurisKey].toString().trim() === activeJurisVal && row[yearKey] && row[yearKey].toString().trim() === year);
            return matches.reduce((sum, row) => sum + (parseFloat(row[normKey]) || 0), 0);
        });

        const finesValues = years.map(year => {
            return dataset
                .filter(row => row[yearKey]?.toString().trim() === year)
                .reduce((sum, row) => sum + (parseFloat(row[finesKey]) || 0), 0);
        });

        const arrestsValues = years.map(year => {
            return dataset
                .filter(row => row[yearKey]?.toString().trim() === year)
                .reduce((sum, row) => sum + (parseFloat(row[arrestsKey]) || 0), 0);
        });

        const chargesValues = years.map(year => {
            return dataset
                .filter(row => row[yearKey]?.toString().trim() === year)
                .reduce((sum, row) => sum + (parseFloat(row[chargesKey]) || 0), 0);
        });

        const licenseHoldersValues = years.map(year => {
            return dataset
                .filter(row => row[yearKey]?.toString().trim() === year)
                .reduce((sum, row) => sum + (parseFloat(row[licenseHoldersKey]) || 0), 0);
        });

        chartDatasets = [{
            label: activeJurisVal,
            data: dataPoints,
            backgroundColor: color,
            borderRadius: 4,
            fines: finesValues,
            arrests: arrestsValues,
            charges: chargesValues,
            licenseHolders: licenseHoldersValues,
        }];
    } else {
        chartLabels = years;
        chartDatasets = selectedJurisdictions.map((juris, index) => {
            const dataPoints = years.map(year => {
                const matches = dataset.filter(row => row[jurisKey] && row[jurisKey].toString().trim() === juris && row[yearKey] && row[yearKey].toString().trim() === year);
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
                        const textStr = data.toLocaleString();
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
                intersect: false,
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
                                const licenseHolders = (datasetObj.licenseHolders?.[index] || 0).toLocaleString();

                                return [
                                    `${labelStr}: ${context.raw.toLocaleString()}`,
                                    `  • Fines Collected: ${fines}`,
                                    `  • Total Arrests: ${arrests}`,
                                    `  • Charges Filed: ${charges}`,
                                    `  • License Holders count: ${licenseHolders}`,
                                    
                                ];
                            } else {
                                return `${labelStr}: ${context.raw.toFixed(2)}`;
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
                        autoSkip: true       
                    }
                },
                y: { 
                    beginAtZero: true, 
                    title: { display: true, text: 'Offenses per 10,000 Licenses', font: { weight: 'bold' }, color: '#333' } 
                } 
            } 
        }
    });
}
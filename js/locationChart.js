function renderLocationChart(arg1, arg2) {
    let canvasId = 'locationChart';
    let dataset = arg1;
    if (arg2 !== undefined) { canvasId = arg1; dataset = arg2; }
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;

    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="location"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    const filters = window.getActiveFilters ? window.getActiveFilters() : { year: ['all'], location: ['all'] };
    
    const firstRow = dataset[0];
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const locKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('loc')) || 'LOCATION';

    let filteredData = dataset.filter(row => {
        if (filters.year && !filters.year.includes('all') && row[yearKey] && !filters.year.includes(row[yearKey].toString().trim())) return false;
        if (filters.location && !filters.location.includes('all') && row[locKey] && !filters.location.includes(row[locKey].toString().trim())) return false;
        return true;
    });

    let years = [...new Set(filteredData.map(row => row[yearKey] ? row[yearKey].toString().trim() : '').filter(y => y !== ''))].sort();
    let uniqueLocations = [...new Set(filteredData.map(row => row[locKey] ? row[locKey].toString().trim() : '').filter(l => l !== ''))];

    const getValue = (row) => {
        const keys = Object.keys(row);
        const k = keys.find(key => {
            const l = key.toLowerCase();
            return l.includes('offen') || l.includes('total') || l.includes('count') || l.includes('fine');
        });
        return k ? (parseFloat(row[k]) || 1) : 1;
    };

    // Sort locations from biggest to smallest
    const locTotals = {};
    uniqueLocations.forEach(loc => {
        locTotals[loc] = filteredData
            .filter(row => row[locKey] && row[locKey].toString().trim() === loc)
            .reduce((sum, row) => sum + getValue(row), 0);
    });
    uniqueLocations.sort((a, b) => locTotals[b] - locTotals[a]);

    const yearlyTotals = {};
    years.forEach(year => {
        yearlyTotals[year] = filteredData
            .filter(row => row[yearKey] && row[yearKey].toString().trim() === year)
            .reduce((sum, row) => sum + getValue(row), 0) || 1;
    });

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];

    const formatLegendLabel = (loc) => {
        if (loc === 'Major Cities of Australia') return ['Major Cities', 'of Australia'];
        if (loc.endsWith(' Australia') && loc !== 'Australia') {
            return [loc.replace(' Australia', ''), 'Australia'];
        }
        return loc;
    };

    const activeYear = filters.year || ['all'];
    const isSingleYear = (activeYear.length === 1 && activeYear[0] !== 'all') || (years.length === 1);
    const isSingleLocation = uniqueLocations.length === 1;
    const useBarChart = isSingleYear || isSingleLocation;
    const showPercentage = !isSingleLocation; 

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        chartLabels = uniqueLocations.map(loc => formatLegendLabel(loc));
        const activeYearVal = (activeYear.length === 1 && activeYear[0] !== 'all') ? activeYear[0] : years[0];
        
        const dataPoints = uniqueLocations.map(loc => {
            const matches = filteredData.filter(row => row[yearKey] && row[yearKey].toString().trim() === activeYearVal && row[locKey] && row[locKey].toString().trim() === loc);
            const sum = matches.reduce((s, row) => s + getValue(row), 0);
            return (sum / yearlyTotals[activeYearVal]) * 100;
        });

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: uniqueLocations.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4
        }];
    } else if (isSingleLocation) {
        chartLabels = years;
        const activeLoc = uniqueLocations[0];

        const dataPoints = years.map(year => {
            const matches = filteredData.filter(row => row[yearKey] && row[yearKey].toString().trim() === year && row[locKey] && row[locKey].toString().trim() === activeLoc);
            return matches.reduce((s, row) => s + getValue(row), 0);
        });

        chartDatasets = [{
            label: Array.isArray(formatLegendLabel(activeLoc)) ? formatLegendLabel(activeLoc).join(' ') : formatLegendLabel(activeLoc),
            data: dataPoints,
            backgroundColor: targetColors[0],
            borderRadius: 4
        }];
    } else {
        chartLabels = years;
        chartDatasets = uniqueLocations.map((loc, index) => {
            const dataPoints = years.map(year => {
                const matches = filteredData.filter(row => row[yearKey] && row[yearKey].toString().trim() === year && row[locKey] && row[locKey].toString().trim() === loc);
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
            layout: { padding: { top: useBarChart ? 25 : 0 } },
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: !useBarChart, 
                    position: 'right',
                    labels: { font: { size: 10 }, boxWidth: 10, padding: 10 }
                },
                tooltip: { 
                    callbacks: { 
                        label: (context) => {
                            let labelStr = "";
                            if (isSingleYear) labelStr = Array.isArray(context.label) ? context.label.join(' ') : context.label;
                            else labelStr = context.dataset.label || "Value";
                            return showPercentage ? `${labelStr}: ${context.raw.toFixed(1)}%` : `${labelStr}: ${context.raw.toLocaleString()}`;
                        } 
                    } 
                }
            },
            scales: {
                x: { stacked: !useBarChart },
                y: { 
                    stacked: !useBarChart, 
                    max: showPercentage && !useBarChart ? 100 : undefined, 
                    ticks: { callback: v => showPercentage ? v + '%' : v.toLocaleString() } 
                }
            }
        }
    });
}
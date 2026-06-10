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

    const activeYearFilter = (filters.year || ['all']).map(v => v.toString().trim());
    const activeLocFilter = (filters.location || ['all']).map(v => v.toString().trim());

    let filteredData = dataset.filter(row => {
        if (!activeYearFilter.includes('all') && row[yearKey] && !activeYearFilter.includes(row[yearKey].toString().trim())) return false;
        if (!activeLocFilter.includes('all') && row[locKey] && !activeLocFilter.includes(row[locKey].toString().trim())) return false;
        return true;
    });

    let uniqueLocations = [...new Set(filteredData.map(row => row[locKey] ? row[locKey].toString().trim() : '').filter(l => l !== ''))].sort();
    let years = [...new Set(filteredData.map(row => row[yearKey] ? row[yearKey].toString().trim() : '').filter(y => y !== ''))].sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''));
        const numB = parseInt(b.replace(/\D/g, ''));
        return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
    });

    const getValue = (row) => {
        const keys = Object.keys(row);
        const k = keys.find(key => {
            const l = key.toLowerCase();
            return l.includes('offen') || l.includes('total') || l.includes('count') || l.includes('fine');
        });
        return k ? (parseFloat(row[k]) || 1) : 1;
    };

    const yearlyTotals = {};
    years.forEach(year => {
        yearlyTotals[year] = filteredData
            .filter(row => row[yearKey] && row[yearKey].toString().trim() === year)
            .reduce((sum, row) => sum + getValue(row), 0) || 1;
    });

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#f0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];

    const formatLegendLabel = (loc) => {
        if (loc === 'Major Cities of Australia') return ['Major Cities', 'of Australia'];
        if (loc.endsWith(' Australia') && loc !== 'Australia') return [loc.replace(' Australia', ''), 'Australia'];
        return loc;
    };

    const isSingleYear = (activeYearFilter.length === 1 && activeYearFilter[0] !== 'all') || years.length === 1;
    const isSingleLocation = (activeLocFilter.length === 1 && activeLocFilter[0] !== 'all') || uniqueLocations.length === 1;
    
    const isStacked = !isSingleYear && !isSingleLocation; 
    
    const showPercentage = isStacked; 

    let chartLabels = [];
    let chartDatasets = [];

    if (isSingleYear) {
        chartLabels = uniqueLocations.map(loc => formatLegendLabel(loc));
        const activeYearVal = years[0];
        
        const dataPoints = uniqueLocations.map(loc => {
            const matches = filteredData.filter(row => row[yearKey] && row[yearKey].toString().trim() === activeYearVal && row[locKey] && row[locKey].toString().trim() === loc);
            return matches.reduce((s, row) => s + getValue(row), 0); // Plotting exact RAW NUMBER now
        });

        chartDatasets = [{
            data: dataPoints,
            backgroundColor: uniqueLocations.map((_, index) => targetColors[index % targetColors.length]),
            borderRadius: 4
        }];
    } else if (isSingleLocation) {
        chartLabels = years;
        const activeLocVal = uniqueLocations[0];

        const dataPoints = years.map(year => {
            const matches = filteredData.filter(row => row[yearKey] && row[yearKey].toString().trim() === year && row[locKey] && row[locKey].toString().trim() === activeLocVal);
            return matches.reduce((s, row) => s + getValue(row), 0);
        });

        chartDatasets = [{
            label: Array.isArray(formatLegendLabel(activeLocVal)) ? formatLegendLabel(activeLocVal).join(' ') : formatLegendLabel(activeLocVal),
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

    const barLabelPlugin = {
        id: 'topLabels',
        afterDatasetsDraw(chart) {
            if (isStacked) return; // Disables labels for the stacked chart so they don't overlap
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
                        const textStr = showPercentage ? data.toFixed(1) + '%' : data.toLocaleString();
                        ctx.fillText(textStr, bar.x, bar.y - 4);
                        ctx.restore();
                    }
                });
            });
        }
    };

    new Chart(ctx, {
        type: 'bar',
        data: { labels: chartLabels, datasets: chartDatasets },
        plugins: [barLabelPlugin],
        options: {
            interaction: { mode: 'index', intersect: true },
            layout: { padding: { top: isStacked ? 0 : 25 } },
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: isStacked, 
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
                x: { stacked: isStacked },
                y: { 
                    stacked: isStacked, 
                    max: showPercentage ? 100 : undefined, 
                    ticks: { callback: v => showPercentage ? v + '%' : v.toLocaleString() },
                    title: { display: true, text: showPercentage ? 'Percentage (%)' : 'Total Offenses', font: { weight: 'bold' }, color: '#333' } 
                }
            }
        }
    });
}
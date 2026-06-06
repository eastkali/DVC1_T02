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
        if (filters.year && !filters.year.includes('all') && row[yearKey] && !filters.year.includes(row[yearKey].toString())) return false;
        if (filters.location && !filters.location.includes('all') && row[locKey] && !filters.location.includes(row[locKey].toString())) return false;
        return true;
    });

    let years = [...new Set(filteredData.map(row => row[yearKey]).filter(Boolean))].map(y => y.toString()).sort();
    let uniqueLocations = [...new Set(filteredData.map(row => row[locKey]).filter(Boolean))].map(l => l.toString().trim()).sort();

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
            .filter(row => row[yearKey] && row[yearKey].toString() === year)
            .reduce((sum, row) => sum + getValue(row), 0) || 1;
    });

    const targetColors = ['#009E73', '#E69F00', '#D55E00', '#0072B2', '#CC79A7', '#F0E442', '#000000'];

    const formatLegendLabel = (loc) => {
        if (loc === 'Major Cities of Australia') return ['Major Cities', 'of Australia'];
        if (loc.endsWith(' Australia') && loc !== 'Australia') {
            return [loc.replace(' Australia', ''), 'Australia'];
        }
        return loc;
    };

    const datasets = uniqueLocations.map((loc, index) => {
        const dataPoints = years.map(year => {
            const matches = filteredData.filter(row => row[yearKey] && row[yearKey].toString() === year && row[locKey] && row[locKey].toString().trim() === loc);
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

    new Chart(ctx, {
        type: 'bar',
        data: { labels: years, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: true, 
                    position: 'right',
                    labels: {
                        font: { size: 10 },
                        boxWidth: 10,
                        padding: 10
                    }
                },
                tooltip: { 
                    callbacks: { 
                        label: (context) => {
                            let labelStr = Array.isArray(context.dataset.label) ? context.dataset.label.join(' ') : context.dataset.label;
                            return `${labelStr}: ${context.raw.toFixed(1)}%`;
                        } 
                    } 
                }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, max: 100, ticks: { callback: v => v + '%' } }
            }
        }
    });
}
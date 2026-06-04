function renderLocationChartDynamic(canvasId, dataset) {
    if (!dataset) return;
    const filters = getActiveFilters();
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (activeChartInstances[canvasId]) {
        activeChartInstances[canvasId].destroy();
    }

    let filtered = dataset.filter(row => {
        if (filters.year !== 'all' && row['YEAR'] && row['YEAR'] !== filters.year) return false;
        if (filters.location !== 'all' && row['LOCATION'] && row['LOCATION'] !== filters.location) return false;
        return true;
    });

    const isSingleYear = (filters.year !== 'all');
    let chartData;

    const colors = ['#56B4E9', '#009E73', '#E69F00', '#D55E00', '#0072B2', '#CC79A7', '#F0E442'];

    let chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { position: 'bottom' } 
        }
    };

    if (isSingleYear) {
        // Pie Chart
        const grouped = {};
        filtered.forEach(row => {
            const loc = row['LOCATION'];
            if (!loc || loc === 'Unknown') return;
            const val = parseFloat(row['Sum(OFFENSES_SUM)']) || 0;
            grouped[loc] = (grouped[loc] || 0) + val;
        });
        
        chartData = {
            labels: Object.keys(grouped).sort(),
            datasets: [{
                label: 'Violations',
                data: Object.keys(grouped).sort().map(k => grouped[k]),
                backgroundColor: colors,
                borderWidth: 1
            }]
        };
    } else {
        // Stacked Bar Chart
        const years = [...new Set(filtered.map(r => r.YEAR))].sort((a,b) => a-b);
        const locations = [...new Set(filtered.map(r => r.LOCATION))].filter(l => l && l !== 'Unknown').sort();
        
        const datasetsArr = locations.map((loc, i) => {
            const data = years.map(y => {
                return filtered.filter(r => r.YEAR == y && r.LOCATION === loc)
                               .reduce((sum, r) => sum + (parseFloat(r['Sum(OFFENSES_SUM)']) || 0), 0);
            });
            return {
                label: loc,
                data: data,
                backgroundColor: colors[i % colors.length]
            };
        });
        chartData = { labels: years, datasets: datasetsArr };

        chartOptions.scales = {
            x: { stacked: true },
            y: { stacked: true }
        };
    }

    activeChartInstances[canvasId] = new Chart(ctx, {
        type: isSingleYear ? 'pie' : 'bar', // dynamically switches between pie and bar
        data: chartData,
        options: chartOptions
    });
}
function renderAgeGroupChartDynamic(canvasId, dataset) {
    if (!dataset) return;
    const filters = window.getActiveFilters();
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (activeChartInstances[canvasId]) {
        activeChartInstances[canvasId].destroy();
    }

    let filtered = dataset.filter(row => {
        if (filters.year !== 'all' && row['YEAR'] && row['YEAR'] !== filters.year) return false;
        if (filters.age !== 'all' && row['AGE_GROUP'] && row['AGE_GROUP'] !== filters.age) return false;
        return true;
    });

    // determine chart mode: <1 (bar) and >1 (line)
    const isSingleYear = (filters.year !== 'all');
    let chartData;
    const colors = window.okabeItoColors || ['#56B4E9', '#009E73', '#E69F00', '#D55E00', '#0072B2'];
    const shapes = window.pointShapes || ['circle', 'rect', 'triangle', 'rectRot', 'star'];

    if (isSingleYear) {
        const grouped = {};
        filtered.forEach(row => {
            const age = row['AGE_GROUP'];
            if (!age || age === 'Unknown') return;
            const val = parseFloat(row['Sum(OFFENSES_SUM)']) || 0;
            grouped[age] = (grouped[age] || 0) + val;
        });
        chartData = {
            labels: Object.keys(grouped).sort(),
            datasets: [{
                label: 'Violations',
                data: Object.keys(grouped).sort().map(k => grouped[k]),
                backgroundColor: colors[1]
            }]
        };
    } else {
        const years = [...new Set(filtered.map(r => r.YEAR))].sort((a,b) => a-b);
        const ages = [...new Set(filtered.map(r => r.AGE_GROUP))].filter(a => a && a !== 'Unknown').sort();
        
         // build dataset per age group
        const datasetsArr = ages.map((age, i) => {
            const data = years.map(y => {
                return filtered.filter(r => r.YEAR == y && r.AGE_GROUP === age)
                               .reduce((sum, r) => sum + (parseFloat(r['Sum(OFFENSES_SUM)']) || 0), 0);
            });
            return {
                label: age,
                data: data,
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length],
                pointStyle: shapes[i % shapes.length],
                pointRadius: 6,
                pointHoverRadius: 9,
                tension: 0.3
            };
        });
        chartData = { labels: years, datasets: datasetsArr };
    }

    activeChartInstances[canvasId] = new Chart(ctx, {
        type: isSingleYear ? 'bar' : 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false }, // tooltip interaction
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Violations' } },
                x: { title: { display: true, text: isSingleYear ? 'Age Group' : 'Year' } }
            }
        }
    });
}
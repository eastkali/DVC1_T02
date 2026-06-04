function renderYearChartDynamic(canvasId, dataset) {
    if (!dataset) return;
    const filters = window.getActiveFilters(); 
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (activeChartInstances[canvasId]) {
        activeChartInstances[canvasId].destroy();
    }

    let filtered = dataset.filter(row => {
        if (filters.year !== 'all' && row['YEAR'] && row['YEAR'] !== filters.year) return false;
        if (filters.jurisdiction !== 'all' && row['JURISDICTION'] && row['JURISDICTION'] !== filters.jurisdiction) return false;
        return true;
    });

    const isSingleYear = (filters.year !== 'all');
    const chartType = isSingleYear ? 'bar' : 'line';
    const mainColor = window.okabeItoColors ? window.okabeItoColors[4] : '#0072B2'; 
    const grouped = {};
    filtered.forEach(row => {
        const year = row['YEAR'];
        if (!year) return;
        const val = parseFloat(row['Sum(OFFENSES_SUM)']) || parseFloat(row['OFFENSES_SUM (Sum)']) || 0;
        grouped[year] = (grouped[year] || 0) + val;
    });

    const labels = Object.keys(grouped).sort((a,b) => a - b);
    const dataValues = labels.map(k => grouped[k]);

    activeChartInstances[canvasId] = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Violations',
                data: dataValues,
                backgroundColor: chartType === 'line' ? 'rgba(0, 114, 178, 0.15)' : mainColor,
                borderColor: mainColor,
                fill: true,
                pointStyle: window.pointShapes ? window.pointShapes[0] : 'circle',
                pointRadius: 6,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Violations' } },
                x: { title: { display: true, text: 'Year' } }
            }
        }
    });
}
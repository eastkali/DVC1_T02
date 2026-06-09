function renderDetectionChart(arg1, arg2) {
    let canvasId = 'detectionChart';
    let dataset = arg1;
    if (arg2 !== undefined) { canvasId = arg1; dataset = arg2; }
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;

    let ctx = document.getElementById(canvasId);
    if (!ctx) ctx = document.querySelector('canvas[id*="method"]');
    if (!ctx) return;

    let existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    const filters = window.getActiveFilters ? window.getActiveFilters() : { year: ['all'], method: ['all'] };
    
    const firstRow = dataset[0];
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const methodKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('detect') || k.toLowerCase().includes('method')) || 'DETECTION_METHOD';

    let filteredData = dataset.filter(row => {
        if (filters.year && !filters.year.includes('all') && row[yearKey] && !filters.year.includes(row[yearKey].toString())) return false;
        if (filters.method && !filters.method.includes('all') && row[methodKey] && !filters.method.includes(row[methodKey].toString())) return false;
        return true;
    });

    let uniqueMethods = [...new Set(filteredData.map(row => row[methodKey]).filter(Boolean))].map(m => m.toString().trim()).sort();
    let years = [...new Set(filteredData.map(row => row[yearKey]).filter(Boolean))].map(y => y.toString()).sort();

    const getValue = (row) => {
        const keys = Object.keys(row);
        const k = keys.find(key => {
            const l = key.toLowerCase();
            return l.includes('offen') || l.includes('total') || l.includes('count') || l.includes('fine');
        });
        return k ? (parseFloat(row[k]) || 1) : 1;
    };

    const targetColors = ['#009E73', '#E69F00', '#D55E00', '#0072B2', '#CC79A7', '#F0E442', '#000000'];

    const isSingleYear = years.length === 1;

    const datasets = uniqueMethods.map((method, index) => {
        const dataPoints = years.map(year => {
            const matches = filteredData.filter(row => row[methodKey] && row[methodKey].toString().trim() === method && row[yearKey] == year);
            return matches.reduce((sum, row) => sum + getValue(row), 0);
        });
        const color = targetColors[index % targetColors.length];
        return {
            label: method,
            data: dataPoints,
            borderColor: color,
            backgroundColor: color,
            fill: !isSingleYear, // Turn off area fill forbars
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
        };
    });

    new Chart(ctx, {
        type: isSingleYear ? 'bar' : 'line',
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
                        boxWidth: 12
                    }
                } 
            },
            scales: {
                // Switch from stacked area to bars if a single year is selected
                x: { stacked: !isSingleYear },
                y: { stacked: !isSingleYear, beginAtZero: true }
            }
        }
    });
}
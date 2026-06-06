window.chartShapes = ['circle', 'rect', 'star', 'triangle', 'rectRot', 'cross', 'crossRot'];
window.createMultiLineChart = function(ctx, labels, datasets, yAxisLabel) {
    return new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: window.getInteractiveLegend() },
            scales: {
                x: { title: { display: true, text: 'Year' } },
                y: { beginAtZero: true, title: { display: true, text: yAxisLabel } }
            }
        }
    });
};
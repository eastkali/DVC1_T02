function renderDetectionChart(canvasId, dataset) {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;
    let canvas = document.getElementById(canvasId) || document.querySelector('canvas[id*="method"]');
    if (!canvas) return;

    if (typeof Chart !== 'undefined') { let existing = Chart.getChart(canvas); if (existing) existing.destroy(); }
    const container = d3.select(canvas.parentNode);
    canvas.style.display = 'none';
    if (container.node()._d3Observer) container.node()._d3Observer.disconnect();
    container.selectAll('.d3-svg-wrapper').remove();

    const firstRow = dataset[0];
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const methodKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('detect') || k.toLowerCase().includes('method')) || 'DETECTION_METHOD';
    const offenseKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('offense') || k.toLowerCase().includes('total') || k.toLowerCase().includes('count')) || 'OFFENSES';
    const finesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('fines'));
    const arrestsKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('arrests'));
    const chargesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('charges'));

    const selectedMethods = [...new Set(dataset.map(r => r[methodKey]?.toString().trim()).filter(Boolean))].sort();
    const allMethods = [...new Set(window.rawDatasets.main.map(r => r[methodKey]?.toString().trim()).filter(Boolean))].sort();
    const selectedYears = [...new Set(dataset.map(r => r[yearKey]?.toString().trim()).filter(Boolean))].sort((a, b) => parseInt(a) - parseInt(b));

    const isSingleYear = selectedYears.length === 1; const isSingleMethod = selectedMethods.length === 1; 
    const useBarChart = isSingleYear || isSingleMethod;
    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const colorScale = d3.scaleOrdinal().domain(allMethods).range(targetColors);

    const wrapper = container.append('div').attr('class', 'd3-svg-wrapper').style('position', 'relative').style('width', '100%').style('height', '100%');
    const svg = wrapper.append('svg').style('width', '100%').style('height', '100%');

    let tooltip = d3.select('body').selectAll('.d3-tooltip').data([0]).join('div').attr('class', 'd3-tooltip')
        .style('position', 'absolute').style('background', 'rgba(255,255,255,0.95)').style('border', '1px solid #ccc').style('padding', '10px').style('border-radius', '4px').style('font-size', '12px').style('color', '#333').style('font-family', 'sans-serif').style('pointer-events', 'none').style('box-shadow', '0 2px 5px rgba(0,0,0,0.15)').style('opacity', 0).style('z-index', 9999);

    function draw() {
        svg.selectAll('*').remove();
        const cw = wrapper.node().clientWidth; const ch = wrapper.node().clientHeight;
        if (cw === 0 || ch === 0) return;

        const margin = { top: 20, right: 120, bottom: 40, left: 60 };
        const width = cw - margin.left - margin.right; const height = ch - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        if (useBarChart) {
            const labels = isSingleYear && !isSingleMethod ? allMethods : selectedYears;
            const method = selectedMethods[0];
            const dataPoints = labels.map(lbl => {
                const mKey = isSingleYear && !isSingleMethod ? lbl : method;
                const yKey = isSingleYear && !isSingleMethod ? selectedYears[0] : lbl;
                const matches = dataset.filter(r => r[methodKey]?.toString().trim() === mKey && r[yearKey]?.toString().trim() === yKey);
                return { label: lbl, value: matches.reduce((s, r) => s + (parseFloat(r[offenseKey]) || 0), 0),
                         f: matches.reduce((s, r) => s + (parseFloat(r[finesKey]) || 0), 0),
                         a: matches.reduce((s, r) => s + (parseFloat(r[arrestsKey]) || 0), 0),
                         c: matches.reduce((s, r) => s + (parseFloat(r[chargesKey]) || 0), 0) };
            });

            const x = d3.scaleBand().domain(labels).range([0, width]).padding(0.2);
            const y = d3.scaleLinear().domain([0, d3.max(dataPoints, d => d.value) * 1.1]).nice().range([height, 0]);

            g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll("text").attr("transform", "translate(-10,0)rotate(-45)").style("text-anchor", "end");
            g.append('g').call(d3.axisLeft(y));

            g.selectAll('rect').data(dataPoints).enter().append('rect').attr('x', d => x(d.label)).attr('y', d => y(d.value)).attr('width', x.bandwidth()).attr('height', d => height - y(d.value)).attr('fill', d => isSingleYear && !isSingleMethod ? colorScale(d.label) : colorScale(method))
                .on('mousemove', function(event, d) {
                    tooltip.style('opacity', 1).html(`<strong>${d.label}</strong>: ${d.value.toLocaleString()}<br>• Fines: ${d.f.toLocaleString()}<br>• Arrests: ${d.a.toLocaleString()}<br>• Charges: ${d.c.toLocaleString()}`)
                        .style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', () => tooltip.style('opacity', 0));
        } else {
            const stackData = selectedYears.map(year => {
                const row = { year: year };
                selectedMethods.forEach(m => { row[m] = dataset.filter(r => r[yearKey] == year && r[methodKey] == m).reduce((s, r) => s + (parseFloat(r[offenseKey]) || 0), 0); });
                return row;
            });

            const stack = d3.stack().keys(selectedMethods)(stackData);
            const x = d3.scalePoint().domain(selectedYears).range([0, width]);
            const y = d3.scaleLinear().domain([0, d3.max(stack[stack.length-1] || [{1:0}], d => d[1]) * 1.1]).nice().range([height, 0]);
            const area = d3.area().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1]));

            g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll("text").attr("transform", "translate(-10,0)rotate(-45)").style("text-anchor", "end");
            g.append('g').call(d3.axisLeft(y));

            g.selectAll('path.area').data(stack).enter().append('path').attr('class', d => `area series-${d.key.replace(/\s+/g, '-')}`).attr('d', area).attr('fill', d => colorScale(d.key))
                .on('mousemove', function(event, d) {
                    const pointer = d3.pointer(event, this);
                    const closestYear = selectedYears.reduce((prev, curr) => Math.abs(x(curr) - pointer[0]) < Math.abs(x(prev) - pointer[0]) ? curr : prev);
                    const pt = d.find(p => p.data.year === closestYear);
                    d3.select(this).style('opacity', 0.8);
                    tooltip.style('opacity', 1).html(`<strong>${d.key}</strong> (${closestYear})<br>Offenses: ${(pt[1] - pt[0]).toLocaleString()}`)
                        .style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function() { d3.select(this).style('opacity', 1); tooltip.style('opacity', 0); });

            const legend = g.append('g').attr('transform', `translate(${width + 10}, 0)`);
            selectedMethods.forEach((method, i) => {
                const row = legend.append('g').attr('transform', `translate(0, ${i * 20})`).style('cursor', 'pointer')
                    .on('click', function() {
                        const isDimmed = d3.select(this).style('opacity') === '0.3';
                        d3.select(this).style('opacity', isDimmed ? '1' : '0.3');
                        g.selectAll(`.series-${method.replace(/\s+/g, '-')}`).style('display', isDimmed ? 'block' : 'none');
                    });
                row.append('rect').attr('width', 10).attr('height', 10).attr('fill', colorScale(method)).attr('y', -5).attr('rx', 2);
                row.append('text').attr('x', 15).attr('y', 4).text(method).style('font-size', '11px').style('fill', '#333').style('font-family', 'sans-serif');
            });
        }
    }
    const ro = new ResizeObserver(() => window.requestAnimationFrame(draw));
    ro.observe(wrapper.node()); container.node()._d3Observer = ro;
}
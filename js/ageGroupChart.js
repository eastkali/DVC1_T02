function renderAgeGroupChart(canvasId, dataset) {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;
    let canvas = document.getElementById(canvasId) || document.querySelector('canvas[id*="age"]');
    if (!canvas) return;

    if (typeof Chart !== 'undefined') { let existing = Chart.getChart(canvas); if (existing) existing.destroy(); }
    const container = d3.select(canvas.parentNode);
    canvas.style.display = 'none';
    if (container.node()._d3Observer) container.node()._d3Observer.disconnect();
    container.selectAll('.d3-svg-wrapper').remove();

    const firstRow = dataset[0] || {};
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const ageKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('age')) || 'AGE_GROUP';
    const finesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('fines'));
    const arrestsKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('arrests'));
    const chargesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('charges'));

    const selectedAges = [...new Set(dataset.map(r => r[ageKey]?.toString().trim()).filter(Boolean))].sort();
    const allAges = [...new Set(window.rawDatasets.loc_age.map(r => r[ageKey]?.toString().trim()).filter(Boolean))].sort();
    const selectedYears = [...new Set(dataset.map(r => r[yearKey]?.toString().trim()).filter(Boolean))].sort((a, b) => parseInt(a) - parseInt(b));

    const getValue = (row) => parseFloat(row[Object.keys(row).find(key => key.toLowerCase().includes('offense') || key.toLowerCase().includes('count') || key.toLowerCase().includes('total'))]) || 0;

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const targetShapes = [d3.symbolCircle, d3.symbolSquare, d3.symbolStar, d3.symbolTriangle, d3.symbolDiamond, d3.symbolCross, d3.symbolWye, d3.symbolCircle];
    const colorScale = d3.scaleOrdinal().domain(allAges).range(targetColors);
    const shapeScale = d3.scaleOrdinal().domain(allAges).range(targetShapes);

    const wrapper = container.append('div').attr('class', 'd3-svg-wrapper').style('position', 'relative').style('width', '100%').style('height', '100%');
    const svg = wrapper.append('svg').style('width', '100%').style('height', '100%').style('overflow', 'visible');

    let tooltip = d3.select('body').selectAll('.d3-tooltip').data([0]).join('div').attr('class', 'd3-tooltip')
        .style('position', 'absolute').style('background', 'rgba(255,255,255,0.95)').style('border', '1px solid #ccc').style('padding', '10px').style('border-radius', '4px').style('font-size', '12px').style('color', '#333').style('font-family', 'sans-serif').style('pointer-events', 'none').style('box-shadow', '0 2px 5px rgba(0,0,0,0.15)').style('opacity', 0).style('z-index', 9999);

    let activeSeries = null;
    const isSingleYear = selectedYears.length === 1;

    function draw() {
        svg.selectAll('*').remove();
        const cw = wrapper.node().clientWidth; const ch = wrapper.node().clientHeight;
        if (cw === 0 || ch === 0) return;

        const margin = isSingleYear 
            ? { top: 20, right: 20, bottom: 70, left: 60 } 
            : { top: 20, right: 85, bottom: 45, left: 60 };

        const width = cw - margin.left - margin.right; const height = ch - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        function toggleHighlight(key) { activeSeries = activeSeries === key ? null : key; applyHighlight(); }

        function applyHighlight() {
            if (!activeSeries) {
                g.selectAll('.line-group, .legend-item, .bar-item').style('opacity', 1);
            } else {
                g.selectAll('.line-group').style('opacity', d => d.age === activeSeries ? 1 : 0.1);
                g.selectAll('.legend-item').style('opacity', d => d === activeSeries ? 1 : 0.1);
                g.selectAll('.bar-item').style('opacity', d => d.label === activeSeries ? 1 : 0.1);
            }
        }

        const drawLegend = () => {
            const itemHeight = 22;
            const legendHeight = selectedAges.length * itemHeight;
            const startY = Math.max(0, (height - legendHeight) / 2);
            const legend = g.append('g').attr('transform', `translate(${width + 15}, ${startY})`);

            selectedAges.forEach((age, i) => {
                const row = legend.append('g').datum(age).attr('class', 'legend-item').attr('transform', `translate(0, ${i * itemHeight})`).style('cursor', 'pointer').style('transition', 'opacity 0.2s').on('click', (event, d) => { event.stopPropagation(); toggleHighlight(d); });
                row.append('path').attr('d', d3.symbol().type(shapeScale(age)).size(50)()).attr('transform', 'translate(6,6)').attr('fill', '#fff').attr('stroke', colorScale(age)).attr('stroke-width', 2);
                row.append('text').attr('x', 15).attr('y', 10).text(age).style('font-size', '11px').style('fill', '#333').style('font-family', 'sans-serif');
            });
        };

        if (isSingleYear) {
            const dataPoints = selectedAges.map(age => {
                const matches = dataset.filter(r => r[ageKey]?.toString().trim() === age && r[yearKey]?.toString().trim() === selectedYears[0]);
                return { label: age, value: matches.reduce((s, r) => s + getValue(r), 0), f: matches.reduce((s, r) => s + (parseFloat(r[finesKey]) || 0), 0), a: matches.reduce((s, r) => s + (parseFloat(r[arrestsKey]) || 0), 0), c: matches.reduce((s, r) => s + (parseFloat(r[chargesKey]) || 0), 0) };
            });

            const x = d3.scaleBand().domain(selectedAges).range([0, width]).padding(0.2);
            const y = d3.scaleLinear().domain([0, d3.max(dataPoints, d => d.value) * 1.1]).nice().range([height, 0]);

            g.append('g').attr('class', 'grid-lines').call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(6)).selectAll('line').style('stroke', '#e2e8f0').style('stroke-dasharray', '3,3');
            g.selectAll('.grid-lines path').style('display', 'none');

            g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");
                
            g.append('g').call(d3.axisLeft(y));

            g.selectAll('rect.bar-item').data(dataPoints).enter().append('rect').attr('class', 'bar-item').style('transition', 'opacity 0.2s').style('cursor', 'pointer').attr('x', d => x(d.label)).attr('y', d => y(d.value)).attr('width', x.bandwidth()).attr('height', d => height - y(d.value)).attr('fill', d => colorScale(d.label))
                .on('mousemove', function(event, d) {
                    if (!activeSeries || activeSeries === d.label) d3.select(this).style('opacity', 0.8);
                    tooltip.style('opacity', 1).html(`<strong>${d.label}</strong>: ${d.value.toLocaleString()}<br>• Fines: ${d.f.toLocaleString()}<br>• Arrests: ${d.a.toLocaleString()}<br>• Charges: ${d.c.toLocaleString()}`).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function() { applyHighlight(); tooltip.style('opacity', 0); })
                .on('click', (event, d) => { event.stopPropagation(); toggleHighlight(d.label); });

        } else {
            const x = d3.scalePoint().domain(selectedYears).range([0, width]).padding(0.5);
            let maxVal = 0;
            const lineData = selectedAges.map(age => {
                const values = selectedYears.map(year => {
                    const matches = dataset.filter(r => r[yearKey] == year && r[ageKey] == age);
                    const sum = matches.reduce((s, r) => s + getValue(r), 0); if (sum > maxVal) maxVal = sum;
                    return { year: year, val: sum, f: matches.reduce((s, r) => s + (parseFloat(r[finesKey]) || 0), 0), a: matches.reduce((s, r) => s + (parseFloat(r[arrestsKey]) || 0), 0), c: matches.reduce((s, r) => s + (parseFloat(r[chargesKey]) || 0), 0) };
                });
                return { age: age, values: values };
            });

            const y = d3.scaleLinear().domain([0, maxVal * 1.1]).nice().range([height, 0]);

            g.append('g').attr('class', 'grid-lines').call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(6)).selectAll('line').style('stroke', '#e2e8f0').style('stroke-dasharray', '3,3');
            g.selectAll('.grid-lines path').style('display', 'none');
            
            g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll("text").attr("transform", "translate(-10,0)rotate(-45)").style("text-anchor", "end");
            g.append('g').call(d3.axisLeft(y));

            const line = d3.line().x(d => x(d.year)).y(d => y(d.val));
            const lines = g.selectAll('.line-group').data(lineData).enter().append('g').attr('class', 'line-group').style('transition', 'opacity 0.2s');

            lines.append('path').attr('d', d => line(d.values)).style('fill', 'none').style('stroke', 'transparent').style('stroke-width', 20).style('cursor', 'pointer').on('click', (event, d) => { event.stopPropagation(); toggleHighlight(d.age); });
            lines.append('path').attr('d', d => line(d.values)).style('fill', 'none').style('stroke', d => colorScale(d.age)).style('stroke-width', 2).style('pointer-events', 'none');
            
            lines.selectAll('.dot').data(d => d.values.map(v => ({...v, age: d.age}))).enter().append('path').attr('class', 'dot').attr('d', d => d3.symbol().type(shapeScale(d.age)).size(50)()).attr('transform', d => `translate(${x(d.year)},${y(d.val)})`).style('fill', '#fff').style('stroke', d => colorScale(d.age)).style('stroke-width', 2).style('cursor', 'pointer')
                .on('mousemove', function(event, d) {
                    d3.select(this).attr('d', d3.symbol().type(shapeScale(d.age)).size(150)());
                    tooltip.style('opacity', 1).html(`<strong>${d.age}</strong> (${d.year})<br>Offenses: ${d.val.toLocaleString()}<br>• Fines: ${d.f.toLocaleString()}<br>• Arrests: ${d.a.toLocaleString()}<br>• Charges: ${d.c.toLocaleString()}`).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function(event, d) { d3.select(this).attr('d', d3.symbol().type(shapeScale(d.age)).size(50)()); tooltip.style('opacity', 0); }).on('click', (event, d) => { event.stopPropagation(); toggleHighlight(d.age); });

            drawLegend();
        }
        applyHighlight(); 
    }
    const ro = new ResizeObserver(() => window.requestAnimationFrame(draw));
    ro.observe(wrapper.node()); container.node()._d3Observer = ro;
}
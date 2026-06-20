function renderLocationChart(canvasId, dataset) {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) return;
    let canvas = document.getElementById(canvasId) || document.querySelector('canvas[id*="location"]');
    if (!canvas) return;

    if (typeof Chart !== 'undefined') { let existing = Chart.getChart(canvas); if (existing) existing.destroy(); }
    const container = d3.select(canvas.parentNode);
    canvas.style.display = 'none';
    if (container.node()._d3Observer) container.node()._d3Observer.disconnect();
    container.selectAll('.d3-svg-wrapper').remove();

    const firstRow = dataset[0];
    const yearKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'year') || 'YEAR';
    const locKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('loc')) || 'LOCATION';
    const finesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('fines'));
    const arrestsKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('arrests'));
    const chargesKey = Object.keys(firstRow).find(k => k.toLowerCase().includes('charges'));

    let selectedYears = [...new Set(dataset.map(r => r[yearKey]?.toString().trim()).filter(Boolean))].sort();
    let selectedLocations = [...new Set(dataset.map(r => r[locKey]?.toString().trim()).filter(Boolean))];

    const getValue = (row) => parseFloat(row[Object.keys(row).find(key => key.toLowerCase().includes('offenses'))]) || 0;

    const locTotals = {};
    selectedLocations.forEach(loc => { locTotals[loc] = dataset.filter(r => r[locKey] && r[locKey].toString().trim() === loc).reduce((s, r) => s + getValue(r), 0); });
    selectedLocations.sort((a, b) => locTotals[b] - locTotals[a]);

    const yearlyTotals = {};
    selectedYears.forEach(year => { yearlyTotals[year] = dataset.filter(r => r[yearKey] && r[yearKey].toString().trim() === year).reduce((s, r) => s + getValue(r), 0) || 1; });

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const colorScale = d3.scaleOrdinal().domain(selectedLocations).range(targetColors);

    const isSingleYear = selectedYears.length === 1;
    const isSingleLocation = selectedLocations.length === 1;
    const useBarChart = isSingleYear || isSingleLocation;

    const wrapper = container.append('div').attr('class', 'd3-svg-wrapper').style('position', 'relative').style('width', '100%').style('height', '100%');
    const svg = wrapper.append('svg').style('width', '100%').style('height', '100%').style('overflow', 'visible');

    let tooltip = d3.select('body').selectAll('.d3-tooltip').data([0]).join('div').attr('class', 'd3-tooltip')
        .style('position', 'absolute').style('background', 'rgba(255,255,255,0.95)').style('border', '1px solid #ccc').style('padding', '10px').style('border-radius', '4px').style('font-size', '12px').style('color', '#333').style('font-family', 'sans-serif').style('pointer-events', 'none').style('box-shadow', '0 2px 5px rgba(0,0,0,0.15)').style('opacity', 0).style('z-index', 9999);

    let activeSeries = null;

    const formatLegendLabel = (loc) => {
        if (!loc) return ['Unknown'];
        if (loc === 'Major Cities of Australia') return ['Major Cities', 'of Australia'];
        if (loc.includes(' Australia') && loc !== 'Australia') return [loc.replace(' Australia', ''), 'Australia'];
        return [loc];
    };

    function draw() {
        svg.selectAll('*').remove();
        const cw = wrapper.node().clientWidth; const ch = wrapper.node().clientHeight;
        if (cw === 0 || ch === 0) return;

        const margin = { top: 20, right: 95, bottom: 45, left: 50 };
        const width = cw - margin.left - margin.right; const height = ch - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        function toggleHighlight(key) { activeSeries = activeSeries === key ? null : key; applyHighlight(); }

        function applyHighlight() {
            if (!activeSeries) {
                g.selectAll('.layer, .bar-item, .legend-item').style('opacity', 1);
            } else {
                g.selectAll('.bar-item').style('opacity', d => (isSingleYear ? d.label : selectedLocations[0]) === activeSeries ? 1 : 0.1);
                g.selectAll('.layer').style('opacity', d => d.key === activeSeries ? 1 : 0.1);
                g.selectAll('.legend-item').style('opacity', d => d === activeSeries ? 1 : 0.1);
            }
        }

        if (useBarChart) {
            const labels = isSingleYear ? selectedLocations : selectedYears;
            const activeKey = isSingleYear ? yearKey : locKey;
            const activeVal = isSingleYear ? selectedYears[0] : selectedLocations[0];

            const dataPoints = labels.map(lbl => {
                const matches = dataset.filter(r => r[activeKey]?.toString().trim() === activeVal && r[isSingleYear ? locKey : yearKey]?.toString().trim() === lbl);
                const sum = matches.reduce((s, r) => s + getValue(r), 0);
                return { label: lbl, value: isSingleYear ? (sum / yearlyTotals[activeVal]) * 100 : sum, raw: sum,
                         f: matches.reduce((s, r) => s + (parseFloat(r[finesKey]) || 0), 0),
                         a: matches.reduce((s, r) => s + (parseFloat(r[arrestsKey]) || 0), 0),
                         c: matches.reduce((s, r) => s + (parseFloat(r[chargesKey]) || 0), 0) };
            });

            const x = d3.scaleBand().domain(labels).range([0, width]).padding(0.2);
            const y = d3.scaleLinear().domain([0, d3.max(dataPoints, d => d.value) * 1.1]).nice().range([height, 0]);

            g.append('g').attr('class', 'grid-lines').call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(6)).selectAll('line').style('stroke', '#e2e8f0').style('stroke-dasharray', '3,3');
            g.selectAll('.grid-lines path').style('display', 'none');

            const xAxis = g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
            if (isSingleYear) {
                xAxis.selectAll('.tick text').each(function(d) {
                    const el = d3.select(this); const lines = formatLegendLabel(d);
                    el.text(''); lines.forEach((line, i) => el.append('tspan').attr('x', 0).attr('dy', i === 0 ? '0.71em' : '1.2em').text(line));
                });
            }

            g.append('g').call(d3.axisLeft(y).tickFormat(d => isSingleYear ? d + '%' : d.toLocaleString()));

            g.selectAll('rect.bar-item').data(dataPoints).enter().append('rect').attr('class', 'bar-item').style('transition', 'opacity 0.2s').style('cursor', 'pointer').attr('x', d => x(d.label)).attr('y', d => y(d.value)).attr('width', x.bandwidth()).attr('height', d => height - y(d.value)).attr('fill', d => colorScale(isSingleYear ? d.label : activeVal))
                .on('mousemove', function(event, d) {
                    if (!activeSeries || activeSeries === d.label) d3.select(this).style('opacity', 0.8);
                    tooltip.style('opacity', 1).html(`<strong>${d.label}</strong>: ${isSingleYear ? d.value.toFixed(1) + '%' : d.value.toLocaleString()}<br>• Fines: ${d.f.toLocaleString()}<br>• Arrests: ${d.a.toLocaleString()}<br>• Charges: ${d.c.toLocaleString()}`).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function() { applyHighlight(); tooltip.style('opacity', 0); }).on('click', (event, d) => toggleHighlight(isSingleYear ? d.label : activeVal));
        } else {
            const stackData = selectedYears.map(year => {
                const row = { year: year };
                selectedLocations.forEach(loc => {
                    const matches = dataset.filter(r => r[yearKey] == year && r[locKey] == loc);
                    const sum = matches.reduce((s, r) => s + getValue(r), 0);
                    row[loc] = (sum / yearlyTotals[year]) * 100;
                    row[`${loc}_raw`] = sum; row[`${loc}_f`] = matches.reduce((s, r) => s + (parseFloat(r[finesKey]) || 0), 0);
                    row[`${loc}_a`] = matches.reduce((s, r) => s + (parseFloat(r[arrestsKey]) || 0), 0);
                    row[`${loc}_c`] = matches.reduce((s, r) => s + (parseFloat(r[chargesKey]) || 0), 0);
                });
                return row;
            });

            const stack = d3.stack().keys(selectedLocations)(stackData);
            const x = d3.scaleBand().domain(selectedYears).range([0, width]).padding(0.2);
            const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

            g.append('g').attr('class', 'grid-lines').call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(5)).selectAll('line').style('stroke', '#e2e8f0').style('stroke-dasharray', '3,3');
            g.selectAll('.grid-lines path').style('display', 'none');

            g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
            g.append('g').call(d3.axisLeft(y).tickFormat(d => d + '%'));

            const layers = g.selectAll('.layer').data(stack).enter().append('g').attr('class', 'layer').style('transition', 'opacity 0.2s').attr('fill', d => colorScale(d.key));

            layers.selectAll('rect').data(d => d.map(item => ({...item, key: d.key}))).enter().append('rect').style('cursor', 'pointer').attr('x', d => x(d.data.year)).attr('y', d => y(d[1])).attr('height', d => y(d[0]) - y(d[1])).attr('width', x.bandwidth())
                .on('mousemove', function(event, d) {
                    if (!activeSeries || activeSeries === d.key) d3.select(this).style('opacity', 0.8);
                    const pct = (d[1] - d[0]).toFixed(1);
                    tooltip.style('opacity', 1).html(`<strong>${d.key}</strong> (${d.data.year})<br>Share: ${pct}%<br>Offenses: ${d.data[`${d.key}_raw`].toLocaleString()}<br>• Fines: ${d.data[`${d.key}_f`].toLocaleString()}<br>• Arrests: ${d.data[`${d.key}_a`].toLocaleString()}<br>• Charges: ${d.data[`${d.key}_c`].toLocaleString()}`).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function() { applyHighlight(); tooltip.style('opacity', 0); }).on('click', (event, d) => toggleHighlight(d.key));

            const itemHeight = 32;
            const legendHeight = selectedLocations.length * itemHeight;
            const startY = Math.max(0, (height - legendHeight) / 2);      
            const legend = g.append('g').attr('transform', `translate(${width + 15}, ${startY})`);

            selectedLocations.forEach((loc, i) => {
                const row = legend.append('g').datum(loc).attr('class', 'legend-item').attr('transform', `translate(0, ${i * itemHeight})`).style('cursor', 'pointer').style('transition', 'opacity 0.2s').on('click', (event, d) => toggleHighlight(d));
                row.append('rect').attr('width', 10).attr('height', 10).attr('fill', colorScale(loc)).attr('y', -5).attr('rx', 2);
                const lines = formatLegendLabel(loc);
                lines.forEach((lineStr, lineIdx) => {
                    row.append('text').attr('x', 15).attr('y', 4 + (lineIdx * 12)).text(lineStr).style('font-size', '11px').style('fill', '#333').style('font-family', 'sans-serif');
                });
            });
        }
        applyHighlight();
    }
    const ro = new ResizeObserver(() => window.requestAnimationFrame(draw));
    ro.observe(wrapper.node()); container.node()._d3Observer = ro;
}
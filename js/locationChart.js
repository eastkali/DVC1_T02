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
    const svg = wrapper.append('svg').style('width', '100%').style('height', '100%');

    let tooltip = d3.select('body').selectAll('.d3-tooltip').data([0]).join('div').attr('class', 'd3-tooltip')
        .style('position', 'absolute').style('background', 'rgba(255,255,255,0.95)').style('border', '1px solid #ccc').style('padding', '10px').style('border-radius', '4px').style('font-size', '12px').style('color', '#333').style('font-family', 'sans-serif').style('pointer-events', 'none').style('box-shadow', '0 2px 5px rgba(0,0,0,0.15)').style('opacity', 0).style('z-index', 9999);

    function draw() {
        svg.selectAll('*').remove();
        const cw = wrapper.node().clientWidth; const ch = wrapper.node().clientHeight;
        if (cw === 0 || ch === 0) return;

        const margin = { top: 20, right: 120, bottom: 40, left: 50 };
        const width = cw - margin.left - margin.right; const height = ch - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

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

            g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
            g.append('g').call(d3.axisLeft(y).tickFormat(d => isSingleYear ? d + '%' : d.toLocaleString()));

            g.selectAll('rect').data(dataPoints).enter().append('rect').attr('x', d => x(d.label)).attr('y', d => y(d.value)).attr('width', x.bandwidth()).attr('height', d => height - y(d.value)).attr('fill', d => colorScale(isSingleYear ? d.label : activeVal))
                .on('mousemove', function(event, d) {
                    tooltip.style('opacity', 1).html(`<strong>${d.label}</strong>: ${isSingleYear ? d.value.toFixed(1) + '%' : d.value.toLocaleString()}<br>• Fines: ${d.f.toLocaleString()}<br>• Arrests: ${d.a.toLocaleString()}<br>• Charges: ${d.c.toLocaleString()}`)
                        .style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', () => tooltip.style('opacity', 0));
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

            g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
            g.append('g').call(d3.axisLeft(y).tickFormat(d => d + '%'));

            const layers = g.selectAll('.layer').data(stack).enter().append('g').attr('class', d => `layer series-${d.key.replace(/\s+/g, '-')}`).attr('fill', d => colorScale(d.key));

            layers.selectAll('rect').data(d => d.map(item => ({...item, key: d.key}))).enter().append('rect')
                .attr('x', d => x(d.data.year)).attr('y', d => y(d[1])).attr('height', d => y(d[0]) - y(d[1])).attr('width', x.bandwidth())
                .on('mousemove', function(event, d) {
                    d3.select(this).style('opacity', 0.8);
                    tooltip.style('opacity', 1).html(`<strong>${d.key}</strong> (${d.data.year})<br>Share: ${(d[1] - d[0]).toFixed(1)}%<br>Offenses: ${d.data[`${d.key}_raw`].toLocaleString()}<br>• Fines: ${d.data[`${d.key}_f`].toLocaleString()}<br>• Arrests: ${d.data[`${d.key}_a`].toLocaleString()}<br>• Charges: ${d.data[`${d.key}_c`].toLocaleString()}`)
                        .style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function() { d3.select(this).style('opacity', 1); tooltip.style('opacity', 0); });

            const legend = g.append('g').attr('transform', `translate(${width + 10}, 0)`);
            selectedLocations.forEach((loc, i) => {
                const row = legend.append('g').attr('transform', `translate(0, ${i * 20})`).style('cursor', 'pointer')
                    .on('click', function() {
                        const isDimmed = d3.select(this).style('opacity') === '0.3';
                        d3.select(this).style('opacity', isDimmed ? '1' : '0.3');
                        g.selectAll(`.series-${loc.replace(/\s+/g, '-')}`).style('display', isDimmed ? 'block' : 'none');
                    });
                row.append('rect').attr('width', 10).attr('height', 10).attr('fill', colorScale(loc)).attr('y', -5).attr('rx', 2);
                row.append('text').attr('x', 15).attr('y', 4).text(loc).style('font-size', '11px').style('fill', '#333').style('font-family', 'sans-serif');
            });
        }
    }
    const ro = new ResizeObserver(() => window.requestAnimationFrame(draw));
    ro.observe(wrapper.node()); container.node()._d3Observer = ro;
}
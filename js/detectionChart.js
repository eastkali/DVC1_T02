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

    const isSingleYear = selectedYears.length === 1; 
    const isSingleMethod = selectedMethods.length === 1; 
    
    const useDonutChart = isSingleYear;
    const useBarChart = !isSingleYear && isSingleMethod;

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const colorScale = d3.scaleOrdinal().domain(allMethods).range(targetColors);

    const wrapper = container.append('div').attr('class', 'd3-svg-wrapper').style('position', 'relative').style('width', '100%').style('height', '100%');
    const svg = wrapper.append('svg').style('width', '100%').style('height', '100%').style('overflow', 'visible');

    let tooltip = d3.select('body').selectAll('.d3-tooltip').data([0]).join('div').attr('class', 'd3-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(15, 23, 42, 0.8)')
        .style('border', 'none')
        .style('padding', '10px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('color', '#fff')
        .style('font-family', 'sans-serif')
        .style('pointer-events', 'none')
        .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)')
        .style('backdrop-filter', 'blur(4px)')
        .style('overflow', 'visible')
        .style('opacity', 0)
        .style('z-index', 9999);

    let activeSeries = null;

    function draw() {
        const cw = wrapper.node().clientWidth; const ch = wrapper.node().clientHeight;
        if (cw === 0 || ch === 0) return;
        svg.selectAll('*').remove();

        const defs = svg.append('defs');
        const getPatternFill = (cat) => {
            const idx = allMethods.indexOf(cat);
            return idx > -1 ? `url(#pat-${canvasId}-${idx})` : colorScale(cat);
        };

        allMethods.forEach((cat, index) => {
            const c = colorScale(cat);
            const pc = c === '#000000' || c === '#0072B2' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)';
            const type = index % 8;
            const pat = defs.append('pattern').attr('id', `pat-${canvasId}-${index}`).attr('patternUnits', 'userSpaceOnUse').attr('width', 8).attr('height', 8);

            pat.append('rect').attr('width', 8).attr('height', 8).attr('fill', c);

            if (type === 0) pat.append('circle').attr('cx', 4).attr('cy', 4).attr('r', 2).attr('fill', pc);
            else if (type === 1) pat.append('path').attr('d', 'M0,4 l8,0').attr('stroke', pc).attr('stroke-width', 2);
            else if (type === 2) pat.append('path').attr('d', 'M4,0 l0,8').attr('stroke', pc).attr('stroke-width', 2);
            else if (type === 3) pat.append('path').attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4').attr('stroke', pc).attr('stroke-width', 1.5);
            else if (type === 4) pat.append('path').attr('d', 'M-2,6 l4,4 M0,0 l8,8 M6,-2 l4,4').attr('stroke', pc).attr('stroke-width', 1.5);
            else if (type === 5) pat.append('path').attr('d', 'M4,0 l0,8 M0,4 l8,0').attr('stroke', pc).attr('stroke-width', 1.5);
            else if (type === 6) pat.append('path').attr('d', 'M-2,2 l6,-6 M0,10 l10,-10 M8,12 l6,-6 M-2,8 l6,6 M0,0 l10,10 M8,-2 l6,6').attr('stroke', pc).attr('stroke-width', 1);
            else if (type === 7) pat.append('circle').attr('cx', 4).attr('cy', 4).attr('r', 2.5).attr('fill', 'none').attr('stroke', pc).attr('stroke-width', 1);
        });

        const getTooltipIcon = (cat) => {
            const index = allMethods.indexOf(cat);
            const c = colorScale(cat);
            const pc = c === '#000000' || c === '#0072B2' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)';
            const type = index % 8;
            let overlay = '';
            if (type===0) overlay = `<circle cx="7" cy="7" r="3.5" fill="${pc}"/>`;
            else if (type===1) overlay = `<path d="M0,7 l14,0" stroke="${pc}" stroke-width="3"/>`;
            else if (type===2) overlay = `<path d="M7,0 l0,14" stroke="${pc}" stroke-width="3"/>`;
            else if (type===3) overlay = `<path d="M-2,2 l8,-8 M0,14 l14,-14 M10,16 l8,-8" stroke="${pc}" stroke-width="2"/>`;
            else if (type===4) overlay = `<path d="M-2,12 l8,8 M0,0 l14,14 M10,-2 l8,8" stroke="${pc}" stroke-width="2"/>`;
            else if (type===5) overlay = `<path d="M7,0 l0,14 M0,7 l14,0" stroke="${pc}" stroke-width="2.5"/>`;
            else if (type===6) overlay = `<path d="M-2,2 l8,-8 M0,14 l14,-14 M10,16 l8,-8 M-2,12 l8,8 M0,0 l14,14 M10,-2 l8,8" stroke="${pc}" stroke-width="1.5"/>`;
            else if (type===7) overlay = `<circle cx="7" cy="7" r="4.5" fill="none" stroke="${pc}" stroke-width="2"/>`;

            return `<svg width="14" height="14" style="flex-shrink: 0; border-radius: 3px; overflow: hidden;"><rect width="14" height="14" fill="${c}"></rect>${overlay}</svg>`;
        };

        const margin = useDonutChart 
            ? { top: 30, right: isSingleMethod ? 40 : 140, bottom: 30, left: 40 }
            : { top: useBarChart ? 55 : 20, right: isSingleMethod ? 20 : 140, bottom: 45, left: 60 };

        const width = cw - margin.left - margin.right; const height = ch - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        function toggleHighlight(key) { activeSeries = activeSeries === key ? null : key; applyHighlight(); }

        function applyHighlight() {
            if (!activeSeries) {
                g.selectAll('.area-path, .bar-item, .bar-label, .data-dot, .donut-arc, .slice-label, .legend-item').style('opacity', 1);
            } else {
                g.selectAll('.bar-item, .bar-label').style('opacity', d => d.seriesKey === activeSeries ? 1 : 0.1);
                g.selectAll('.area-path, .data-dot').style('opacity', d => d.key === activeSeries ? 1 : 0.1);
                g.selectAll('.donut-arc, .slice-label').style('opacity', d => d.data.seriesKey === activeSeries ? 1 : 0.1);
                g.selectAll('.legend-item').style('opacity', d => d === activeSeries ? 1 : 0.1);
            }
        }

        const drawLegend = () => {
            const itemHeight = 24; 
            const legendHeight = selectedMethods.length * itemHeight;
            const startY = Math.max(0, (height - legendHeight) / 2);
            const legend = g.append('g').attr('transform', `translate(${width + 15}, ${startY})`);

            selectedMethods.forEach((method, i) => {
                const row = legend.append('g').datum(method).attr('class', 'legend-item').attr('transform', `translate(0, ${i * itemHeight})`).style('cursor', 'pointer').style('transition', 'opacity 0.2s').on('click', (event, d) => { event.stopPropagation(); toggleHighlight(d); });
                
                row.append('rect').attr('width', 18).attr('height', 18).attr('fill', getPatternFill(method)).attr('y', -9).attr('rx', 3);
                row.append('text').attr('x', 24).attr('y', 4).text(method).style('font-size', '11px').style('fill', '#333').style('font-family', 'sans-serif');
            });
        };

        if (useDonutChart) {
            const dataPoints = allMethods.map(m => {
                const matches = dataset.filter(r => r[methodKey]?.toString().trim() === m && r[yearKey]?.toString().trim() === selectedYears[0]);
                return { label: m, value: matches.reduce((s, r) => s + (parseFloat(r[offenseKey]) || 0), 0), f: matches.reduce((s, r) => s + (parseFloat(r[finesKey]) || 0), 0), a: matches.reduce((s, r) => s + (parseFloat(r[arrestsKey]) || 0), 0), c: matches.reduce((s, r) => s + (parseFloat(r[chargesKey]) || 0), 0), seriesKey: m };
            }).filter(d => d.value > 0); 

            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2;
            
            const gPie = g.append("g").attr("transform", `translate(${centerX},${centerY})`);

            const pie = d3.pie().value(d => d.value).sort(null);
            
            const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius * 0.75);
            const outerArc = d3.arc().innerRadius(radius * 0.85).outerRadius(radius * 0.85);

            gPie.selectAll('path').data(pie(dataPoints)).enter().append('path')
                .attr('class', 'donut-arc').style('transition', 'opacity 0.2s').style('cursor', 'pointer')
                .attr('d', arc).attr('fill', d => getPatternFill(d.data.seriesKey))
                .style('stroke', '#fff').style('stroke-width', 2)
                .on('mousemove', function(event, d) {
                    if (!activeSeries || activeSeries === d.data.seriesKey) {
                        d3.select(this).style('opacity', 0.8);
                    }
                    
                    const pct = ((d.data.value / d3.sum(dataPoints, dp => dp.value)) * 100).toFixed(1);
                    
                    let html = `
                        <div style="position: absolute; top: 12px; left: -6px; width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 6px solid rgba(15, 23, 42, 0.8);"></div>
                        <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                ${getTooltipIcon(d.data.seriesKey)}
                                <span>${d.data.label}</span>
                            </div>
                        </div>
                        <div style="font-size: 11px;">Offenses: <strong>${d.data.value.toLocaleString()} (${pct}%)</strong><br>• Fines: ${d.data.f.toLocaleString()}<br>• Arrests: ${d.data.a.toLocaleString()}<br>• Charges: ${d.data.c.toLocaleString()}</div>
                    `;
                    tooltip.style('opacity', 1).html(html).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function(event, d) {
                    d3.select(this).style('opacity', null); 
                    applyHighlight(); 
                    tooltip.style('opacity', 0);
                }).on('click', (event, d) => { event.stopPropagation(); toggleHighlight(d.data.seriesKey); });

            const midAngle = d => d.startAngle + (d.endAngle - d.startAngle) / 2;

            gPie.selectAll('polyline').data(pie(dataPoints)).enter().append('polyline')
                .attr('class', 'slice-label').style('transition', 'opacity 0.2s').style('pointer-events', 'none')
                .attr('points', d => {
                    if ((d.endAngle - d.startAngle) < 0.15) return '';
                    const posA = arc.centroid(d);
                    const posB = outerArc.centroid(d);
                    const posC = [...posB];
                    posC[0] = radius * 0.9 * (midAngle(d) < Math.PI ? 1 : -1);
                    return [posA, posB, posC];
                })
                .style('fill', 'none').style('stroke', '#94a3b8').style('stroke-width', 1);

            gPie.selectAll('text.slice-label-text').data(pie(dataPoints)).enter().append('text')
                .attr('class', 'slice-label').style('transition', 'opacity 0.2s').style('pointer-events', 'none')
                .attr('transform', d => {
                    const pos = outerArc.centroid(d);
                    pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
                    return `translate(${pos})`;
                })
                .style('text-anchor', d => midAngle(d) < Math.PI ? 'start' : 'end')
                .style('alignment-baseline', 'middle')
                .style('font-size', '11px')
                .style('font-weight', '600')
                .style('fill', '#334155')
                .text(d => {
                    if ((d.endAngle - d.startAngle) < 0.15) return '';
                    return d.data.value.toLocaleString(); 
                });

            const totalVal = d3.sum(dataPoints, d => d.value);
            gPie.append("text").attr("text-anchor", "middle").attr("dy", "-0.2em").style("font-size", "13px").style("fill", "#64748b").style("font-family", "sans-serif").text("Total");
            gPie.append("text").attr("text-anchor", "middle").attr("dy", "1.1em").style("font-size", "22px").style("font-weight", "bold").style("fill", "#1e293b").style("font-family", "sans-serif").text(totalVal.toLocaleString());
            
            if (!isSingleMethod) drawLegend();

        } else if (useBarChart) {
            const method = selectedMethods[0];
            const labels = selectedYears;
            const dataPoints = labels.map(lbl => {
                const matches = dataset.filter(r => r[methodKey]?.toString().trim() === method && r[yearKey]?.toString().trim() === lbl);
                return { label: lbl, value: matches.reduce((s, r) => s + (parseFloat(r[offenseKey]) || 0), 0), f: matches.reduce((s, r) => s + (parseFloat(r[finesKey]) || 0), 0), a: matches.reduce((s, r) => s + (parseFloat(r[arrestsKey]) || 0), 0), c: matches.reduce((s, r) => s + (parseFloat(r[chargesKey]) || 0), 0), seriesKey: method };
            });

            const x = d3.scaleBand().domain(labels).range([0, width]).padding(0.2);
            const y = d3.scaleLinear().domain([0, d3.max(dataPoints, d => d.value) * 1.1]).nice().range([height, 0]);

            g.append('g').attr('class', 'grid-lines').call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(6)).selectAll('line').style('stroke', '#e2e8f0').style('stroke-dasharray', '3,3');
            g.selectAll('.grid-lines path').style('display', 'none');

            g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll("text").attr("transform", "translate(-10,0)rotate(-45)").style("text-anchor", "end");
            g.append('g').call(d3.axisLeft(y));

            g.selectAll('rect.bar-item').data(dataPoints).enter().append('rect')
                .attr('class', 'bar-item').style('transition', 'opacity 0.2s').style('pointer-events', 'none')
                .attr('x', d => x(d.label)).attr('y', d => y(d.value)).attr('width', x.bandwidth()).attr('height', d => height - y(d.value))
                .attr('fill', d => colorScale(d.seriesKey));

            g.append('rect')
                .attr('width', width)
                .attr('height', height)
                .attr('fill', 'transparent')
                .style('pointer-events', 'all')
                .on('mousemove', function(event) {
                    const pointer = d3.pointer(event, this); 
                    const mouseX = pointer[0];

                    const domain = x.domain();
                    const range = x.range();
                    const scaleWidth = range[1] - range[0];
                    
                    let index = Math.floor((mouseX / scaleWidth) * domain.length);
                    index = Math.max(0, Math.min(index, domain.length - 1)); 
                    
                    const closestCategory = domain[index];
                    const d = dataPoints.find(item => item.label === closestCategory);

                    if (!d) return;

                    g.selectAll('rect.bar-item').style('opacity', bar => {
                        if (activeSeries && bar.seriesKey !== activeSeries) return 0.1;
                        return bar.label === closestCategory ? 0.8 : 1;
                    });

                    tooltip.style('background', 'rgba(15, 23, 42, 0.8)').style('border', 'none').style('color', '#fff').style('backdrop-filter', 'blur(4px)').style('overflow', 'visible');
                    
                    let html = `
                        <div style="position: absolute; top: 12px; left: -6px; width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 6px solid rgba(15, 23, 42, 0.8);"></div>
                        <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <svg width="14" height="14" style="flex-shrink: 0; border-radius: 3px; overflow: hidden;"><rect width="14" height="14" fill="${colorScale(d.seriesKey)}"></rect></svg>
                                <span>${d.seriesKey} (${d.label})</span>
                            </div>
                        </div>
                        <div style="font-size: 11px;">Offenses: <strong>${d.value.toLocaleString()}</strong><br>• Fines: ${d.f.toLocaleString()}<br>• Arrests: ${d.a.toLocaleString()}<br>• Charges: ${d.c.toLocaleString()}</div>
                    `;
                    tooltip.style('opacity', 1).html(html).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function() { 
                    g.selectAll('rect.bar-item').style('opacity', bar => {
                        if (activeSeries && bar.seriesKey !== activeSeries) return 0.1;
                        return 1;
                    });
                    applyHighlight(); 
                    tooltip.style('opacity', 0); 
                }).on('click', function(event) { 
                    const pointer = d3.pointer(event, this); 
                    const mouseX = pointer[0];
                    const domain = x.domain();
                    const range = x.range();
                    const scaleWidth = range[1] - range[0];
                    let index = Math.floor((mouseX / scaleWidth) * domain.length);
                    index = Math.max(0, Math.min(index, domain.length - 1)); 
                    const closestCategory = domain[index];
                    const d = dataPoints.find(item => item.label === closestCategory);
                    if (d) {
                        event.stopPropagation();
                        toggleHighlight(d.seriesKey);
                    }
                });
            
            g.selectAll('text.bar-label').data(dataPoints).enter().append('text')
                .attr('class', 'bar-label').style('transition', 'opacity 0.2s').style('pointer-events', 'none')
                .attr('transform', d => `translate(${x(d.label) + x.bandwidth() / 2}, ${y(d.value) - 8}) rotate(-90)`)
                .style('font-size', '11px').style('fill', '#334155').style('font-weight', '600').style('font-family', 'sans-serif')
                .attr('text-anchor', 'start').attr('alignment-baseline', 'middle')
                .text(d => d.value.toLocaleString());
            
            if (!isSingleMethod) drawLegend();

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

            g.append('g').attr('class', 'grid-lines').call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(6)).selectAll('line').style('stroke', '#e2e8f0').style('stroke-dasharray', '3,3');
            g.selectAll('.grid-lines path').style('display', 'none');

            g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll("text").attr("transform", "translate(-10,0)rotate(-45)").style("text-anchor", "end");
            g.append('g').call(d3.axisLeft(y));

            const areas = g.selectAll('.area-group').data(stack).enter().append('g').attr('class', 'area-group');

            areas.append('path')
                .attr('class', 'area-path').style('transition', 'opacity 0.2s').style('cursor', 'pointer')
                .attr('d', area).attr('fill', d => getPatternFill(d.key)).style('stroke', d => colorScale(d.key)).style('stroke-width', 1.5).style('stroke-linejoin', 'round')
                .on('mousemove', function(event, d) {
                    if (!activeSeries || activeSeries === d.key) d3.select(this).style('opacity', 0.8);
                    
                    const pointer = d3.pointer(event, this); 
                    const closestYear = selectedYears.reduce((prev, curr) => Math.abs(x(curr) - pointer[0]) < Math.abs(x(prev) - pointer[0]) ? curr : prev); 

                    g.selectAll('.data-dot')
                     .attr('r', dotData => {
                         if (dotData.data.year === closestYear) return dotData.key === d.key ? 7 : 5;
                         return 3; 
                     }).style('stroke-width', dotData => dotData.data.year === closestYear ? 2 : 1.5);

                    const yearData = stackData.find(row => row.year === closestYear);
                    const yearTotalRaw = selectedMethods.reduce((sum, method) => sum + (yearData[method] || 0), 0);

                    const sortedData = selectedMethods
                        .map(method => ({ loc: method, val: yearData[method] }))
                        .filter(item => item.val !== undefined)
                        .sort((a, b) => b.val - a.val);

                    let html = `
                        <div style="position: absolute; top: 12px; left: -6px; width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 6px solid rgba(15, 23, 42, 0.8);"></div>
                        <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
                            ${closestYear} Total: ${yearTotalRaw.toLocaleString()}
                        </div>
                    `;
                    
                    sortedData.forEach(item => {
                        html += `
                        <div style="display:flex; justify-content: space-between; align-items:center; gap:16px; margin-top:4px; font-size: 11px;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                ${getTooltipIcon(item.loc)}
                                <span>${item.loc}</span>
                            </div>
                            <strong>${item.val.toLocaleString()}</strong>
                        </div>`;
                    });

                    tooltip.style('opacity', 1).html(html).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function(event, d) { 
                    d3.select(this).style('opacity', null); 
                    applyHighlight(); 
                    
                    g.selectAll('.data-dot').attr('r', 3).style('stroke-width', 1.5);
                    
                    tooltip.style('opacity', 0); 
                }).on('click', (event, d) => { event.stopPropagation(); toggleHighlight(d.key); });

            if (!isSingleYear) {
                areas.selectAll('.data-dot').data(d => d.map(p => ({...p, key: d.key}))).enter().append('circle')
                    .attr('class', 'data-dot').style('transition', 'all 0.15s ease-out').style('pointer-events', 'none') 
                    .attr('cx', d => x(d.data.year)).attr('cy', d => y(d[1])).attr('r', 3) 
                    .attr('fill', d => colorScale(d.key)).style('stroke', '#fff').style('stroke-width', 1.5);
            }
            
            if (!isSingleMethod) drawLegend();
        }
        applyHighlight();
    }
    const ro = new ResizeObserver(() => window.requestAnimationFrame(draw));
    ro.observe(wrapper.node()); container.node()._d3Observer = ro;
}
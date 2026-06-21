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
    
    const allLocations = [...new Set(window.rawDatasets.main.map(r => r[locKey]?.toString().trim()).filter(Boolean))].sort();
    const getValue = (row) => parseFloat(row[Object.keys(row).find(key => key.toLowerCase().includes('offenses'))]) || 0;
    const locTotals = {};

    selectedLocations.forEach(loc => { locTotals[loc] = dataset.filter(r => r[locKey] && r[locKey].toString().trim() === loc).reduce((s, r) => s + getValue(r), 0); });
    selectedLocations = selectedLocations.filter(loc => locTotals[loc] > 0);
    selectedLocations.sort((a, b) => locTotals[b] - locTotals[a]);

    const yearlyTotals = {};
    selectedYears.forEach(year => { yearlyTotals[year] = dataset.filter(r => r[yearKey] && r[yearKey].toString().trim() === year).reduce((s, r) => s + getValue(r), 0) || 1; });

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const colorScale = d3.scaleOrdinal().domain(allLocations).range(targetColors);

    const isSingleYear = selectedYears.length === 1;
    const isSingleLocation = selectedLocations.length === 1;
    const useBarChart = isSingleYear || isSingleLocation;

    const titleText = (!isSingleYear && isSingleLocation) ? 'Annual Offenses by Location' : 'Annual Offenses by Location (%)';
    if (canvas.id === 'modal-canvas') {
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle && modalTitle.innerText.includes('Location')) modalTitle.innerText = titleText;
    } else {
        const cardContainer = canvas.closest('.chart-card');
        if (cardContainer) {
            const titleEl = cardContainer.querySelector('.chart-header h3');
            if (titleEl) titleEl.innerText = titleText;
        }
    }

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

        const defs = svg.append('defs');
        const getPatternFill = (cat) => {
            const idx = allLocations.indexOf(cat);
            return idx > -1 ? `url(#pat-${canvasId}-${idx})` : colorScale(cat);
        };

        allLocations.forEach((cat, index) => {
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
            else if (type === 6) pat.append('path').attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4 M-2,6 l4,4 M0,0 l8,8 M6,-2 l4,4').attr('stroke', pc).attr('stroke-width', 1);
            else if (type === 7) pat.append('circle').attr('cx', 4).attr('cy', 4).attr('r', 2.5).attr('fill', 'none').attr('stroke', pc).attr('stroke-width', 1);
        });

        const getTooltipIcon = (cat) => {
            const index = allLocations.indexOf(cat);
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

        const margin = isSingleYear 
            ? { top: 55, right: 20, bottom: 45, left: 60 } 
            : { top: (useBarChart ? 55 : 20), right: 140, bottom: 45, left: 60 };

        const width = cw - margin.left - margin.right; const height = ch - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        function toggleHighlight(key) { activeSeries = activeSeries === key ? null : key; applyHighlight(); }

        function applyHighlight() {
            if (!activeSeries) {
                g.selectAll('.stacked-bar-item, .bar-item, .bar-label, .legend-item').style('opacity', 1);
            } else {
                g.selectAll('.bar-item, .bar-label').style('opacity', d => (isSingleYear ? d.label : selectedLocations[0]) === activeSeries ? 1 : 0.1);
                g.selectAll('.stacked-bar-item').style('opacity', d => d.loc === activeSeries ? 1 : 0.1);
                g.selectAll('.legend-item').style('opacity', d => d === activeSeries ? 1 : 0.1);
            }
        }

        const drawLegend = () => {
            const itemHeight = 32;
            const legendItems = [...selectedLocations].reverse();
            const legendHeight = legendItems.length * itemHeight;
            const startY = Math.max(0, (height - legendHeight) / 2);
            
            const legend = g.append('g').attr('transform', `translate(${width + 15}, ${startY})`);

            legendItems.forEach((loc, i) => {
                const row = legend.append('g').datum(loc).attr('class', 'legend-item').attr('transform', `translate(0, ${i * itemHeight})`).style('cursor', 'pointer').style('transition', 'opacity 0.2s').on('click', (event, d) => { event.stopPropagation(); toggleHighlight(d); });
                row.append('rect').attr('width', 18).attr('height', 18).attr('fill', useBarChart ? colorScale(loc) : getPatternFill(loc)).attr('y', -9).attr('rx', 3);
                const lines = formatLegendLabel(loc);
                lines.forEach((lineStr, lineIdx) => {
                    row.append('text').attr('x', 24).attr('y', 4 + (lineIdx * 12)).text(lineStr).style('font-size', '11px').style('fill', '#333').style('font-family', 'sans-serif');
                });
            });
        };

        if (useBarChart) {
            const labels = isSingleYear ? [...selectedLocations].reverse() : selectedYears;
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
            xAxis.selectAll('.tick text')
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end")
                .each(function(d) {
                    if (isSingleYear) {
                        const el = d3.select(this); const lines = formatLegendLabel(d);
                        el.text(''); lines.forEach((line, i) => el.append('tspan').attr('x', 0).attr('dy', i === 0 ? '0.71em' : '1.2em').text(line));
                    }
                });

            g.append('g').call(d3.axisLeft(y).tickFormat(d => isSingleYear ? d + '%' : d.toLocaleString()));

            g.selectAll('rect.bar-item').data(dataPoints).enter().append('rect')
                .attr('class', 'bar-item').style('transition', 'opacity 0.2s').style('cursor', 'pointer')
                .attr('x', d => x(d.label)).attr('y', d => y(d.value)).attr('width', x.bandwidth()).attr('height', d => height - y(d.value))
                .attr('fill', d => colorScale(isSingleYear ? d.label : activeVal));
            
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
                                <svg width="14" height="14" style="flex-shrink: 0; border-radius: 3px; overflow: hidden;"><rect width="14" height="14" fill="${colorScale(isSingleYear ? d.label : activeVal)}"></rect></svg>
                                <span>${isSingleYear ? d.label : activeVal} (${isSingleYear ? activeVal : d.label})</span>
                            </div>
                        </div>
                        <div style="font-size: 11px;">Offenses: <strong>${isSingleYear ? d.value.toFixed(1) + '%' : d.value.toLocaleString()}</strong><br>• Fines: ${d.f.toLocaleString()}<br>• Arrests: ${d.a.toLocaleString()}<br>• Charges: ${d.c.toLocaleString()}</div>
                    `;
                    tooltip.style('opacity', 1).html(html).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function() { 
                    g.selectAll('rect.bar-item').style('opacity', bar => {
                        if (activeSeries && bar.seriesKey !== activeSeries) return 0.1;
                        return 1;
                    });
                    applyHighlight(); 
                    tooltip.style('opacity', 0).style('background', 'rgba(255,255,255,0.95)').style('border', '1px solid #ccc').style('color', '#333').style('backdrop-filter', 'none'); 
                })
            
            g.selectAll('text.bar-label').data(dataPoints).enter().append('text')
                .attr('class', 'bar-label').style('transition', 'opacity 0.2s').style('pointer-events', 'none')
                .attr('transform', d => `translate(${x(d.label) + x.bandwidth() / 2}, ${y(d.value) - 8}) rotate(-90)`)
                .style('font-size', '11px').style('fill', '#334155').style('font-weight', '600').style('font-family', 'sans-serif')
                .attr('text-anchor', 'start').attr('alignment-baseline', 'middle')
                .text(d => isSingleYear ? d.value.toFixed(1) + '%' : d.value.toLocaleString());

        } else {
            const rectsData = [];
            selectedYears.forEach(year => {
                const yearMatches = dataset.filter(r => r[yearKey] == year);
                const sumOffenses = yearMatches.reduce((s, r) => s + getValue(r), 0);
                
                let yOffset = 0;
                const yearSegments = [];
                
                selectedLocations.forEach(loc => {
                    const locMatches = yearMatches.filter(r => r[locKey] == loc);
                    const rawSum = locMatches.reduce((s, r) => s + getValue(r), 0);
                    if (rawSum > 0) {
                        yearSegments.push({
                            year: year,
                            loc: loc,
                            raw: rawSum,
                            pct: sumOffenses > 0 ? (rawSum / sumOffenses) * 100 : 0,
                            f: locMatches.reduce((s, r) => s + (parseFloat(r[finesKey]) || 0), 0),
                            a: locMatches.reduce((s, r) => s + (parseFloat(r[arrestsKey]) || 0), 0),
                            c: locMatches.reduce((s, r) => s + (parseFloat(r[chargesKey]) || 0), 0)
                        });
                    }
                });
                
                yearSegments.sort((a, b) => b.pct - a.pct);
                
                yearSegments.forEach(seg => {
                    seg.y0 = yOffset;
                    seg.y1 = yOffset + seg.pct;
                    yOffset += seg.pct;
                    rectsData.push(seg);
                });
            });

            const x = d3.scaleBand().domain(selectedYears).range([0, width]).padding(0.2);
            const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

            g.append('g').attr('class', 'grid-lines').call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(5)).selectAll('line').style('stroke', '#e2e8f0').style('stroke-dasharray', '3,3');
            g.selectAll('.grid-lines path').style('display', 'none');

            g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x))
                .selectAll("text").attr("transform", "translate(-10,0)rotate(-45)").style("text-anchor", "end");

            g.append('g').call(d3.axisLeft(y).tickFormat(d => d + '%'));

            g.selectAll('rect.stacked-bar-item').data(rectsData).enter().append('rect')
                .attr('class', 'stacked-bar-item')
                .style('cursor', 'pointer')
                .style('transition', 'opacity 0.2s')
                .attr('x', d => x(d.year)).attr('y', d => y(d.y1)).attr('height', d => Math.max(0, y(d.y0) - y(d.y1))).attr('width', x.bandwidth())
                .attr('fill', d => getPatternFill(d.loc))
                .on('mousemove', function(event, d) {
                    
                    if (!activeSeries || activeSeries === d.loc) d3.select(this).style('opacity', 0.8);

                    const yearSegments = rectsData.filter(r => r.year === d.year);
                    const yearTotalRaw = yearSegments.reduce((sum, item) => sum + item.raw, 0);

                    let html = `
                        <div style="position: absolute; top: 12px; left: -6px; width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 6px solid rgba(15, 23, 42, 0.8);"></div>
                        <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
                            ${d.year} Total: ${yearTotalRaw.toLocaleString()}
                        </div>
                    `;
                    
                    yearSegments.forEach(item => {
                        html += `
                        <div style="display:flex; justify-content: space-between; align-items:center; gap:16px; margin-top:4px; font-size: 11px;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                ${getTooltipIcon(item.loc)}
                                <span>${item.loc}</span>
                            </div>
                            <strong>${item.pct.toFixed(1)}%</strong>
                        </div>`;
                    });

                    tooltip.style('opacity', 1).html(html).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
                }).on('mouseout', function(event, d) { 
                    d3.select(this).style('opacity', null);
                    applyHighlight(); 
                    tooltip.style('opacity', 0); 
                }).on('click', (event, d) => { event.stopPropagation(); toggleHighlight(d.loc); });
                
            drawLegend();
        }
        applyHighlight();
    }
    const ro = new ResizeObserver(() => window.requestAnimationFrame(draw));
    ro.observe(wrapper.node()); container.node()._d3Observer = ro;
}
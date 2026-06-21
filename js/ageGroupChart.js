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

    const customX = {
        draw(context, size) {
            const r = Math.sqrt(size) * 0.6;
            const w = r * 0.3;
            context.moveTo(-r, -r+w); context.lineTo(-r+w, -r); context.lineTo(0, -w);
            context.lineTo(r-w, -r); context.lineTo(r, -r+w); context.lineTo(w, 0);
            context.lineTo(r, r-w); context.lineTo(r-w, r); context.lineTo(0, w);
            context.lineTo(-r+w, r); context.lineTo(-r, r-w); context.lineTo(-w, 0);
            context.closePath();
        }
    };

    const customHexagon = {
        draw(context, size) {
            const r = Math.sqrt(size) * 0.65;
            const h = r * 0.866;
            context.moveTo(r, 0);
            context.lineTo(r/2, h);
            context.lineTo(-r/2, h);
            context.lineTo(-r, 0);
            context.lineTo(-r/2, -h);
            context.lineTo(r/2, -h);
            context.closePath();
        }
    };

    const targetColors = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];
    const targetShapes = [d3.symbolCircle, d3.symbolSquare, d3.symbolStar, d3.symbolTriangle, d3.symbolDiamond, customX, d3.symbolCross, customHexagon];
    const colorScale = d3.scaleOrdinal().domain(allAges).range(targetColors);
    const shapeScale = d3.scaleOrdinal().domain(allAges).range(targetShapes);

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
        .style('z-index', 9999)
        .style('transform', 'translateY(-50%)'); 

    let activeSeries = null;
    const isSingleYear = selectedYears.length === 1;
    const isSingleAge = selectedAges.length === 1;
    const useBarChart = isSingleYear || isSingleAge;

    function draw() {
        svg.selectAll('*').remove();
        const cw = wrapper.node().clientWidth; const ch = wrapper.node().clientHeight;
        if (cw === 0 || ch === 0) return;

        const margin = useBarChart 
            ? { top: 55, right: 20, bottom: isSingleYear ? 70 : 45, left: 60 } 
            : { top: 20, right: 85, bottom: 45, left: 60 };

        const width = cw - margin.left - margin.right; const height = ch - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        function toggleHighlight(key) { activeSeries = activeSeries === key ? null : key; applyHighlight(); }

        function applyHighlight() {
            if (!activeSeries) {
                g.selectAll('.line-group, .legend-item, .bar-item, .bar-label, .dot').style('opacity', 1);
            } else {
                g.selectAll('.line-group').style('opacity', d => d.age === activeSeries ? 1 : 0.1);
                g.selectAll('.legend-item').style('opacity', d => d === activeSeries ? 1 : 0.1);
                g.selectAll('.bar-item, .bar-label').style('opacity', d => d.seriesKey === activeSeries ? 1 : 0.1);
                g.selectAll('.dot').style('opacity', d => d.age === activeSeries ? 1 : 0.1);
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

        if (useBarChart) {
            const labels = isSingleYear ? selectedAges : selectedYears;
            const activeKey = isSingleYear ? yearKey : ageKey;
            const activeVal = isSingleYear ? selectedYears[0] : selectedAges[0];

            const dataPoints = labels.map(lbl => {
                const matches = dataset.filter(r => r[activeKey]?.toString().trim() === activeVal && r[isSingleYear ? ageKey : yearKey]?.toString().trim() === lbl);
                const sum = matches.reduce((s, r) => s + getValue(r), 0);
                return { label: lbl, value: sum, 
                         f: matches.reduce((s, r) => s + (parseFloat(r[finesKey]) || 0), 0), 
                         a: matches.reduce((s, r) => s + (parseFloat(r[arrestsKey]) || 0), 0), 
                         c: matches.reduce((s, r) => s + (parseFloat(r[chargesKey]) || 0), 0),
                         seriesKey: isSingleYear ? lbl : activeVal };
            });

            const x = d3.scaleBand().domain(labels).range([0, width]).padding(0.2);
            const y = d3.scaleLinear().domain([0, d3.max(dataPoints, d => d.value) * 1.1]).nice().range([height, 0]);

            g.append('g').attr('class', 'grid-lines').call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(6)).selectAll('line').style('stroke', '#e2e8f0').style('stroke-dasharray', '3,3');
            g.selectAll('.grid-lines path').style('display', 'none');

            const xAxis = g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
            xAxis.selectAll("text").attr("transform", "translate(-10,0)rotate(-45)").style("text-anchor", "end");

            g.append('g').call(d3.axisLeft(y));

            g.selectAll('rect.bar-item').data(dataPoints).enter().append('rect').attr('class', 'bar-item').style('transition', 'opacity 0.2s').style('pointer-events', 'none')
                .attr('x', d => x(d.label)).attr('y', d => y(d.value)).attr('width', x.bandwidth()).attr('height', d => height - y(d.value)).attr('fill', d => colorScale(d.seriesKey));

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
                        return bar.label === closestCategory ? 0.8 : 1;
                    });

                    let html = `
                        <div style="position: absolute; top: 50%; left: -6px; transform: translateY(-50%); width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 6px solid rgba(15, 23, 42, 0.8);"></div>
                        <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <svg width="14" height="14" style="flex-shrink: 0; overflow: visible;">
                                    <path d="${d3.symbol().type(shapeScale(d.seriesKey)).size(40)()}" transform="translate(7,7)" fill="#fff" stroke="${colorScale(d.seriesKey)}" stroke-width="2"></path>
                                </svg>
                                <span>${d.seriesKey} (${isSingleYear ? activeVal : d.label})</span>
                            </div>
                        </div>
                        <div style="font-size: 11px;">Offenses: <strong>${d.value.toLocaleString()}</strong><br>• Fines: ${d.f.toLocaleString()}<br>• Arrests: ${d.a.toLocaleString()}<br>• Charges: ${d.c.toLocaleString()}</div>
                    `;
                    tooltip.style('opacity', 1).html(html);
                    const tipHeight = tooltip.node().offsetHeight;
                    tooltip.style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - (tipHeight / 2)) + 'px');
                }).on('mouseout', function() { 
                    g.selectAll('rect.bar-item').style('opacity', 1);
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
            
            g.selectAll('text.bar-label').data(dataPoints).enter().append('text').attr('class', 'bar-label').style('transition', 'opacity 0.2s').style('pointer-events', 'none')
                .attr('transform', d => `translate(${x(d.label) + x.bandwidth() / 2}, ${y(d.value) - 8}) rotate(-90)`)
                .style('font-size', '11px').style('fill', '#334155').style('font-weight', '600').style('font-family', 'sans-serif')
                .attr('text-anchor', 'start').attr('alignment-baseline', 'middle')
                .text(d => d.value.toLocaleString());

        } else {
            const x = d3.scalePoint().domain(selectedYears).range([0, width]);
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
            
            lines.selectAll('.dot').data(d => d.values.map(v => ({...v, age: d.age}))).enter().append('path').attr('class', 'dot').style('transition', 'all 0.15s ease-out')
                .attr('d', d => d3.symbol().type(shapeScale(d.age)).size(50)()).attr('transform', d => `translate(${x(d.year)},${y(d.val)})`).style('fill', '#fff').style('stroke', d => colorScale(d.age)).style('stroke-width', 2).style('cursor', 'pointer')
                .on('mousemove', function(event, d) {
                    
                    g.selectAll('.dot').attr('d', dotData => {
                        if (dotData.year === d.year) {
                            return d3.symbol().type(shapeScale(dotData.age)).size(dotData.age === d.age ? 200 : 100)();
                        }
                        return d3.symbol().type(shapeScale(dotData.age)).size(50)();
                    });

                    const yearData = lineData.map(ld => {
                        const pt = ld.values.find(v => v.year === d.year);
                        return { age: ld.age, val: pt ? pt.val : 0 };
                    });

                    const sortedData = yearData.sort((a, b) => b.val - a.val);
                    const yearTotalRaw = sortedData.reduce((sum, item) => sum + item.val, 0);

                    let html = `
                        <div style="position: absolute; top: 50%; left: -6px; transform: translateY(-50%); width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 6px solid rgba(15, 23, 42, 0.8);"></div>
                        <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
                            ${d.year} Total: ${yearTotalRaw.toLocaleString()}
                        </div>
                    `;
                    
                    sortedData.forEach(item => {
                        html += `
                        <div style="display:flex; justify-content: space-between; align-items:center; gap:20px; margin-top:4px; font-size: 11px;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <svg width="14" height="14" style="flex-shrink: 0; overflow: visible;">
                                    <path d="${d3.symbol().type(shapeScale(item.age)).size(40)()}" transform="translate(7,7)" fill="#fff" stroke="${colorScale(item.age)}" stroke-width="2"></path>
                                </svg>
                                <span>${item.age}</span>
                            </div>
                            <strong>${item.val.toLocaleString()}</strong>
                        </div>`;
                    });

                    tooltip.style('opacity', 1).html(html);
                    const tipHeight = tooltip.node().offsetHeight;
                    tooltip.style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - (tipHeight / 2)) + 'px');
                }).on('mouseout', function(event, d) { 
                    g.selectAll('.dot').attr('d', dotData => d3.symbol().type(shapeScale(dotData.age)).size(50)()); 
                    tooltip.style('opacity', 0); 
                }).on('click', (event, d) => { event.stopPropagation(); toggleHighlight(d.age); });

            drawLegend(); 
        }
        applyHighlight(); 
    }
    const ro = new ResizeObserver(() => window.requestAnimationFrame(draw));
    ro.observe(wrapper.node()); container.node()._d3Observer = ro;
}
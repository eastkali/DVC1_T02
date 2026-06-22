function updateKPICards(containerId, dataset) {
    let targetContainerId = containerId;
    let targetDataset = dataset;
    // Fallback logic: If the first argument is accidentally the array, gracefully reassign variables
    if (Array.isArray(containerId)) {
        targetDataset = containerId;
        targetContainerId = 'offenseLevelKpiContainer';
    }

    // Locate the container in the DOM
    const container = document.getElementById(targetContainerId);
    if (!container) return;
    
    // Handle Empty State: Prevent mathematical errors by rendering a clean fallback UI if no data exists
    if (!targetDataset || !Array.isArray(targetDataset) || targetDataset.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b; font-size: 13px;">No data available for the selected filters.</div>';
        return;
    }
    
    try {
        // Initialize aggregate counters
        let totalFines = 0;
        let totalArrests = 0;
        let totalCharges = 0;
        let totalOffenses = 0;
        
        // Extract headers from the first row of data
        const keys = Object.keys(targetDataset[0] || {});
        
        // Dynamic Key Matching
        // Instead of hardcoding exact column names,
        // it searches for keywords (case-insensitive) to find the correct data columns.
        const yearKey = keys.find(k => k.toLowerCase() === 'year') || 'YEAR';
        const fineK = keys.find(k => k.toLowerCase().includes('fine'));
        const arrestK = keys.find(k => k.toLowerCase().includes('arrest'));
        const chargeK = keys.find(k => k.toLowerCase().includes('charge'));
        const offenseK = keys.find(k => k.toLowerCase().includes('offense') || k.toLowerCase().includes('count') || k.toLowerCase().includes('total'));

        // Determine how many unique years are present in the current filter state
        const uniqueYears = [...new Set(targetDataset.map(row => row[yearKey] ? row[yearKey].toString().trim() : ''))].filter(Boolean);
        const yearCount = uniqueYears.length > 0 ? uniqueYears.length : 1;
        const isMultiYear = yearCount > 1;

        // Iterate through all filtered rows to accumulate the raw totals
        targetDataset.forEach(row => {
            const f = fineK ? parseFloat(row[fineK]) || 0 : 0;
            const a = arrestK ? parseFloat(row[arrestK]) || 0 : 0;
            const c = chargeK ? parseFloat(row[chargeK]) || 0 : 0;
            let o = offenseK ? parseFloat(row[offenseK]) || 0 : 0;
            
            // Fallback: If an explicit 'offense' total isn't provided, calculate it from sub-metrics
            if (o === 0) o = (f + a + c);

            totalFines += f;
            totalArrests += a;
            totalCharges += c;
            totalOffenses += o;
        });

        // If multiple years are selected, displaying a massive cumulative total is misleading.
        // Instead, we mathematically average the sums across the number of selected years.
        const displayOffenses = isMultiYear ? Math.round(totalOffenses / yearCount) : totalOffenses;
        const displayFines = isMultiYear ? Math.round(totalFines / yearCount) : totalFines;
        const displayArrests = isMultiYear ? Math.round(totalArrests / yearCount) : totalArrests;
        const displayCharges = isMultiYear ? Math.round(totalCharges / yearCount) : totalCharges;

        // Dynamically adjust the UI labels to reflect whether the data is a Total or an Average
        const offLabel = isMultiYear ? `AVG OF ${yearCount} YRS OFFENSES` : 'TOTAL OFFENSES';
        const fineLabel = isMultiYear ? `AVG OF ${yearCount} YRS FINES` : 'TOTAL FINES';
        const arrLabel = isMultiYear ? `AVG OF ${yearCount} YRS ARRESTS` : 'TOTAL ARRESTS';
        const charLabel = isMultiYear ? `AVG OF ${yearCount} YRS CHARGES` : 'TOTAL CHARGES';

        // --- DOM INJECTION ---
        // Apply structural CSS directly to the container to ensure flex layout
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%'; 
        container.style.width = '100%';
        container.style.overflow = 'hidden';

        // Inject the generated KPI blocks with precise typography and spacing
        container.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; border-bottom: 1px solid #f1f5f9; background: #ffffff; padding: 12px 10px;">
                <span style="font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1;">${displayOffenses.toLocaleString()}</span>
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 4px; line-height: 1.1; text-align: center;">${offLabel}</span>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; border-bottom: 1px solid #f1f5f9; background: #ffffff; padding: 12px 10px;">
                <span style="font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1;">${displayFines.toLocaleString()}</span>
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 4px; line-height: 1.1; text-align: center;">${fineLabel}</span>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; border-bottom: 1px solid #f1f5f9; background: #ffffff; padding: 12px 10px;">
                <span style="font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1;">${displayArrests.toLocaleString()}</span>
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 4px; line-height: 1.1; text-align: center;">${arrLabel}</span>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #ffffff; padding: 12px 10px;">
                <span style="font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1;">${displayCharges.toLocaleString()}</span>
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 4px; line-height: 1.1; text-align: center;">${charLabel}</span>
            </div>
        `;
    } catch (error) {
        console.error("KPI Card Error:", error);
    }
}

// Map internal rendering function to global scope for easy external invocation
window.renderOffenseLevelKpi = function(containerId, dataset) {
    updateKPICards(containerId, dataset);
};
window.updateKPICards = updateKPICards;
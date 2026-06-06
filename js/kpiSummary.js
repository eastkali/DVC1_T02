function updateKPICards(containerId, dataset) {
    let targetContainerId = containerId;
    let targetDataset = dataset;
    if (Array.isArray(containerId)) {
        targetDataset = containerId;
        targetContainerId = 'offenseLevelKpiContainer';
    }

    const container = document.getElementById(targetContainerId);
    if (!container) return;
    
    if (!targetDataset || !Array.isArray(targetDataset) || targetDataset.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    try {
        let totalFines = 0;
        let totalArrests = 0;
        let totalCharges = 0;
        let totalOffenses = 0;
        
        const keys = Object.keys(targetDataset[0] || {});
        
        const fineK = keys.find(k => k.toLowerCase().includes('fine'));
        const arrestK = keys.find(k => k.toLowerCase().includes('arrest'));
        const chargeK = keys.find(k => k.toLowerCase().includes('charge'));
        const offenseK = keys.find(k => k.toLowerCase().includes('offenses_sum') || k.toLowerCase() === 'offenses') || keys.find(k => k.toLowerCase().includes('total'));

        targetDataset.forEach(row => {
            const f = fineK ? parseFloat(row[fineK]) || 0 : 0;
            const a = arrestK ? parseFloat(row[arrestK]) || 0 : 0;
            const c = chargeK ? parseFloat(row[chargeK]) || 0 : 0;
            let o = offenseK ? parseFloat(row[offenseK]) || 0 : 0;
            
            if (o === 0) o = (f + a + c);

            totalFines += f;
            totalArrests += a;
            totalCharges += c;
            totalOffenses += o;
        });

        container.innerHTML = `
            <div style="width: 100%; text-align: center; padding: 2px 0; border-bottom: 1px solid #f0f0f0; background: #ffffff; color: #000000;">
                <h1 style="font-size: 15px; font-weight: 700; margin: 0; color: #000000; line-height: 1.1;">${totalOffenses.toLocaleString()}</h1>
                <span style="font-size: 9px; font-weight: 600; text-transform: uppercase; color: #666666; display: block; margin-top: 1px; letter-spacing: 0.3px; white-space: nowrap;">TOTAL OFFENSES</span>
            </div>
            <div style="width: 100%; text-align: center; padding: 2px 0; border-bottom: 1px solid #f0f0f0; background: #ffffff; color: #000000;">
                <h2 style="font-size: 14px; font-weight: 700; margin: 0; color: #000000; line-height: 1.1;">${totalFines.toLocaleString()}</h2>
                <span style="font-size: 9px; font-weight: 600; text-transform: uppercase; color: #666666; display: block; margin-top: 1px; letter-spacing: 0.3px; white-space: nowrap;">FINES</span>
            </div>
            <div style="width: 100%; text-align: center; padding: 2px 0; border-bottom: 1px solid #f0f0f0; background: #ffffff; color: #000000;">
                <h2 style="font-size: 14px; font-weight: 700; margin: 0; color: #000000; line-height: 1.1;">${totalArrests.toLocaleString()}</h2>
                <span style="font-size: 9px; font-weight: 600; text-transform: uppercase; color: #666666; display: block; margin-top: 1px; letter-spacing: 0.3px; white-space: nowrap;">ARRESTS</span>
            </div>
            <div style="width: 100%; text-align: center; padding: 2px 0; background: #ffffff; color: #000000;">
                <h2 style="font-size: 14px; font-weight: 700; margin: 0; color: #000000; line-height: 1.1;">${totalCharges.toLocaleString()}</h2>
                <span style="font-size: 9px; font-weight: 600; text-transform: uppercase; color: #666666; display: block; margin-top: 1px; letter-spacing: 0.3px; white-space: nowrap;">CHARGES</span>
            </div>
        `;
    } catch (error) {
        console.error("KPI Card Error:", error);
    }
}

window.renderOffenseLevelKpi = function(containerId, dataset) {
    updateKPICards(containerId, dataset);
};
window.updateKPICards = updateKPICards;
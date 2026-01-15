/**
 * Report Generator
 * Generates PDF and Excel reports for custom analysis results
 */

import { storagePut } from "./storage";

interface ReportData {
  siteName: string;
  analysisName: string;
  analysisDate: Date;
  performanceRatio: number;
  availability: number;
  energyGeneration: number;
  revenue: number;
  penalties: number;
  contractTerms?: any;
  complianceStatus: {
    prCompliant: boolean;
    availabilityCompliant: boolean;
  };
}

/**
 * Generate PDF report using markdown and manus-md-to-pdf utility
 */
export async function generatePDFReport(data: ReportData): Promise<string> {
  // Create markdown content
  const markdown = `
# Solar Farm Performance Analysis Report

**Site:** ${data.siteName}  
**Analysis:** ${data.analysisName}  
**Date:** ${data.analysisDate.toLocaleDateString()}

---

## Executive Summary

This report presents the performance analysis results for ${data.siteName} based on uploaded SCADA and meteorological data analyzed against contract terms.

### Key Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Performance Ratio | ${data.performanceRatio.toFixed(1)}% | ${data.complianceStatus.prCompliant ? '✓ Compliant' : '✗ Below Target'} |
| Availability | ${data.availability.toFixed(1)}% | ${data.complianceStatus.availabilityCompliant ? '✓ Compliant' : '✗ Below Target'} |
| Energy Generation | ${(data.energyGeneration / 1000).toFixed(1)} MWh | - |
| Revenue | $${(data.revenue / 1000).toFixed(1)}k | - |
| Penalties | $${(data.penalties / 1000).toFixed(1)}k | ${data.penalties > 0 ? '⚠ Applied' : '✓ None'} |
| **Net Revenue** | **$${((data.revenue - data.penalties) / 1000).toFixed(1)}k** | - |

---

## Performance Analysis

### Performance Ratio (PR)

The Performance Ratio measures the actual energy output compared to the theoretical maximum output under given conditions. The site achieved a PR of **${data.performanceRatio.toFixed(1)}%** during the analysis period.

${data.complianceStatus.prCompliant 
  ? '**Status:** ✓ The PR meets or exceeds contractual requirements.'
  : '**Status:** ✗ The PR is below contractual requirements, resulting in performance penalties.'}

### Availability

System availability measures the percentage of time the solar farm was operational and capable of generating power. The site achieved **${data.availability.toFixed(1)}%** availability.

${data.complianceStatus.availabilityCompliant
  ? '**Status:** ✓ Availability meets contractual requirements.'
  : '**Status:** ✗ Availability is below contractual requirements.'}

### Energy Generation

Total energy generated during the analysis period: **${(data.energyGeneration / 1000).toFixed(1)} MWh**

---

## Financial Summary

### Revenue Calculation

- **Gross Revenue:** $${(data.revenue / 1000).toFixed(1)}k
- **Performance Penalties:** $${(data.penalties / 1000).toFixed(1)}k
- **Net Revenue:** $${((data.revenue - data.penalties) / 1000).toFixed(1)}k

${data.penalties > 0 
  ? `\n### Penalty Assessment\n\nPerformance penalties of $${(data.penalties / 1000).toFixed(1)}k have been applied due to performance falling below contractual guarantees. This represents ${((data.penalties / data.revenue) * 100).toFixed(1)}% of gross revenue.`
  : ''}

---

## Contract Terms

${data.contractTerms?.tariff_structure 
  ? `### Tariff Structure\n\n- **Base Tariff:** $${data.contractTerms.tariff_structure.base_tariff || 0}/MWh\n${data.contractTerms.tariff_structure.time_of_use_rates ? '- **Time-of-Use Rates:** Applied\n' : ''}`
  : ''}

${data.contractTerms?.capacity_guarantees
  ? `### Performance Guarantees\n\n${data.contractTerms.capacity_guarantees.min_performance_ratio ? `- **Minimum PR:** ${data.contractTerms.capacity_guarantees.min_performance_ratio}%\n` : ''}${data.contractTerms.capacity_guarantees.min_availability ? `- **Minimum Availability:** ${data.contractTerms.capacity_guarantees.min_availability}%\n` : ''}`
  : ''}

---

## Compliance Status

| Requirement | Target | Actual | Status |
|-------------|--------|--------|--------|
| Performance Ratio | ${data.contractTerms?.capacity_guarantees?.min_performance_ratio || 85}% | ${data.performanceRatio.toFixed(1)}% | ${data.complianceStatus.prCompliant ? '✓ Compliant' : '✗ Non-Compliant'} |
| Availability | ${data.contractTerms?.capacity_guarantees?.min_availability || 98}% | ${data.availability.toFixed(1)}% | ${data.complianceStatus.availabilityCompliant ? '✓ Compliant' : '✗ Non-Compliant'} |

---

## Recommendations

${!data.complianceStatus.prCompliant || !data.complianceStatus.availabilityCompliant
  ? `### Performance Improvement Actions\n\n${!data.complianceStatus.prCompliant ? '- **PR Below Target:** Investigate inverter efficiency, soiling losses, and module degradation. Consider enhanced O&M procedures.\n' : ''}${!data.complianceStatus.availabilityCompliant ? '- **Availability Below Target:** Review downtime logs, identify recurring faults, and improve preventive maintenance schedules.\n' : ''}`
  : '### Maintain Current Performance\n\nThe site is meeting all contractual requirements. Continue current O&M practices and monitor for any degradation trends.'}

---

*Report generated by Solar Farm Performance Analyzer*  
*Date: ${new Date().toLocaleString()}*
`;

  // Write markdown to temp file
  const tempMdPath = `/tmp/report-${Date.now()}.md`;
  const tempPdfPath = `/tmp/report-${Date.now()}.pdf`;
  
  const fs = await import('fs/promises');
  await fs.writeFile(tempMdPath, markdown);
  
  // Convert to PDF using manus-md-to-pdf utility
  const { execSync } = await import('child_process');
  try {
    execSync(`manus-md-to-pdf ${tempMdPath} ${tempPdfPath}`, { stdio: 'inherit' });
    
    // Read PDF and upload to S3
    const pdfBuffer = await fs.readFile(tempPdfPath);
    const fileKey = `analysis-reports/report-${Date.now()}.pdf`;
    const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
    
    // Cleanup temp files
    await fs.unlink(tempMdPath).catch(() => {});
    await fs.unlink(tempPdfPath).catch(() => {});
    
    return url;
  } catch (error) {
    // Cleanup on error
    await fs.unlink(tempMdPath).catch(() => {});
    await fs.unlink(tempPdfPath).catch(() => {});
    throw error;
  }
}

/**
 * Generate Excel report with detailed data tables
 */
export async function generateExcelReport(data: ReportData, timeSeriesData?: any[]): Promise<string> {
  const XLSX = await import('xlsx');
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['Solar Farm Performance Analysis Report'],
    [],
    ['Site', data.siteName],
    ['Analysis', data.analysisName],
    ['Date', data.analysisDate.toLocaleDateString()],
    [],
    ['Key Metrics'],
    ['Metric', 'Value', 'Status'],
    ['Performance Ratio', `${data.performanceRatio.toFixed(1)}%`, data.complianceStatus.prCompliant ? 'Compliant' : 'Below Target'],
    ['Availability', `${data.availability.toFixed(1)}%`, data.complianceStatus.availabilityCompliant ? 'Compliant' : 'Below Target'],
    ['Energy Generation', `${(data.energyGeneration / 1000).toFixed(1)} MWh`, '-'],
    ['Revenue', `$${(data.revenue / 1000).toFixed(1)}k`, '-'],
    ['Penalties', `$${(data.penalties / 1000).toFixed(1)}k`, data.penalties > 0 ? 'Applied' : 'None'],
    ['Net Revenue', `$${((data.revenue - data.penalties) / 1000).toFixed(1)}k`, '-'],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Time series data sheet (if provided)
  if (timeSeriesData && timeSeriesData.length > 0) {
    const timeSeriesSheet = XLSX.utils.json_to_sheet(timeSeriesData);
    XLSX.utils.book_append_sheet(workbook, timeSeriesSheet, 'Time Series Data');
  }
  
  // Contract terms sheet
  if (data.contractTerms) {
    const contractData = [
      ['Contract Terms'],
      [],
      ['Tariff Structure'],
      ['Base Tariff', data.contractTerms.tariff_structure?.base_tariff || 'N/A'],
      ['Time-of-Use Rates', data.contractTerms.tariff_structure?.time_of_use_rates ? 'Yes' : 'No'],
      [],
      ['Performance Guarantees'],
      ['Minimum PR', data.contractTerms.capacity_guarantees?.min_performance_ratio || 'N/A'],
      ['Minimum Availability', data.contractTerms.capacity_guarantees?.min_availability || 'N/A'],
    ];
    
    const contractSheet = XLSX.utils.aoa_to_sheet(contractData);
    XLSX.utils.book_append_sheet(workbook, contractSheet, 'Contract Terms');
  }
  
  // Write to buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  // Upload to S3
  const fileKey = `analysis-reports/report-${Date.now()}.xlsx`;
  const { url } = await storagePut(
    fileKey,
    Buffer.from(excelBuffer),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  
  return url;
}

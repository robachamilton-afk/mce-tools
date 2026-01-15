/**
 * Demo Data Generator
 * Creates mock data for demonstration purposes
 */

import { storagePut } from "./storage";

/**
 * Generate mock contract PDF content
 */
export async function generateMockContract(siteName: string): Promise<{ url: string; fileName: string }> {
  const contractMarkdown = `
# POWER PURCHASE AGREEMENT
## ${siteName}

**Date:** ${new Date().toLocaleDateString()}  
**Parties:** Main Character Energy Pty Ltd and ${siteName} Operator

---

## 1. PERFORMANCE GUARANTEES

### 1.1 Performance Ratio
The facility shall maintain a minimum Performance Ratio of **85%** calculated monthly.

**Performance Ratio Formula:**
\`\`\`
PR = (Actual Energy Output / Expected Energy Output) × 100
\`\`\`

Where Expected Energy Output is calculated based on:
- POA Irradiance (measured)
- Module specifications
- Temperature coefficients
- System losses (5%)

### 1.2 Availability
The facility shall maintain minimum availability of **98%** calculated monthly.

**Availability Formula:**
\`\`\`
Availability = (Available Hours / Total Hours) × 100
\`\`\`

Excluded Periods: Force Majeure events, scheduled maintenance (max 48 hours/year)

---

## 2. TARIFF STRUCTURE

### 2.1 Base Tariff
**$45.00 per MWh** for all energy delivered to the grid.

### 2.2 Time-of-Use Multipliers
- Peak (2pm-8pm weekdays): 1.3x base tariff
- Shoulder (7am-2pm, 8pm-10pm weekdays): 1.0x base tariff  
- Off-peak (all other times): 0.8x base tariff

---

## 3. CAPACITY DETAILS

- **Contract Capacity:** 50 MW AC
- **Minimum Generation:** 80% of contract capacity during peak periods
- **Degradation Allowance:** 0.5% per annum

---

## 4. PENALTIES

### 4.1 Performance Penalties
If monthly PR falls below 85%:
- **Penalty = (85% - Actual PR) × Monthly Revenue × 2.0**

### 4.2 Availability Penalties  
If monthly availability falls below 98%:
- **Penalty = (98% - Actual Availability) × $5,000 per percentage point**

---

## 5. TERM
- **Start Date:** ${new Date().toLocaleDateString()}
- **End Date:** ${new Date(Date.now() + 365 * 25 * 24 * 60 * 60 * 1000).toLocaleDateString()} (25 years)

---

*This is a demonstration contract for ${siteName}*
`;

  // Convert markdown to PDF would normally use manus-md-to-pdf
  // For demo, just store markdown as text file
  const fileKey = `demo-contracts/contract-${Date.now()}.txt`;
  const { url } = await storagePut(fileKey, contractMarkdown, 'text/plain');
  
  return {
    url,
    fileName: `${siteName.replace(/\s+/g, '_')}_PPA_Demo.txt`,
  };
}

/**
 * Generate mock SCADA CSV data
 */
export async function generateMockSCADAData(days: number = 30): Promise<{ url: string; fileName: string }> {
  const rows = ['timestamp,active_power_kw,availability_pct,inverter_efficiency_pct'];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Generate hourly data
  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      date.setHours(hour, 0, 0, 0);
      
      // Simulate solar generation curve
      const hourOfDay = date.getHours();
      let basePower = 0;
      
      if (hourOfDay >= 6 && hourOfDay <= 18) {
        // Daylight hours - bell curve
        const solarNoon = 12;
        const hoursFromNoon = Math.abs(hourOfDay - solarNoon);
        basePower = 45000 * Math.exp(-Math.pow(hoursFromNoon / 4, 2)); // 45 MW peak
      }
      
      // Add some randomness
      const power = basePower * (0.9 + Math.random() * 0.2);
      const availability = 95 + Math.random() * 5; // 95-100%
      const efficiency = 96 + Math.random() * 3; // 96-99%
      
      rows.push(
        `${date.toISOString()},${power.toFixed(2)},${availability.toFixed(2)},${efficiency.toFixed(2)}`
      );
    }
  }
  
  const csvContent = rows.join('\n');
  const fileKey = `demo-scada/scada-${Date.now()}.csv`;
  const { url } = await storagePut(fileKey, csvContent, 'text/csv');
  
  return {
    url,
    fileName: `SCADA_Data_Demo_${days}days.csv`,
  };
}

/**
 * Generate mock meteorological CSV data
 */
export async function generateMockMeteoData(days: number = 30): Promise<{ url: string; fileName: string }> {
  const rows = ['timestamp,poa_irradiance_w_m2,ambient_temp_c,module_temp_c,wind_speed_m_s'];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Generate hourly data
  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      date.setHours(hour, 0, 0, 0);
      
      const hourOfDay = date.getHours();
      let baseIrradiance = 0;
      
      if (hourOfDay >= 6 && hourOfDay <= 18) {
        // Daylight hours - bell curve
        const solarNoon = 12;
        const hoursFromNoon = Math.abs(hourOfDay - solarNoon);
        baseIrradiance = 1000 * Math.exp(-Math.pow(hoursFromNoon / 4, 2)); // 1000 W/m² peak
      }
      
      // Add some randomness and cloud effects
      const irradiance = baseIrradiance * (0.7 + Math.random() * 0.3);
      
      // Temperature varies with time of day
      const baseTemp = 25 + (hourOfDay - 6) * 1.5 - Math.abs(hourOfDay - 14) * 0.8;
      const ambientTemp = baseTemp + (Math.random() - 0.5) * 5;
      const moduleTemp = ambientTemp + (irradiance / 1000) * 25; // Modules heat up with sun
      const windSpeed = 2 + Math.random() * 8; // 2-10 m/s
      
      rows.push(
        `${date.toISOString()},${irradiance.toFixed(2)},${ambientTemp.toFixed(2)},${moduleTemp.toFixed(2)},${windSpeed.toFixed(2)}`
      );
    }
  }
  
  const csvContent = rows.join('\n');
  const fileKey = `demo-meteo/meteo-${Date.now()}.csv`;
  const { url } = await storagePut(fileKey, csvContent, 'text/csv');
  
  return {
    url,
    fileName: `Meteo_Data_Demo_${days}days.csv`,
  };
}

/**
 * Generate mock extracted model from contract
 */
export function generateMockExtractedModel() {
  return {
    equations: {
      performance_ratio: {
        formula: "(Actual Energy Output / Expected Energy Output) × 100",
        variables: ["actual_energy_output", "expected_energy_output"],
        description: "Monthly Performance Ratio calculation"
      },
      availability: {
        formula: "(Available Hours / Total Hours) × 100",
        variables: ["available_hours", "total_hours"],
        description: "Monthly Availability calculation",
        exclusions: ["Force Majeure events", "Scheduled maintenance (max 48 hours/year)"]
      },
      expected_energy: {
        formula: "POA_Irradiance × Module_Efficiency × System_Area × (1 - System_Losses)",
        variables: ["poa_irradiance", "module_efficiency", "system_area", "system_losses"],
        description: "Expected energy output calculation"
      }
    },
    parameters: {
      module_efficiency: { value: 0.20, unit: "decimal", description: "Module conversion efficiency" },
      system_losses: { value: 0.05, unit: "decimal", description: "System losses (cables, inverters, etc.)" },
      degradation_rate: { value: 0.005, unit: "per_annum", description: "Annual degradation rate" }
    },
    tariff_structure: {
      base_tariff: { value: 45.0, unit: "$/MWh", description: "Base energy tariff" },
      time_of_use_rates: {
        peak: { multiplier: 1.3, hours: "2pm-8pm weekdays" },
        shoulder: { multiplier: 1.0, hours: "7am-2pm, 8pm-10pm weekdays" },
        off_peak: { multiplier: 0.8, hours: "all other times" }
      }
    },
    capacity_guarantees: {
      contract_capacity_mw: { value: 50, unit: "MW AC" },
      min_performance_ratio: { value: 85, unit: "%" },
      min_availability: { value: 98, unit: "%" },
      min_generation_peak: { value: 80, unit: "% of capacity", description: "During peak periods" }
    },
    penalties: {
      performance_penalty: {
        condition: "PR < 85%",
        formula: "(85% - Actual PR) × Monthly Revenue × 2.0",
        description: "Applied when monthly PR falls below guarantee"
      },
      availability_penalty: {
        condition: "Availability < 98%",
        formula: "(98% - Actual Availability) × $5,000",
        unit: "$ per percentage point",
        description: "Applied when monthly availability falls below guarantee"
      }
    },
    contract_dates: {
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 365 * 25 * 24 * 60 * 60 * 1000).toISOString(),
      term_years: 25
    },
    _validation: {
      confidence: 95,
      needsClarification: false,
      clarificationCount: 0,
      undefinedTerms: [],
      missingParameters: [],
      ambiguities: []
    }
  };
}

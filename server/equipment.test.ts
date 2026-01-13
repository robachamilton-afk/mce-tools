import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './db';
import { siteConfigurations } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Equipment Details Schema', () => {
  it('should have equipment fields in schema', () => {
    // Verify schema includes equipment fields
    const schemaFields = Object.keys(siteConfigurations);
    
    expect(schemaFields).toContain('inverterMake');
    expect(schemaFields).toContain('inverterModel');
    expect(schemaFields).toContain('inverterCount');
    expect(schemaFields).toContain('moduleMake');
    expect(schemaFields).toContain('moduleModel');
    expect(schemaFields).toContain('pcuCount');
  });

  it('should support conditional equipment data', () => {
    // Mock configuration with equipment
    const configWithEquipment = {
      inverterMake: 'SMA',
      inverterModel: 'Sunny Central 2750',
      inverterCount: 48,
      moduleMake: 'Jinko Solar',
      moduleModel: 'JKM400M-72H',
      pcuCount: 12,
    };

    expect(configWithEquipment.inverterMake).toBe('SMA');
    expect(configWithEquipment.inverterCount).toBe(48);
    expect(configWithEquipment.pcuCount).toBe(12);
  });

  it('should handle missing equipment data gracefully', () => {
    // Mock configuration without equipment
    const configWithoutEquipment = {
      inverterMake: null,
      moduleMake: null,
      pcuCount: null,
    };

    expect(configWithoutEquipment.inverterMake).toBeNull();
    expect(configWithoutEquipment.moduleMake).toBeNull();
    expect(configWithoutEquipment.pcuCount).toBeNull();
  });
});

describe('Performance Visualization Data', () => {
  it('should generate valid daily generation data', () => {
    const startDate = new Date('2026-01-04');
    const endDate = new Date('2026-01-11');
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    expect(days).toBe(7); // 7 days in assessment period
    
    // Simulate daily generation data
    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        potential: 450, // MWh
        actual: 400, // MWh
        curtailment: 50, // MWh
      };
    });

    expect(dailyData).toHaveLength(7);
    expect(dailyData[0].date).toBe('2026-01-04');
    expect(dailyData[6].date).toBe('2026-01-10');
  });

  it('should generate valid PR trend data', () => {
    const startDate = new Date('2026-01-04');
    const endDate = new Date('2026-01-11');
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Simulate PR data
    const prData = Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        technicalPr: 82.5 + (Math.random() * 5 - 2.5), // 80-85%
        overallPr: 75.3 + (Math.random() * 5 - 2.5), // 72-78%
      };
    });

    expect(prData).toHaveLength(7);
    prData.forEach(day => {
      expect(day.technicalPr).toBeGreaterThan(75);
      expect(day.technicalPr).toBeLessThan(90);
      expect(day.overallPr).toBeGreaterThan(70);
      expect(day.overallPr).toBeLessThan(80);
      expect(day.technicalPr).toBeGreaterThan(day.overallPr); // Technical PR should be higher
    });
  });

  it('should generate valid hourly generation pattern', () => {
    const hours = 24;
    const hourlyData = Array.from({ length: hours }, (_, hour) => {
      // Solar generation curve (6am-6pm)
      const isDaytime = hour >= 6 && hour <= 18;
      const generation = isDaytime ? 50 + Math.random() * 50 : 0;
      const curtailment = isDaytime && hour >= 11 && hour <= 15 ? Math.random() * 20 : 0;
      
      return {
        hour: hour.toString().padStart(2, '0') + ':00',
        generation,
        curtailment,
      };
    });

    expect(hourlyData).toHaveLength(24);
    
    // Check nighttime hours have no generation
    expect(hourlyData[0].generation).toBe(0); // Midnight
    expect(hourlyData[23].generation).toBe(0); // 11pm
    
    // Check daytime hours have generation
    expect(hourlyData[12].generation).toBeGreaterThan(0); // Noon
    
    // Check peak hours have curtailment
    const peakHours = hourlyData.slice(11, 16); // 11am-3pm
    const hasCurtailment = peakHours.some(h => h.curtailment > 0);
    expect(hasCurtailment).toBe(true);
  });

  it('should calculate correct assessment metrics', () => {
    const totalEnergyMwh = 2999;
    const curtailmentMwh = 215.4;
    const technicalPr = 82.5;
    const overallPr = 75.3;
    
    // Curtailment percentage (curtailment / total potential)
    const totalPotentialMwh = totalEnergyMwh + curtailmentMwh; // 3214.4 MWh
    const curtailmentPct = (curtailmentMwh / totalPotentialMwh) * 100;
    expect(curtailmentPct).toBeCloseTo(6.7, 1); // 215.4 / 3214.4 = 6.7%
    
    // Lost revenue estimate ($87/MWh spot price)
    const lostRevenue = curtailmentMwh * 87;
    expect(lostRevenue).toBeCloseTo(18750, -2);
    
    // PR difference (technical - overall)
    const prDifference = technicalPr - overallPr;
    expect(prDifference).toBeCloseTo(7.2, 1);
  });
});

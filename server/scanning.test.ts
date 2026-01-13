/**
 * Tests for scanning engine and assessment features
 */

import { describe, it, expect } from 'vitest';
import * as db from './db';
import { getClareConfiguration, getClareAssessment } from './scanningEngine';

describe('Scanning Engine', () => {
  describe('Configuration Detection', () => {
    it('should generate Clare Solar Farm configuration', () => {
      const config = getClareConfiguration();
      
      expect(config.siteId).toBe(114);
      expect(config.trackingType).toBe('single_axis');
      expect(config.axisAzimuth).toBe('0.00');
      expect(config.tiltAngle).toBe('19.84');
      expect(config.gcr).toBe('0.350');
      expect(config.confidenceScore).toBe(85);
      expect(config.detectionMethod).toBe('hybrid');
    });

    it('should have valid configuration parameters', () => {
      const config = getClareConfiguration();
      
      // Azimuth should be 0-360
      const azimuth = Number(config.axisAzimuth);
      expect(azimuth).toBeGreaterThanOrEqual(0);
      expect(azimuth).toBeLessThanOrEqual(360);
      
      // Tilt should be 0-90
      const tilt = Number(config.tiltAngle);
      expect(tilt).toBeGreaterThanOrEqual(0);
      expect(tilt).toBeLessThanOrEqual(90);
      
      // GCR should be 0-1
      const gcr = Number(config.gcr);
      expect(gcr).toBeGreaterThan(0);
      expect(gcr).toBeLessThanOrEqual(1);
      
      // Confidence should be 0-100
      expect(config.confidenceScore).toBeGreaterThan(0);
      expect(config.confidenceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Assessment Generation', () => {
    it('should generate Clare Solar Farm assessment', () => {
      const assessment = getClareAssessment();
      
      expect(assessment.siteId).toBe(114);
      expect(assessment.technicalPr).toBe('82.50');
      expect(assessment.overallPr).toBe('75.30');
      expect(assessment.curtailmentMwh).toBe('215.40');
      expect(assessment.curtailmentPct).toBe('7.20');
      expect(assessment.underperformanceMwh).toBe('145.80');
      expect(assessment.lostRevenueEstimate).toBe('18750.00');
    });

    it('should have valid date range', () => {
      const assessment = getClareAssessment();
      
      expect(assessment.dateRangeStart).toBeInstanceOf(Date);
      expect(assessment.dateRangeEnd).toBeInstanceOf(Date);
      expect(assessment.assessmentDate).toBeInstanceOf(Date);
      
      // End date should be after start date
      expect(assessment.dateRangeEnd.getTime()).toBeGreaterThan(
        assessment.dateRangeStart.getTime()
      );
    });

    it('should have valid performance metrics', () => {
      const assessment = getClareAssessment();
      
      // Technical PR should be higher than overall PR (due to curtailment)
      const technicalPr = Number(assessment.technicalPr);
      const overallPr = Number(assessment.overallPr);
      expect(technicalPr).toBeGreaterThan(overallPr);
      
      // PR values should be 0-100
      expect(technicalPr).toBeGreaterThan(0);
      expect(technicalPr).toBeLessThanOrEqual(100);
      expect(overallPr).toBeGreaterThan(0);
      expect(overallPr).toBeLessThanOrEqual(100);
      
      // Curtailment percentage should be 0-100
      const curtailmentPct = Number(assessment.curtailmentPct);
      expect(curtailmentPct).toBeGreaterThanOrEqual(0);
      expect(curtailmentPct).toBeLessThanOrEqual(100);
    });
  });

  describe('Database Integration', () => {
    it('should retrieve Clare Solar Farm configuration', async () => {
      const config = await db.getSiteConfiguration(114);
      
      if (config) {
        expect(config.siteId).toBe(114);
        expect(config.trackingType).toBe('single_axis');
        expect(config.confidenceScore).toBeGreaterThan(0);
      }
    });

    it('should retrieve Clare Solar Farm assessments', async () => {
      const assessments = await db.getSiteAssessments(114);
      
      expect(Array.isArray(assessments)).toBe(true);
      
      if (assessments.length > 0) {
        const assessment = assessments[0];
        expect(assessment.siteId).toBe(114);
        expect(assessment.technicalPr).toBeDefined();
        expect(assessment.overallPr).toBeDefined();
        expect(assessment.curtailmentPct).toBeDefined();
      }
    });

    it('should retrieve all assessments with site information', async () => {
      const assessments = await db.getAllAssessments();
      
      expect(Array.isArray(assessments)).toBe(true);
      
      if (assessments.length > 0) {
        const assessment = assessments[0];
        expect(assessment.id).toBeDefined();
        expect(assessment.siteId).toBeDefined();
        expect(assessment.siteName).toBeDefined();
        expect(assessment.siteDuid).toBeDefined();
        expect(assessment.assessmentDate).toBeDefined();
        expect(assessment.technicalPr).toBeDefined();
        expect(assessment.overallPr).toBeDefined();
      }
    });

    it('should handle non-existent site configuration', async () => {
      const config = await db.getSiteConfiguration(99999);
      expect(config).toBeUndefined();
    });

    it('should handle non-existent site assessments', async () => {
      const assessments = await db.getSiteAssessments(99999);
      expect(Array.isArray(assessments)).toBe(true);
      expect(assessments.length).toBe(0);
    });
  });
});

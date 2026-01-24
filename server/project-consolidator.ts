/**
 * Project Consolidator - Phase 2 Processing
 * 
 * Runs reconciliation, narrative generation, and specialized extraction
 * when user clicks "Process & Consolidate"
 */

import mysql from 'mysql2/promise';
import { invokeLLM } from './_core/llm';

interface ConsolidationProgress {
  stage: string;
  progress: number;
  message: string;
}

export class ProjectConsolidator {
  private projectId: number;
  private projectDbName: string;
  private progressCallback?: (progress: ConsolidationProgress) => void;

  constructor(projectId: number, projectDbName: string, progressCallback?: (progress: ConsolidationProgress) => void) {
    this.projectId = projectId;
    this.projectDbName = projectDbName;
    this.progressCallback = progressCallback;
  }

  private async updateProgress(stage: string, progress: number, message: string) {
    if (this.progressCallback) {
      this.progressCallback({ stage, progress, message });
    }
    console.log(`[Consolidator] ${stage} (${progress}%): ${message}`);
  }

  /**
   * Run full consolidation process
   */
  async consolidate(): Promise<void> {
    await this.updateProgress('starting', 0, 'Starting consolidation...');

    // Step 1: Reconcile insights (deduplicate, merge similar)
    await this.updateProgress('reconciling', 10, 'Reconciling insights...');
    await this.reconcileInsights();

    // Step 2: Generate section narratives
    await this.updateProgress('narratives', 40, 'Generating narratives...');
    await this.generateNarratives();

    // Step 3: Extract performance parameters
    await this.updateProgress('performance', 60, 'Extracting performance parameters...');
    await this.extractPerformanceParameters();

    // Step 4: Extract financial data
    await this.updateProgress('financial', 75, 'Extracting financial data...');
    await this.extractFinancialData();

    // Step 5: Process weather files
    await this.updateProgress('weather', 85, 'Processing weather files...');
    await this.processWeatherFiles();

    // Step 6: Check validation trigger
    await this.updateProgress('validation', 95, 'Checking validation readiness...');
    await this.checkValidationTrigger();

    await this.updateProgress('complete', 100, 'Consolidation complete!');
  }

  private async reconcileInsights(): Promise<void> {
    // TODO: Implement reconciliation logic
    // This will run the insight-reconciler on all facts
    console.log('[Consolidator] Reconciliation not yet implemented');
  }

  private async generateNarratives(): Promise<void> {
    const projectDb = mysql.createPool({
      host: '127.0.0.1',
      user: 'root',
      database: this.projectDbName,
    });

    try {
      // Get all facts grouped by section
      const [facts]: any = await projectDb.execute(
        `SELECT \`key\`, value FROM extracted_facts WHERE project_id = ${this.projectId} AND deleted_at IS NULL`
      );

      // Group by section
      const { normalizeSection } = await import('../shared/section-normalizer');
      const { getSectionDisplayName } = await import('../shared/section-normalizer');
      
      const factsBySection = new Map<string, any[]>();
      for (const fact of facts) {
        const canonical = normalizeSection(fact.key);
        if (!factsBySection.has(canonical)) {
          factsBySection.set(canonical, []);
        }
        factsBySection.get(canonical)!.push(fact);
      }

      // Generate narratives for narrative-mode sections
      const narrativeSections = ['Project_Overview', 'Financial_Structure', 'Technical_Design'];
      const { getDb } = await import('./db');
      const mainDb = await getDb();

      for (const sectionName of narrativeSections) {
        const sectionFacts = factsBySection.get(sectionName);
        if (sectionFacts && sectionFacts.length > 0) {
          const displayName = getSectionDisplayName(sectionName);
          const factsText = sectionFacts.map((f, i) => `${i + 1}. ${f.value}`).join('\n');

          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `You are a technical writing assistant. Synthesize the following project insights into a cohesive, flowing narrative paragraph suitable for executive review. Maintain all factual details but present them as connected prose rather than bullet points.`
              },
              {
                role: 'user',
                content: `Section: ${displayName}\n\nInsights:\n${factsText}\n\nSynthesize these insights into 2-3 well-structured paragraphs.`
              }
            ]
          });

          const narrativeContent = response.choices[0]?.message?.content;
          const narrative = typeof narrativeContent === 'string' ? narrativeContent : '';

          if (narrative && mainDb) {
            const escapedNarrative = narrative.replace(/'/g, "''");
            await mainDb.execute(
              `INSERT INTO section_narratives (project_db_name, section_name, narrative_text) 
               VALUES ('${this.projectDbName}', '${sectionName}', '${escapedNarrative}') 
               ON DUPLICATE KEY UPDATE narrative_text = '${escapedNarrative}', updated_at = NOW()`
            );
            console.log(`[Consolidator] Generated narrative for ${displayName}`);
          }
        }
      }
    } finally {
      await projectDb.end();
    }
  }

  private async extractPerformanceParameters(): Promise<void> {
    // TODO: Implement performance parameter extraction
    console.log('[Consolidator] Performance extraction not yet implemented');
  }

  private async extractFinancialData(): Promise<void> {
    // TODO: Implement financial data extraction
    console.log('[Consolidator] Financial extraction not yet implemented');
  }

  private async processWeatherFiles(): Promise<void> {
    // TODO: Implement weather file processing
    console.log('[Consolidator] Weather processing not yet implemented');
  }

  private async checkValidationTrigger(): Promise<void> {
    // TODO: Implement validation trigger check
    console.log('[Consolidator] Validation check not yet implemented');
  }
}

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface StylePatternsReport {
  totalEdits: number;
  avgOriginalLength: number;
  avgEditedLength: number;
  preferredOpening: string;
  preferredCTA: string;
  directnessLevel: string;
  commonlyAddedWords: string[];
  commonlyRemovedWords: string[];
  topTones: string[];
}

const STOP_WORDS = new Set(['the', 'and', 'a', 'an', 'to', 'of', 'in', 'for', 'on', 'with', 'is', 'are', 'you', 'your', 'we', 'our', 'i', 'it', 'that', 'this', 'at', 'as', 'be', 'or', 'if', 'so']);

/** Words the BDE most often adds to (or removes from) the AI's drafts, counted across all edits. */
function topWordChanges(records: { originalDraft: string; userEditedVersion: string | null }[], direction: 'added' | 'removed'): string[] {
  const words = (text: string) => new Set(text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []);
  const counts: Record<string, number> = {};
  for (const rec of records) {
    if (!rec.userEditedVersion) continue;
    const [from, to] = direction === 'added' ? [words(rec.originalDraft), words(rec.userEditedVersion)] : [words(rec.userEditedVersion), words(rec.originalDraft)];
    for (const w of to) if (!from.has(w) && !STOP_WORDS.has(w)) counts[w] = (counts[w] || 0) + 1;
  }
  return Object.entries(counts).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
}

export class AILearningService {
  /**
   * Save a user edit event to the database (strictly append-only).
   * Never overwrites previous learning logs.
   */
  static async recordLearningEvent(params: {
    playbookId: string | null;
    originalDraft: string;
    userEditedVersion: string;
    selectedTones: string[];
    outcome?: string;
  }): Promise<boolean> {
    try {
      await db.aILearningData.create({
        data: {
          playbookId: params.playbookId,
          originalDraft: params.originalDraft,
          userEditedVersion: params.userEditedVersion,
          selectedTones: params.selectedTones,
          outcome: params.outcome || null,
        },
      });
      logger.info('AI writing style learning record saved.');
      return true;
    } catch (error) {
      logger.error('Failed to save AI learning record', error);
      return false;
    }
  }

  /**
   * Analyze the collected user edits logs to identify writing patterns.
   * With no edits yet (or no database) the report is empty rather than made up.
   */
  static async analyzeStylePatterns(): Promise<StylePatternsReport> {
    try {
      const records = await db.aILearningData.findMany();
      if (records.length === 0) {
        return this.emptyReport();
      }

      let totalOriginalLength = 0;
      let totalEditedLength = 0;
      const openingsCount: Record<string, number> = {};
      const tonesCount: Record<string, number> = {};

      records.forEach(rec => {
        const origWords = rec.originalDraft.split(/\s+/).filter(Boolean).length;
        const editWords = rec.userEditedVersion ? rec.userEditedVersion.split(/\s+/).filter(Boolean).length : origWords;
        
        totalOriginalLength += origWords;
        totalEditedLength += editWords;

        // Extract opening style (first 15 characters, sanitized)
        if (rec.userEditedVersion) {
          const opening = rec.userEditedVersion.substring(0, 15).split(/[\n,]/)[0]?.trim();
          if (opening) {
            openingsCount[opening] = (openingsCount[opening] || 0) + 1;
          }
        }

        // Tones audit
        rec.selectedTones.forEach(t => {
          tonesCount[t] = (tonesCount[t] || 0) + 1;
        });
      });

      const total = records.length;
      
      // Determine preferred opening
      let preferredOpening = '';
      let maxOpeningVal = 0;
      Object.entries(openingsCount).forEach(([op, count]) => {
        if (count > maxOpeningVal) {
          maxOpeningVal = count;
          preferredOpening = op + '...';
        }
      });

      // Calculate directness metric
      const ratio = totalOriginalLength > 0 ? (totalEditedLength / totalOriginalLength) : 1;
      let directnessLevel = 'Direct and brief';
      if (ratio < 0.75) {
        directnessLevel = 'Highly direct (reduces AI text length by 30%+)';
      } else if (ratio < 0.9) {
        directnessLevel = 'Moderate (trims minor fluff and cliches)';
      } else {
        directnessLevel = 'Elaborate (preserves standard AI descriptions)';
      }

      // Sorted tones
      const topTones = Object.entries(tonesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tone]) => tone);

      return {
        totalEdits: total,
        avgOriginalLength: Math.round(totalOriginalLength / total),
        avgEditedLength: Math.round(totalEditedLength / total),
        preferredOpening,
        preferredCTA: '',
        directnessLevel,
        commonlyAddedWords: topWordChanges(records, 'added'),
        commonlyRemovedWords: topWordChanges(records, 'removed'),
        topTones,
      };
    } catch {
      logger.warn('Could not read the writing-style records.');
      return this.emptyReport();
    }
  }

  private static emptyReport(): StylePatternsReport {
    return {
      totalEdits: 0,
      avgOriginalLength: 0,
      avgEditedLength: 0,
      preferredOpening: '',
      preferredCTA: '',
      directnessLevel: 'Not enough edits yet',
      commonlyAddedWords: [],
      commonlyRemovedWords: [],
      topTones: [],
    };
  }
}

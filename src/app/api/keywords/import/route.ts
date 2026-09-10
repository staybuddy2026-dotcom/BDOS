import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { errorResponse } from '@/lib/errors';
import { validateBooleanQuery } from '@/features/keywords/validation';
import { Priority, KeywordStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: { message: 'No file uploaded.' } }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/);
    const importedKeywords: { keyword: string; category: string; priority: Priority; isFavorite: boolean }[] = [];
    const errors: string[] = [];

    // Simple CSV parser that handles quotes
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    let isFirstLine = true;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCsvLine(line);
      if (cols.length < 2) continue;

      // Skip header if matches
      if (isFirstLine && (cols[0].toLowerCase() === 'keyword' || cols[0].toLowerCase() === 'query')) {
        isFirstLine = false;
        continue;
      }
      isFirstLine = false;

      const keywordText = cols[0];
      const category = cols[1] || 'general';
      const rawPriority = (cols[2] || 'MEDIUM').toUpperCase();
      const rawFavorite = (cols[3] || 'false').toLowerCase();

      // Check validity of boolean syntax
      const booleanVal = validateBooleanQuery(keywordText);
      if (!booleanVal.isValid) {
        errors.push(`Line ${i + 1}: "${keywordText}" has invalid Boolean syntax: ${booleanVal.error}`);
        continue;
      }

      let priority: Priority = Priority.MEDIUM;
      if (rawPriority === 'LOW') priority = Priority.LOW;
      if (rawPriority === 'HIGH') priority = Priority.HIGH;

      const isFavorite = rawFavorite === 'true' || rawFavorite === '1' || rawFavorite === 'yes';

      importedKeywords.push({
        keyword: keywordText,
        category: category.toLowerCase(),
        priority,
        isFavorite,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'CSV import file contains parsing errors.',
          errors: { csv: errors },
        }
      }, { status: 400 });
    }

    if (importedKeywords.length === 0) {
      return NextResponse.json({ success: false, error: { message: 'No valid keywords found in CSV file.' } }, { status: 400 });
    }

    // Insert transaction
    let createdCount = 0;
    let skippedCount = 0;

    await db.$transaction(async (tx) => {
      for (const kw of importedKeywords) {
        // Check duplicate in DB
        const existing = await tx.keyword.findUnique({
          where: { keyword: kw.keyword },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        await tx.keyword.create({
          data: {
            keyword: kw.keyword,
            category: kw.category,
            priority: kw.priority,
            isFavorite: kw.isFavorite,
            status: KeywordStatus.ACTIVE,
          },
        });
        createdCount++;
      }
    });

    logger.info(`CSV Import Complete: Created ${createdCount}, Skipped duplicate ${skippedCount}`);

    return NextResponse.json({
      success: true,
      data: {
        created: createdCount,
        skipped: skippedCount,
        total: createdCount + skippedCount,
      },
    });

  } catch (error) {
    return errorResponse(error);
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { errorResponse } from '@/lib/errors';

export async function GET() {
  try {
    const keywords = await db.keyword.findMany({
      orderBy: { keyword: 'asc' },
    });

    const csvHeaders = 'keyword,category,priority,isFavorite,status,matchesFound\n';
    
    const escapeCsv = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = keywords
      .map((kw) => {
        return `${escapeCsv(kw.keyword)},${escapeCsv(kw.category)},${kw.priority},${kw.isFavorite},${kw.status},${kw.matchesFound}`;
      })
      .join('\n');

    const csvContent = csvHeaders + csvRows;

    logger.info(`Exporting ${keywords.length} keywords to CSV.`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="bdos_keywords.csv"',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

'use server';

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError, ValidationError } from '@/lib/errors';
import { validateBooleanQuery } from './validation';
import { safeRevalidatePath } from '@/lib/revalidate';
import { Priority, KeywordStatus } from '@prisma/client';

export type KeywordData = {
  id: string;
  keyword: string;
  category: string;
  priority: Priority;
  status: KeywordStatus;
  isFavorite: boolean;
  matchesFound: number;
  lastSearchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Fetch all keywords.
 */
export async function getKeywords(): Promise<KeywordData[]> {
  try {
    const list = await db.keyword.findMany({
      orderBy: [
        { isFavorite: 'desc' },
        { keyword: 'asc' },
      ],
    });
    return list;
  } catch (error) {
    logger.error('Failed to get keywords from database', error);
    // In case database is not migrated or down, return a default warning list or empty array
    // Since we handle UI fallbacks, we return an empty array here.
    return [];
  }
}

/**
 * Add a new keyword.
 */
export async function addKeyword(
  keywordText: string,
  category: string,
  priority: Priority,
  isFavorite = false
) {
  const trimmedKeyword = keywordText.trim();
  const trimmedCategory = category.trim().toLowerCase();

  // Validate Boolean search query syntax
  const booleanVal = validateBooleanQuery(trimmedKeyword);
  if (!booleanVal.isValid) {
    throw new ValidationError(booleanVal.error || 'Invalid Boolean query.');
  }

  if (!trimmedCategory) {
    throw new ValidationError('Category is required.');
  }

  try {
    // Check if duplicate exists
    const existing = await db.keyword.findUnique({
      where: { keyword: trimmedKeyword },
    });

    if (existing) {
      throw new ValidationError(`The keyword "${trimmedKeyword}" already exists in the library.`);
    }

    const created = await db.keyword.create({
      data: {
        keyword: trimmedKeyword,
        category: trimmedCategory,
        priority,
        isFavorite,
        status: KeywordStatus.ACTIVE,
      },
    });

    logger.info(`Keyword added: "${trimmedKeyword}" (Category: ${trimmedCategory})`);
    safeRevalidatePath('/keywords');
    return created;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logger.error('Failed to add keyword', error);
    throw new AppError('Failed to save the keyword. Ensure the database is running.', 500);
  }
}

/**
 * Update keyword fields.
 */
export async function updateKeyword(
  id: string,
  data: {
    keyword?: string;
    category?: string;
    priority?: Priority;
    isFavorite?: boolean;
    status?: KeywordStatus;
  }
) {
  try {
    const existingKeyword = await db.keyword.findUnique({
      where: { id },
    });

    if (!existingKeyword) {
      throw new Error('Keyword not found.');
    }

    const updateData: {
      keyword?: string;
      category?: string;
      priority?: Priority;
      isFavorite?: boolean;
      status?: KeywordStatus;
    } = {};

    if (data.keyword !== undefined) {
      const trimmedText = data.keyword.trim();
      const val = validateBooleanQuery(trimmedText);
      if (!val.isValid) {
        throw new ValidationError(val.error || 'Invalid Boolean syntax.');
      }
      
      // Check duplicate
      if (trimmedText !== existingKeyword.keyword) {
        const dup = await db.keyword.findUnique({ where: { keyword: trimmedText } });
        if (dup) {
          throw new ValidationError(`Keyword "${trimmedText}" already exists.`);
        }
      }
      updateData.keyword = trimmedText;
    }

    if (data.category !== undefined) {
      updateData.category = data.category.trim().toLowerCase();
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if (data.isFavorite !== undefined) {
      updateData.isFavorite = data.isFavorite;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const updated = await db.keyword.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Keyword updated: ID ${id}`);
    safeRevalidatePath('/keywords');
    return updated;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logger.error(`Failed to update keyword ${id}`, error);
    throw new AppError('Failed to update keyword details.', 500);
  }
}

/**
 * Delete a keyword.
 */
export async function deleteKeyword(id: string) {
  try {
    await db.keyword.delete({
      where: { id },
    });
    logger.info(`Keyword deleted: ID ${id}`);
    safeRevalidatePath('/keywords');
    return { success: true };
  } catch (error) {
    logger.error(`Failed to delete keyword ${id}`, error);
    throw new AppError('Failed to delete keyword.', 500);
  }
}

/**
 * Bulk toggle active/inactive status.
 */
export async function bulkToggleStatus(ids: string[], status: KeywordStatus) {
  try {
    await db.keyword.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    logger.info(`Bulk updated status to ${status} for ${ids.length} keywords.`);
    safeRevalidatePath('/keywords');
    return { success: true };
  } catch (error) {
    logger.error('Failed in bulk status update', error);
    throw new AppError('Failed to perform bulk status toggle.', 500);
  }
}

/**
 * Bulk delete keywords.
 */
export async function bulkDeleteKeywords(ids: string[]) {
  try {
    await db.keyword.deleteMany({
      where: { id: { in: ids } },
    });
    logger.info(`Bulk deleted ${ids.length} keywords.`);
    safeRevalidatePath('/keywords');
    return { success: true };
  } catch (error) {
    logger.error('Failed in bulk delete keywords', error);
    throw new AppError('Failed to perform bulk delete.', 500);
  }
}

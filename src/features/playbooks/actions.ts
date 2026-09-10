'use server';

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { safeRevalidatePath } from '@/lib/revalidate';

export type PlaybookStepData = {
  id: string;
  playbookId: string;
  stepName: string;
  delay: number;
  objective: string | null;
  tone: string | null;
  aiInstructions: string | null;
  enabled: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PlaybookData = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  defaultTone: string | null;
  createdAt: Date;
  updatedAt: Date;
  steps: PlaybookStepData[];
};

/**
 * Fetch all playbooks in the library.
 */
export async function getPlaybooks(): Promise<PlaybookData[]> {
  try {
    const list = await db.outreachPlaybook.findMany({
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return list;
  } catch (error) {
    logger.error('Failed to fetch playbooks', error);
    return [];
  }
}

/**
 * Fetch playbook details.
 */
export async function getPlaybookById(id: string): Promise<PlaybookData | null> {
  try {
    const playbook = await db.outreachPlaybook.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });
    return playbook;
  } catch (error) {
    logger.error(`Failed to fetch playbook ID: ${id}`, error);
    return null;
  }
}

/**
 * Toggle active/inactive status of a playbook.
 */
export async function togglePlaybookStatus(id: string, status: string) {
  try {
    const updated = await db.outreachPlaybook.update({
      where: { id },
      data: { status },
    });
    logger.info(`Playbook status updated to ${status} for ID: ${id}`);
    safeRevalidatePath('/playbooks');
    return updated;
  } catch (error) {
    logger.error(`Failed to toggle playbook status for ID: ${id}`, error);
    throw new AppError('Failed to toggle playbook status.', 500);
  }
}

/**
 * Delete a playbook (cascades to steps).
 */
export async function deletePlaybook(id: string) {
  try {
    await db.outreachPlaybook.delete({
      where: { id },
    });
    logger.info(`Playbook deleted: ID ${id}`);
    safeRevalidatePath('/playbooks');
    return { success: true };
  } catch (error) {
    logger.error(`Failed to delete playbook ID: ${id}`, error);
    throw new AppError('Failed to delete playbook.', 500);
  }
}

/**
 * Duplicate an existing playbook along with all its child steps.
 */
export async function duplicatePlaybook(id: string) {
  try {
    const source = await db.outreachPlaybook.findUnique({
      where: { id },
      include: { steps: true },
    });

    if (!source) {
      throw new Error('Source playbook not found.');
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Create playbook record
      const copy = await tx.outreachPlaybook.create({
        data: {
          name: `${source.name} (Copy)`,
          description: source.description,
          status: source.status,
          defaultTone: source.defaultTone,
        },
      });

      // 2. Clone child steps
      if (source.steps.length > 0) {
        const stepsToCreate = source.steps.map((step) => ({
          playbookId: copy.id,
          stepName: step.stepName,
          delay: step.delay,
          objective: step.objective,
          tone: step.tone,
          aiInstructions: step.aiInstructions,
          enabled: step.enabled,
          order: step.order,
        }));

        await tx.outreachStep.createMany({
          data: stepsToCreate,
        });
      }

      return copy;
    });

    logger.info(`Playbook duplicated successfully: ${source.name} -> ID: ${result.id}`);
    safeRevalidatePath('/playbooks');
    return result;
  } catch (error) {
    logger.error(`Failed to duplicate playbook ID: ${id}`, error);
    throw new AppError('Failed to duplicate playbook.', 500);
  }
}

/**
 * Save / Upsert Playbook details and its configuration steps.
 */
export async function savePlaybook(
  playbookId: string | null,
  playbookData: {
    name: string;
    description?: string;
    status: string;
    defaultTone?: string;
  },
  stepsData: {
    id?: string;
    stepName: string;
    delay: number;
    objective?: string;
    tone?: string;
    aiInstructions?: string;
    enabled: boolean;
  }[]
) {
  // Input validations
  if (!playbookData.name.trim()) {
    throw new AppError('Playbook name cannot be empty.', 400);
  }

  for (const step of stepsData) {
    if (!step.stepName.trim()) {
      throw new AppError('Step name cannot be empty.', 400);
    }
    if (step.delay < 0) {
      throw new AppError('Step delay must be zero or positive.', 400);
    }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      let playbook;
      
      // 1. Playbook Upsert
      if (playbookId) {
        playbook = await tx.outreachPlaybook.update({
          where: { id: playbookId },
          data: {
            name: playbookData.name,
            description: playbookData.description || null,
            status: playbookData.status,
            defaultTone: playbookData.defaultTone || null,
          },
        });
      } else {
        playbook = await tx.outreachPlaybook.create({
          data: {
            name: playbookData.name,
            description: playbookData.description || null,
            status: playbookData.status,
            defaultTone: playbookData.defaultTone || null,
          },
        });
      }

      // 2. Identify and delete steps that are removed from UI
      const submittedStepIds = stepsData.map(s => s.id).filter(Boolean) as string[];
      await tx.outreachStep.deleteMany({
        where: {
          playbookId: playbook.id,
          id: {
            notIn: submittedStepIds,
          },
        },
      });

      // 3. Upsert remaining or new steps with normalized order index
      let index = 1;
      for (const step of stepsData) {
        if (step.id) {
          // Update existing step
          await tx.outreachStep.update({
            where: { id: step.id },
            data: {
              stepName: step.stepName,
              delay: step.delay,
              objective: step.objective || null,
              tone: step.tone || null,
              aiInstructions: step.aiInstructions || null,
              enabled: step.enabled,
              order: index,
            },
          });
        } else {
          // Create new step
          await tx.outreachStep.create({
            data: {
              playbookId: playbook.id,
              stepName: step.stepName,
              delay: step.delay,
              objective: step.objective || null,
              tone: step.tone || null,
              aiInstructions: step.aiInstructions || null,
              enabled: step.enabled,
              order: index,
            },
          });
        }
        index++;
      }

      return playbook;
    });

    logger.info(`Playbook saved: ${result.name} (ID: ${result.id})`);
    safeRevalidatePath('/playbooks');
    return result;
  } catch (error) {
    logger.error('Failed to save playbook configuration', error);
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown database error';
    throw new AppError(`Failed to save playbook. ${message}`, 500);
  }
}

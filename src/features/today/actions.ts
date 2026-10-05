'use server';

import { TaskPriority, TaskStatus } from '@prisma/client';
import { AuthService } from '@/lib/auth';
import { canSeeAllDeals } from '@/lib/roles';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { safeRevalidatePath } from '@/lib/revalidate';
import { canEditDeal, dealScope, logActivity } from '@/features/crm/service';
import { getTodaySummary } from './service';
import type { TodayData } from './service';

// Mutations return `{ error }` instead of throwing, so the real reason reaches the UI.

export async function getTodayAction(): Promise<TodayData> {
  const user = await AuthService.verifySession();
  return getTodaySummary(user);
}

/** Adds a personal task (not tied to a deal) for the signed-in user. */
export async function addMyTaskAction(input: { title: string; dueDate: string; priority?: TaskPriority }): Promise<{ error?: string }> {
  const user = await AuthService.verifySession();
  const title = input.title?.trim();
  const dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (!title) return { error: 'Enter what needs to be done.' };
  if (!dueDate || Number.isNaN(dueDate.getTime())) return { error: 'Pick a due date.' };
  try {
    await db.task.create({
      data: {
        title: title.slice(0, 300),
        priority: input.priority && Object.values(TaskPriority).includes(input.priority) ? input.priority : TaskPriority.NORMAL,
        dueDate,
        assignedOwner: user.name,
        assigneeId: user.id,
      },
    });
    safeRevalidatePath('/today');
    return {};
  } catch (err) {
    logger.error('Could not add task', err);
    return { error: 'Could not add the task. Please try again.' };
  }
}

/** Completes (or reopens) a task. Deal tasks follow the deal's permissions; personal tasks belong to their assignee. */
export async function toggleTaskAction(taskId: string): Promise<{ error?: string }> {
  const user = await AuthService.verifySession();
  try {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) return { error: 'Task not found.' };

    if (task.dealId) {
      const deal = await db.deal.findFirst({ where: { id: task.dealId, ...dealScope(user) } });
      if (!deal || !(canEditDeal(user, deal) || task.assigneeId === user.id)) return { error: 'This task belongs to a teammate\'s deal.' };
    } else if (task.assigneeId !== user.id && !canSeeAllDeals(user.role)) {
      return { error: 'This task belongs to a teammate.' };
    }

    const completed = task.status !== TaskStatus.COMPLETED;
    await db.$transaction(async (tx) => {
      await tx.task.update({ where: { id: task.id }, data: { status: completed ? TaskStatus.COMPLETED : TaskStatus.PENDING, completedAt: completed ? new Date() : null } });
      if (task.dealId) await logActivity(tx, { dealId: task.dealId, type: 'TASK', title: `${completed ? 'Task completed' : 'Task reopened'}: ${task.title}`, userId: user.id });
    });
    safeRevalidatePath('/today');
    safeRevalidatePath('/crm');
    return {};
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    logger.error(`Could not update task ${taskId}`, err);
    return { error: 'Could not update the task. Please try again.' };
  }
}

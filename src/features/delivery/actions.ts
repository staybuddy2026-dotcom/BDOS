'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { safeRevalidatePath } from '@/lib/revalidate';
import { DeliveryProject, ProjectStatus, DeliveryTelemetry } from './types';
import { createProjectFromWonDeal } from './handoff';

const projectStore: Map<string, DeliveryProject> = new Map();

function initializeMockProjects() {
  // Database store initialized empty
}

/**
 * Fetch all active projects in DeliveryOS.
 */
export async function getDeliveryProjectsAction(): Promise<DeliveryProject[]> {
  try {
    await AuthService.verifySession();
    initializeMockProjects();
    logger.info(`Fetching ${projectStore.size} active DeliveryOS projects...`);
    return Array.from(projectStore.values());
  } catch (err: unknown) {
    logger.error('Failed to fetch delivery projects', { error: String(err) });
    throw new AppError('Failed to fetch delivery projects.', 500);
  }
}

/**
 * Fetch DeliveryOS Telemetry KPIs.
 */
export async function getDeliveryTelemetryAction(): Promise<DeliveryTelemetry> {
  try {
    await AuthService.verifySession();
    const count = projectStore.size;

    return {
      activeProjectsCount: count,
      projectsAtRiskCount: 0,
      revenueInDeliveryInr: count > 0 ? '₹35,00,000' : '₹0',
      revenueInDeliveryUsd: count > 0 ? '$42,000' : '$0',
      upcomingMilestonesCount: 0,
      sprintVelocityPoints: 0,
      resourceUtilizationPercent: 0,
      deliveryHealthPercent: 0,
    };
  } catch (err: unknown) {
    logger.error('Failed to query delivery telemetry', { error: String(err) });
    throw new AppError('Delivery telemetry query failed.', 500);
  }
}

/**
 * Initiate Sales-to-Delivery AI Handoff from a Won Deal.
 */
export async function initiateDealHandoffAction(
  dealId: string,
  companyName: string,
  domain: string,
  contractValueInr: string,
  scopeSummary: string,
  techStack: string[]
): Promise<DeliveryProject> {
  try {
    await AuthService.verifySession();
    initializeMockProjects();

    const newProject = createProjectFromWonDeal(
      dealId,
      companyName,
      domain,
      contractValueInr,
      scopeSummary,
      techStack
    );

    projectStore.set(newProject.id, newProject);
    logger.info(`Deal handoff initiated cleanly for '${companyName}'. Project ID: ${newProject.id}`);

    safeRevalidatePath('/delivery');
    return newProject;
  } catch (err: unknown) {
    logger.error(`Failed to initiate handoff for deal '${dealId}'`, { error: String(err) });
    throw new AppError('Deal handoff failed.', 500);
  }
}

/**
 * Update project delivery status.
 */
export async function updateProjectStatusAction(projectId: string, status: ProjectStatus): Promise<DeliveryProject> {
  try {
    await AuthService.verifySession();
    initializeMockProjects();

    const project = projectStore.get(projectId);
    if (!project) throw new AppError('Project not found.', 404);

    project.status = status;
    project.updatedAt = new Date().toISOString();
    projectStore.set(projectId, project);

    safeRevalidatePath('/delivery');
    return project;
  } catch (err: unknown) {
    logger.error(`Failed to update project status for '${projectId}'`, { error: String(err) });
    throw new AppError('Project status update failed.', 500);
  }
}

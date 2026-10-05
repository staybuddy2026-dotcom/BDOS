import { logger } from '@/lib/logger';
import { runAutomation } from './run';

const state = globalThis as typeof globalThis & { __bdosAutomationTimer?: ReturnType<typeof setInterval> };

/**
 * Runs the automation pass every few minutes inside the server process (`next dev` / `next start`).
 * On hosts where the server is not long-lived (serverless), set AUTOMATION_DISABLED=true and call
 * POST /api/cron/run from an external scheduler instead.
 */
export function startAutomationScheduler() {
  if (state.__bdosAutomationTimer) return; // already started (dev reloads call this again)

  const minutes = Math.max(1, Number(process.env.AUTOMATION_INTERVAL_MINUTES) || 5);
  const tick = () => { runAutomation().catch((err) => logger.error('Automation pass failed', err)); };

  state.__bdosAutomationTimer = setInterval(tick, minutes * 60 * 1000);
  state.__bdosAutomationTimer.unref?.();
  // First pass shortly after start-up, to catch anything that fell due while the server was off.
  setTimeout(tick, 30 * 1000).unref?.();
  logger.info(`Automation scheduler started: due follow-ups are checked every ${minutes} minute${minutes === 1 ? '' : 's'}.`);
}

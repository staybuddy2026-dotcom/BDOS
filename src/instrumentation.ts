/**
 * Runs once when the server starts. Starts the background automation
 * (scheduled outreach emails and the morning summary).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.AUTOMATION_DISABLED === 'true' || process.env.NODE_ENV === 'test') return;
  const { startAutomationScheduler } = await import('@/features/automation/scheduler');
  startAutomationScheduler();
}

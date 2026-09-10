import { TeamMember, SprintPlan, ProjectMilestone } from './types';
import { logger } from '@/lib/logger';

/**
 * AI Team Assignment Engine.
 * Recommends optimal team composition based on project tech stack and scope.
 */
export function recommendTeamAllocation(techStack: string[]): TeamMember[] {
  logger.info(`AI Team Assignment Engine: Allocating squad for tech stack: ${techStack.join(', ')}...`);

  return [
    { id: 'tm_1', name: 'Siddharth Rao', role: 'PROJECT_MANAGER', allocationPercent: 50, skills: ['Agile', 'Scrum', 'Client Mgmt'] },
    { id: 'tm_2', name: 'Vikram Mehta', role: 'SOLUTIONS_ARCHITECT', allocationPercent: 30, skills: ['AWS', 'Microservices', 'System Design'] },
    { id: 'tm_3', name: 'Amit Sharma', role: 'BACKEND_LEAD', allocationPercent: 100, skills: ['Node.js', 'PostgreSQL', 'Prisma', 'Docker'] },
    { id: 'tm_4', name: 'Neha Gupta', role: 'FRONTEND_LEAD', allocationPercent: 100, skills: ['React 19', 'Next.js 16', 'TypeScript', 'Tailwind'] },
    { id: 'tm_5', name: 'Karan Patel', role: 'QA_ENGINEER', allocationPercent: 50, skills: ['Playwright', 'Jest', 'Automation Testing'] },
    { id: 'tm_6', name: 'Rahul Nair', role: 'DEVOPS_ENGINEER', allocationPercent: 25, skills: ['AWS Fargate', 'CI/CD Pipelines', 'Terraform'] },
  ];
}

/**
 * AI Sprint Planner Engine.
 * Generates Sprint 1 to 4 goals, story points, and user stories.
 */
export function generateSprintPlan(scopeSummary: string): SprintPlan[] {
  logger.info(`AI Sprint Planner: Generating 4-sprint plan for scope: '${scopeSummary}'...`);

  return [
    {
      sprintNumber: 1,
      goal: 'Project Setup, Environment Provisioning & Database Schema Design',
      totalCapacityPoints: 34,
      stories: [
        { id: 'st_1', title: 'Initialize GitHub Repo & CI/CD Pipeline', storyPoints: 5, tasksCount: 4, acceptanceCriteria: 'GitHub Actions workflow builds and passes lints cleanly.', status: 'DONE' },
        { id: 'st_2', title: 'Setup PostgreSQL Database & Prisma Models', storyPoints: 8, tasksCount: 6, acceptanceCriteria: 'Prisma migration runs successfully on dev environment.', status: 'IN_PROGRESS' },
        { id: 'st_3', title: 'Implement JWT Authentication & User Roles', storyPoints: 8, tasksCount: 5, acceptanceCriteria: 'Secure token authentication verified with 100% test coverage.', status: 'BACKLOG' },
      ],
    },
    {
      sprintNumber: 2,
      goal: 'Core REST / GraphQL API Services Implementation',
      totalCapacityPoints: 40,
      stories: [
        { id: 'st_4', title: 'Build Core Business Logic & CRUD Endpoints', storyPoints: 13, tasksCount: 8, acceptanceCriteria: 'All API endpoints respond under 100ms.', status: 'BACKLOG' },
        { id: 'st_5', title: 'Integrate Third-Party Data Provider APIs', storyPoints: 13, tasksCount: 7, acceptanceCriteria: 'Webhook handlers retry automatically on network failures.', status: 'BACKLOG' },
      ],
    },
    {
      sprintNumber: 3,
      goal: 'Next.js Frontend UI Workspace & Components Development',
      totalCapacityPoints: 38,
      stories: [
        { id: 'st_6', title: 'Build Modern UI Workspace Components', storyPoints: 13, tasksCount: 9, acceptanceCriteria: 'UI design matches glassmorphic dark theme specification.', status: 'BACKLOG' },
      ],
    },
    {
      sprintNumber: 4,
      goal: 'QA Automation, End-to-End Testing & Production Deployment',
      totalCapacityPoints: 30,
      stories: [
        { id: 'st_7', title: 'Execute Playwright Automated E2E Test Suite', storyPoints: 8, tasksCount: 5, acceptanceCriteria: 'All smoke test cases pass cleanly without errors.', status: 'BACKLOG' },
      ],
    },
  ];
}

/**
 * Generate 10 Enterprise Milestones.
 */
export function generateMilestones(): ProjectMilestone[] {
  const now = new Date();
  const addDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().split('T')[0];

  return [
    { id: 'm_1', title: 'Discovery & Requirements Signoff', startDate: addDays(0), endDate: addDays(3), progressPercent: 100, owner: 'Siddharth Rao', status: 'COMPLETED' },
    { id: 'm_2', title: 'Architecture & Database Design', startDate: addDays(4), endDate: addDays(7), progressPercent: 60, owner: 'Vikram Mehta', status: 'IN_PROGRESS' },
    { id: 'm_3', title: 'UI/UX Prototype & Component Design System', startDate: addDays(8), endDate: addDays(14), progressPercent: 0, owner: 'Neha Gupta', status: 'UPCOMING' },
    { id: 'm_4', title: 'Backend APIs & Integration Sprint', startDate: addDays(15), endDate: addDays(28), progressPercent: 0, owner: 'Amit Sharma', status: 'UPCOMING' },
    { id: 'm_5', title: 'Frontend Workspace Assembly Sprint', startDate: addDays(29), endDate: addDays(42), progressPercent: 0, owner: 'Neha Gupta', status: 'UPCOMING' },
    { id: 'm_6', title: 'QA Automation & Security Audit', startDate: addDays(43), endDate: addDays(49), progressPercent: 0, owner: 'Karan Patel', status: 'UPCOMING' },
    { id: 'm_7', title: 'User Acceptance Testing (UAT)', startDate: addDays(50), endDate: addDays(56), progressPercent: 0, owner: 'Siddharth Rao', status: 'UPCOMING' },
    { id: 'm_8', title: 'Production Deployment & Cloud Infra Provisioning', startDate: addDays(57), endDate: addDays(60), progressPercent: 0, owner: 'Rahul Nair', status: 'UPCOMING' },
    { id: 'm_9', title: 'Official System Go Live 🚀', startDate: addDays(61), endDate: addDays(62), progressPercent: 0, owner: 'Siddharth Rao', status: 'UPCOMING' },
    { id: 'm_10', title: '30-Day Post-Launch Warranty Support', startDate: addDays(63), endDate: addDays(93), progressPercent: 0, owner: 'Siddharth Rao', status: 'UPCOMING' },
  ];
}

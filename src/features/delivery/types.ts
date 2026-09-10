export type ProjectStatus = 
  | 'NOT_STARTED'
  | 'KICKOFF'
  | 'IN_PROGRESS'
  | 'UAT'
  | 'DEPLOYED'
  | 'WARRANTY';

export type TeamRole = 
  | 'PROJECT_MANAGER'
  | 'SOLUTIONS_ARCHITECT'
  | 'BACKEND_LEAD'
  | 'FRONTEND_LEAD'
  | 'MOBILE_DEV'
  | 'QA_ENGINEER'
  | 'DEVOPS_ENGINEER'
  | 'AI_ENGINEER'
  | 'UI_UX_DESIGNER';

export type TeamMember = {
  id: string;
  name: string;
  role: TeamRole;
  allocationPercent: number;
  skills: string[];
};

export type SprintStory = {
  id: string;
  title: string;
  storyPoints: number;
  tasksCount: number;
  acceptanceCriteria: string;
  status: 'BACKLOG' | 'IN_PROGRESS' | 'DONE';
};

export type SprintPlan = {
  sprintNumber: number;
  goal: string;
  totalCapacityPoints: number;
  stories: SprintStory[];
};

export type ProjectMilestone = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  progressPercent: number;
  owner: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
};

export type ProjectRisk = {
  id: string;
  category: 'TIMELINE' | 'BUDGET' | 'RESOURCE' | 'TECH' | 'SCOPE' | 'DEPENDENCY';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: string;
  mitigation: string;
  owner: string;
};

export type DeliveryTask = {
  id: string;
  category: 'SETUP' | 'DATABASE' | 'BACKEND' | 'FRONTEND' | 'MOBILE' | 'TESTING' | 'DEPLOYMENT';
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assignedTo: string;
};

export type ProjectDocument = {
  id: string;
  documentType: 'PROPOSAL' | 'SOW' | 'MSA' | 'NDA' | 'ARCHITECTURE' | 'CONTRACT';
  title: string;
  fileUrl: string;
  attachedAt: string;
};

export type ProjectHealthMetrics = {
  deliveryScore: number; // 0-100
  riskScore: number; // 0-100
  timelineHealth: 'ON_TRACK' | 'AT_RISK' | 'DELAYED';
  budgetHealth: 'UNDER_BUDGET' | 'ON_BUDGET' | 'OVER_BUDGET';
  completionPercent: number; // 0-100
  qualityScorePercent: number; // 0-100
};

export type DeliveryProject = {
  id: string;
  dealId: string;
  companyName: string;
  domain: string;
  contractValueInr: string;
  contractValueUsd: string;
  scopeSummary: string;
  techStack: string[];
  repoUrl: string;
  cloudInfra: string;
  projectManager: string;
  technicalArchitect: string;
  team: TeamMember[];
  sprints: SprintPlan[];
  milestones: ProjectMilestone[];
  risks: ProjectRisk[];
  tasks: DeliveryTask[];
  documents: ProjectDocument[];
  health: ProjectHealthMetrics;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryTelemetry = {
  activeProjectsCount: number;
  projectsAtRiskCount: number;
  revenueInDeliveryInr: string;
  revenueInDeliveryUsd: string;
  upcomingMilestonesCount: number;
  sprintVelocityPoints: number;
  resourceUtilizationPercent: number;
  deliveryHealthPercent: number;
};

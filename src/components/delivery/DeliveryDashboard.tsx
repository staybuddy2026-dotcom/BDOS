'use client';

import { useState } from 'react';
import { DeliveryProject, DeliveryTelemetry } from '@/features/delivery/types';
import { HandoffPanel } from './HandoffPanel';
import { ProjectOverview } from './ProjectOverview';
import { TeamAssignment } from './TeamAssignment';
import { SprintPlanner } from './SprintPlanner';
import { MilestoneTimeline } from './MilestoneTimeline';
import { RisksPanel } from './RisksPanel';
import { DeliverablesPanel } from './DeliverablesPanel';
import { ProjectDocuments } from './ProjectDocuments';
import { initiateDealHandoffAction } from '@/features/delivery/actions';

export function DeliveryDashboard({ 
  initialProjects, 
  telemetry 
}: { 
  initialProjects: DeliveryProject[]; 
  telemetry: DeliveryTelemetry;
}) {
  const [projects, setProjects] = useState<DeliveryProject[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjects[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'sprints' | 'milestones' | 'risks' | 'tasks' | 'documents'>('overview');

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const handleInitiateHandoff = async () => {
    try {
      const created = await initiateDealHandoffAction(
        `deal_${Date.now()}`,
        'Logistics Global Fleet',
        'logisticsfleet.io',
        '₹45,00,000',
        'Real-time IoT Fleet Tracking & Dispatch Architecture (Next.js + Go)',
        ['Next.js 16', 'Go', 'PostgreSQL', 'Docker', 'AWS Fargate']
      );
      setProjects((prev) => [created, ...prev]);
      setSelectedProjectId(created.id);
    } catch {
      // fallback
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Telemetry KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(16, 185, 129, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase' }}>Active Projects</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>{telemetry.activeProjectsCount} Projects</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{telemetry.projectsAtRiskCount} Projects at Risk</div>
          <div className="kpi-glow" />
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(99, 102, 241, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 700, textTransform: 'uppercase' }}>Revenue in Delivery</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '2px' }}>{telemetry.revenueInDeliveryInr}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{telemetry.revenueInDeliveryUsd} USD</div>
          <div className="kpi-glow" />
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(234, 179, 8, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-warning)', fontWeight: 700, textTransform: 'uppercase' }}>Upcoming Milestones</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#eab308', marginTop: '2px' }}>{telemetry.upcomingMilestonesCount} Milestones</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Sprint Velocity {telemetry.sprintVelocityPoints} pts</div>
          <div className="kpi-glow" />
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(139, 92, 246, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-violet)', fontWeight: 700, textTransform: 'uppercase' }}>Resource Utilization</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-violet)', marginTop: '2px' }}>{telemetry.resourceUtilizationPercent}%</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Delivery Health {telemetry.deliveryHealthPercent}%</div>
          <div className="kpi-glow" />
        </div>
      </div>

      {/* AI Sales-to-Delivery Handoff Panel */}
      <HandoffPanel onInitiate={handleInitiateHandoff} />

      {/* Active Project Workspace Container */}
      {selectedProject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Project Selector Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  border: selectedProjectId === p.id ? '1px solid #10b981' : '1px solid transparent',
                  background: selectedProjectId === p.id ? 'rgba(16, 185, 129, 0.25)' : 'var(--bg-card)',
                  color: selectedProjectId === p.id ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.companyName} ({p.status})
              </button>
            ))}
          </div>

          {/* Delivery Workspace Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', overflowX: 'auto' }}>
            {(['overview', 'team', 'sprints', 'milestones', 'risks', 'tasks', 'documents'] as const).map((tb) => (
              <button
                key={tb}
                onClick={() => setActiveTab(tb)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  border: activeTab === tb ? '1px solid #10b981' : '1px solid transparent',
                  background: activeTab === tb ? 'var(--color-success-bg)' : 'transparent',
                  color: activeTab === tb ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {tb}
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          {activeTab === 'overview' && <ProjectOverview project={selectedProject} />}
          {activeTab === 'team' && <TeamAssignment team={selectedProject.team} />}
          {activeTab === 'sprints' && <SprintPlanner sprints={selectedProject.sprints} />}
          {activeTab === 'milestones' && <MilestoneTimeline milestones={selectedProject.milestones} />}
          {activeTab === 'risks' && <RisksPanel risks={selectedProject.risks} />}
          {activeTab === 'tasks' && <DeliverablesPanel tasks={selectedProject.tasks} />}
          {activeTab === 'documents' && <ProjectDocuments documents={selectedProject.documents} />}
        </div>
      )}
    </div>
  );
}

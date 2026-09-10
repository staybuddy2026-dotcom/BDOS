'use client';

import { useState } from 'react';
import Image from 'next/image';
import bg1 from '../../assets/bg1.png';
import { MorningCommandMetrics, UniversalSearchResultItem, LeadExplanation, OmniChannelOutreachPackage } from '@/features/refinement/types';
import { LeadExplanationModal } from './LeadExplanationModal';
import { OmniOutreachDrawer } from './OmniOutreachDrawer';
import { explainLeadScoreAction, generateOmniOutreachAction } from '@/features/refinement/actions';
import { TrendingUp, Users, ChevronRight, Zap, Target, Sun, ArrowRight, Sparkles } from 'lucide-react';

const GithubIcon = ({ size = 24, strokeWidth = 2, ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export function MorningDashboard({ metrics }: { metrics: MorningCommandMetrics }) {
  const companies = metrics.topCompanies;
  const [selectedExplanation, setSelectedExplanation] = useState<LeadExplanation | null>(null);
  const [selectedOutreach, setSelectedOutreach] = useState<OmniChannelOutreachPackage | null>(null);
  const [isLoadingOutreach, setIsLoadingOutreach] = useState<string | null>(null);

  const handleExplain = async (company: UniversalSearchResultItem) => {
    try {
      const exp = await explainLeadScoreAction(company.companyId, company.companyName, company.domain, company.buyingScore);
      setSelectedExplanation(exp);
    } catch { }
  };

  const handleGenerateOutreach = async (company: UniversalSearchResultItem) => {
    try {
      setIsLoadingOutreach(company.companyId);
      const pkg = await generateOmniOutreachAction(company.companyName, company.domain, 'Dr. Rajesh Kumar', 'Chief Technology Officer');
      setSelectedOutreach(pkg);
    } catch {
    } finally {
      setIsLoadingOutreach(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{`
        .empty-queue-box {
          border: 1.5px dashed #bfdbfe;
          border-radius: 12px;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .empty-queue-box:hover {
          border-color: #60a5fa;
          background: #eff6ff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.1);
        }
        .empty-queue-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .empty-queue-box:hover .empty-queue-icon {
          transform: scale(1.1) rotate(15deg);
          color: #2563eb;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
        }
        .interactive-greeting {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          background-color: #4f46e5;
          background-image: 
            radial-gradient(at 0% 0%, #3b82f6 0px, transparent 60%),
            radial-gradient(at 100% 100%, #a855f7 0px, transparent 60%),
            radial-gradient(at 50% 100%, #6366f1 0px, transparent 50%);
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px -5px rgba(99, 102, 241, 0.3);
        }
        .interactive-greeting::before {
          content: '';
          position: absolute;
          top: -20%;
          right: -10%;
          width: 50%;
          height: 140%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .greeting-icon-box {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 14px;
          border-radius: 10px;
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .premium-kpi-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 1);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 
            0 10px 30px -5px rgba(15, 23, 42, 0.04),
            inset 0 0 0 1px rgba(255, 255, 255, 0.5);
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        .premium-kpi-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(135deg, var(--glow-color) 0%, transparent 50%);
          opacity: 0.3;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .premium-kpi-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 
            0 20px 40px -10px rgba(15, 23, 42, 0.08),
            inset 0 0 0 1px rgba(255, 255, 255, 0.8);
          border-color: transparent;
        }
        .premium-kpi-card:hover::before {
          opacity: 0.6;
        }
        .kpi-glow {
          position: absolute;
          bottom: -30px;
          right: -30px;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: var(--glow-color);
          filter: blur(40px);
          opacity: 0.5;
          transition: all 0.5s ease;
          pointer-events: none;
        }
        .premium-kpi-card:hover .kpi-glow {
          transform: scale(1.3);
          opacity: 0.8;
        }
        .priority-account-row {
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-subtle, #e2e8f0);
          border-radius: 10px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          transition: all 0.2s ease-in-out;
        }
        .priority-account-row:hover {
          border-color: var(--accent-indigo, #6366f1);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.06);
          background: linear-gradient(to right, var(--bg-primary, #ffffff), var(--bg-secondary, #f8fafc));
        }
        .btn-why-score {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          background: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border-subtle, #e2e8f0);
          color: var(--text-secondary, #475569);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-why-score:hover {
          background: var(--bg-card);
          color: var(--text-primary);
          border-color: var(--text-muted);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .btn-omni {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--accent-indigo, #6366f1), var(--accent-violet, #8b5cf6));
          color: #ffffff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }
        .btn-omni:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
          filter: brightness(1.05);
        }
        .btn-omni:active {
          transform: translateY(0);
        }
      `}</style>

      {/* Greeting Header */}
      <div className="interactive-greeting">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
          <div className="greeting-icon-box">
            <Sun size={24} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 600, margin: 0, letterSpacing: '-0.01em', color: '#ffffff' }}>
              Good Morning, BDE.
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.9)', margin: 0, fontWeight: 400 }}>
              Here is your actionable intelligence briefing for today.
            </p>
          </div>
        </div>

        <div style={{ position: 'absolute', right: '10px', top: '0px', height: '110%', zIndex: 0, pointerEvents: 'none' }}>
          <Image src={bg1} alt="Decoration" priority style={{ height: '100%', width: 'auto', objectFit: 'contain', opacity: 0.9, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))' }} />
        </div>
      </div>

      {/* Modern KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>

        {/* Card 1 */}
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(251, 191, 36, 0.15)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '50%', color: '#d97706', display: 'flex' }}>
                <TrendingUp size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '1rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Funding Today</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{metrics.fundingTodayCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '8px', fontWeight: 600 }}>Deals closing or raised capital</div>
            </div>
            <div style={{ border: '1px solid #fef3c7', borderRadius: '50%', padding: '6px', color: '#d97706', display: 'flex', background: '#fffbeb' }}>
              <ArrowRight size={14} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(16, 185, 129, 0.12)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '50%', color: '#059669', display: 'flex' }}>
                <Users size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '1rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hiring Today</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{metrics.hiringTodayCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '8px', fontWeight: 600 }}>Active squad & dev openings</div>
            </div>
            <div style={{ border: '1px solid #ecfdf5', borderRadius: '50%', padding: '6px', color: '#059669', display: 'flex', background: '#ecfdf5' }}>
              <ArrowRight size={14} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(59, 130, 246, 0.12)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '50%', color: '#2563eb', display: 'flex' }}>
                <Zap size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '1rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>New CTOs</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{metrics.newCtosCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#2563eb', marginTop: '8px', fontWeight: 600 }}>Leadership changes detected</div>
            </div>
            <div style={{ border: '1px solid #eff6ff', borderRadius: '50%', padding: '6px', color: '#2563eb', display: 'flex', background: '#eff6ff' }}>
              <ArrowRight size={14} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(168, 85, 247, 0.12)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#faf5ff', padding: '10px', borderRadius: '50%', color: '#9333ea', display: 'flex' }}>
                <GithubIcon size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '1rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Github Active</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{metrics.newProductHuntLaunchesCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#9333ea', marginTop: '8px', fontWeight: 600 }}>Repos with fresh commits</div>
            </div>
            <div style={{ border: '1px solid #faf5ff', borderRadius: '50%', padding: '6px', color: '#9333ea', display: 'flex', background: '#faf5ff' }}>
              <ArrowRight size={14} strokeWidth={2.5} />
            </div>
          </div>
        </div>

      </div>

      {/* Priority Accounts Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: '#ecfdf5', border: '2px solid #a7f3d0', color: '#10b981' }}>
              <Target size={18} strokeWidth={2.5} />
            </div>
            Priority Accounts Queue
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 700 }}>
            <Sparkles size={14} /> {companies.length} targets pre-qualified by AI
          </div>
        </div>

        {companies.length === 0 ? (
          <div className="empty-queue-box">
            <div className="empty-queue-icon">
              <Sparkles size={24} strokeWidth={2.5} />
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e40af', marginBottom: '6px' }}>
              No priority accounts populated yet.
            </div>
            <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 500 }}>
              Let the AI run its ingestion cycles.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {companies.map((comp) => (
              <div key={comp.companyId} className="priority-account-row">

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 min-content' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {comp.companyName}
                    </h4>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--accent-indigo)', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.02em' }}>
                        ICP {comp.icpScore || 95}/100
                      </span>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--color-success)', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.02em' }}>
                        INTENT {comp.buyingScore}/100
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{comp.domain}</span>
                    {comp.country && (
                      <>
                        <span style={{ color: 'var(--border-focus)' }}>•</span>
                        <span>{comp.country}</span>
                      </>
                    )}
                  </div>

                  {comp.primaryTechStack && comp.primaryTechStack.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {comp.primaryTechStack.slice(0, 4).map(t => (
                        <span key={t} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => handleExplain(comp)}
                    className="btn-why-score"
                  >
                    View AI Reasoning
                  </button>

                  <button
                    onClick={() => handleGenerateOutreach(comp)}
                    className="btn-omni"
                    disabled={isLoadingOutreach === comp.companyId}
                    style={{ opacity: isLoadingOutreach === comp.companyId ? 0.7 : 1 }}
                  >
                    {isLoadingOutreach === comp.companyId ? 'Generating...' : '1-Click Omni-Outreach'} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
            {companies.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-focus)' }}>
                No priority accounts populated yet. Let the AI run its ingestion cycles.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      {selectedExplanation && <LeadExplanationModal explanation={selectedExplanation} onClose={() => setSelectedExplanation(null)} />}
      {selectedOutreach && <OmniOutreachDrawer packageData={selectedOutreach} onClose={() => setSelectedOutreach(null)} />}
    </div>
  );
}

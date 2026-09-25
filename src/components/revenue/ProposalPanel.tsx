'use client';

import { useState } from 'react';
import { RevenueProposal } from '@/features/revenue/types';
import { FileText, CheckCircle, Copy, Download, Send, Sparkles } from 'lucide-react';
import { z } from 'zod';

const ProposalSchema = z.object({
  scopeSummary: z.string().min(10, "Scope summary must be at least 10 characters long").max(500, "Scope summary is too long"),
  budgetInr: z.string().regex(/^₹?[0-9,]+(\s*-\s*₹?[0-9,]+)?$/, "Valid INR budget required (e.g. ₹45,000,00 - ₹65,000,00)"),
  budgetUsd: z.string().regex(/^\$?[0-9,]+(\s*-\s*\$?[0-9,]+)?( USD)?$/, "Valid USD budget required (e.g. $55,000 - $78,000 USD)"),
  timelineWeeks: z.number().min(1, "Timeline must be at least 1 week").max(52, "Timeline cannot exceed 52 weeks")
});

export function ProposalPanel({ 
  proposals: initialProposals,
  companyName = 'Target Client'
}: { 
  proposals: RevenueProposal[];
  companyName?: string;
}) {
  const [proposals, setProposals] = useState<RevenueProposal[]>(initialProposals);
  const [showModal, setShowModal] = useState(false);

  const [budgetInr, setBudgetInr] = useState('₹45,000,00 - ₹65,000,00');
  const [budgetUsd, setBudgetUsd] = useState('$55,000 - $78,000 USD');
  const [timelineWeeks, setTimelineWeeks] = useState(6);
  const [scopeSummary, setScopeSummary] = useState(`Senior React 19 & Python FastAPI Squad deployment for ${companyName}`);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGenerateProposal = () => {
    try {
      ProposalSchema.parse({ scopeSummary, budgetInr, budgetUsd, timelineWeeks });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        (error as any).errors.forEach((err: any) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      }
      return;
    }

    const v = proposals.length + 1;
    const newProp: RevenueProposal = {
      id: `prop_${Date.now()}`,
      version: `v${v}.0`,
      createdDate: new Date().toISOString().split('T')[0],
      status: 'SENT',
      budgetInr,
      budgetUsd,
      scopeSummary,
      timelineWeeks,
    };

    setProposals([newProp, ...proposals]);
    setShowModal(false);
    setToastMsg(`⚡ AI Commercial Proposal v${v}.0 generated & dispatched!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopyProposal = (prop: RevenueProposal) => {
    const text = `PROPOSAL VERSION: ${prop.version}\nCOMPANY: ${companyName}\nBUDGET: ${prop.budgetInr} (${prop.budgetUsd})\nTIMELINE: ${prop.timelineWeeks} Weeks\nSCOPE: ${prop.scopeSummary}\nDELIVERABLES: Senior Engineering Squad (2-React, 2-FastAPI, 1-DevOps), Full Source Code Ownership, 90-Day Production Guarantee.`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(prop.id);
    setToastMsg(`Copied Proposal ${prop.version} details to clipboard!`);
    setTimeout(() => {
      setCopiedId(null);
      setToastMsg(null);
    }, 2500);
  };

  const handleSendProposalToClient = (prop: RevenueProposal) => {
    setToastMsg(`Dispatched Commercial Proposal ${prop.version} to ${companyName} client portal & decision maker email!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', border: '2px solid var(--accent-indigo)', boxShadow: '0 12px 32px rgba(99,102,241,0.2)' }}>
          <CheckCircle size={18} style={{ color: 'var(--accent-indigo)' }} /> {toastMsg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} style={{ color: '#eab308' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Proposals & Commercial Quotes ({proposals.length})
          </h3>
        </div>

        <button 
          type="button"
          onClick={() => setShowModal(true)}
          style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #eab308, #ca8a04)', border: 'none', color: '#ffffff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(234, 179, 8, 0.3)' }}
        >
          <Sparkles size={14} /> + Generate AI Commercial Proposal
        </button>
      </div>

      {/* Generate Proposal Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '460px', background: 'var(--bg-card)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-focus)', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={18} style={{ color: '#eab308' }} /> AI Commercial Proposal Generator
            </h3>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Target Scope Summary</label>
              <textarea rows={3} value={scopeSummary} onChange={(e) => setScopeSummary(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: errors.scopeSummary ? '1px solid #ef4444' : '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit' }} />
              {errors.scopeSummary && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.scopeSummary}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Budget Range (INR)</label>
                <input type="text" value={budgetInr} onChange={(e) => setBudgetInr(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: errors.budgetInr ? '1px solid #ef4444' : '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                {errors.budgetInr && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.budgetInr}</span>}
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Budget Range (USD)</label>
                <input type="text" value={budgetUsd} onChange={(e) => setBudgetUsd(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: errors.budgetUsd ? '1px solid #ef4444' : '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                {errors.budgetUsd && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.budgetUsd}</span>}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Delivery Timeline (Weeks)</label>
              <input type="number" value={timelineWeeks} onChange={(e) => setTimelineWeeks(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: errors.timelineWeeks ? '1px solid #ef4444' : '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
              {errors.timelineWeeks && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.timelineWeeks}</span>}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Cancel</button>
              <button type="button" onClick={handleGenerateProposal} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #eab308, #ca8a04)', border: 'none' }}>Generate Proposal PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Proposals List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {proposals.length === 0 ? (
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
            No proposals generated yet. Click Generate AI Commercial Proposal above!
          </div>
        ) : (
          proposals.map((prop) => (
            <div key={prop.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#eab308', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> Proposal {prop.version} (Created {prop.createdDate})
                </span>
                <span style={{ fontSize: '0.66rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  {prop.status}
                </span>
              </div>

              <div style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                Budget: <span style={{ color: '#eab308' }}>{prop.budgetInr}</span> <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>({prop.budgetUsd})</span>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {prop.scopeSummary} • <strong>{prop.timelineWeeks} Weeks Delivery Timeline</strong>
              </div>

              {/* Interactive Action Controls */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.74rem' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyProposal(prop)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedId === prop.id ? <CheckCircle size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                    {copiedId === prop.id ? 'Copied!' : 'Copy Proposal Text'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendProposalToClient(prop)}
                    style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', border: 'none', color: '#ffffff', padding: '5px 12px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)' }}
                  >
                    <Send size={12} /> Dispatch Proposal to Client
                  </button>
                </div>

                <a href={`/api/delivery/export?type=proposal&id=${prop.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-indigo)', textDecoration: 'none', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Download size={12} /> Download PDF
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

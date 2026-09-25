'use client';

import { useState } from 'react';
import { RevenueContract } from '@/features/revenue/types';
import { ShieldCheck, CheckCircle, Copy, Send, Sparkles, FileText } from 'lucide-react';
import { CustomDropdown } from '@/components/CustomDropdown';

export function ContractPanel({ 
  contracts: initialContracts,
  companyName = 'Target Client'
}: { 
  contracts: RevenueContract[];
  companyName?: string;
}) {
  const [contracts, setContracts] = useState<RevenueContract[]>(initialContracts);
  const [showModal, setShowModal] = useState(false);
  const [contractType, setContractType] = useState<'MSA' | 'SOW' | 'NDA' | 'INVOICE'>('MSA');
  const [notes, setNotes] = useState(`Master Services Agreement (MSA) for ${companyName} senior engineering squad deployment.`);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleGenerateContract = () => {
    const newCtr: RevenueContract = {
      id: `ctr_${Date.now()}`,
      contractType,
      status: 'SENT',
      executionDate: new Date().toISOString().split('T')[0],
      fileUrl: '#',
    };

    setContracts([newCtr, ...contracts]);
    setShowModal(false);
    setToastMsg(`⚡ ${contractType} Legal Contract generated & sent for client E-Signature!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopyContract = (ctr: RevenueContract) => {
    const text = `CONTRACT TYPE: ${ctr.contractType}\nCOMPANY: ${companyName}\nEXECUTION DATE: ${ctr.executionDate}\nSTATUS: ${ctr.status}\nTERMS: Master Services Agreement for Software Engineering & Squad Augmentation. IP Rights transfer upon milestone payment. 90-Day Production Warranty included.`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(ctr.id);
    setToastMsg(`Copied ${ctr.contractType} Contract text to clipboard!`);
    setTimeout(() => {
      setCopiedId(null);
      setToastMsg(null);
    }, 2500);
  };

  const handleSendContractForSignature = (ctr: RevenueContract) => {
    setToastMsg(`Dispatched ${ctr.contractType} contract to ${companyName} legal team for DocuSign / E-Signature!`);
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
          <ShieldCheck size={18} style={{ color: '#10b981' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Legal Contracts & Invoices ({contracts.length})
          </h3>
        </div>

        <button 
          type="button"
          onClick={() => setShowModal(true)}
          style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}
        >
          <Sparkles size={14} /> + Generate AI Legal Contract / MSA
        </button>
      </div>

      {/* Generate Contract Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-card)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-focus)', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} style={{ color: '#10b981' }} /> AI Legal Contract & MSA Generator
            </h3>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Contract Type</label>
              <CustomDropdown
                value={contractType}
                onChange={(val) => setContractType(val as 'MSA' | 'SOW' | 'NDA' | 'INVOICE')}
                options={[
                  { value: 'MSA', label: '📜 Master Services Agreement (MSA)' },
                  { value: 'SOW', label: '📝 Statement of Work (SOW)' },
                  { value: 'NDA', label: '🔒 Non-Disclosure Agreement (NDA)' },
                  { value: 'INVOICE', label: '💳 Milestone Invoice (50% Deposit)' },
                ]}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Legal Terms Summary</label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Cancel</button>
              <button type="button" onClick={handleGenerateContract} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>Generate & Request E-Signature</button>
            </div>
          </div>
        </div>
      )}

      {/* Contracts List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {contracts.length === 0 ? (
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
            No legal contracts generated yet. Click Generate AI Legal Contract above!
          </div>
        ) : (
          contracts.map((ctr) => (
            <div key={ctr.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FileText size={14} style={{ color: '#10b981' }} /> {ctr.contractType} CONTRACT
                </span>
                <span style={{ fontSize: '0.64rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  {ctr.status}
                </span>
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Executed: <strong>{ctr.executionDate}</strong>
              </div>

              {/* Interactive Controls */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '0.72rem' }}>
                <button
                  type="button"
                  onClick={() => handleCopyContract(ctr)}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                >
                  {copiedId === ctr.id ? <CheckCircle size={11} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                  {copiedId === ctr.id ? 'Copied!' : 'Copy Terms'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSendContractForSignature(ctr)}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)' }}
                >
                  <Send size={11} /> Request Signature
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

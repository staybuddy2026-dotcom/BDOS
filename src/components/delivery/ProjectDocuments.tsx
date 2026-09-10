'use client';

import { ProjectDocument } from '@/features/delivery/types';
import { FileText, ExternalLink, ShieldCheck } from 'lucide-react';

export function ProjectDocuments({ documents }: { documents: ProjectDocument[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} style={{ color: 'var(--accent-indigo)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Project Documents & Legal Attachments ({documents.length} Files)
          </h3>
        </div>

        <button style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '0.74rem', background: 'var(--accent-indigo-glow)', border: '1px solid #38bdf8', color: 'var(--bg-primary)', fontWeight: 700, cursor: 'pointer' }}>
          + Attach Document
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        {documents.map((doc) => (
          <div key={doc.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                {doc.documentType}
              </span>
              <ShieldCheck size={14} style={{ color: 'var(--color-success)' }} />
            </div>

            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>{doc.title}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Attached: {new Date(doc.attachedAt).toLocaleDateString()}</div>

            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.74rem', color: 'var(--accent-indigo)', textDecoration: 'none', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              Open Document PDF <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

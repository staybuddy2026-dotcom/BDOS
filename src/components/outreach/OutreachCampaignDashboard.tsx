'use client';

import { useState, useEffect } from 'react';
import { getActiveOutreachCampaignsAction } from '@/features/outreach/actions';
import { Mail, CheckCircle2, Pause, Loader2, BarChart2 } from 'lucide-react';

type Campaign = {
  id: string;
  companyName: string;
  targetContactName: string;
  targetContactTitle: string;
  domain: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export function OutreachCampaignDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const data = await getActiveOutreachCampaignsAction();
        setCampaigns(data);
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCampaigns();

    // Poll every 30 seconds for new approved campaigns
    const interval = setInterval(loadCampaigns, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#eef2ff', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={20} style={{ color: '#6366f1' }} />
            </div>
            Active Outreach Campaigns
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 600 }}>
            Tracking {campaigns.length} ongoing multi-channel outreach sequences
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={24} className="spin" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Loading active campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #cbd5e1' }}>
          <Mail size={32} style={{ color: '#64748b', margin: '0 auto 12px auto', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>No Active Campaigns</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Generate and approve a draft above to start a campaign.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>
                <th style={{ padding: '12px 16px' }}>Target Prospect</th>
                <th style={{ padding: '12px 16px' }}>Company</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Last Updated</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => (
                <tr key={camp.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s', cursor: 'default' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{camp.targetContactName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>{camp.targetContactTitle}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{camp.companyName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6366f1', marginTop: '2px', fontWeight: 600 }}>{camp.domain}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontSize: '0.75rem', background: '#eef2ff', color: '#6366f1', border: '1px solid #6366f1', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> {camp.status === 'APPROVED' ? 'RUNNING' : camp.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    {new Date(camp.updatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease' }}>
                      <Pause size={14} style={{ color: '#64748b' }} /> Pause
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

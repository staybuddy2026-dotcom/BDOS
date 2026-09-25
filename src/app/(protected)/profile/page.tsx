import { 
  User, Mail, MapPin, Briefcase, Calendar, 
  Shield, Activity, Link2, CheckCircle, AlertTriangle, 
  Settings, Target, Send, Zap, Award
} from 'lucide-react';
import blob from '@/assets/blob.png';
import '@/styles/globals.css';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/jwt';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  let user = null;
  if (session) {
    user = await decrypt(session);
  }

  const name = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = name.charAt(0).toUpperCase();
  const email = user?.email || 'email@company.com';
  const roleTitle = user?.role === 'bde' ? 'Business Development Executive' : 'User';
  
  return (
    <div className="dashboard-page" style={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', gap: 0, paddingBottom: 0, boxSizing: 'border-box',
      backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.7), rgba(248, 250, 252, 0.7)), url(${blob.src})`,
      backgroundSize: 'cover', backgroundPosition: 'top right', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed'
    }}>
      
      {/* HEADER BANNER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        height: '65px',
        flexShrink: 0,
        padding: '0 28px',
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}>
            <User size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              User Profile
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.03em', marginTop: '2px', margin: 0 }}>
              Manage your identity, metrics, and integrations
            </p>
          </div>
        </div>
        
        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          <Settings size={16} /> Edit Profile
        </button>
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div
        className="dashboard-scrollable-content custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* HERO SECTION */}
          <div className="card-glass relative overflow-hidden" style={{ padding: '32px', display: 'flex', gap: '32px', alignItems: 'center' }}>
            {/* Background accent */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.05))', zIndex: 0 }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: '120px', height: '120px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, #a78bfa, #3b82f6)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 12px 32px rgba(99, 102, 241, 0.25)',
                border: '4px solid #fff'
              }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-kpi)', color: '#fff' }}>{initial}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1, flex: 1 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-kpi)', color: '#0f172a', margin: 0 }}>{name}</h2>
                  <span className="badge-indigo" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}>
                    <Shield size={12} /> Pro Member
                  </span>
                </div>
                <h3 style={{ fontSize: '1.1rem', color: '#475569', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={16} /> {roleTitle}
                </h3>
              </div>
              
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                  <Mail size={16} /> {email}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                  <MapPin size={16} /> San Francisco, CA (PST)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                  <Calendar size={16} /> Joined August 2025
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMN LAYOUT */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
            
            {/* COLUMN 1: Metrics & Integrations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* PERFORMANCE METRICS */}
              <div className="card-glass" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: 'var(--accent-indigo-glow)', padding: '6px', borderRadius: '6px', color: 'var(--accent-indigo)' }}>
                    <Activity size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Performance Snapshot</h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Metric 1 */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Target size={14} /> Prospects Sourced
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-kpi)', color: '#0f172a' }}>1,284</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>+12% this month</div>
                  </div>
                  
                  {/* Metric 2 */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Send size={14} /> Outreach Emails
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-kpi)', color: '#0f172a' }}>3,492</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>+5% this month</div>
                  </div>
                  
                  {/* Metric 3 */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Zap size={14} /> Reply Rate
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-kpi)', color: '#0f172a' }}>18.4%</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>+2.1% vs average</div>
                  </div>
                  
                  {/* Metric 4 */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Award size={14} /> Meetings Booked
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-kpi)', color: '#0f172a' }}>42</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Top 10% in team</div>
                  </div>
                </div>
              </div>

              {/* INTEGRATIONS */}
              <div className="card-glass" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: 'var(--accent-indigo-glow)', padding: '6px', borderRadius: '6px', color: 'var(--accent-indigo)' }}>
                    <Link2 size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Connected Integrations</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* LinkedIn */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', background: '#0a66c2', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>in</div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>LinkedIn</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Connected as {name}</div>
                      </div>
                    </div>
                    <span className="badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                      <CheckCircle size={12} /> Active
                    </span>
                  </div>

                  {/* Apollo */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', background: '#000', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>A</div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Apollo.io API</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Connected workspace</div>
                      </div>
                    </div>
                    <span className="badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                      <CheckCircle size={12} /> Active
                    </span>
                  </div>

                  {/* Outlook */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', background: '#0078d4', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>O</div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Microsoft Outlook</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Needs Re-authentication</div>
                      </div>
                    </div>
                    <span className="badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#fef9c3', color: '#ca8a04' }}>
                      <AlertTriangle size={12} /> Action Required
                    </span>
                  </div>
                </div>
                
                <button className="btn-secondary" style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}>
                  Manage Integrations
                </button>
              </div>
            </div>

            {/* COLUMN 2: Activity Timeline */}
            <div className="card-glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--accent-indigo-glow)', padding: '6px', borderRadius: '6px', color: 'var(--accent-indigo)' }}>
                  <Calendar size={18} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Recent Activity</h3>
              </div>
              
              <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '8px' }}>
                {/* Vertical Line */}
                <div style={{ position: 'absolute', left: '17px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border-subtle)', zIndex: 0 }} />
                
                {/* Item 1 */}
                <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', border: '3px solid #10b981', flexShrink: 0, marginTop: '2px', boxShadow: '0 0 0 4px rgba(16,185,129,0.1)' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Meeting Booked</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>Booked a discovery call with Sarah Jenkins from TechFlow.</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>2 hours ago</div>
                  </div>
                </div>
                
                {/* Item 2 */}
                <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', border: '3px solid var(--accent-indigo)', flexShrink: 0, marginTop: '2px', boxShadow: '0 0 0 4px var(--accent-indigo-glow)' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Playbook Activated</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>Started "Enterprise SaaS Q3" outreach playbook for 45 contacts.</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Yesterday at 2:30 PM</div>
                  </div>
                </div>
                
                {/* Item 3 */}
                <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', border: '3px solid #3b82f6', flexShrink: 0, marginTop: '2px', boxShadow: '0 0 0 4px rgba(59,130,246,0.1)' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Company Target Added</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>Added Microsoft (Azure Division) to priority tier 1.</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Yesterday at 10:15 AM</div>
                  </div>
                </div>
                
                {/* Item 4 */}
                <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', border: '3px solid #8b5cf6', flexShrink: 0, marginTop: '2px', boxShadow: '0 0 0 4px rgba(139,92,246,0.1)' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Universal Search Executed</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>Scanned Apollo for VP of Engineering roles in NY.</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Sep 20, 2026</div>
                  </div>
                </div>

                {/* Item 5 */}
                <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', border: '3px solid #64748b', flexShrink: 0, marginTop: '2px', boxShadow: '0 0 0 4px rgba(100,116,139,0.1)' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>System Update</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>Profile information was last updated.</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Sep 15, 2026</div>
                  </div>
                </div>
              </div>
              
              <button className="btn-secondary" style={{ width: '100%', marginTop: 'auto', paddingTop: '10px', paddingBottom: '10px', justifyContent: 'center' }}>
                View Full Activity Log
              </button>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}

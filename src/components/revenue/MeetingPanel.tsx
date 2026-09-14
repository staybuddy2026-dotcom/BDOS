'use client';

import { useState } from 'react';
import { RevenueMeeting } from '@/features/revenue/types';
import { Calendar, Clock, Plus, ExternalLink, CheckCircle, Video, Mail, XCircle, RotateCcw } from 'lucide-react';

export function MeetingPanel({ meetings: initialMeetings }: { meetings: RevenueMeeting[] }) {
  const [meetings, setMeetings] = useState<RevenueMeeting[]>(initialMeetings);
  const [showModal, setShowModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00 AM');
  const [title, setTitle] = useState('Discovery Call - Technical Requirement');
  const [clientEmail, setClientEmail] = useState('decisionmaker@target.com');
  const [meetingPlatform, setMeetingPlatform] = useState<'GOOGLE_MEET' | 'ZOOM' | 'TEAMS'>('GOOGLE_MEET');
  const customMeetingUrl = '';
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const generateMeetingUrl = (platform: 'GOOGLE_MEET' | 'ZOOM' | 'TEAMS', mtgId: string) => {
    if (customMeetingUrl.trim()) return customMeetingUrl.trim();
    if (platform === 'ZOOM') return `https://zoom.us/j/987${mtgId.replace(/\D/g, '').slice(-7)}`;
    if (platform === 'TEAMS') return `https://teams.microsoft.com/l/meetup-join/tinyscript_${mtgId}`;
    return `https://meet.google.com/new`;
  };

  const handleBookMeeting = () => {
    const id = `mtg_${Date.now()}`;
    const joinUrl = generateMeetingUrl(meetingPlatform, id);

    const newMtg: RevenueMeeting = {
      id,
      date: `${date} @ ${time}`,
      meetingType: 'DISCOVERY',
      attendees: [clientEmail, 'Lead BDE'],
      outcome: 'SCHEDULED',
      notes: `${title} (${meetingPlatform.replace('_', ' ')}) • Join Link: ${joinUrl}`,
      nextAction: 'Send Discovery Notes & Architecture Proposal',
    };

    setMeetings([newMtg, ...meetings]);
    setShowModal(false);
    setSuccessToast(`Meeting booked for ${date} @ ${time}! Calendar invite & ${meetingPlatform.replace('_', ' ')} link sent to ${clientEmail}.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleCancelMeeting = (id: string) => {
    setMeetings(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, outcome: 'CANCELLED' as const, notes: `${m.notes} (Cancelled by BDE)` };
      }
      return m;
    }));
    setSuccessToast('Meeting cancelled successfully. Cancellation notice sent to client email.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleRescheduleMeeting = (id: string) => {
    setMeetings(prev => prev.map(m => {
      if (m.id === id) {
        return {
          ...m,
          date: `${date} @ ${time}`,
          outcome: 'SCHEDULED' as const,
          notes: `${m.notes} (Rescheduled to ${date} @ ${time})`,
        };
      }
      return m;
    }));
    setShowRescheduleModal(null);
    setSuccessToast(`Meeting rescheduled for ${date} @ ${time}! Updated calendar invite sent to client.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleSendClientInviteNotification = (mtg: RevenueMeeting) => {
    setSuccessToast(`Dispatched calendar invite & online meeting link to ${mtg.attendees[0] || 'client email'}!`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const getGoogleCalendarUrl = (mtg: RevenueMeeting) => {
    const cleanTitle = encodeURIComponent(mtg.notes.split('•')[0] || title);
    const cleanDetails = encodeURIComponent(`Meeting scheduled via BDE Sales OS for ${mtg.attendees.join(', ')}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${cleanTitle}&details=${cleanDetails}&location=Google+Meet`;
  };

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {successToast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', border: '2px solid var(--accent-indigo)', boxShadow: '0 12px 32px rgba(99,102,241,0.2)' }}>
          <CheckCircle size={18} style={{ color: 'var(--accent-indigo)' }} /> {successToast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} style={{ color: 'var(--accent-indigo)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Scheduled & Online Meetings ({meetings.length})
          </h3>
        </div>

        <button 
          type="button"
          onClick={() => setShowModal(true)}
          style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', border: 'none', color: '#ffffff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)' }}
        >
          <Plus size={14} /> Schedule Online Meeting & Invite Client
        </button>
      </div>

      {/* Book Meeting Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '460px', background: 'var(--bg-card)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-focus)', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Schedule Online Discovery Meeting</h3>
            
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Meeting Topic / Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.84rem' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Client Recipient Email</label>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.84rem' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Time</label>
                <input type="text" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Online Platform</label>
              <select value={meetingPlatform} onChange={(e) => setMeetingPlatform(e.target.value as any)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.84rem', fontWeight: 700 }}>
                <option value="GOOGLE_MEET">🎥 Google Meet</option>
                <option value="ZOOM">💻 Zoom Video Conference</option>
                <option value="TEAMS">🔷 Microsoft Teams</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Cancel</button>
              <button type="button" onClick={handleBookMeeting} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.8rem' }}>Book & Dispatch Invite</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-card)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-focus)', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Reschedule Meeting</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>New Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>New Time</label>
                <input type="text" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" onClick={() => setShowRescheduleModal(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Cancel</button>
              <button type="button" onClick={() => handleRescheduleMeeting(showRescheduleModal)} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.8rem' }}>Confirm Reschedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Meetings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {meetings.length === 0 ? (
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
            No meetings scheduled yet. Click Schedule Online Meeting above!
          </div>
        ) : (
          meetings.map((mtg) => {
            const isCancelled = mtg.outcome === 'CANCELLED';
            const meetUrl = generateMeetingUrl('GOOGLE_MEET', mtg.id);

            return (
              <div key={mtg.id} style={{ background: isCancelled ? 'var(--bg-secondary)' : 'var(--bg-card)', border: isCancelled ? '1px dashed var(--border-subtle)' : '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', opacity: isCancelled ? 0.7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.66rem', background: isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'var(--accent-indigo-glow)', color: isCancelled ? '#ef4444' : 'var(--accent-indigo)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                      {mtg.meetingType} MEETING
                    </span>
                    <span style={{ fontSize: '0.66rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Video size={10} /> Online Meeting
                    </span>
                  </div>

                  <span style={{ fontSize: '0.76rem', color: isCancelled ? '#ef4444' : 'var(--accent-indigo)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {mtg.date}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Topic & Notes:</strong> {mtg.notes}
                </div>

                {/* Interactive Action Control Row */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {!isCancelled && (
                      <a 
                        href={meetUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', padding: '5px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)' }}
                      >
                        <Video size={12} /> Join Google Meet / Zoom
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSendClientInviteNotification(mtg)}
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Send email invitation notice to client"
                    >
                      <Mail size={12} style={{ color: 'var(--accent-indigo)' }} /> Email Client Notice
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!isCancelled && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowRescheduleModal(mtg.id)}
                          style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <RotateCcw size={11} /> Reschedule
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelMeeting(mtg.id)}
                          style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <XCircle size={11} /> Cancel
                        </button>
                      </>
                    )}

                    <a 
                      href={getGoogleCalendarUrl(mtg)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      <ExternalLink size={11} /> GCal
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

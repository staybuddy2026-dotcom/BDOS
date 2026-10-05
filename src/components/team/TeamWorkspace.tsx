'use client';

import { useState } from 'react';
import type { UserRole } from '@prisma/client';
import { KeyRound, Loader2, Mail, UserPlus, X } from 'lucide-react';
import {
  createTeamMemberAction,
  getTeamMembersAction,
  resetTeamMemberPasswordAction,
  updateTeamMemberAction,
} from '@/features/team/actions';
import type { TeamMember } from '@/features/team/actions';
import { ROLE_LABELS } from '@/lib/roles';
import s from '@/components/ui/ui.module.css';
import { useToast } from '@/components/ui/useToast';
import { Time } from '@/components/crm/ui';

const ROLES: UserRole[] = ['BDE', 'MANAGER', 'ADMIN'];
const ROLE_HELP: Record<UserRole, string> = {
  BDE: 'Works their own deals and can claim unassigned leads.',
  MANAGER: 'Sees and reassigns every deal in the team.',
  ADMIN: 'Everything a manager can do, plus managing team members.',
};

const emptyMember = { name: '', email: '', role: 'BDE' as UserRole, password: '' };

/** Team list for admins and managers. Only admins can add members, change roles or reset passwords. */
export function TeamWorkspace({ initialMembers, meId, canManage }: { initialMembers: TeamMember[]; meId: string; canManage: boolean }) {
  const [members, setMembers] = useState(initialMembers);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState<typeof emptyMember | null>(null);
  const [reset, setReset] = useState<{ member: TeamMember; password: string } | null>(null);

  const { toast, notify } = useToast();

  /** Runs an admin action, shows the outcome and reloads the list. */
  const run = async (key: string, action: () => Promise<{ error?: string }>, success: string): Promise<boolean> => {
    setBusy(key);
    try {
      const res = await action();
      if (res.error) { notify(res.error, true); return false; }
      notify(success);
      setMembers(await getTeamMembersAction());
      return true;
    } catch {
      notify('Something went wrong. Please try again.', true);
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={s.root}>
      {toast}

      <section className={s.card} aria-label="Team members">
        <div className={s.cardHeader}>
          <div>
            <h3 className={s.cardTitle}>Team members ({members.filter((m) => m.isActive).length} active)</h3>
            <p className={s.cardSubtitle}>Each member signs in with their own email and password and sees their own pipeline.</p>
          </div>
          {canManage && (
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setAdding(emptyMember)}><UserPlus size={15} /> Add team member</button>
          )}
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Member</th><th>Role</th><th>Open deals</th><th>Won</th><th>Mailbox</th><th>Last sign-in</th><th>Status</th>{canManage && <th></th>}</tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={m.isActive ? undefined : { opacity: 0.6 }}>
                  <td>
                    <div className={s.cellStrong}>{m.name}{m.id === meId && <span className={s.chipMeta}> (you)</span>}</div>
                    <div className={s.cellSub}>{m.email}</div>
                  </td>
                  <td>
                    {canManage ? (
                      <select className={`${s.select} ${s.selectSm}`} aria-label={`Role for ${m.name}`} value={m.role} disabled={busy !== null} title={ROLE_HELP[m.role]} onChange={(e) => run(m.id, () => updateTeamMemberAction(m.id, { role: e.target.value as UserRole }), `${m.name} is now ${ROLE_LABELS[e.target.value as UserRole]}.`)}>
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    ) : ROLE_LABELS[m.role]}
                  </td>
                  <td>{m.openDeals}</td>
                  <td>{m.wonDeals}</td>
                  <td>{m.hasMailbox ? <span className={`${s.badge} ${s.badgeGreen}`}><Mail size={11} /> Connected</span> : <span className={s.cellSub}>Team mailbox</span>}</td>
                  <td>{m.lastLoginAt ? <Time iso={m.lastLoginAt} mode="ago" /> : <span className={s.cellSub}>Never</span>}</td>
                  <td><span className={`${s.badge} ${m.isActive ? s.badgeGreen : s.badgeGray}`}>{m.isActive ? 'Active' : 'Deactivated'}</span></td>
                  {canManage && (
                    <td>
                      <div className={s.actionGroup} style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy !== null} onClick={() => setReset({ member: m, password: '' })}><KeyRound size={13} /> Reset password</button>
                        <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} disabled={busy !== null || m.id === meId} title={m.id === meId ? 'You cannot deactivate yourself' : undefined} onClick={() => run(m.id, () => updateTeamMemberAction(m.id, { isActive: !m.isActive }), m.isActive ? `${m.name} can no longer sign in. Their deals stay assigned to them.` : `${m.name} can sign in again.`)}>
                          {busy === m.id ? <Loader2 size={13} className={s.spin} /> : null} {m.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.card} aria-label="Roles">
        <h3 className={s.cardTitle}>What each role can do</h3>
        <div className={s.contactGrid}>
          {ROLES.map((r) => (
            <div key={r} className={s.contactItem}>
              <div className={s.contactLabel}>{ROLE_LABELS[r]}</div>
              <div style={{ fontSize: 13, color: 'var(--o-text-2)', marginTop: 6, lineHeight: 1.5 }}>{ROLE_HELP[r]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Add member */}
      {adding && (
        <div className={s.backdrop} onClick={() => busy === null && setAdding(null)}>
          <form className={s.modal} role="dialog" aria-modal="true" aria-labelledby="member-title" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => { e.preventDefault(); if (await run('add', () => createTeamMemberAction(adding), `${adding.name} added. Share the email and password with them.`)) setAdding(null); }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 className={s.modalTitle} id="member-title"><UserPlus size={17} /> Add team member</h3>
              <button type="button" className={s.iconBtn} onClick={() => setAdding(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <div>
              <label className={s.label} htmlFor="member-name">Full name</label>
              <input id="member-name" className={s.input} style={{ marginTop: 6 }} required autoFocus value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
            </div>
            <div>
              <label className={s.label} htmlFor="member-email">Work email (used to sign in)</label>
              <input id="member-email" type="email" className={s.input} style={{ marginTop: 6 }} required value={adding.email} onChange={(e) => setAdding({ ...adding, email: e.target.value })} />
            </div>
            <div>
              <label className={s.label} htmlFor="member-role">Role</label>
              <select id="member-role" className={s.select} style={{ marginTop: 6, width: '100%' }} value={adding.role} onChange={(e) => setAdding({ ...adding, role: e.target.value as UserRole })}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <div className={s.cellSub} style={{ marginTop: 6 }}>{ROLE_HELP[adding.role]}</div>
            </div>
            <div>
              <label className={s.label} htmlFor="member-password">Temporary password (8+ characters)</label>
              <input id="member-password" type="text" className={s.input} style={{ marginTop: 6 }} required minLength={8} autoComplete="off" value={adding.password} onChange={(e) => setAdding({ ...adding, password: e.target.value })} />
              <div className={s.cellSub} style={{ marginTop: 6 }}>They can change it under Profile after signing in.</div>
            </div>
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setAdding(null)} disabled={busy !== null}>Cancel</button>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy !== null}>{busy === 'add' && <Loader2 size={15} className={s.spin} />} Add member</button>
            </div>
          </form>
        </div>
      )}

      {/* Reset password */}
      {reset && (
        <div className={s.backdrop} onClick={() => busy === null && setReset(null)}>
          <form className={s.modal} role="dialog" aria-modal="true" aria-labelledby="reset-title" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => { e.preventDefault(); if (await run('reset', () => resetTeamMemberPasswordAction(reset.member.id, reset.password), `Password reset for ${reset.member.name}.`)) setReset(null); }}>
            <h3 className={s.modalTitle} id="reset-title"><KeyRound size={17} /> Reset password for {reset.member.name}</h3>
            <p className={s.modalText}>Set a new password and share it with them. Their old password stops working immediately.</p>
            <input className={s.input} type="text" placeholder="New password (8+ characters)" aria-label="New password" required minLength={8} autoFocus autoComplete="off" value={reset.password} onChange={(e) => setReset({ ...reset, password: e.target.value })} />
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setReset(null)} disabled={busy !== null}>Cancel</button>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy !== null}>{busy === 'reset' && <Loader2 size={15} className={s.spin} />} Reset password</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

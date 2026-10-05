'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Mail, Send, Unplug, UserRound } from 'lucide-react';
import {
  changeMyPasswordAction,
  getMyAccountAction,
  removeMyMailboxAction,
  saveMyMailboxAction,
  sendMyTestEmailAction,
  updateMyProfileAction,
} from '@/features/team/actions';
import type { MyAccount } from '@/features/team/actions';
import s from '@/components/ui/ui.module.css';
import { useToast } from '@/components/ui/useToast';
import c from '@/components/crm/crm.module.css';

// Common providers. Gmail and Outlook need an "App Password" created in the account's security settings.
const PROVIDERS = [
  { id: 'gmail', label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 465, secure: true },
  { id: 'outlook', label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false },
  { id: 'zoho', label: 'Zoho Mail', host: 'smtp.zoho.in', port: 465, secure: true },
] as const;

/** Profile page section for the signed-in user: name and signature, the mailbox outreach is sent from, and password. */
export function AccountSettings({ initialAccount }: { initialAccount: MyAccount }) {
  const [account, setAccount] = useState(initialAccount);
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState(initialAccount.name);
  const [signature, setSignature] = useState(initialAccount.signature);
  const [digestEnabled, setDigestEnabled] = useState(initialAccount.digestEnabled);
  const [mailbox, setMailbox] = useState({ ...initialAccount.mailbox, user: initialAccount.mailbox.user || initialAccount.email, password: '' });
  const [passwords, setPasswords] = useState({ current: '', next: '' });

  const { toast, notify } = useToast();

  const run = async (key: string, action: () => Promise<{ error?: string; message?: string }>, success?: string): Promise<boolean> => {
    setBusy(key);
    try {
      const res = await action();
      if (res.error) { notify(res.error, true); return false; }
      notify(res.message || success || 'Saved.');
      setAccount(await getMyAccountAction());
      return true;
    } catch {
      notify('Something went wrong. Please try again.', true);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const connected = account.mailbox.hasPassword && !!account.mailbox.host;

  return (
    <div className={s.root}>
      {toast}

      {/* Email sending */}
      <section className={s.card} aria-label="Email sending">
        <div className={s.cardHeader}>
          <div>
            <h3 className={s.cardTitle}><span className={s.iconTile}><Mail size={16} /></span> Email sending</h3>
            <p className={s.cardSubtitle}>Outreach and CRM emails are sent straight from this mailbox, so replies land in your own inbox.</p>
          </div>
          {account.sendingFrom ? (
            <span className={`${s.badge} ${s.badgeGreen}`}><CheckCircle2 size={12} /> Sending from {account.sendingFrom.address}{account.sendingFrom.source === 'team' ? ' (team mailbox)' : ''}</span>
          ) : (
            <span className={`${s.badge} ${s.badgeAmber}`}><AlertTriangle size={12} /> No mailbox connected</span>
          )}
        </div>

        <div className={s.chipRow} role="group" aria-label="Mail provider">
          {PROVIDERS.map((p) => (
            <button key={p.id} type="button" className={`${s.chip} ${mailbox.host === p.host ? s.chipActive : ''}`} aria-pressed={mailbox.host === p.host} onClick={() => setMailbox({ ...mailbox, host: p.host, port: p.port, secure: p.secure })}>{p.label}</button>
          ))}
        </div>

        <form className={c.fieldGrid} onSubmit={async (e) => { e.preventDefault(); if (await run('mailbox', () => saveMyMailboxAction(mailbox))) setMailbox((m) => ({ ...m, password: '' })); }}>
          <div className={c.field}>
            <label className={c.fieldLabel} htmlFor="smtp-user">Mailbox email</label>
            <input id="smtp-user" type="email" className={`${s.input} ${c.inputSm}`} required value={mailbox.user} onChange={(e) => setMailbox({ ...mailbox, user: e.target.value })} />
          </div>
          <div className={c.field}>
            <label className={c.fieldLabel} htmlFor="smtp-pass">App password</label>
            <input id="smtp-pass" type="password" className={`${s.input} ${c.inputSm}`} autoComplete="new-password" placeholder={account.mailbox.hasPassword ? 'Saved. Type to replace it' : 'App password from your mail provider'} required={!account.mailbox.hasPassword} value={mailbox.password} onChange={(e) => setMailbox({ ...mailbox, password: e.target.value })} />
          </div>
          <div className={c.field}>
            <label className={c.fieldLabel} htmlFor="smtp-host">SMTP host</label>
            <input id="smtp-host" className={`${s.input} ${c.inputSm}`} placeholder="smtp.gmail.com" required value={mailbox.host} onChange={(e) => setMailbox({ ...mailbox, host: e.target.value })} />
          </div>
          <div className={c.field}>
            <label className={c.fieldLabel} htmlFor="smtp-port">Port and security</label>
            <div className={c.formRow}>
              <input id="smtp-port" className={`${s.input} ${c.inputSm}`} style={{ width: 90 }} inputMode="numeric" required value={mailbox.port} onChange={(e) => setMailbox({ ...mailbox, port: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
              <select className={s.select} style={{ height: 36, flex: 1 }} aria-label="Connection security" value={mailbox.secure ? 'ssl' : 'starttls'} onChange={(e) => setMailbox({ ...mailbox, secure: e.target.value === 'ssl' })}>
                <option value="ssl">SSL/TLS (port 465)</option>
                <option value="starttls">STARTTLS (port 587)</option>
              </select>
            </div>
          </div>
          <div className={`${c.field} ${c.fieldWide}`}>
            <label className={c.fieldLabel} htmlFor="smtp-from">Sender name shown to recipients</label>
            <input id="smtp-from" className={`${s.input} ${c.inputSm}`} placeholder={account.name} value={mailbox.fromName} onChange={(e) => setMailbox({ ...mailbox, fromName: e.target.value })} />
          </div>
          <div className={`${c.fieldWide} ${s.actionGroup}`}>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy !== null}>
              {busy === 'mailbox' ? <Loader2 size={15} className={s.spin} /> : <CheckCircle2 size={15} />} {busy === 'mailbox' ? 'Checking mailbox…' : connected ? 'Save changes' : 'Connect mailbox'}
            </button>
            <button type="button" className={`${s.btn} ${s.btnSecondary}`} disabled={busy !== null || !account.sendingFrom} onClick={() => run('test', () => sendMyTestEmailAction())}>
              {busy === 'test' ? <Loader2 size={15} className={s.spin} /> : <Send size={15} />} Send me a test email
            </button>
            {connected && (
              <button type="button" className={`${s.btn} ${s.btnGhost} ${c.dangerBtn}`} disabled={busy !== null} onClick={async () => { if (window.confirm('Disconnect your mailbox? Emails will go out from the team mailbox if one is set up.') && (await run('remove', () => removeMyMailboxAction(), 'Mailbox disconnected.'))) setMailbox({ host: '', port: 465, secure: true, user: account.email, fromName: '', hasPassword: false, password: '' }); }}>
                <Unplug size={15} /> Disconnect
              </button>
            )}
          </div>
        </form>
        <div className={s.cellSub}>The password is checked against your mail server before it is saved, and stored encrypted. Gmail: Google Account → Security → 2-Step Verification → App passwords.</div>
      </section>

      <div className={s.mainGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Profile */}
        <section className={s.card} aria-label="Your details">
          <h3 className={s.cardTitle}><span className={s.iconTile}><UserRound size={16} /></span> Your details</h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={(e) => { e.preventDefault(); run('profile', () => updateMyProfileAction({ name, signature, digestEnabled }), 'Your details were saved.'); }}>
            <div className={c.field}>
              <label className={c.fieldLabel} htmlFor="profile-name">Name</label>
              <input id="profile-name" className={`${s.input} ${c.inputSm}`} required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={c.field}>
              <label className={c.fieldLabel} htmlFor="profile-signature">Email signature</label>
              <textarea id="profile-signature" className={`${s.textarea} ${c.textareaSm}`} placeholder={`${account.name}\nBusiness Development, Your Company`} value={signature} onChange={(e) => setSignature(e.target.value)} />
              <span className={s.cellSub}>Added to new emails you write from a CRM deal.</span>
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={digestEnabled} onChange={(e) => setDigestEnabled(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--o-accent)' }} />
              <span>
                <strong>Morning summary email</strong>
                <span className={s.cellSub} style={{ display: 'block' }}>Around 9:00, a short email to {account.email} with today&apos;s tasks, follow-ups and meetings. Skipped on days with nothing due.</span>
              </span>
            </label>
            <div><button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy !== null}>{busy === 'profile' && <Loader2 size={15} className={s.spin} />} Save details</button></div>
          </form>
        </section>

        {/* Password */}
        <section className={s.card} aria-label="Change password">
          <h3 className={s.cardTitle}><span className={s.iconTile}><KeyRound size={16} /></span> Change password</h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={async (e) => { e.preventDefault(); if (await run('password', () => changeMyPasswordAction(passwords.current, passwords.next), 'Your password was changed.')) setPasswords({ current: '', next: '' }); }}>
            <div className={c.field}>
              <label className={c.fieldLabel} htmlFor="password-current">Current password</label>
              <input id="password-current" type="password" className={`${s.input} ${c.inputSm}`} required autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
            </div>
            <div className={c.field}>
              <label className={c.fieldLabel} htmlFor="password-new">New password (8+ characters)</label>
              <input id="password-new" type="password" className={`${s.input} ${c.inputSm}`} required minLength={8} autoComplete="new-password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
            </div>
            <div><button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy !== null}>{busy === 'password' && <Loader2 size={15} className={s.spin} />} Change password</button></div>
          </form>
        </section>
      </div>
    </div>
  );
}

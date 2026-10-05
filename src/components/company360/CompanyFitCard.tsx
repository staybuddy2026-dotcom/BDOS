'use client';

import { AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import type { Company360Profile } from '@/features/company360/types';
import s from '@/components/ui/ui.module.css';

/** Things that make a company a harder sale, from facts in the profile only. */
function watchOuts(profile: Company360Profile): string[] {
  const o = profile.overview;
  const list: string[] = [];
  if (o.employeeCount > 2000) list.push(`Large company (about ${o.employeeCount.toLocaleString('en-US')} employees): expect procurement and an existing vendor list.`);
  if (o.employeeCount > 0 && o.employeeCount < 10) list.push('Very small team: budget may be limited; start with a small, fixed-scope piece of work.');
  if (!profile.linkedin?.activeJobOpeningsCount) list.push('No open jobs found, so there is no visible hiring pressure.');
  if (!profile.decisionMakers?.some((d) => d.name)) list.push('No decision maker found yet.');
  if (!profile.engineering.primaryLanguages.length) list.push('Tech stack unknown, so service fit cannot be checked yet.');
  return list;
}

/**
 * Company fit in one place: the score, the evidence it is built from, and what to watch out for.
 * Replaces the separate ICP, project value, competitive fit and "why not" cards, which guessed at
 * missing facts.
 */
export function CompanyFitCard({ profile }: { profile: Company360Profile }) {
  const scoring = profile.opportunityScoring;
  const cautions = watchOuts(profile);
  return (
    <section className={s.card}>
      <div className={s.cardHeader} style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h4 className={s.cardTitle}><Target size={15} /> Company fit</h4>
          <p className={s.cardSubtitle}>Built only from what was found about {profile.overview.companyName}. {scoring.confidenceScorePercent}% of the data the score uses is available.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={s.kpiValue} style={{ marginTop: 0 }}>{scoring.overallScore}<span className={s.cellSub}> / 100</span></div>
          <span className={`${s.badge} ${scoring.salesPriority === 'HIGH' ? s.badgeGreen : scoring.salesPriority === 'MEDIUM' ? s.badgeAmber : s.badgeGray}`}>
            {scoring.salesPriority === 'HIGH' ? 'High' : scoring.salesPriority === 'MEDIUM' ? 'Medium' : 'Low'} priority
          </span>
        </div>
      </div>

      {scoring.scoringFactors.length === 0 ? (
        <p className={s.cardSubtitle}>Nothing is known about this company yet. Search it in Apollo to build the profile.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {scoring.scoringFactors.map((f) => (
            <div key={f.factorName} style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'flex-start' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--o-success)', flexShrink: 0, marginTop: 2 }} />
              <span style={{ flex: 1 }}><strong>{f.factorName}:</strong> {f.description}</span>
              <span className={s.cellSub} style={{ whiteSpace: 'nowrap' }}>+{f.impactScore}</span>
            </div>
          ))}
        </div>
      )}

      {cautions.length > 0 && (
        <div className={`${s.notice} ${s.noticeWarn}`}>
          <AlertTriangle size={15} className={s.noticeIcon} />
          <div>
            <strong>Watch out for</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{cautions.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        </div>
      )}
    </section>
  );
}

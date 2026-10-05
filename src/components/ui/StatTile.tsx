import Link from 'next/link';
import s from './ui.module.css';

export type StatTileColorScheme = 'indigo' | 'violet' | 'emerald' | 'sky' | 'blue' | 'purple' | 'rose' | 'amber' | 'default';

/** A headline number with a label, icon, badge, tone, and an optional line of context underneath. */
export function StatTile({
  label,
  value,
  foot,
  tone,
  icon,
  badge,
  colorScheme = 'default',
  href,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  foot?: React.ReactNode;
  /** Colours the value: good (green) or bad (red) or warn (amber). Leave empty for neutral numbers. */
  tone?: 'good' | 'bad' | 'warn';
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  colorScheme?: StatTileColorScheme;
  href?: string;
}) {
  const schemeClass = colorScheme !== 'default' ? s[`kpi_${colorScheme}`] : '';
  const iconSchemeClass = colorScheme !== 'default' ? s[`kpiIcon_${colorScheme}`] : '';

  const content = (
    <>
      <div className={s.kpiHead}>
        <div className={s.kpiHeadLeft}>
          <span className={s.kpiLabel}>{label}</span>
          {badge && <span className={s.kpiBadge}>{badge}</span>}
        </div>
        {icon && <div className={`${s.kpiIconWrap} ${iconSchemeClass}`}>{icon}</div>}
      </div>
      <div className={`${s.kpiValue} ${tone === 'good' ? s.good : tone === 'bad' ? s.bad : tone === 'warn' ? s.warn : ''}`}>
        {value}
      </div>
      {foot && (
        <div className={s.kpiFoot}>
          <span>{foot}</span>
          {href && <span className={s.kpiArrow} aria-hidden>→</span>}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${s.kpi} ${s.kpiLink} ${schemeClass}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`${s.kpi} ${schemeClass}`}>
      {content}
    </div>
  );
}


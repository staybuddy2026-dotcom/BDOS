import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Calendar,
  CalendarCheck,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Home,
  Inbox,
  Kanban,
  Mail,
  Moon,
  Percent,
  Phone,
  PieChart,
  Share2,
  Sparkles,
  Sun,
  Sunrise,
  Target,
  TrendingUp,
  Trophy,
  User,
  UserPlus,
} from 'lucide-react';
import { AuthService } from '@/lib/auth';
import { getDashboardOverview, type DashboardScope } from '@/features/command-center/overview';
import { STAGE_LABELS, STALE_AFTER_DAYS } from '@/features/crm/types';
import { PageShell, StatTile } from '@/components/ui';
import { BarList } from '@/components/reports/BarList';
import s from '@/components/ui/ui.module.css';
import d from './dashboard.module.css';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

function ago(iso: string, now: number) {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

function greetingInfo(now: Date) {
  const h = now.getHours();
  if (h < 12) return { text: 'Good morning', icon: <Sunrise size={18} className={d.heroTimeIcon} /> };
  if (h < 17) return { text: 'Good afternoon', icon: <Sun size={18} className={d.heroTimeIcon} /> };
  return { text: 'Good evening', icon: <Moon size={18} className={d.heroTimeIcon} /> };
}

function getInitials(name: string) {
  if (!name) return 'DE';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const STAGE_CONFIG: Record<string, { dot: string; gradient: string }> = {
  LEAD: { dot: '#0284c7', gradient: 'linear-gradient(90deg, #38bdf8, #0284c7)' },
  CONTACTED: { dot: '#4f46e5', gradient: 'linear-gradient(90deg, #818cf8, #4f46e5)' },
  MEETING_SCHEDULED: { dot: '#9333ea', gradient: 'linear-gradient(90deg, #c084fc, #9333ea)' },
  PROPOSAL_SENT: { dot: '#d97706', gradient: 'linear-gradient(90deg, #fbbf24, #d97706)' },
  NEGOTIATION: { dot: '#e11d48', gradient: 'linear-gradient(90deg, #f472b6, #e11d48)' },
};

function getActivityIcon(type: string) {
  switch (type) {
    case 'MEETING':
      return <CalendarCheck size={12} style={{ color: '#2563eb' }} />;
    case 'CALL':
      return <Phone size={12} style={{ color: '#059669' }} />;
    case 'EMAIL':
      return <Mail size={12} style={{ color: '#4f46e5' }} />;
    case 'NOTE':
      return <FileText size={12} style={{ color: '#64748b' }} />;
    case 'PROPOSAL':
      return <FileSpreadsheet size={12} style={{ color: '#d97706' }} />;
    case 'STAGE_CHANGE':
      return <ArrowRightLeft size={12} style={{ color: '#9333ea' }} />;
    case 'LINKEDIN':
      return <Share2 size={12} style={{ color: '#0284c7' }} />;
    default:
      return <Activity size={12} style={{ color: '#f59e0b' }} />;
  }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await AuthService.verifySession();
  const params = await searchParams;
  const requested: DashboardScope = params.scope === 'mine' ? 'mine' : 'team';
  const data = await getDashboardOverview(user, requested);
  const { kpis } = data;
  const now = new Date();
  const nowMs = now.getTime();
  const { text: greetText, icon: greetIcon } = greetingInfo(now);

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Action items to prioritize
  const focus: { icon: React.ReactNode; text: string; href: string; cta: string }[] = [];
  if (kpis.dueToday) {
    focus.push({
      icon: <CalendarCheck size={16} />,
      text: `You have ${kpis.dueToday} thing${kpis.dueToday === 1 ? '' : 's'} to do today: tasks, next actions and follow-ups.`,
      href: '/today',
      cta: 'Open Today',
    });
  }
  if (kpis.overdueActions) {
    focus.push({
      icon: <AlertTriangle size={16} />,
      text: `${kpis.overdueActions} deal${kpis.overdueActions === 1 ? ' has' : 's have'} an overdue next action that needs follow-up.`,
      href: '/crm',
      cta: 'Open CRM',
    });
  }
  if (kpis.unassigned) {
    focus.push({
      icon: <UserPlus size={16} />,
      text: `${kpis.unassigned} new lead${kpis.unassigned === 1 ? ' is' : 's are'} waiting to be claimed from the team pool.`,
      href: '/crm',
      cta: 'Claim leads',
    });
  }
  if (kpis.unvaluedDeals) {
    focus.push({
      icon: <Target size={16} />,
      text: `${kpis.unvaluedDeals} open deal${kpis.unvaluedDeals === 1 ? ' has' : 's have'} no estimated value yet.`,
      href: '/crm',
      cta: 'Add values',
    });
  }
  if (!kpis.openDeals) {
    focus.push({
      icon: <Sparkles size={16} />,
      text: 'The pipeline is currently empty. Find decision makers on Apollo or LinkedIn to start prospecting.',
      href: '/apollo-search',
      cta: 'Find leads',
    });
  }

  const maxStage = Math.max(1, ...data.stages.map((st) => st.count));

  return (
    <PageShell
      icon={Home}
      title="Dashboard"
      subtitle="How the pipeline stands, from the same deals as the CRM"
      breadcrumb={false}
      actions={
        <>
          {data.canSeeAll && (
            <div className={s.tabs} role="tablist" aria-label="Whose deals">
              <Link href="/dashboard" role="tab" aria-selected={data.scope === 'team'} className={`${s.tab} ${data.scope === 'team' ? s.tabActive : ''}`}>Team</Link>
              <Link href="/dashboard?scope=mine" role="tab" aria-selected={data.scope === 'mine'} className={`${s.tab} ${data.scope === 'mine' ? s.tabActive : ''}`}>Mine</Link>
            </div>
          )}
          <Link href="/today" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}><CalendarCheck size={14} /> Today{kpis.dueToday ? ` (${kpis.dueToday})` : ''}</Link>
          <Link href="/crm" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}><Kanban size={14} /> CRM</Link>
        </>
      }
    >
      <div className={s.root}>
        {/* Command center greeting & action focus */}
        <section className={d.heroCard}>
          <div className={d.heroHeader}>
            <div>
              <div className={d.heroGreetingRow}>
                {greetIcon}
                <h2 className={d.heroTitle}>{greetText}, {data.firstName}</h2>
                <span className={d.heroDateBadge}>{formattedDate}</span>
              </div>
              <p className={d.heroSubtitle}>
                {focus.length
                  ? `You have ${focus.length} action item${focus.length === 1 ? '' : 's'} requiring attention today.`
                  : 'Everything is up to date. Keep up the sales momentum.'}
              </p>
            </div>
            <div>
              {focus.length > 0 ? (
                <span className={`${d.heroStatusBadge} ${d.heroStatusAlert}`}>
                  <AlertCircle size={13} /> {focus.length} action item{focus.length === 1 ? '' : 's'}
                </span>
              ) : (
                <span className={`${d.heroStatusBadge} ${d.heroStatusGood}`}>
                  All clear · Pipeline on track
                </span>
              )}
            </div>
          </div>

          {focus.length > 0 && (
            <div className={d.focusList}>
              {focus.slice(0, 3).map((f) => (
                <div key={f.text} className={d.focusRow}>
                  <div className={d.focusMain}>
                    <span className={d.focusIcon}>{f.icon}</span>
                    <span className={d.focusText}>{f.text}</span>
                  </div>
                  <Link href={f.href} className={d.focusBtn}>
                    {f.cta} <ArrowRight size={13} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Balanced 4-column KPI grid */}
        <section aria-label="Key metrics" className={d.kpiGrid}>
          <StatTile
            label="Open pipeline"
            value={usd(kpis.pipelineValue)}
            foot={`${kpis.openDeals} open deal${kpis.openDeals === 1 ? '' : 's'}${kpis.unvaluedDeals ? ` · ${kpis.unvaluedDeals} unvalued` : ''}`}
            icon={<DollarSign size={18} />}
            badge="Live"
            colorScheme="indigo"
            href="/crm"
          />
          <StatTile
            label="Weighted forecast"
            value={usd(kpis.weightedValue)}
            foot="Probability-adjusted pipeline"
            icon={<TrendingUp size={18} />}
            badge="Forecast"
            colorScheme="violet"
            href="/reports"
          />
          <StatTile
            label="Won this month"
            value={usd(kpis.wonThisMonth.value)}
            foot={`${kpis.wonThisMonth.count} closed deal${kpis.wonThisMonth.count === 1 ? '' : 's'}`}
            icon={<Trophy size={18} />}
            badge="Closed"
            tone={kpis.wonThisMonth.count ? 'good' : undefined}
            colorScheme="emerald"
            href="/reports"
          />
          <StatTile
            label="Win rate"
            value={kpis.winRate90 === null ? '—' : `${kpis.winRate90}%`}
            foot={kpis.winRate90 === null ? 'No deals closed in 90 days' : 'Won out of closed (90d)'}
            icon={<Percent size={18} />}
            badge="90 Days"
            colorScheme="sky"
            href="/reports"
          />
          <StatTile
            label="New leads"
            value={kpis.newLeads7d}
            foot="Added in the last 7 days"
            icon={<UserPlus size={18} />}
            badge="7d Flow"
            colorScheme="blue"
            href="/crm"
          />
          <StatTile
            label="Meetings"
            value={kpis.meetingsThisWeek}
            foot="In the next 7 days"
            icon={<CalendarCheck size={18} />}
            badge="Upcoming"
            colorScheme="purple"
            href="/today"
          />
          <StatTile
            label="Needs attention"
            value={kpis.overdueActions + kpis.staleDeals}
            foot={`${kpis.overdueActions} overdue · ${kpis.staleDeals} quiet ${STALE_AFTER_DAYS}+ days`}
            tone={kpis.overdueActions + kpis.staleDeals ? 'bad' : undefined}
            icon={<AlertTriangle size={18} />}
            badge={kpis.overdueActions + kpis.staleDeals > 0 ? 'Urgent' : 'All Clear'}
            colorScheme="rose"
            href="/crm"
          />
          <StatTile
            label="Unclaimed leads"
            value={kpis.unassigned}
            foot="In the team's pool"
            tone={kpis.unassigned > 0 ? 'warn' : undefined}
            icon={<Inbox size={18} />}
            badge={kpis.unassigned > 0 ? 'Pool Available' : 'Empty'}
            colorScheme="amber"
            href="/crm"
          />
        </section>

        {/* Pipeline & Attention Section */}
        <div className={d.twoCol}>
          {/* Pipeline by stage */}
          <section className={s.card}>
            <div className={d.cardHeaderRow}>
              <div>
                <h2 className={s.cardTitle}><PieChart size={16} /> Pipeline by stage</h2>
                <p className={s.cardSubtitle}>{data.scope === 'team' ? "The team's" : 'Your'} open deals across stages</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={d.headerPill}>{kpis.openDeals} total open deal{kpis.openDeals === 1 ? '' : 's'}</span>
                <Link href="/crm" className={d.headerLink}>View CRM board <ArrowUpRight size={13} /></Link>
              </div>
            </div>

            {kpis.openDeals === 0 ? (
              <div className={s.empty}>
                <Kanban size={24} style={{ color: 'var(--o-subtle)' }} />
                <div className={s.emptyTitle}>No open deals</div>
                Deals appear here once leads are added to the CRM pipeline.
              </div>
            ) : (
              <div className={d.stages} role="list">
                {data.stages.map((st) => {
                  const cfg = STAGE_CONFIG[st.stage] || { dot: '#4f46e5', gradient: 'linear-gradient(90deg, #818cf8, #4f46e5)' };
                  const percentage = maxStage > 0 ? (st.count / maxStage) * 100 : 0;
                  return (
                    <div key={st.stage} className={d.stageRow} role="listitem" aria-label={`${st.label}: ${st.count} deals, ${usd(st.value)}`}>
                      <div className={d.stageNameWrap}>
                        <span className={d.stageDot} style={{ background: cfg.dot }} />
                        <span className={d.stageLabel} title={st.label}>{st.label}</span>
                      </div>
                      <div className={d.stageTrack}>
                        <span
                          className={d.stageBar}
                          style={{
                            width: st.count > 0 ? `${Math.max(6, percentage)}%` : '0%',
                            background: cfg.gradient,
                          }}
                        />
                      </div>
                      <span className={d.stageCount}>{st.count}</span>
                      <span className={d.stageValue}>{st.value ? usd(st.value) : '$0'}</span>
                    </div>
                  );
                })}

                <div className={d.stageSummary}>
                  <span>Total pipeline value: <strong className={d.stageSummaryStrong}>{usd(kpis.pipelineValue)}</strong></span>
                  <span>Weighted forecast: <strong className={d.stageSummaryStrong}>{usd(kpis.weightedValue)}</strong></span>
                </div>
              </div>
            )}
          </section>

          {/* Deals that need attention */}
          <section className={s.card}>
            <div className={d.cardHeaderRow}>
              <div>
                <h2 className={s.cardTitle}><AlertTriangle size={16} /> Deals that need attention</h2>
                <p className={s.cardSubtitle}>Overdue actions, closing soon, or quiet for {STALE_AFTER_DAYS}+ days</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`${d.headerPill} ${data.attention.length ? d.reasonPillOverdue : ''}`}>
                  {data.attention.length} need review
                </span>
                <Link href="/crm" className={d.headerLink}>Open in CRM <ArrowUpRight size={13} /></Link>
              </div>
            </div>

            {data.attention.length === 0 ? (
              <div className={s.empty}>
                <Inbox size={24} style={{ color: 'var(--o-subtle)' }} />
                <div className={s.emptyTitle}>All deals are on track</div>
                Nothing is overdue or inactive. Great job keeping deals warm!
              </div>
            ) : (
              <div className={d.attentionList}>
                {data.attention.map((a) => {
                  const hasOverdue = a.reasons.some((r) => r.toLowerCase().includes('overdue'));
                  return (
                    <Link
                      key={a.dealId}
                      href={`/crm?deal=${a.dealId}`}
                      className={`${d.attentionCard} ${hasOverdue ? d.attentionCardOverdue : ''}`}
                    >
                      <div className={d.attentionLeft}>
                        <div className={d.companyMonogram}>
                          {getInitials(a.company)}
                        </div>
                        <div className={d.attentionMeta}>
                          <div className={d.attentionTitleRow}>
                            <span className={d.companyTitle}>{a.company}</span>
                            <span className={d.stageBadge}>{STAGE_LABELS[a.stage]}</span>
                            {data.scope === 'team' && a.owner && (
                              <span className={d.ownerPill}><User size={11} /> {a.owner}</span>
                            )}
                          </div>
                          <div className={d.reasonTags}>
                            {a.reasons.map((r) => {
                              const isOverdue = r.toLowerCase().includes('overdue');
                              const isQuiet = r.toLowerCase().includes('quiet');
                              const pillClass = isOverdue
                                ? d.reasonPillOverdue
                                : isQuiet
                                ? d.reasonPillQuiet
                                : d.reasonPillSoon;
                              const IconComponent = isOverdue ? AlertCircle : isQuiet ? AlertTriangle : Calendar;
                              return (
                                <span key={r} className={`${d.reasonPill} ${pillClass}`}>
                                  <IconComponent size={11} /> {r}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className={d.attentionRight}>
                        <span className={d.attentionValue}>{a.value != null ? usd(a.value) : '—'}</span>
                        <div className={d.attentionAction}>
                          <ArrowUpRight size={14} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Activity & Forecast Section */}
        <div className={d.twoCol}>
          {/* Recent activity */}
          <section className={s.card}>
            <div className={d.cardHeaderRow}>
              <div>
                <h2 className={s.cardTitle}><Activity size={16} /> Recent activity</h2>
                <p className={s.cardSubtitle}>Latest notes, emails, meetings and pipeline updates</p>
              </div>
              <span className={d.headerPill}>{data.activity.length} updates</span>
            </div>

            {data.activity.length === 0 ? (
              <div className={s.empty}>
                <Activity size={24} style={{ color: 'var(--o-subtle)' }} />
                <div className={s.emptyTitle}>No recent activity</div>
                Activity logged in the CRM will show up here automatically.
              </div>
            ) : (
              <div className={d.timeline}>
                {data.activity.map((a) => (
                  <Link key={a.id} href={`/crm?deal=${a.dealId}`} className={d.event}>
                    <div className={d.eventIconWrap}>
                      {getActivityIcon(a.type)}
                    </div>
                    <div className={d.eventBody}>
                      <span className={d.eventTitle}>{a.title}</span>
                      <span className={d.eventSub}>
                        <strong>{a.company}</strong>
                        {a.by ? ` · ${a.by}` : ''}
                        <span>· {ago(a.at, nowMs)}</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* This month and lead sources */}
          <section className={s.card}>
            <div>
              <h2 className={s.cardTitle}><TrendingUp size={16} /> Monthly performance</h2>
              <p className={s.cardSubtitle}>Closed won so far versus probability-weighted forecast</p>
            </div>

            <div className={d.forecastWidget}>
              <div className={`${d.forecastBox} ${d.forecastBoxWon}`}>
                <div className={d.forecastLabel}><Trophy size={13} style={{ color: '#059669' }} /> Won this month</div>
                <div className={`${d.forecastValue} ${d.forecastValueWon}`}>{usd(data.forecast.wonThisMonth)}</div>
                <div className={d.forecastSub}>{data.kpis.wonThisMonth.count} closed deals</div>
              </div>

              <div className={`${d.forecastBox} ${d.forecastBoxExpected}`}>
                <div className={d.forecastLabel}><Target size={13} style={{ color: '#2563eb' }} /> Expected to close</div>
                <div className={`${d.forecastValue} ${d.forecastValueExpected}`}>{usd(data.forecast.thisMonthWeighted)}</div>
                <div className={d.forecastSub}>{data.forecast.thisMonthDeals} deals due this month</div>
              </div>
            </div>

            <div>
              <div className={s.sectionLabel} style={{ marginBottom: 10 }}>Lead generation sources (last 30 days)</div>
              {data.sources.length === 0 ? (
                <div className={s.cellSub}>No new leads logged in the last 30 days.</div>
              ) : (
                <BarList items={data.sources.map((src) => ({ label: src.label, value: src.count }))} unit="leads" />
              )}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

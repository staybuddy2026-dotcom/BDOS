import s from '@/components/ui/ui.module.css';

/** Shown while a page's data loads on the server, so navigation responds straight away. */
export default function Loading() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-secondary)]" aria-busy="true" aria-label="Loading">
      <div className="flex h-[65px] shrink-0 items-center gap-3.5 border-b border-[var(--border-subtle)] bg-white px-7">
        <div className="h-9 w-9 rounded-lg bg-slate-200" />
        <div className={s.skeletonGroup} style={{ width: 240, marginTop: 0 }}>
          <div className={s.skeleton} style={{ height: 14 }} />
          <div className={s.skeleton} style={{ width: '70%' }} />
        </div>
      </div>
      <div className="flex flex-col gap-4 px-7 pt-5 max-[768px]:px-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={s.kpi}>
              <div className={s.skeleton} style={{ width: '50%' }} />
              <div className={s.skeleton} style={{ height: 22, width: '35%', marginTop: 14 }} />
            </div>
          ))}
        </div>
        <div className={s.card} style={{ minHeight: 260 }}>
          <div className={s.skeletonGroup} style={{ width: '100%' }}>
            {[90, 75, 82, 60, 70].map((w) => <div key={w} className={s.skeleton} style={{ width: `${w}%` }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
